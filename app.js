// --- GLOBAL SPRITE EXCEPTION DICTIONARY ---
window.EXCEPTION_SPRITES = {
    "taurospaldeacombat": "https://play.pokemonshowdown.com/sprites/dex/taurospaldea.png",
    "taurospaldeablaze": "https://play.pokemonshowdown.com/sprites/dex/taurospaldeablaze.png",
    "taurospaldeaaqua": "https://play.pokemonshowdown.com/sprites/dex/taurospaldeaaqua.png",
    "porygonz": "https://play.pokemonshowdown.com/sprites/gen5/porygonz.png",
    "basculinbluestriped": "https://play.pokemonshowdown.com/sprites/gen5/basculin-bluestriped.png",
    "darmanitangalarzen": "https://play.pokemonshowdown.com/sprites/gen5/darmanitan-galarzen.png",
    "oricoriopompom": "https://play.pokemonshowdown.com/sprites/gen5/oricorio-pompom.png",
    "toxtricitylowkey": "https://play.pokemonshowdown.com/sprites/gen5/toxtricity-lowkey.png",
    "dudunsparcethreesegment": "https://play.pokemonshowdown.com/sprites/dex/dudunsparcethreesegment.png",
    "hooh": "https://play.pokemonshowdown.com/sprites/gen5/hooh.png",
    "kommoo": "https://play.pokemonshowdown.com/sprites/gen5/kommoo.png",
    "sirfetchd": "https://play.pokemonshowdown.com/sprites/gen5/sirfetchd.png",
    "chienpao": "https://play.pokemonshowdown.com/sprites/gen5/chienpao.png",
    "chiyu": "https://play.pokemonshowdown.com/sprites/gen5/chiyu.png",
    "tinglu": "https://play.pokemonshowdown.com/sprites/gen5/tinglu.png",
    "wochien": "https://play.pokemonshowdown.com/sprites/gen5/wochien.png"
};

// The smart sprite fetcher!
window.getSafeSprite = function(id, name) {
    if (typeof CUSTOM_SPRITES !== 'undefined' && CUSTOM_SPRITES[id]) return CUSTOM_SPRITES[id];
    if (window.EXCEPTION_SPRITES && window.EXCEPTION_SPRITES[id]) return window.EXCEPTION_SPRITES[id] + "?v=8";
    let spriteName = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png?v=8`;
};

window.imgFallback = function(img, strictId) {
    if (!img.dataset.fallback) {
        img.dataset.fallback = 'dex';
        let dexId = strictId.replace(/[^a-z0-9]/g, '');
        if (dexId === "taurospaldeacombat") dexId = "taurospaldea";
        img.src = `https://play.pokemonshowdown.com/sprites/dex/${dexId}.png?v=8`;
    } else if (img.dataset.fallback === 'dex') {
        img.dataset.fallback = 'sub';
        img.src = `https://play.pokemonshowdown.com/sprites/gen5/substitute.png?v=8`;
    }
};

// --- CORE APP LOGIC (Forced 31 IVs) ---
function calcLv50Stat(baseStat, isHP = false, ev = 0, iv = 31) {
    if (isHP && baseStat === 1) return 1; 
    let core = 2 * baseStat + iv + Math.floor(ev / 4);
    if (isHP) return Math.floor(core * 0.5) + 60;
    return Math.floor(core * 0.5) + 5;
}

let showdownData = {}; let abilitiesData = {}; let movesData = {}; let learnsetsData = {}; let itemsData = {};
let allTeams = Array.from({length: 6}, (_, i) => ({ roster: [], notes: "", replays: "", teamName: `Team ${i+1}` }));
let currentTeamIndex = 0; let currentTeam = []; let pendingMon = null; let draggedSlotIndex = null;
let simYourSelection = []; let simOppTeam = [];

// OVERRIDE DATA.JS ROSTER RENDERER
function renderRoster() {
    let html = '';
    if (typeof ROSTER_SECTIONS !== 'undefined') {
        ROSTER_SECTIONS.forEach(sec => {
            html += `<${sec.heading}>${sec.text}</${sec.heading}>`;
            sec.subsections.forEach(sub => {
                if (sub.heading) html += `<${sub.heading}>${sub.text}</${sub.heading}>`;
                html += `<div class="grid-container">`;
                sub.lines.forEach(line => {
                    html += `<div class="poke-box">` + line.split(' / ').map(stage => {
                        return `<div class="stage-container">` + stage.split('|').map(name => {
                            let clean = name.trim();
                            let id = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
                            
                            // Map formatting from data.js
                            if (clean.includes("Alolan ")) { id = clean.replace("Alolan ", "").toLowerCase() + "alola"; }
                            else if (clean.includes("Galarian ")) { id = clean.replace("Galarian ", "").toLowerCase() + "galar"; }
                            else if (clean.includes("Hisuian ")) { id = clean.replace("Hisuian ", "").toLowerCase() + "hisui"; }
                            else if (clean.includes("Paldean ")) { id = clean.replace("Paldean ", "").toLowerCase() + "paldea"; }
                            
                            if (clean === 'Flabébé') id = 'flabebe';
                            if (clean === 'Porygon-Z') id = 'porygonz';
                            if (clean === 'Mime Jr.') id = 'mimejr';
                            if (clean === 'Mr. Mime') id = 'mrmime';
                            if (clean === 'Jangmo-o') id = 'jangmoo';
                            if (clean === 'Hakamo-o') id = 'hakamoo';
                            if (clean === 'Kommo-o') id = 'kommoo';
                            if (clean === 'Ho-Oh') id = 'hooh';
                            
                            let url = getSafeSprite(id, clean);
                            return `<div class="poke-sprite-container" onclick="showData('${id}', '${clean.replace(/'/g, "\\'")}', '${url}')">
                                <img src="${url}" alt="${clean}" class="poke-sprite" loading="lazy" onerror="imgFallback(this, '${id}')">
                                <span>${clean}</span>
                            </div>`;
                        }).join('<div class="branch-divider">/</div>') + `</div>`;
                    }).join('<span class="arrow">▶</span>') + `</div>`;
                });
                html += `</div>`;
            });
        });
    }
    document.getElementById('roster-wrapper').innerHTML = html;
}

window.addEventListener('load', () => {
  if (window.exports && window.exports.BattlePokedex) {
      showdownData = window.exports.BattlePokedex; abilitiesData = window.exports.BattleAbilities; movesData = window.exports.BattleMovedex; learnsetsData = window.exports.BattleLearnsets; itemsData = window.exports.BattleItems;
      for (let key in showdownData) { showdownData[key].id = key; }

      Object.keys(CUSTOM_SPRITES).forEach(megaId => {
          if (megaId.includes('mega') && !showdownData[megaId]) {
              let baseId = megaId.replace(/mega[a-z]?$/, '');
              if(showdownData[baseId]) {
                  let clone = JSON.parse(JSON.stringify(showdownData[baseId]));
                  let letter = megaId.match(/mega([xyz])$/) ? " " + megaId.slice(-1).toUpperCase() : "";
                  clone.name = clone.name + "-Mega" + letter;
                  if (clone.baseStats) { clone.baseStats.atk += 20; clone.baseStats.def += 20; clone.baseStats.spa += 20; clone.baseStats.spd += 20; clone.baseStats.spe += 20; }
                  showdownData[megaId] = clone;
              }
          }
      });
      document.getElementById('loading-overlay').style.display = 'none';
      renderRoster(); loadTeam();
  } else {
      document.getElementById('loading-overlay').innerHTML = `<h2 style="color:#ff0000;">Data Blocked by Browser</h2><p>Your browser's adblocker blocked the Pokémon Showdown scripts.</p>`;
  }
});

function formatVersionName(name) { return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }

