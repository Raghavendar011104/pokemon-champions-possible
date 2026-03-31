// --- GLOBAL SPRITE EXCEPTION DICTIONARY ---
window.EXCEPTION_SPRITES = {
    "taurospaldeacombat": "https://play.pokemonshowdown.com/sprites/dex/tauros-paldeacombat.png",
    "taurospaldeablaze": "https://play.pokemonshowdown.com/sprites/dex/tauros-paldeablaze.png",
    "taurospaldeaaqua": "https://play.pokemonshowdown.com/sprites/dex/tauros-paldeaaqua.png",
    "porygonz": "https://play.pokemonshowdown.com/sprites/gen5/porygonz.png",
    "basculinbluestriped": "https://play.pokemonshowdown.com/sprites/gen5/basculin-bluestriped.png",
    "darmanitangalarzen": "https://play.pokemonshowdown.com/sprites/gen5/darmanitan-galarzen.png",
    "oricoriopompom": "https://play.pokemonshowdown.com/sprites/gen5/oricorio-pompom.png",
    "toxtricitylowkey": "https://play.pokemonshowdown.com/sprites/gen5/toxtricity-lowkey.png",
    "dudunsparcethreesegment": "https://play.pokemonshowdown.com/sprites/dex/dudunsparce-threesegment.png",
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
    
    // 1. Check if it's a known troublemaker
    if (window.EXCEPTION_SPRITES && window.EXCEPTION_SPRITES[id]) {
        return window.EXCEPTION_SPRITES[id] + "?v=6";
    }
    
    // 2. Default rule: Keep hyphens! This preserves pixel art for Alolan/Galarian forms!
    let spriteName = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png?v=6`;
};

// --- GLOBAL IMAGE FALLBACK ENGINE ---
window.imgFallback = function(img, strictId) {
    if (!img.dataset.fallback) {
        img.dataset.fallback = 'dex';
        // Strip hyphens for the dex folder, as it uses strict IDs
        let dexId = strictId.replace(/[^a-z0-9]/g, '');
        if (dexId === "taurospaldeacombat") dexId = "taurospaldea";
        img.src = `https://play.pokemonshowdown.com/sprites/dex/${dexId}.png?v=6`;
    } else if (img.dataset.fallback === 'dex') {
        img.dataset.fallback = 'sub';
        img.src = `https://play.pokemonshowdown.com/sprites/gen5/substitute.png?v=6`;
    }
};

// --- CORE APP LOGIC ---
function calcLv50Stat(baseStat, isHP = false, ev = 0, iv = 31) {
    if (isHP && baseStat === 1) return 1; 
    let core = 2 * baseStat + iv + Math.floor(ev / 4);
    if (isHP) return Math.floor(core * 0.5) + 60;
    return Math.floor(core * 0.5) + 5;
}

function getGeneration(num) {
    if (num <= 151) return 1; if (num <= 251) return 2; if (num <= 386) return 3;
    if (num <= 493) return 4; if (num <= 649) return 5; if (num <= 721) return 6;
    if (num <= 809) return 7; if (num <= 905) return 8; return 9;
}

let showdownData = {}; let abilitiesData = {}; let movesData = {}; let learnsetsData = {}; let itemsData = {};
let allTeams = Array.from({length: 6}, (_, i) => ({ roster: [], notes: "", replays: "", teamName: `Team ${i+1}` }));
let currentTeamIndex = 0; let currentTeam = []; let pendingMon = null; let draggedSlotIndex = null;
let simYourSelection = []; let simOppTeam = [];