function fetchPokedexEntries(dexNum) {
    let container = document.getElementById('pokedex-entry-container');
    if (!container) return;
    if (!dexNum || dexNum <= 0) { container.innerHTML = "<div style='text-align:center;'>No Pokédex entry available.</div>"; return; }

    fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNum}/`).then(res => res.json()).then(data => {
        let entries = data.flavor_text_entries.filter(e => e.language.name === 'en');
        let uniqueEntries = []; let seenTexts = new Set();
        for (let i = entries.length - 1; i >= 0; i--) {
            let cleanText = entries[i].flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s{2,}/g, ' ');
            if (!seenTexts.has(cleanText)) { seenTexts.add(cleanText); uniqueEntries.push({ text: cleanText, version: formatVersionName(entries[i].version.name) }); }
        }
        if (uniqueEntries.length === 0) { container.innerHTML = "<div style='text-align:center;'>No English Pokédex entries found.</div>"; return; }

        let latest = uniqueEntries[0]; let others = uniqueEntries.slice(1);
        let html = `<div style="font-size: 9px; font-style: italic; color: #fff; margin-bottom: 8px; line-height: 1.4;">"${latest.text}"<div style="text-align: right; color: #888; font-size: 7px; margin-top: 4px;">- Pokémon ${latest.version}</div></div>`;

        if (others.length > 0) {
            let othersHtml = others.map(e => `<div style="margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 8px; line-height: 1.4;"><div style="color: #ccc; font-size: 8px;">"${e.text}"</div><div style="color: #888; text-align: right; font-size: 7px; margin-top: 4px;">- Pokémon ${e.version}</div></div>`).join('');
            html += `<details style="background: #111; border: 1px solid #333; margin-top: 10px; border-radius: 4px;"><summary style="padding: 8px; font-size: 8px; color: #ffcc00; cursor: pointer; display: flex; justify-content: space-between; outline: none; border-radius: 4px;"><span>View Past Entries</span><span style="color: #666;">(${others.length})</span></summary><div style="padding: 10px; max-height: 150px; overflow-y: auto; border-top: 1px solid #333; text-align: left; border-radius: 0 0 4px 4px;">${othersHtml}</div></details>`;
        }
        container.innerHTML = html;
    }).catch(err => { container.innerHTML = "<div style='text-align:center; color:#ff4444;'>Failed to load Pokédex entries.</div>"; });
}

function showData(jsonId, displayName, spriteUrl) {
  const modal = document.getElementById('data-modal'); const content = document.getElementById('modal-info');
  let monData = showdownData[jsonId];
  if (!monData) { content.innerHTML = `<h2 style="margin-top:0; color:#ffcc00;">${displayName}</h2><p style="color:#ff0000;">Error: Data not found.</p>`; } else {
    let stats = monData.baseStats; let bst = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
    let hp50  = calcLv50Stat(stats.hp,  true); let atk50 = calcLv50Stat(stats.atk); let def50 = calcLv50Stat(stats.def);
    let spa50 = calcLv50Stat(stats.spa); let spd50 = calcLv50Stat(stats.spd); let spe50 = calcLv50Stat(stats.spe);

    let abilitiesHtml = `<div style="margin: 15px 0 5px 0; text-align: left; color: #ff9900;"><strong>Select Ability:</strong></div>`;
    let first = true; let initialDesc = "";
    for(let key in monData.abilities) {
        let aName = monData.abilities[key]; let aId = aName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let aDesc = abilitiesData[aId] ? (abilitiesData[aId].desc || abilitiesData[aId].shortDesc) : "N/A";
        if(first) initialDesc = aDesc;
        let safeDesc = aDesc.replace(/"/g, '&quot;');
        abilitiesHtml += `<label style="display:block; margin:6px 0; font-size:9px; cursor:pointer; text-align: left;"><input type="radio" name="ability-select" value="${aName}" ${first ? 'checked' : ''} data-desc="${safeDesc}" onchange="document.getElementById('ability-desc').innerText = this.getAttribute('data-desc')"> ${aName} ${key === 'H' ? '<span style="color:#888;">(Hidden)</span>' : ''}</label>`;
        first = false;
    }
    abilitiesHtml += `<div id="ability-desc" style="background:#222; padding:8px; font-size:8px; border-radius:4px; text-align:left; min-height:30px; margin-top:5px; color:#ddd;">${initialDesc}</div>`;

    let megaDropdown = "";
    if (typeof MEGA_MAP !== 'undefined' && MEGA_MAP[jsonId]) {
        let options = MEGA_MAP[jsonId].map(m => `<option value="${m.id}">${m.stone}</option>`).join('');
        megaDropdown = `<div style="margin: 10px 0; color: #aaddff; text-align: left;"><strong>Form / Mega:</strong> <select id="mega-select" style="background:#222; color:#fff; border:1px solid #ffcc00; padding:4px; border-radius:3px; font-family: 'Press Start 2P', monospace; font-size: 8px; width: 100%; margin-top: 5px;" onchange="previewMega('${jsonId}', '${displayName.replace(/'/g, "\\'")}', '${spriteUrl}', this.value)"><option value="none">Base Form</option>${options}</select></div>`;
    }

    pendingMon = { id: jsonId, name: monData.name || displayName, sprite: spriteUrl, types: monData.types, moves: [], item: "", ability: "", evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: "Serious" };

    content.innerHTML = `
      <h2 style="margin-top:0; color:#ffcc00;">${displayName}</h2>${megaDropdown}
      <div id="modal-dynamic-area">
          <img src="${spriteUrl}" style="height:80px; image-rendering:pixelated;" onerror="imgFallback(this, '${monData.id}')">
          <p style="margin: 2px 0;"><strong>Types:</strong> ${monData.types.join(' / ')}</p>${abilitiesHtml}
          <div id="pokedex-entry-container" class="pokedex-entry-box"><div style="text-align: center; color: #888;">Loading Pokédex entry...</div></div>
          <div class="stat-card">
            <div class="stat-card-header"><strong>Lv. 50 Stats (Max IV, 0 EV)</strong></div>
            <div class="stat-row"><span>HP:</span> <span>${hp50}</span></div><div class="stat-row"><span>Attack:</span> <span>${atk50}</span></div>
            <div class="stat-row"><span>Defense:</span> <span>${def50}</span></div><div class="stat-row"><span>Sp. Atk:</span> <span>${spa50}</span></div>
            <div class="stat-row"><span>Sp. Def:</span> <span>${spd50}</span></div><div class="stat-row"><span>Speed:</span> <span>${spe50}</span></div>
            <hr style="border-color:#444; margin: 5px 0;"><div class="stat-row" style="color:#aaddff;"><span>Base Stat Total:</span> <span>${bst}</span></div>
          </div>
      </div>
      <button id="modal-add-btn" class="btn-action btn-add" onclick='submitToTeam()'>Add to Team</button>
    `;
    fetchPokedexEntries(monData.num);
  }
  modal.style.display = 'flex';
}

function previewMega(baseId, displayName, baseSprite, megaId) {
    const dynamicArea = document.getElementById('modal-dynamic-area'); const addBtn = document.getElementById('modal-add-btn');
    if (megaId === "none") { showData(baseId, displayName, baseSprite); return; }
    let megaData = showdownData[megaId]; if (!megaData) return;
    
    let stats = megaData.baseStats; let bst = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
    let hp50  = calcLv50Stat(stats.hp,  true); let atk50 = calcLv50Stat(stats.atk); let def50 = calcLv50Stat(stats.def);
    let spa50 = calcLv50Stat(stats.spa); let spd50 = calcLv50Stat(stats.spd); let spe50 = calcLv50Stat(stats.spe);

    let abilitiesHtml = `<div style="margin: 6px 0 2px 0; text-align: left; color: #ff9900; font-size:9px;"><strong>Select Ability:</strong></div>`;
    let first = true; let megaAbilityName = "";
    for(let key in megaData.abilities) {
        let aName = megaData.abilities[key]; if (first) megaAbilityName = aName;
        abilitiesHtml += `<label style="display:block; margin:4px 0; font-size:9px; cursor:pointer; text-align: left;"><input type="radio" name="ability-select" value="${aName}" ${first ? 'checked' : ''}> ${aName} ${key === 'H' ? '<span style="color:#888;">(Hidden)</span>' : ''}</label>`;
        first = false;
    }

    let megaSprite = getSafeSprite(megaData.id, megaData.name);

    dynamicArea.innerHTML = `
      <img src="${megaSprite}" style="height:80px; image-rendering:pixelated;" onerror="imgFallback(this, '${megaData.id}')">
      <p style="margin: 2px 0; color:#ffcc00;"><strong>Types:</strong> ${megaData.types.join(' / ')}</p>${abilitiesHtml}
      <div id="pokedex-entry-container" class="pokedex-entry-box"><div style="text-align: center; color: #888;">Loading Pokédex entry...</div></div>
      <div class="stat-card">
        <div class="stat-card-header"><strong>Lv. 50 Stats (Max IV, 0 EV)</strong></div>
        <div class="stat-row"><span>HP:</span> <span>${hp50}</span></div><div class="stat-row"><span>Attack:</span> <span>${atk50}</span></div>
        <div class="stat-row"><span>Defense:</span> <span>${def50}</span></div><div class="stat-row"><span>Sp. Atk:</span> <span>${spa50}</span></div>
        <div class="stat-row"><span>Sp. Def:</span> <span>${spd50}</span></div><div class="stat-row"><span>Speed:</span> <span>${spe50}</span></div>
        <hr style="border-color:#444; margin: 5px 0;"><div class="stat-row" style="color:#aaddff;"><span>Base Stat Total:</span> <span>${bst}</span></div>
      </div>
    `;

    let megaItemName = "";
    if (typeof MEGA_MAP !== 'undefined' && MEGA_MAP[baseId]) {
        let match = MEGA_MAP[baseId].find(m => m.id === megaId);
        if (match && match.stone && !match.stone.includes("Form") && !match.stone.includes("Rotom")) megaItemName = match.stone;
    }

    pendingMon = { id: megaId, name: megaData.name, sprite: megaSprite, types: megaData.types, moves: [], item: megaItemName, ability: megaAbilityName, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: "Serious" };
    addBtn.innerText = "Add Form to Team"; fetchPokedexEntries(megaData.num);
}