const VGC_ITEMS = { "None": "No item held.", "Focus Sash": "Survive one OHKO attack.", "Assault Vest": "Boosts Sp. Def by 50%, disables status.", "Choice Scarf": "Boosts Speed by 50%, locks move.", "Choice Band": "Boosts Attack by 50%, locks move.", "Choice Specs": "Boosts Sp. Atk by 50%, locks move.", "Clear Amulet": "Protects stats from lowering.", "Sitrus Berry": "Restores 25% HP.", "Leftovers": "Restores HP every turn.", "Life Orb": "Boosts damage by 30%, drains 10% HP.", "Rocky Helmet": "Damages physical attackers.", "Covert Cloak": "Protects from secondary effects.", "Mental Herb": "Cures Taunt.", "Eviolite": "Boosts Def/Sp. Def by 50% for NFE.", "Mystic Water": "Boosts Water attacks.", "Black Glasses": "Boosts Dark attacks." };

function isValidRosterMon(mon) {
    if (!mon || mon.num <= 0) return false; 
    if (mon.id === 'floetteeternal') return true;
    if (mon.isNonstandard && mon.isNonstandard !== "Past") return false; 
    let baseMon = mon;
    if (mon.baseSpecies && mon.baseSpecies !== mon.name) {
        let baseId = mon.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (showdownData[baseId]) baseMon = showdownData[baseId];
    }
    let allTags = [...(mon.tags || []), ...(baseMon.tags || [])];
    if (allTags.includes("Restricted Legendary") || allTags.includes("Sub-Legendary") || 
        allTags.includes("Mythical") || allTags.includes("Paradox") || allTags.includes("Ultra Beast")) {
        return false;
    }
    let n = mon.name;
    if (n.includes('Pikachu-') && mon.id !== 'pikachu') return false;
    if (n.includes('Pichu-')) return false;
    if (n.includes('Eevee-Starter')) return false;
    if (n.includes('Alcremie-')) return false;
    if (n.includes('Greninja-') && !n.includes('-Mega')) return false;
    if (n.includes('Ursaluna-Bloodmoon')) return false;
    if (mon.baseSpecies === 'Furfrou' && n !== 'Furfrou') return false;
    if (mon.baseSpecies === 'Minior' && mon.id !== 'minior') return false;
    if (mon.baseSpecies === 'Vivillon' && mon.id !== 'vivillon') return false;
    if (mon.baseSpecies === 'Flabebe' && mon.id !== 'flabebe') return false;
    if (mon.baseSpecies === 'Floette' && mon.id !== 'floette' && mon.id !== 'floetteeternal') return false;
    if (mon.baseSpecies === 'Florges' && mon.id !== 'florges') return false;
    if (mon.baseSpecies === 'Gastrodon' && mon.id !== 'gastrodon') return false;
    if (n.includes("-Mega") || n.includes("-Primal") || n.includes("-Gmax") || n.includes("-Totem")) return false;
    let hasEvos = mon.evos && mon.evos.length > 0;
    if (hasEvos && mon.id !== 'pikachu') return false;
    return true;
}