function closeModal() { document.getElementById('data-modal').style.display = 'none'; }
function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }
function openImportModal() { document.getElementById('import-modal').style.display = 'flex'; }
function closeImportModal() { document.getElementById('import-modal').style.display = 'none'; }
function closeSuggestModal() { document.getElementById('suggest-modal').style.display = 'none'; }
function closeSimModal() { document.getElementById('sim-modal').style.display = 'none'; }
function openAutoBuildModal() { document.getElementById('autobuild-modal').style.display = 'flex'; }
function closeAutoBuildModal() { document.getElementById('autobuild-modal').style.display = 'none'; }

window.onclick = function(event) {
  if (event.target == document.getElementById('data-modal')) closeModal();
  if (event.target == document.getElementById('edit-modal')) closeEditModal();
  if (event.target == document.getElementById('import-modal')) closeImportModal();
  if (event.target == document.getElementById('suggest-modal')) closeSuggestModal();
  if (event.target == document.getElementById('sim-modal')) closeSimModal();
  if (event.target == document.getElementById('autobuild-modal')) closeAutoBuildModal();
}

function handleDragStart(e) { draggedSlotIndex = parseInt(e.target.closest('.team-slot').dataset.index); }
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e) {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over');
    let targetSlotIndex = parseInt(e.currentTarget.dataset.index);
    if (draggedSlotIndex !== null && !isNaN(targetSlotIndex) && draggedSlotIndex !== targetSlotIndex) {
        let draggedMon = currentTeam[draggedSlotIndex];
        currentTeam.splice(draggedSlotIndex, 1);
        currentTeam.splice(targetSlotIndex, 0, draggedMon);
        saveTeam(); renderAllUI();
    }
}

function getLegalMoves(monId) {
    let moves = new Set(); let currentId = monId;
    while (currentId) {
        let lset = learnsetsData[currentId]?.learnset; let mon = showdownData[currentId];
        if (!lset && mon && mon.baseSpecies) { let baseId = mon.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, ''); lset = learnsetsData[baseId]?.learnset; }
        if (lset) Object.keys(lset).forEach(m => moves.add(m));
        currentId = mon && mon.prevo ? mon.prevo.toLowerCase().replace(/[^a-z0-9]/g, '') : null;
    }
    let moveArray = Array.from(moves).map(mId => ({ id: mId, name: movesData[mId] ? movesData[mId].name : mId }));
    moveArray.sort((a, b) => a.name.localeCompare(b.name));
    return moveArray;
}

function updateItemDescription(itemName) {
    let descBox = document.getElementById('item-desc');
    if (typeof VGC_ITEMS !== 'undefined' && VGC_ITEMS[itemName || 'None']) {
        descBox.innerText = VGC_ITEMS[itemName || 'None'];
    } else if (itemName) {
        let itemId = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (typeof itemsData !== 'undefined' && itemsData[itemId]) { descBox.innerText = itemsData[itemId].desc || itemsData[itemId].shortDesc || "Competitive Item."; } 
        else { descBox.innerText = "Imported or Custom Item."; }
    } else { descBox.innerText = "No item selected."; }
}

window.handleEVChange = function(stat, index) {
    let val = parseInt(document.getElementById(`ev-${stat}`).value) || 0;
    let total = 0;
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(s => {
        if (s !== stat) total += parseInt(document.getElementById(`ev-${s}`).value) || 0;
    });
    if (total + val > 508) {
        val = 508 - total;
        document.getElementById(`ev-${stat}`).value = val;
    }
    document.getElementById(`ev-val-${stat}`).value = val;
    document.getElementById('ev-remaining').innerText = 508 - (total + val);
    updateLiveStats(index);
}

window.handleEVInput = function(stat, index) {
     let val = parseInt(document.getElementById(`ev-val-${stat}`).value) || 0;
     if(val > 252) val = 252;
     if(val < 0) val = 0;
     document.getElementById(`ev-${stat}`).value = val;
     handleEVChange(stat, index);
}

window.updateLiveStats = function(index) {
     let mon = currentTeam[index];
     let baseMonData = showdownData[mon.id];
     if (!baseMonData && mon.id.includes('mega')) { let baseId = mon.id.replace(/mega[a-z]?$/, ''); baseMonData = showdownData[baseId]; }
     if (!baseMonData) return;
     
     let stats = baseMonData.baseStats;
     let nature = document.getElementById('edit-nature').value;
     
     ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
         let ev = parseInt(document.getElementById(`ev-${stat}`).value) || 0;
         let isHP = stat === 'hp';
         let base = stats[stat] || 50;
         let val = calcLv50Stat(base, isHP, ev, 31);
         
         let natureMult = 1.0;
         if (!isHP) {
             if (['Lonely', 'Brave', 'Adamant', 'Naughty'].includes(nature) && stat === 'atk') natureMult = 1.1;
             if (['Bold', 'Relaxed', 'Impish', 'Lax'].includes(nature) && stat === 'def') natureMult = 1.1;
             if (['Timid', 'Hasty', 'Jolly', 'Naive'].includes(nature) && stat === 'spe') natureMult = 1.1;
             if (['Modest', 'Mild', 'Quiet', 'Rash'].includes(nature) && stat === 'spa') natureMult = 1.1;
             if (['Calm', 'Gentle', 'Sassy', 'Careful'].includes(nature) && stat === 'spd') natureMult = 1.1;
             
             if (['Bold', 'Timid', 'Modest', 'Calm'].includes(nature) && stat === 'atk') natureMult = 0.9;
             if (['Lonely', 'Hasty', 'Mild', 'Gentle'].includes(nature) && stat === 'def') natureMult = 0.9;
             if (['Brave', 'Relaxed', 'Quiet', 'Sassy'].includes(nature) && stat === 'spe') natureMult = 0.9;
             if (['Adamant', 'Impish', 'Jolly', 'Careful'].includes(nature) && stat === 'spa') natureMult = 0.9;
             if (['Naughty', 'Lax', 'Naive', 'Rash'].includes(nature) && stat === 'spd') natureMult = 0.9;
         }
         
         val = Math.floor(val * natureMult);
         document.getElementById(`live-stat-${stat}`).innerText = val;
         
         if (natureMult > 1) document.getElementById(`live-stat-${stat}`).style.color = '#ffbec3'; 
         else if (natureMult < 1) document.getElementById(`live-stat-${stat}`).style.color = '#93c5fd'; 
         else document.getElementById(`live-stat-${stat}`).style.color = '#aaddff'; 
     });
}