function renderRoster() {
    let gens = { 1: { name: "Kanto", mons: [] }, 2: { name: "Johto", mons: [] }, 3: { name: "Hoenn", mons: [] }, 4: { name: "Sinnoh", mons: [] }, 5: { name: "Unova", mons: [] }, 6: { name: "Kalos", mons: [] }, 7: { name: "Alola", mons: [] }, 8: { name: "Galar & Hisui", mons: [] }, 9: { name: "Paldea", mons: [] } };

    Object.values(showdownData).forEach(mon => {
        if (isValidRosterMon(mon)) { let genNum = getGeneration(mon.num); if (gens[genNum]) gens[genNum].mons.push(mon); }
    });

    let html = ``;
    Object.keys(gens).forEach(genNum => {
        let group = gens[genNum];
        if (group.mons.length === 0) return;
        html += `<h3 style="color: #aaddff; font-family: 'Press Start 2P', monospace; font-size: 13px; margin-top: 20px; margin-bottom: 15px; line-height: 1.4;">Generation ${genNum} - ${group.name}</h3><div class="grid-container">`;
        group.mons.sort((a, b) => { if (a.num !== b.num) return a.num - b.num; return a.name.localeCompare(b.name); });

        group.mons.forEach(mon => {
            let url = getSafeSprite(mon.id, mon.name);
            html += `<div class="poke-box" style="justify-content: center; min-width: 100px;"><div class="poke-sprite-container" onclick="showData('${mon.id}', '${mon.name.replace(/'/g, "\\'")}', '${url}')"><img src="${url}" alt="${mon.name}" class="poke-sprite" loading="lazy" onerror="imgFallback(this, '${mon.id}')"><span>${mon.name}</span></div></div>`;
        });
        html += `</div>`;
    });
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

    pendingMon = { id: jsonId, name: monData.name || displayName, sprite: spriteUrl, types: monData.types, moves: [], item: "", ability: "", evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: "" };

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

    pendingMon = { id: megaId, name: megaData.name, sprite: megaSprite, types: megaData.types, moves: [], item: megaItemName, ability: megaAbilityName, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: "" };
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

    let html = `
        <h2 style="color:#ffcc00; font-size:16px;">Edit ${mon.name}</h2>
        <img src="${mon.sprite}" style="height:60px; image-rendering:pixelated; margin-bottom:10px;" onerror="imgFallback(this, '${mon.id}')">
        <p style="font-size:10px; margin-bottom:5px; text-align:left; color:#ff9900;"><strong>Held Item:</strong></p>
        <select id="edit-item" style="width:100%; margin-bottom:0; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;" onchange="updateItemDescription(this.value)" ${itemDisableHTML}>
            ${isMega ? `<option value="${mon.item}">${mon.item}</option>` : itemOptions}
        </select>
        <button class="btn-action" style="margin-top:5px; width:100%; padding:4px; font-size:10px; background:#4CAF50; color:#fff;" onclick="if(typeof loadStarterKit === 'function'){loadStarterKit(${index});}else{alert('Coach features not loaded.');}">🎒 Load Starter Kit</button>
        <div id="item-desc" style="background:#111; padding:8px; font-size:10px; border-radius:4px; text-align:left; min-height:30px; margin-bottom:15px; margin-top:5px; color:#aaa; line-height: 1.4;">Select an item to see its competitive use.</div>
        <p style="font-size:10px; margin-bottom:5px; text-align:left; color:#ff9900;"><strong>Moveset:</strong></p>
        <select id="edit-move1" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move2" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move3" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <select id="edit-move4" style="width:100%; margin-bottom:8px; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;">${moveOptions}</select>
        <button class="btn-action btn-add" style="margin-top:15px; font-size:12px;" onclick="saveMoves(${index})">Save Team Member</button>
    `;
    
    document.getElementById('edit-modal-info').innerHTML = html;
    if (mon.item) { document.getElementById('edit-item').value = mon.item; updateItemDescription(mon.item); } else { updateItemDescription('None'); }
    if (mon.moves) {
        if (mon.moves[0]) document.getElementById('edit-move1').value = mon.moves[0];
        if (mon.moves[1]) document.getElementById('edit-move2').value = mon.moves[1];
        if (mon.moves[2]) document.getElementById('edit-move3').value = mon.moves[2];
        if (mon.moves[3]) document.getElementById('edit-move4').value = mon.moves[3];
    }
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveMoves(index) {
    if (!currentTeam[index]) return;
    currentTeam[index].moves = [document.getElementById('edit-move1').value, document.getElementById('edit-move2').value, document.getElementById('edit-move3').value, document.getElementById('edit-move4').value].filter(m => m !== "");
    currentTeam[index].item = document.getElementById('edit-item').value || "";
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

function switchTeam(index) {
    currentTeamIndex = index; currentTeam = allTeams[currentTeamIndex].roster || [];
    document.getElementById('team-notes').value = allTeams[currentTeamIndex].notes || "";
    document.getElementById('team-replays').value = allTeams[currentTeamIndex].replays || "";
    document.getElementById('team-name-input').value = allTeams[currentTeamIndex].teamName || `Team ${index + 1}`;
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
    try { analyzeArchetype(); } catch(e){ console.error(e); }
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
      
      slot.innerHTML = `
        <img src="${getSafeSprite(currentTeam[i].id, currentTeam[i].name)}" alt="${currentTeam[i].name}" title="Click to Edit\nAbility: ${currentTeam[i].ability}\nItem: ${currentTeam[i].item || 'None'}" onerror="imgFallback(this, '${currentTeam[i].id}')">
        <span style="font-size: 10px; font-family: 'Inter', sans-serif; font-weight: bold; color: #ffcc00; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${currentTeam[i].name}</span>
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
        return `<div class="speed-tier-row"><span class="speed-tier-value">${s.speed || 0}</span><img src="${getSafeSprite(s.id, s.name)}" class="speed-tier-sprite" onerror="imgFallback(this, '${s.id}')"><span class="speed-tier-name">${s.name} ${s.item ? `<span class="speed-tier-item">(@${s.item})</span>` : ''}</span></div>`;
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
        return `<img src="${getSafeSprite(m.id, m.name)}" title="${m.name}" onerror="imgFallback(this, '${m.id}')">`;
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

function analyzeArchetype() {
    let container = document.getElementById('archetype-summary');
    if (!container) return;
    if (currentTeam.length === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px; margin:0;">Add Pokémon to analyze archetype.</p>'; return; }
    
    let totalMoves = 0; currentTeam.forEach(mon => { if (mon && mon.moves && Array.isArray(mon.moves)) totalMoves += mon.moves.length; });
    if (totalMoves === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px; margin:0;">Awaiting move selection...</p>'; return; }

    let stats = { hasTR: false, hasTailwind: false, hasDrizzle: false, hasRainAbuser: false, hasDrought: false, hasSunAbuser: false, hasSand: false, hasSnow: false, hasPsychicTerrain: false, hasExpandingForce: false, protectCount: 0, recoveryCount: 0, unawareCount: 0, perishSongCount: 0, pivotMoveCount: 0, hazardSetters: 0, suicideLeadPotential: false, dragonCount: 0, shadowTag: false, avgSpeed: 0, highSpeedCount: 0 };
    let typesPresent = new Set();
    
    let teamNames = currentTeam.map(m => (m && m.name) ? m.name.toLowerCase() : "");
    let hasMon = (nameFragment) => teamNames.some(n => n.includes(nameFragment));

    currentTeam.forEach(mon => {
        if (!mon || !mon.id) return;
        let baseSpe = (showdownData[mon.id] && showdownData[mon.id].baseStats) ? showdownData[mon.id].baseStats.spe : 50;
        stats.avgSpeed += baseSpe; if (baseSpe >= 110) stats.highSpeedCount++;
        
        if (mon.types && Array.isArray(mon.types)) { mon.types.forEach(t => typesPresent.add(t)); if (mon.types.includes('Dragon')) stats.dragonCount++; }
        
        if (mon.ability === 'Unaware') stats.unawareCount++;
        if (mon.ability === 'Drizzle') stats.hasDrizzle = true; if (['Swift Swim'].includes(mon.ability)) stats.hasRainAbuser = true;
        if (mon.ability === 'Drought') stats.hasDrought = true; if (['Chlorophyll', 'Protosynthesis'].includes(mon.ability)) stats.hasSunAbuser = true;
        if (mon.ability === 'Sand Stream') stats.hasSand = true; if (['Snow Warning', 'Chilly Reception'].includes(mon.ability)) stats.hasSnow = true;
        if (mon.ability === 'Psychic Surge') stats.hasPsychicTerrain = true; if (['Shadow Tag', 'Arena Trap'].includes(mon.ability)) stats.shadowTag = true;

        if (mon.moves && Array.isArray(mon.moves)) {
            let cleanMoves = mon.moves.map(m => m.trim());
            if (cleanMoves.includes('Trick Room')) stats.hasTR = true; if (cleanMoves.includes('Tailwind')) stats.hasTailwind = true;
            if (cleanMoves.includes('Expanding Force')) stats.hasExpandingForce = true;
            if (['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot'].some(m => cleanMoves.includes(m))) stats.pivotMoveCount++;
            if (['Stealth Rock', 'Spikes', 'Toxic Spikes'].some(m => cleanMoves.includes(m))) stats.hazardSetters++;
            if (['Recover', 'Roost', 'Soft-Boiled', 'Slack Off', 'Morning Sun', 'Synthesis'].some(m => cleanMoves.includes(m))) stats.recoveryCount++;
            if (['Protect', 'Detect', 'Spiky Shield', 'Baneful Bunker'].some(m => cleanMoves.includes(m))) stats.protectCount++;
            if (cleanMoves.includes('Perish Song')) stats.perishSongCount++;
            if (mon.item === 'Focus Sash' && baseSpe > 100 && (cleanMoves.includes('Stealth Rock') || cleanMoves.includes('Taunt'))) stats.suicideLeadPotential = true;
        }
    });
    
    stats.avgSpeed /= currentTeam.length; let detectedModes = [];

    if (hasMon('dondozo') && hasMon('tatsugiri')) detectedModes.push({name: "DozoGiri", desc: "Uses Commander to grant Dondozo double omni-boosts to sweep."});
    if (hasMon('magnezone') && stats.dragonCount >= 2) detectedModes.push({name: "DragMag", desc: "Magnezone traps Steel-types to clear the path for Dragon sweepers."});
    if (stats.perishSongCount >= 1 && (stats.shadowTag || stats.protectCount >= 4)) detectedModes.push({name: "Perish Trap", desc: "Traps opponents and uses Perish Song to force KOs within 3 turns."});
    if (stats.hasDrizzle && stats.hasRainAbuser) detectedModes.push({name: "Rain Offense", desc: "Uses Drizzle to power up Water moves and double the speed of Swift Swim partners."});
    if (stats.hasDrought && stats.hasSunAbuser) detectedModes.push({name: "Sun Offense", desc: "Capitalizes on Protosynthesis or Chlorophyll under the sun for immediate pressure."});
    if (stats.hasSand) detectedModes.push({name: "Sand Mode", desc: "Uses Sandstorm for residual damage and to grant Special Defense boosts to Rock types."});
    if (stats.hasSnow) detectedModes.push({name: "Snow Mode", desc: "Sets Snow to boost Ice-type Defense and enable Aurora Veil support."});
    if (stats.hasPsychicTerrain && stats.hasExpandingForce) detectedModes.push({name: "Psyspam", desc: "Abuses Psychic Terrain to block priority and fire off high-powered Expanding Force attacks."});
    if (stats.hasTailwind) detectedModes.push({name: "Tailwind Control", desc: "Utilizes Tailwind for an immediate, team-wide speed advantage."});
    if (stats.hasTR && stats.avgSpeed < 75) detectedModes.push({name: "Hard Trick Room", desc: "Committed to speed inversion. Relies on slow juggernauts to sweep."});

    if (detectedModes.length === 0) {
        if (stats.recoveryCount >= 3) detectedModes.push({name: "Stall / Semi-Stall", desc: "Wins through attrition, passive damage, and extreme defensive redundancy."});
        else if (stats.suicideLeadPotential || (stats.highSpeedCount >= 4 && stats.protectCount < 2)) detectedModes.push({name: "Hyper Offense", desc: "Total aggression. Uses a lead to set hazards/screens then chains sweepers."});
        else detectedModes.push({name: "Bulky Offense / Balance", desc: "Uses pivoting momentum and bulky defenders to safely bring in wallbreakers."});
    }

    let archetype = detectedModes.map(m => m.name).join(" + ");
    let desc = detectedModes.map(m => `• ${m.desc}`).join("<br>");

    container.innerHTML = `<span style="color:#ffcc00; font-size:14px; font-weight:bold;">${archetype}</span><br><br><span style="color:#ccc; font-size:12px;">${desc}</span>`;
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
        let evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }; let nature = "";

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
                    let [val, stat] = p.trim().split(' ');
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