function openEditModal(index) {
    let mon = currentTeam[index]; 
    if (!mon) return;
    let legalMoves = getLegalMoves(mon.id);
    let moveOptions = `<option value="">(Select Move)</option>` + legalMoves.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    
    let itemOptions = Object.keys(VGC_ITEMS).map(item => `<option value="${item === 'None' ? '' : item}">${item}</option>`).join('');
    itemOptions += `<option disabled>──────────</option>`;
    
    if (typeof itemsData !== 'undefined') {
        let dynamicItems = [];
        Object.values(itemsData).forEach(item => {
            let isTMTR = /^(TM|TR|HM)\d+/.test(item.name);
            let isSpeciesSpecific = item.itemUser && item.itemUser.length > 0;
            let isNonStandard = item.isNonstandard;
            let isPokeball = item.isPokeball;
            if (item.name && !item.megaStone && !item.zMove && !isTMTR && !isSpeciesSpecific && !isNonStandard && !isPokeball && !VGC_ITEMS[item.name]) {
                dynamicItems.push(item.name);
            }
        });
        dynamicItems.sort();
        dynamicItems.forEach(name => { itemOptions += `<option value="${name}">${name}</option>`; });
    }

    let isMega = mon.id.includes('mega') || mon.id.includes('primal');
    let itemDisableHTML = isMega ? `disabled style="background:#111; cursor:not-allowed;" title="Megas must hold their stones!"` : ``;

    let evs = mon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    let nature = mon.nature || "Serious";
    let natures = ["Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish", "Lax", "Timid", "Hasty", "Serious", "Jolly", "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", "Gentle", "Sassy", "Careful", "Quirky"];
    let natureOptions = natures.map(n => `<option value="${n}" ${n === nature ? 'selected' : ''}>${n}</option>`).join('');

    let currentTotalEVs = evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;

    let strictId = mon.id;

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h2 style="color:#ffcc00; font-size:16px; margin-bottom:5px; margin-top:0;">Edit ${mon.name}</h2>
                <button class="btn-action" style="padding:4px; font-size:9px; background:#4CAF50; color:#fff;" onclick="if(typeof loadStarterKit === 'function'){loadStarterKit(${index});}else{alert('Coach features not loaded.');}">🎒 Load Starter Kit</button>
            </div>
            <img src="${mon.sprite}" style="height:60px; image-rendering:pixelated;" onerror="imgFallback(this, '${strictId}')">
        </div>

        <p style="font-size:10px; margin-bottom:5px; text-align:left; color:#ff9900; margin-top:10px;"><strong>Held Item:</strong></p>
        <select id="edit-item" style="width:100%; margin-bottom:0; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;" onchange="updateItemDescription(this.value)" ${itemDisableHTML}>
            ${isMega ? `<option value="${mon.item}">${mon.item}</option>` : itemOptions}
        </select>
        <div id="item-desc" style="background:#111; padding:8px; font-size:10px; border-radius:4px; text-align:left; min-height:30px; margin-bottom:15px; margin-top:5px; color:#aaa; line-height: 1.4;">Select an item to see its competitive use.</div>
        
        <div style="background:#1e293b; padding:10px; border-radius:4px; border:1px solid #4a90e2; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; color:#ff9900; font-size:10px; margin-bottom:8px; align-items:center;">
                <strong>EVs (Rem: <span id="ev-remaining">${508 - currentTotalEVs}</span>)</strong>
                <select id="edit-nature" style="background:#111; color:#fff; border:1px solid #555; border-radius:4px; font-size:9px; padding:3px;" onchange="updateLiveStats(${index})">${natureOptions}</select>
            </div>
            <div id="ev-sliders" style="font-size:9px;">
                ${['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(stat => `
                    <div style="display:flex; align-items:center; margin-bottom:4px;">
                        <span style="width:25px; color:#ccc; font-weight:bold;">${stat.toUpperCase()}</span>
                        <input type="range" id="ev-${stat}" min="0" max="252" step="4" value="${evs[stat]}" oninput="handleEVChange('${stat}', ${index})" style="flex-grow:1; margin:0 8px; cursor:pointer;">
                        <input type="number" id="ev-val-${stat}" value="${evs[stat]}" min="0" max="252" step="4" onchange="handleEVInput('${stat}', ${index})" style="width:35px; background:#111; color:#fff; border:1px solid #444; font-size:10px; text-align:center; border-radius:3px; padding:2px;">
                        <span id="live-stat-${stat}" style="width:28px; text-align:right; font-weight:bold;">0</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <p style="font-size:10px; margin-bottom:5px; text-align:left; color:#ff9900;"><strong>Moveset:</strong></p>
        <select id="edit-move1" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move2" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move3" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move4" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <button class="btn-action btn-add" style="margin-top:15px; font-size:12px; width:100%;" onclick="saveMoves(${index})">Save Team Member</button>
    `;
    
    document.getElementById('edit-modal-info').innerHTML = html;
    if (mon.item) { document.getElementById('edit-item').value = mon.item; updateItemDescription(mon.item); } else { updateItemDescription('None'); }
    if (mon.moves) {
        if (mon.moves[0]) document.getElementById('edit-move1').value = mon.moves[0];
        if (mon.moves[1]) document.getElementById('edit-move2').value = mon.moves[1];
        if (mon.moves[2]) document.getElementById('edit-move3').value = mon.moves[2];
        if (mon.moves[3]) document.getElementById('edit-move4').value = mon.moves[3];
    }
    
    updateLiveStats(index);
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveMoves(index) {
    if (!currentTeam[index]) return;
    currentTeam[index].moves = [document.getElementById('edit-move1').value, document.getElementById('edit-move2').value, document.getElementById('edit-move3').value, document.getElementById('edit-move4').value].filter(m => m !== "");
    currentTeam[index].item = document.getElementById('edit-item').value || "";
    currentTeam[index].nature = document.getElementById('edit-nature').value;
    currentTeam[index].evs = {
         hp: parseInt(document.getElementById('ev-hp').value) || 0,
         atk: parseInt(document.getElementById('ev-atk').value) || 0,
         def: parseInt(document.getElementById('ev-def').value) || 0,
         spa: parseInt(document.getElementById('ev-spa').value) || 0,
         spd: parseInt(document.getElementById('ev-spd').value) || 0,
         spe: parseInt(document.getElementById('ev-spe').value) || 0
    };
    saveTeam(); closeEditModal(); renderAllUI();
}

function updateTeamName() {
    let newName = document.getElementById('team-name-input').value.trim();
    if (newName === "") newName = `Team ${currentTeamIndex + 1}`;
    allTeams[currentTeamIndex].teamName = newName;
    document.getElementById(`tab-team-${currentTeamIndex}`).innerText = newName; saveTeam();
}

function saveTeam() {
  allTeams[currentTeamIndex].roster = currentTeam;
  allTeams[currentTeamIndex].notes = document.getElementById('team-notes').value;
  allTeams[currentTeamIndex].replays = document.getElementById('team-replays').value;
  localStorage.setItem('myVGCTeams_v4', JSON.stringify(allTeams));
}

function loadTeam() {
  const saved = localStorage.getItem('myVGCTeams_v4');
  if (saved) {
    let parsed = JSON.parse(saved);
    for(let i=0; i<6; i++) {
        allTeams[i] = parsed[i] || { roster: [], notes: "", replays: "", teamName: `Team ${i+1}` };
        if (!allTeams[i].teamName) allTeams[i].teamName = `Team ${i+1}`;
        document.getElementById(`tab-team-${i}`).innerText = allTeams[i].teamName;
    }
  }
  switchTeam(0);
}

window.updateReplayEmbed = function() {
    let url = document.getElementById('team-replays').value.trim();
    let container = document.getElementById('replay-container');
    let iframe = document.getElementById('replay-iframe');
    if (url && url.includes('replay.pokemonshowdown.com')) {
        if (!url.startsWith('http')) url = 'https://' + url;
        iframe.src = url;
        if(container) container.style.display = 'block';
    } else {
        if(container) container.style.display = 'none';
        if(iframe) iframe.src = '';
    }
}

function switchTeam(index) {
    currentTeamIndex = index; currentTeam = allTeams[currentTeamIndex].roster || [];
    document.getElementById('team-notes').value = allTeams[currentTeamIndex].notes || "";
    document.getElementById('team-replays').value = allTeams[currentTeamIndex].replays || "";
    document.getElementById('team-name-input').value = allTeams[currentTeamIndex].teamName || `Team ${index + 1}`;
    updateReplayEmbed();
    for(let i=0; i<6; i++) {
        let tab = document.getElementById(`tab-team-${i}`);
        if (tab) { if (i === index) tab.classList.add('active'); else tab.classList.remove('active'); }
    }
    renderAllUI();
}

function submitToTeam() {
  if (currentTeam.length >= 6) { alert("Your team is already full! Remove a Pokémon first."); return; }
  let selectedAbility = document.querySelector('input[name="ability-select"]:checked').value;
  pendingMon.ability = selectedAbility; currentTeam.push(pendingMon);
  saveTeam(); closeModal(); renderAllUI();
}

function removeFromTeam(index) { currentTeam.splice(index, 1); saveTeam(); renderAllUI(); }

function renderAllUI() { 
    try { renderTeamUI(); } catch(e){ console.error(e); }
    try { renderTypeChart(); } catch(e){ console.error(e); }
    try { renderSpeedTiers(); } catch(e){ console.error(e); }
    try { if (typeof runNewFeaturesHook === 'function') runNewFeaturesHook(); } catch(e){ console.error(e); }
}

function renderTeamUI() {
  const container = document.getElementById('team-container'); container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const slot = document.createElement('div'); slot.className = 'team-slot'; slot.dataset.index = i;
    if (currentTeam[i]) {
      slot.classList.add('filled'); slot.setAttribute('draggable', 'true');
      slot.ondragstart = handleDragStart; slot.ondragover = handleDragOver; slot.ondragleave = handleDragLeave; slot.ondrop = handleDrop;
      slot.onclick = function(e) { if (e.target.classList.contains('remove-x')) return; openEditModal(i); };
      
      let strictId = currentTeam[i].id;
      let evArr = [];
      let evs = currentTeam[i].evs;
      if (evs) {
          if(evs.hp) evArr.push(`${evs.hp} HP`);
          if(evs.atk) evArr.push(`${evs.atk} Atk`);
          if(evs.def) evArr.push(`${evs.def} Def`);
          if(evs.spa) evArr.push(`${evs.spa} SpA`);
          if(evs.spd) evArr.push(`${evs.spd} SpD`);
          if(evs.spe) evArr.push(`${evs.spe} Spe`);
      }
      let evHtml = evArr.length > 0 ? `<div style="font-size: 8px; color: #ffcc00; margin-top: 4px; line-height: 1.2;">${evArr.join(' / ')}</div>` : '';
      let natureHtml = currentTeam[i].nature ? `<div style="font-size: 8px; color: #aaddff; margin-top: 2px;">${currentTeam[i].nature}</div>` : '';

      slot.innerHTML = `
        <img src="${getSafeSprite(currentTeam[i].id, currentTeam[i].name)}" alt="${currentTeam[i].name}" title="Click to Edit\nAbility: ${currentTeam[i].ability}\nItem: ${currentTeam[i].item || 'None'}" onerror="imgFallback(this, '${strictId}')">
        <span style="font-size: 10px; font-family: 'Inter', sans-serif; font-weight: bold; color: #fff; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${currentTeam[i].name}</span>
        ${natureHtml}
        ${evHtml}
        <div class="remove-x" onclick="removeFromTeam(${i}); event.stopPropagation();">X</div>
      `;
    } else {
      slot.ondragover = handleDragOver; slot.ondragleave = handleDragLeave; slot.ondrop = handleDrop;
    }
    container.appendChild(slot);
  }
}

function renderSpeedTiers() {
    let container = document.getElementById('speed-tier-container'); if (!container) return; 
    if (currentTeam.length === 0) { container.innerHTML = '<p style="color:#888; font-size:12px; margin:0;">Add Pokémon to see speed tiers.</p>'; return; }
    
    let isTailwind = document.getElementById('speed-tailwind') ? document.getElementById('speed-tailwind').checked : false;
    let isTrickRoom = document.getElementById('speed-trickroom') ? document.getElementById('speed-trickroom').checked : false;
    let isDrop = document.getElementById('speed-drop') ? document.getElementById('speed-drop').checked : false;

    let speeds = currentTeam.map(mon => {
        let baseSpe = 50; 
        let baseMonData = showdownData[mon.id];
        if (!baseMonData && mon.id && mon.id.includes('mega')) { let baseId = mon.id.replace(/mega[a-z]?$/, ''); baseMonData = showdownData[baseId]; }
        if (baseMonData && baseMonData.baseStats) { baseSpe = baseMonData.baseStats.spe || 50; }
        
        let speEV = (mon.evs && mon.evs.spe) ? mon.evs.spe : 0;
        let spe50 = calcLv50Stat(baseSpe, false, speEV, 31); 
        
        if (mon && mon.nature) {
            if (['Timid', 'Hasty', 'Jolly', 'Naive'].includes(mon.nature)) spe50 = Math.floor(spe50 * 1.1);
            if (['Brave', 'Relaxed', 'Quiet', 'Sassy'].includes(mon.nature)) spe50 = Math.floor(spe50 * 0.9);
        }

        if (mon && mon.item) {
            if (mon.item === 'Choice Scarf') spe50 = Math.floor(spe50 * 1.5);
            if (mon.item === 'Iron Ball' || mon.item === 'Macho Brace') spe50 = Math.floor(spe50 * 0.5);
        }
        if (isDrop) spe50 = Math.floor(spe50 * 0.66);
        if (isTailwind) spe50 = spe50 * 2;
        
        return { id: mon.id, name: mon && mon.name ? mon.name : 'Unknown', sprite: mon && mon.sprite ? mon.sprite : '', speed: spe50, item: mon && mon.item ? mon.item : '' };
    });
    
    if (isTrickRoom) speeds.sort((a, b) => a.speed - b.speed); else speeds.sort((a, b) => b.speed - a.speed);
    
    container.innerHTML = speeds.map(s => {
        let strictId = s.id;
        return `<div class="speed-tier-row"><span class="speed-tier-value">${s.speed || 0}</span><img src="${getSafeSprite(strictId, s.name)}" class="speed-tier-sprite" onerror="imgFallback(this, '${strictId}')"><span class="speed-tier-name">${s.name} ${s.item ? `<span class="speed-tier-item">(@${s.item})</span>` : ''}</span></div>`;
    }).join('');
}

function getDefensiveMultiplier(defendingTypes, attackingType) {
  let mult = 1;
  if (!defendingTypes || !Array.isArray(defendingTypes)) return mult;
  defendingTypes.forEach(type => {
    if (!TYPE_DATA[type]) return;
    if (TYPE_DATA[type].weakTo.includes(attackingType)) mult *= 2;
    if (TYPE_DATA[type].resists.includes(attackingType)) mult *= 0.5;
    if (TYPE_DATA[type].immuneTo.includes(attackingType)) mult *= 0;
  });
  return mult;
}

function renderTypeChart() {
  const container = document.getElementById('type-summary-container'); 
  if (!container) return; container.innerHTML = '';
  if (currentTeam.length === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px;">Add Pokémon to your team to see analysis.</p>'; return; }

  let extremeWeak = {}; let weaknesses = {}; let resistances = {}; let mostlyIneffective = {}; let immunities = {}; let abilityImmune = {}; let abilityResist = {}; let coverage = {};
  Object.keys(TYPE_DATA).forEach(t => { extremeWeak[t] = []; weaknesses[t] = []; resistances[t] = []; mostlyIneffective[t] = []; immunities[t] = []; abilityImmune[t] = []; abilityResist[t] = []; coverage[t] = []; });

  Object.keys(TYPE_DATA).forEach(targetType => {
    currentTeam.forEach(mon => {
      if (!mon || !mon.types || !Array.isArray(mon.types)) return;
      let defMult = getDefensiveMultiplier(mon.types, targetType);
      if (defMult === 4) extremeWeak[targetType].push(mon); else if (defMult === 2) weaknesses[targetType].push(mon); else if (defMult === 0.5) resistances[targetType].push(mon); else if (defMult === 0.25) mostlyIneffective[targetType].push(mon); else if (defMult === 0) immunities[targetType].push(mon);
      
      if (mon.ability && typeof ABILITY_DEFENSES !== 'undefined' && ABILITY_DEFENSES[mon.ability]) {
         let abilDef = ABILITY_DEFENSES[mon.ability];
         if (abilDef.immuneTo && abilDef.immuneTo.includes(targetType) && defMult !== 0) abilityImmune[targetType].push(mon);
         if (abilDef.resists && abilDef.resists.includes(targetType)) abilityResist[targetType].push(mon);
      }
      if (mon.moves && Array.isArray(mon.moves)) { 
          let hasSE = mon.types.some(t => TYPE_DATA[targetType] && TYPE_DATA[targetType].weakTo.includes(t)); 
          if (hasSE) coverage[targetType].push(mon); 
      }
    });
  });

  const buildSection = (title, color, dataObj, emptyMsg) => {
    let activeTypes = Object.keys(dataObj).filter(t => dataObj[t].length > 0).sort((a, b) => dataObj[b].length - dataObj[a].length);
    let contentHtml = activeTypes.length === 0 ? `<div style="color: #888; font-size: 10px;">${emptyMsg}</div>` : activeTypes.map(t => `<div class="summary-row"><div class="type-label" style="background-color: ${TYPE_COLORS[t]}; width: 60px;">${t.substring(0,3).toUpperCase()}</div><div class="summary-sprites">${dataObj[t].map(m => {
        let strictId = m.id;
        return `<img src="${getSafeSprite(strictId, m.name)}" title="${m.name}" onerror="imgFallback(this, '${strictId}')">`;
    }).join('')}</div></div>`).join('');
    let totalCount = activeTypes.reduce((sum, t) => sum + dataObj[t].length, 0);
    return `<details><summary style="color: ${color};"><strong>${title}</strong><span style="background: ${color}; color: #111; padding: 2px 6px; border-radius: 10px;">${totalCount}</span></summary><div class="summary-content">${contentHtml}</div></details>`;
  };

  container.innerHTML = `
    ${buildSection('⚠️ 4x Extreme Weaknesses', '#cc0000', extremeWeak, 'No 4x weaknesses!')}
    ${buildSection('🔻 2x Weaknesses', '#ff4444', weaknesses, 'No 2x weaknesses!')}
    ${buildSection('🛡️ 1/2x Resistances', '#4CAF50', resistances, 'No basic resistances.')}
    ${buildSection('🧱 1/4x Mostly Ineffective', '#2E7D32', mostlyIneffective, 'No 4x resistances.')}
    ${buildSection('🚫 Base Immunities', '#4a90e2', immunities, 'No natural immunities.')}
    ${buildSection('✨ Ability Immunities', '#9c27b0', abilityImmune, 'No ability-based immunities.')}
    ${buildSection('❄️ Ability Resistances', '#00bcd4', abilityResist, 'No ability-based resistances.')}
    ${buildSection('⚔️ SE Coverage', '#ff9800', coverage, 'No super effective STAB coverage.')}
  `;
}

function processImport() {
    let text = document.getElementById('import-text').value; 
    let blocks = text.trim().split(/\n\s*\n/); 
    let importedTeam = [];
    
    blocks.forEach(block => {
        let lines = block.split('\n'); if (lines.length === 0 || lines[0] === '') return;
        let firstLine = lines[0].trim(); let item = "";
        
        if (firstLine.includes('@')) { let parts = firstLine.split('@'); item = parts[1].trim(); firstLine = parts[0].trim(); }
        firstLine = firstLine.replace(/\s*\([MFN]\)$/i, '').trim();
        let species = firstLine; let match = firstLine.match(/.*\(([^)]+)\)$/); if (match) species = match[1].trim();
        let jsonId = species.toLowerCase().replace(/[^a-z0-9]/g, ''); if (jsonId === 'indeedeef') jsonId = 'indeedeef';

        if (item && typeof MEGA_MAP !== 'undefined' && MEGA_MAP[jsonId]) {
            let megaMatch = MEGA_MAP[jsonId].find(m => m.stone && m.stone.toLowerCase() === item.toLowerCase());
            if (megaMatch) { jsonId = megaMatch.id; }
        }

        let ability = ""; let moves = [];
        let evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }; let nature = "Serious";

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('Ability:')) ability = line.replace('Ability:', '').trim();
            
            if (line.startsWith('-')) {
                let moveName = line.replace('-', '').trim();
                moveName = moveName.replace(/[\r\n]+/g, ''); 
                moves.push(moveName);
            }
            
            if (line.startsWith('EVs:')) {
                let parts = line.replace('EVs:', '').split('/');
                parts.forEach(p => {
                    let [val, stat] = p.trim().split(/\s+/); 
                    let s = stat ? stat.toLowerCase() : "";
                    if (s === 'hp') evs.hp = parseInt(val) || 0;
                    if (s === 'atk') evs.atk = parseInt(val) || 0;
                    if (s === 'def') evs.def = parseInt(val) || 0;
                    if (s === 'spa') evs.spa = parseInt(val) || 0;
                    if (s === 'spd') evs.spd = parseInt(val) || 0;
                    if (s === 'spe') evs.spe = parseInt(val) || 0;
                });
            }
            if (line.includes(' Nature')) { nature = line.replace(' Nature', '').trim(); }
        }
        
        let monData = showdownData[jsonId];
        if (!monData) { let found = Object.values(showdownData).find(d => d.name === species); if (found) { monData = found; jsonId = found.id || jsonId; } }

        let isCosmetic = false;
        if (!monData && species.includes('-')) {
            let baseSpecies = species.split('-')[0].trim();
            let baseId = baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
            monData = showdownData[baseId];
            if (monData) { jsonId = baseId; isCosmetic = true; }
        }

        if (monData) {
            if (jsonId.includes('mega') || (monData.name && monData.name.includes('-Mega'))) { item = ""; }

            let safeName = isCosmetic ? species : (monData.name || species);
            let safeId = monData.id || jsonId;
            let spriteUrl = getSafeSprite(safeId, safeName);

            let displayName = isCosmetic ? species : (monData.name || species);
            let finalTypes = (monData.types && Array.isArray(monData.types)) ? monData.types : ["Normal"]; 
            
            importedTeam.push({ id: jsonId, name: displayName, sprite: spriteUrl, types: finalTypes, ability: ability, item: item, moves: moves.slice(0, 4), evs: evs, nature: nature });
        }
    });
    
    if (importedTeam.length > 0) { currentTeam = importedTeam.slice(0, 6); saveTeam(); renderAllUI(); closeImportModal(); document.getElementById('import-text').value = ""; } 
    else { alert("Could not parse any valid Pokémon from the text."); }
}

function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = function(e) { document.getElementById('import-text').value = e.target.result; }; reader.readAsText(file);
}

function exportTeam() {
  if (currentTeam.length === 0) { alert("Add some Pokémon to your team first!"); return; }
  let exportText = "";
  currentTeam.forEach(mon => {
    let exportName = mon.id.includes('mega') && !mon.name.includes('-Mega') ? mon.name.replace(' (Mega)', '-Mega') : mon.name;
    exportText += mon.item ? `${exportName} @ ${mon.item}\n` : `${exportName}\n`;
    exportText += `Level: 50\nAbility: ${mon.ability}\n`;
    
    let evArr = [];
    if (mon.evs) {
        if(mon.evs.hp) evArr.push(`${mon.evs.hp} HP`);
        if(mon.evs.atk) evArr.push(`${mon.evs.atk} Atk`);
        if(mon.evs.def) evArr.push(`${mon.evs.def} Def`);
        if(mon.evs.spa) evArr.push(`${mon.evs.spa} SpA`);
        if(mon.evs.spd) evArr.push(`${mon.evs.spd} SpD`);
        if(mon.evs.spe) evArr.push(`${mon.evs.spe} Spe`);
    }
    if(evArr.length > 0) exportText += `EVs: ${evArr.join(' / ')}\n`;
    if(mon.nature) exportText += `${mon.nature} Nature\n`;

    if (mon.moves && mon.moves.length > 0) { mon.moves.forEach(move => { exportText += `- ${move}\n`; }); }
    exportText += `\n`; 
  });
  navigator.clipboard.writeText(exportText.trim()).then(() => { alert("Copied to clipboard!"); });
}

function universalSearch() {
    let input = document.getElementById('universal-search').value.toLowerCase().trim();
    let containers = document.querySelectorAll('.poke-sprite-container');
    containers.forEach(container => {
        let match = container.getAttribute('onclick').match(/showData\('([^']+)'/);
        if (match) {
            let monId = match[1]; let monData = showdownData[monId]; let isMatch = false;
            if (input === '') { isMatch = true; } 
            else if (monData) {
                if (monData.name.toLowerCase().includes(input)) isMatch = true;
                if (monData.types.some(t => t.toLowerCase().includes(input))) isMatch = true;
                if (monData.abilities) { for (let key in monData.abilities) { if (monData.abilities[key].toLowerCase().includes(input)) isMatch = true; } }
            } else { if (monId.includes(input)) isMatch = true; }

            if (isMatch) { container.style.opacity = "1"; container.style.pointerEvents = "auto"; container.style.filter = "drop-shadow(0 4px 4px rgba(0,0,0,0.5))"; container.style.transform = "scale(1)"; } 
            else { container.style.opacity = "0.15"; container.style.pointerEvents = "none"; container.style.filter = "grayscale(100%) blur(2px)"; container.style.transform = "scale(0.85)"; }
        }
    });
}

// --- BATTLE PREP SIMULATOR ENGINE ---

window.openSimModal = function() {
    if (currentTeam.length < 4) { alert("You need at least 4 Pokémon on your team to simulate a battle!"); return; }
    
    simYourSelection = currentTeam.slice(0, 4); 
    renderSimYourTeam();
    document.getElementById('sim-modal').style.display = 'flex';
}

window.renderSimYourTeam = function() {
    document.getElementById('sim-your-team').innerHTML = currentTeam.map(m => {
        let isSelected = simYourSelection.find(s => s.id === m.id);
        let border = isSelected ? "border: 2px solid #4ade80; transform: scale(1.15); background: rgba(74, 222, 128, 0.2);" : "border: 2px solid transparent; opacity: 0.4;";
        return `<img src="${getSafeSprite(m.id, m.name)}" style="height:50px; cursor:pointer; transition: 0.2s; ${border} border-radius: 50%; padding: 4px;" title="${m.name} (Click to Select)" onclick="toggleSimSelection('${m.id}')" onerror="imgFallback(this, '${m.id}')">`;
    }).join('');
}

window.toggleSimSelection = function(id) {
    let index = simYourSelection.findIndex(s => s.id === id);
    if (index > -1) {
        if (simYourSelection.length > 1) simYourSelection.splice(index, 1);
    } else {
        if (simYourSelection.length < 4) {
            let mon = currentTeam.find(m => m.id === id);
            if (mon) simYourSelection.push(mon);
        }
    }
    renderSimYourTeam();
}

function loadTopCutTeam() {
    let val = document.getElementById('top-cut-select').value;
    if (val && typeof TOP_CUT_TEAMS !== 'undefined' && TOP_CUT_TEAMS[val]) {
        document.getElementById('sim-opp-paste').value = TOP_CUT_TEAMS[val];
        loadSimOpponent();
    }
}

function loadSimOpponent() {
    let text = document.getElementById('sim-opp-paste').value;
    if (!text) { alert("Select or paste a team first!"); return; }
    
    simOppTeam = [];
    let blocks = text.trim().split(/\n\s*\n/);
    
    blocks.forEach(block => {
        let lines = block.split('\n'); if (lines.length === 0 || lines[0] === '') return;
        let firstLine = lines[0].trim();
        if (firstLine.includes('@')) firstLine = firstLine.split('@')[0].trim();
        firstLine = firstLine.replace(/\s*\([MFN]\)$/i, '').trim();
        
        let species = firstLine; let match = firstLine.match(/.*\(([^)]+)\)$/); if (match) species = match[1].trim();
        let jsonId = species.toLowerCase().replace(/[^a-z0-9]/g, '');

        let monData = showdownData[jsonId];
        if (!monData) {
            let found = Object.values(showdownData).find(d => d.name === species);
            if (found) { monData = found; jsonId = found.id; }
        }
        
        if (monData) {
            simOppTeam.push({ id: jsonId, name: monData.name, types: monData.types });
        } else {
            simOppTeam.push({ id: jsonId, name: species, types: ["Normal"] });
        }
    });

    let html = simOppTeam.map(m => {
        return `<img src="${getSafeSprite(m.id, m.name)}" style="height:50px;" onerror="imgFallback(this, '${m.id}')" title="${m.name}">`;
    }).join('');
    
    document.getElementById('sim-opp-team').innerHTML = html;
    document.getElementById('sim-analysis-results').style.display = 'block';
    document.getElementById('sim-matrix-results').style.display = 'none';
    document.getElementById('sim-analysis-results').innerHTML = "<p style='color:#4ade80; font-size:11px; text-align:center;'>Opponent loaded successfully. Select a Matrix Analysis option below.</p>";
}

function get1v1Score(myMon, oppMon) {
    let myBaseSpe = showdownData[myMon.id] ? showdownData[myMon.id].baseStats.spe : 50; 
    let mySpd = calcLv50Stat(myBaseSpe, false, myMon.evs ? myMon.evs.spe : 0, 31);
    if(myMon.item === 'Choice Scarf') mySpd = Math.floor(mySpd * 1.5); 
    if(myMon.item === 'Iron Ball' || myMon.item === 'Macho Brace') mySpd = Math.floor(mySpd * 0.5);
    
    let oppBaseSpe = showdownData[oppMon.id] ? showdownData[oppMon.id].baseStats.spe : 50; 
    let oppSpd = calcLv50Stat(oppBaseSpe);
    
    let myMaxOffense = 0; myMon.types.forEach(t => { let mult = getDefensiveMultiplier(oppMon.types, t); if (mult > myMaxOffense) myMaxOffense = mult; });
    let theirMaxOffense = 0; oppMon.types.forEach(t => { let mult = getDefensiveMultiplier(myMon.types, t); if (mult > theirMaxOffense) theirMaxOffense = mult; });

    let score = 0;
    if (myMaxOffense > theirMaxOffense) score += 1; else if (myMaxOffense < theirMaxOffense) score -= 1;
    if (mySpd > oppSpd) score += 0.5; else if (mySpd < oppSpd) score -= 0.5;
    return score;
}

function generate1v1LeadMatrix() {
    let matrixDiv = document.getElementById('sim-matrix-results');
    let myTeamToUse = simYourSelection.length >= 1 ? simYourSelection : currentTeam;
    
    if (myTeamToUse.length === 0 || simOppTeam.length === 0) { alert("Need both teams loaded!"); return; }

    let legendHtml = `
        <div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 10px; margin-bottom: 10px; text-align: left;">
            <h4 style="color: #9c27b0; margin: 0 0 6px 0; font-size: 14px;">How to Read the 1v1 Matrix</h4>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #ccc; line-height: 1.6;">
                <li><strong style="color: #4CAF50;">Favorable:</strong> You naturally outspeed and threaten Super Effective damage.</li>
                <li><strong style="color: #81c784;">Slight Adv:</strong> You outspeed or have better typing, but not both.</li>
                <li><strong style="color: #aaa;">Neutral:</strong> A balanced matchup.</li>
                <li><strong style="color: #e57373;">Slight Dis:</strong> You are slightly outsped or have weaker typing.</li>
                <li><strong style="color: #ff4444;">Poor:</strong> You are outsped and take Super Effective damage. DO NOT lead!</li>
            </ul>
        </div>
    `;

    let html = '<h3 style="color:#9c27b0; font-size:14px; margin-top:0;">Turn 1 Lead Matrix (1v1)</h3>' + legendHtml;
    html += '<div style="overflow-x: auto;"><table style="width:100%; border-collapse: collapse; font-size:11px; color:#fff; text-align:center; background: #222; margin-top:10px;"><tr><th style="padding:8px; border: 1px solid #444; background:#111; color:#ffcc00; min-width:60px;">VS</th>';

    simOppTeam.forEach(opp => { 
        html += `<th style="padding:4px; border: 1px solid #444; background:#111; min-width: 60px;">
            <img src="${getSafeSprite(opp.id, opp.name)}" style="height:35px; image-rendering:pixelated;" onerror="imgFallback(this, '${opp.id}')">
        </th>`; 
    }); 
    html += '</tr>';

    myTeamToUse.forEach(myMon => {
        html += `<tr><th style="padding:4px; border: 1px solid #444; background:#111;">
            <img src="${getSafeSprite(myMon.id, myMon.name)}" style="height:35px; image-rendering:pixelated;" onerror="imgFallback(this, '${myMon.id}')">
        </th>`;
        simOppTeam.forEach(oppMon => {
            let score = get1v1Score(myMon, oppMon);
            let color = "#333"; let text = "Neutral";
            if (score >= 1) { color = "rgba(76, 175, 80, 0.4)"; text = "Favorable"; } 
            else if (score <= -1) { color = "rgba(244, 67, 54, 0.4)"; text = "Poor"; }
            else if (score > 0) { color = "rgba(129, 199, 132, 0.3)"; text = "Slight Adv"; } 
            else if (score < 0) { color = "rgba(229, 115, 115, 0.3)"; text = "Slight Dis"; }
            html += `<td style="background:${color}; border: 1px solid #444; padding:8px; font-weight:bold;">${text}</td>`;
        });
        html += '</tr>';
    });
    html += '</table></div>'; 
    matrixDiv.innerHTML = html;
    matrixDiv.style.display = 'block';
    document.getElementById('sim-analysis-results').style.display = 'none';
}

function generate2v2LeadMatrix() {
    let matrixDiv = document.getElementById('sim-matrix-results');
    let myTeamToUse = simYourSelection.length >= 2 ? simYourSelection : currentTeam;
    
    if (myTeamToUse.length < 2 || simOppTeam.length < 2) { alert("You need at least 2 Pokémon on your side and the opponent's side to do a 2v2 matrix!"); return; }

    let oppPairs = []; for(let i=0; i<simOppTeam.length; i++) { for(let j=i+1; j<simOppTeam.length; j++) { oppPairs.push([simOppTeam[i], simOppTeam[j]]); } }
    let myPairs = []; for(let i=0; i<myTeamToUse.length; i++) { for(let j=i+1; j<myTeamToUse.length; j++) { myPairs.push([myTeamToUse[i], myTeamToUse[j]]); } }

    let legendHtml = `
        <div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 10px; margin-bottom: 10px; text-align: left;">
            <h4 style="color: #2196F3; margin: 0 0 6px 0; font-size: 14px;">How to Read the 2v2 Duo Matrix</h4>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #ccc; line-height: 1.6;">
                <li><strong style="color: #4CAF50;">Favorable:</strong> Both of your Pokémon apply massive combined offensive pressure or speed control over their duo. Excellent lead pair!</li>
                <li><strong style="color: #81c784;">Advantage:</strong> Your duo naturally covers each other's weaknesses or pressures at least one of their leads heavily.</li>
                <li><strong style="color: #aaa;">Neutral:</strong> An even trade on the board. Game will be decided by Turn 1 positioning and Terastallization.</li>
                <li><strong style="color: #e57373;">Disadv:</strong> Their duo inherently counters your lead pair's STAB types or speed tiers.</li>
                <li><strong style="color: #ff4444;">Poor:</strong> Their duo completely shuts down both of your Pokémon. Highly recommended to keep this pair in the back!</li>
            </ul>
        </div>
    `;

    let html = '<h3 style="color:#2196F3; font-size:14px; margin-top:0;">Turn 1 Duo Lead Matrix (2v2)</h3>' + legendHtml;
    html += '<div style="overflow-x: auto;"><table style="width:100%; border-collapse: collapse; font-size:11px; color:#fff; text-align:center; background: #222; margin-top:10px;"><tr><th style="padding:8px; border: 1px solid #444; background:#111; color:#ffcc00; min-width:60px;">VS</th>';

    oppPairs.forEach(opp => { 
        html += `<th style="padding:4px; border: 1px solid #444; background:#111; min-width: 60px;">
            <img src="${getSafeSprite(opp[0].id, opp[0].name)}" style="height:30px; image-rendering:pixelated; margin-right:-5px;" onerror="imgFallback(this, '${opp[0].id}')">
            <img src="${getSafeSprite(opp[1].id, opp[1].name)}" style="height:30px; image-rendering:pixelated;" onerror="imgFallback(this, '${opp[1].id}')">
        </th>`; 
    }); 
    html += '</tr>';

    myPairs.forEach(myPair => {
        html += `<tr><th style="padding:4px; border: 1px solid #444; background:#111;">
            <img src="${getSafeSprite(myPair[0].id, myPair[0].name)}" style="height:30px; image-rendering:pixelated; margin-right:-5px;" onerror="imgFallback(this, '${myPair[0].id}')">
            <img src="${getSafeSprite(myPair[1].id, myPair[1].name)}" style="height:30px; image-rendering:pixelated;" onerror="imgFallback(this, '${myPair[1].id}')">
        </th>`;
        oppPairs.forEach(oppPair => {
            let score = get1v1Score(myPair[0], oppPair[0]) + get1v1Score(myPair[0], oppPair[1]) + get1v1Score(myPair[1], oppPair[0]) + get1v1Score(myPair[1], oppPair[1]);
            let color = "#333"; let text = "Neutral";
            if (score >= 2) { color = "rgba(76, 175, 80, 0.4)"; text = "Favorable"; } 
            else if (score <= -2) { color = "rgba(244, 67, 54, 0.4)"; text = "Poor"; }
            else if (score > 0) { color = "rgba(129, 199, 132, 0.3)"; text = "Adv"; } 
            else if (score < 0) { color = "rgba(229, 115, 115, 0.3)"; text = "Dis"; }
            html += `<td style="background:${color}; border: 1px solid #444; padding:8px; font-weight:bold;">${text}</td>`;
        });
        html += '</tr>';
    });
    html += '</table></div>'; 
    matrixDiv.innerHTML = html;
    matrixDiv.style.display = 'block';
    document.getElementById('sim-analysis-results').style.display = 'none';
}

function generateTeamSheet() {
    if (currentTeam.length === 0) { alert("Add some Pokémon to your team first!"); return; }
    let teamWord = document.getElementById('team-name-input') ? document.getElementById('team-name-input').value : "My VGC Team";
    if (!teamWord) teamWord = "My VGC Team";

    let c1 = "#555", c2 = "#555", c3 = "#555";
    if (currentTeam[0] && currentTeam[0].types) c1 = TYPE_COLORS[currentTeam[0].types[0]] || "#555";
    if (currentTeam[1] && currentTeam[1].types) c2 = TYPE_COLORS[currentTeam[1].types[0]] || "#555"; else c2 = c1;
    if (currentTeam[2] && currentTeam[2].types) c3 = TYPE_COLORS[currentTeam[2].types[0]] || "#555"; else c3 = c2;

    let sheetHTML = `<!DOCTYPE html><html><head><title>VGC Open Team Sheet</title>
    <style>
        body { background: #1a1a1a; color: #fff; font-family: monospace; padding: 20px; }
        .mon-container { background: #222; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #444; display: flex; align-items: center; gap: 15px; box-sizing: border-box;}
        .mon-sprite { width: 80px; text-align: center; flex-shrink: 0; }
        .mon-details { flex-grow: 1; font-size: 14px; line-height: 1.5; }
        @media (max-width: 600px) { .mon-container { width: 100% !important; } }
    </style></head><body>
    <h2 style="color:#ffcc00; text-align:center;">${teamWord} - Open Team Sheet</h2>
    <div style="display:flex; flex-wrap:wrap; justify-content:space-between;">
    `;

    currentTeam.forEach(mon => {
        let strictId = mon.id;
        
        let evArr = [];
        if (mon.evs) {
            if(mon.evs.hp) evArr.push(`${mon.evs.hp} HP`);
            if(mon.evs.atk) evArr.push(`${mon.evs.atk} Atk`);
            if(mon.evs.def) evArr.push(`${mon.evs.def} Def`);
            if(mon.evs.spa) evArr.push(`${mon.evs.spa} SpA`);
            if(mon.evs.spd) evArr.push(`${mon.evs.spd} SpD`);
            if(mon.evs.spe) evArr.push(`${mon.evs.spe} Spe`);
        }
        let evHtml = evArr.length > 0 ? `<div style="font-size: 11px; color: #ff9800; margin-top: 3px;">EVs: ${evArr.join(' / ')}</div>` : '';
        let natureHtml = mon.nature ? `<div style="font-size: 11px; color: #aaddff;">Nature: ${mon.nature}</div>` : '';

        sheetHTML += `
        <div class="mon-container" style="width: 48%;">
            <div class="mon-sprite"><img src="${getSafeSprite(mon.id, mon.name)}" style="width:100%; image-rendering:pixelated;" onerror="imgFallback(this, '${strictId}')"></div>
            <div class="mon-details">
                <strong style="color:#aaddff; font-size:16px;">${mon.name}</strong><br>
                <span style="color:#aaa;">Item:</span> ${mon.item || 'None'}<br>
                <span style="color:#aaa;">Ability:</span> ${mon.ability || 'Unknown'}<br>
                ${evHtml}
                ${natureHtml}
                <div style="margin-top:5px; color:#ddd;">
                    ${mon.moves && mon.moves.length > 0 ? mon.moves.map(m => `- ${m}`).join('<br>') : '- No moves selected'}
                </div>
            </div>
        </div>`;
    });

    sheetHTML += `</div></body></html>`;
    let win = window.open("", "_blank");
    win.document.write(sheetHTML);
    win.document.close();
}
