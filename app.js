// --- APP LOGIC ---

function calcLv50Stat(baseStat, isHP = false) {
    if (isHP && baseStat === 1) return 1; 
    if (isHP) return Math.floor(0.5 * (2 * baseStat + 31)) + 60;
    return Math.floor(0.5 * (2 * baseStat + 31)) + 5;
}

let showdownData = {}; let abilitiesData = {}; let movesData = {}; let learnsetsData = {}; let itemsData = {};
let allTeams = Array.from({length: 6}, (_, i) => ({ roster: [], notes: "", replays: "", teamName: `Team ${i+1}` }));
let currentTeamIndex = 0; let currentTeam = []; let pendingMon = null; let draggedSlotIndex = null;
let simYourSelection = []; let simOppTeam = [];

function renderRoster() {
    let html = '';
    ROSTER_SECTIONS.forEach(sec => {
        html += `<${sec.heading}>${sec.text}</${sec.heading}>`;
        sec.subsections.forEach(sub => {
            if (sub.heading) html += `<${sub.heading}>${sub.text}</${sub.heading}>`;
            html += `<div class="grid-container">`;
            sub.lines.forEach(line => {
                html += `<div class="poke-box">` + line.split(' / ').map(stage => {
                    return `<div class="stage-container">` + stage.split('|').map(name => {
                        let clean = name.trim(); let id = clean.toLowerCase().replace(/[^a-z0-9]/g, ''); let spr = id;
                        if (clean.includes("Alolan ")) { id = clean.replace("Alolan ", "").toLowerCase() + "alola"; spr = id.replace('alola', '-alola'); }
                        else if (clean.includes("Galarian ")) { id = clean.replace("Galarian ", "").toLowerCase() + "galar"; spr = id.replace('galar', '-galar'); }
                        else if (clean.includes("Hisuian ")) { id = clean.replace("Hisuian ", "").toLowerCase() + "hisui"; spr = id.replace('hisui', '-hisui'); }
                        else if (clean.includes("Paldean ")) { id = clean.replace("Paldean ", "").toLowerCase() + "paldea"; spr = id.replace('paldea', '-paldea'); }
                        
                        if (clean === 'Flabébé') { spr = 'flabebe'; id = 'flabebe'; }
                        if (clean === 'Porygon-Z') spr = 'porygon-z';
                        if (clean === 'Mime Jr.') { spr = 'mimejr'; id = 'mimejr'; }
                        if (clean === 'Mr. Mime') { spr = 'mrmime'; id = 'mrmime'; }
                        if (clean === 'Jangmo-o') { spr = 'jangmoo'; id = 'jangmoo'; }
                        if (clean === 'Hakamo-o') { spr = 'hakamoo'; id = 'hakamoo'; }
                        if (clean === 'Kommo-o') { spr = 'kommoo'; id = 'kommoo'; }
                        
                        let url = `https://play.pokemonshowdown.com/sprites/gen5/${spr}.png`;
                        return `<div class="poke-sprite-container" onclick="showData('${id}', '${clean.replace(/'/g, "\\'")}', '${url}')">
                            <img src="${url}" alt="${clean}" class="poke-sprite" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'">
                            <span>${clean}</span>
                        </div>`;
                    }).join('<div class="branch-divider">/</div>') + `</div>`;
                }).join('<span class="arrow">▶</span>') + `</div>`;
            });
            html += `</div>`;
        });
    });
    document.getElementById('roster-wrapper').innerHTML = html;
}

window.addEventListener('load', () => {
  if (window.exports && window.exports.BattlePokedex && window.exports.BattleAbilities && window.exports.BattleMovedex && window.exports.BattleLearnsets && window.exports.BattleItems) {
      showdownData = window.exports.BattlePokedex; abilitiesData = window.exports.BattleAbilities; movesData = window.exports.BattleMovedex;
      learnsetsData = window.exports.BattleLearnsets; itemsData = window.exports.BattleItems;
      
      let itemOptions = "";
      Object.values(itemsData).forEach(item => { if (item.name && !item.megaStone && !item.zMove) itemOptions += `<option value="${item.name}">`; });
      document.getElementById('item-list').innerHTML = itemOptions;

      Object.keys(CUSTOM_SPRITES).forEach(megaId => {
          if (megaId.includes('mega') && !showdownData[megaId]) {
              let baseId = megaId.replace(/mega[a-z]?$/, '');
              if(showdownData[baseId]) {
                  let clone = JSON.parse(JSON.stringify(showdownData[baseId]));
                  let letter = megaId.match(/mega([xyz])$/) ? " " + megaId.slice(-1).toUpperCase() : "";
                  clone.name = clone.name + "-Mega" + letter;
                  clone.baseStats.hp += 0; clone.baseStats.atk += 20; clone.baseStats.def += 20; clone.baseStats.spa += 20; clone.baseStats.spd += 20; clone.baseStats.spe += 20;
                  showdownData[megaId] = clone;
              }
          }
      });

      document.getElementById('loading-overlay').style.display = 'none';
      renderRoster();
      loadTeam();
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
    let stats = monData.baseStats;
    let bst = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
    
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
    if (MEGA_MAP[jsonId]) {
        let options = MEGA_MAP[jsonId].map(m => `<option value="${m.id}">${m.stone}</option>`).join('');
        megaDropdown = `<div style="margin: 10px 0; color: #aaddff; text-align: left;"><strong>Form / Mega:</strong> <select id="mega-select" style="background:#222; color:#fff; border:1px solid #ffcc00; padding:4px; border-radius:3px; font-family: 'Press Start 2P', monospace; font-size: 8px; width: 100%; margin-top: 5px;" onchange="previewMega('${jsonId}', '${displayName.replace(/'/g, "\\'")}', '${spriteUrl}', this.value)"><option value="none">Base Form</option>${options}</select></div>`;
    }

    pendingMon = { id: jsonId, name: monData.name || displayName, sprite: spriteUrl, types: monData.types, moves: [], item: "", ability: "" };

    content.innerHTML = `
      <h2 style="margin-top:0; color:#ffcc00;">${displayName}</h2>${megaDropdown}
      <div id="modal-dynamic-area">
          <img src="${spriteUrl}" style="height:80px; image-rendering:pixelated;">
          <p style="margin: 2px 0;"><strong>Types:</strong> ${monData.types.join(' / ')}</p>${abilitiesHtml}
          <div id="pokedex-entry-container" class="pokedex-entry-box"><div style="text-align: center; color: #888;">Loading Pokédex entry...</div></div>
          <div class="stat-card">
            <div class="stat-card-header"><strong>Lv. 50 Stats (0 EVs)</strong></div>
            <div class="stat-row"><span>HP:</span> <span>${hp50}</span></div><div class="stat-row"><span>Attack:</span> <span>${atk50}</span></div>
            <div class="stat-row"><span>Defense:</span> <span>${def50}</span></div><div class="stat-row"><span>Sp. Atk:</span> <span>${spa50}</span></div>
            <div class="stat-row"><span>Sp. Def:</span> <span>${spd50}</span></div><div class="stat-row"><span>Speed:</span> <span>${spe50}</span></div>
            <hr style="border-color:#444; margin: 5px 0;">
            <div class="stat-row" style="color:#aaddff;"><span>Base Stat Total:</span> <span>${bst}</span></div>
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

    let megaAbilityName = megaData.abilities[0] || megaData.abilities['0'];
    let showdownSpriteName = megaId.replace('mega', '-mega');
    let megaSprite = CUSTOM_SPRITES[megaId] ? CUSTOM_SPRITES[megaId] : `https://play.pokemonshowdown.com/sprites/gen5/${showdownSpriteName}.png`;

    dynamicArea.innerHTML = `
      <img src="${megaSprite}" style="height:80px; image-rendering:pixelated;" onerror="this.src='${baseSprite}'">
      <p style="margin: 2px 0; color:#ffcc00;"><strong>Types:</strong> ${megaData.types.join(' / ')}</p>
      <label style="display:block; margin:6px 0; font-size:9px; cursor:pointer; text-align: left;"><input type="radio" name="ability-select" value="${megaAbilityName}" checked> ${megaAbilityName}</label>
      <div id="pokedex-entry-container" class="pokedex-entry-box"><div style="text-align: center; color: #888;">Loading Pokédex entry...</div></div>
      <div class="stat-card">
        <div class="stat-card-header"><strong>Lv. 50 Stats (0 EVs)</strong></div>
        <div class="stat-row"><span>HP:</span> <span>${hp50}</span></div><div class="stat-row"><span>Attack:</span> <span>${atk50}</span></div>
        <div class="stat-row"><span>Defense:</span> <span>${def50}</span></div><div class="stat-row"><span>Sp. Atk:</span> <span>${spa50}</span></div>
        <div class="stat-row"><span>Sp. Def:</span> <span>${spd50}</span></div><div class="stat-row"><span>Speed:</span> <span>${spe50}</span></div>
        <hr style="border-color:#444; margin: 5px 0;"><div class="stat-row" style="color:#aaddff;"><span>Base Stat Total:</span> <span>${bst}</span></div>
      </div>
    `;

    let megaItemName = "";
    if (MEGA_MAP[baseId]) {
        let match = MEGA_MAP[baseId].find(m => m.id === megaId);
        if (match && match.stone && !match.stone.includes("Form") && !match.stone.includes("Rotom")) megaItemName = match.stone;
    }

    pendingMon = { id: megaId, name: megaData.name, sprite: megaSprite, types: megaData.types, moves: [], item: megaItemName, ability: megaAbilityName };
    addBtn.innerText = "Add Form to Team";
    fetchPokedexEntries(megaData.num);
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

function openEditModal(index) {
    let mon = currentTeam[index]; 
    let legalMoves = getLegalMoves(mon.id);
    let moveOptions = `<option value="">(Select Move)</option>` + legalMoves.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    
    // Check if VGC_ITEMS is defined (it's in new_features.js now, so we need a fallback just in case)
    let itemOptions = "";
    if (typeof VGC_ITEMS !== 'undefined') {
        itemOptions = Object.keys(VGC_ITEMS).map(item => `<option value="${item === 'None' ? '' : item}">${item}</option>`).join('');
    } else {
        itemOptions = `<option value="">None</option><option value="Focus Sash">Focus Sash</option>`; 
    }

    let html = `
        <h2 style="color:#ffcc00; font-size:16px;">Edit ${mon.name}</h2>
        <img src="${mon.sprite}" style="height:60px; image-rendering:pixelated; margin-bottom:10px;">
        
        <p style="font-size:10px; margin-bottom:5px; text-align:left; color:#ff9900;"><strong>Held Item:</strong></p>
        <select id="edit-item" style="width:100%; margin-bottom:0; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px; font-family: inherit; font-size:12px;" onchange="document.getElementById('item-desc').innerText = (typeof VGC_ITEMS !== 'undefined' ? VGC_ITEMS[this.value || 'None'] : 'Item selected.')">
            ${itemOptions}
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
    
    if (mon.item) {
        document.getElementById('edit-item').value = mon.item;
        if (typeof VGC_ITEMS !== 'undefined' && VGC_ITEMS[mon.item]) {
            document.getElementById('item-desc').innerText = VGC_ITEMS[mon.item];
        } else {
            document.getElementById('item-desc').innerText = "Imported Item.";
        }
    }
    
    if (mon.moves) {
        if (mon.moves[0]) document.getElementById('edit-move1').value = mon.moves[0];
        if (mon.moves[1]) document.getElementById('edit-move2').value = mon.moves[1];
        if (mon.moves[2]) document.getElementById('edit-move3').value = mon.moves[2];
        if (mon.moves[3]) document.getElementById('edit-move4').value = mon.moves[3];
    }
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveMoves(index) {
    currentTeam[index].moves = [document.getElementById('edit-move1').value, document.getElementById('edit-move2').value, document.getElementById('edit-move3').value, document.getElementById('edit-move4').value].filter(m => m !== "");
    currentTeam[index].item = document.getElementById('edit-item').value;
    saveTeam(); closeEditModal(); renderAllUI();
}

function updateTeamName() {
    let newName = document.getElementById('team-name-input').value.trim();
    if (newName === "") newName = `Team ${currentTeamIndex + 1}`;
    allTeams[currentTeamIndex].teamName = newName;
    document.getElementById(`tab-team-${currentTeamIndex}`).innerText = newName;
    saveTeam();
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
  } else {
    const oldSaved = localStorage.getItem('myVGCTeams_v3');
    if (oldSaved) {
        let parsed = JSON.parse(oldSaved);
        for(let i=0; i<6; i++) {
            allTeams[i] = parsed[i] ? { ...parsed[i], teamName: `Team ${i+1}` } : { roster: [], notes: "", replays: "", teamName: `Team ${i+1}` };
            document.getElementById(`tab-team-${i}`).innerText = allTeams[i].teamName;
        }
    }
  }
  switchTeam(0);
}

function switchTeam(index) {
    currentTeamIndex = index;
    currentTeam = allTeams[currentTeamIndex].roster || [];
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
  pendingMon.ability = selectedAbility;
  currentTeam.push(pendingMon);
  saveTeam(); closeModal(); renderAllUI();
}

function removeFromTeam(index) { currentTeam.splice(index, 1); saveTeam(); renderAllUI(); }

function renderAllUI() { 
    renderTeamUI(); 
    renderTypeChart(); 
    analyzeArchetype(); 
    renderSpeedTiers(); 
    if (typeof runNewFeaturesHook === 'function') runNewFeaturesHook();
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
        <img src="${currentTeam[i].sprite}" alt="${currentTeam[i].name}" title="Click to Edit\nAbility: ${currentTeam[i].ability}\nItem: ${currentTeam[i].item || 'None'}">
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
    let container = document.getElementById('speed-tier-container');
    if (currentTeam.length === 0) { container.innerHTML = '<p style="color:#888; font-size:12px; margin:0;">Add Pokémon to see speed tiers.</p>'; return; }
    
    let isTailwind = document.getElementById('speed-tailwind').checked;
    let isTrickRoom = document.getElementById('speed-trickroom').checked;
    let isDrop = document.getElementById('speed-drop').checked;

    let speeds = currentTeam.map(mon => {
        let baseSpe = showdownData[mon.id] ? showdownData[mon.id].baseStats.spe : 50;
        let spe50 = calcLv50Stat(baseSpe);
        if (mon.item === 'Choice Scarf') spe50 = Math.floor(spe50 * 1.5);
        if (mon.item === 'Iron Ball' || mon.item === 'Macho Brace') spe50 = Math.floor(spe50 * 0.5);
        if (isDrop) spe50 = Math.floor(spe50 * 0.66);
        if (isTailwind) spe50 = spe50 * 2;
        return { name: mon.name, sprite: mon.sprite, speed: spe50, item: mon.item };
    });
    
    if (isTrickRoom) speeds.sort((a, b) => a.speed - b.speed);
    else speeds.sort((a, b) => b.speed - a.speed);

    container.innerHTML = speeds.map(s => `
        <div class="speed-tier-row">
            <span class="speed-tier-value">${s.speed}</span>
            <img src="${s.sprite}" class="speed-tier-sprite">
            <span class="speed-tier-name">${s.name} ${s.item ? `<span class="speed-tier-item">(@${s.item})</span>` : ''}</span>
        </div>
    `).join('');
}

function suggestTeammate() {
    if(currentTeam.length >= 6) { alert("Your team is full!"); return; }
    if(currentTeam.length === 0) { alert("Add at least one Pokémon first to find synergies."); return; }

    let typeBalance = {};
    Object.keys(TYPE_DATA).forEach(targetType => {
        let weakCount = 0; let resistCount = 0;
        currentTeam.forEach(mon => {
            let defMult = getDefensiveMultiplier(mon.types, targetType);
            if(defMult > 1) weakCount++;
            if(defMult < 1) resistCount++;
            if(mon.ability && ABILITY_DEFENSES[mon.ability]) {
                 let abilDef = ABILITY_DEFENSES[mon.ability];
                 if (abilDef.immuneTo && abilDef.immuneTo.includes(targetType)) resistCount += 2;
            }
        });
        typeBalance[targetType] = { weak: weakCount, resist: resistCount };
    });
    
    let candidates = [];
    Object.keys(POKEMON_AESTHETICS).forEach(id => {
        if(currentTeam.some(m => m.id === id)) return;
        let mon = showdownData[id]; if(!mon) return;
        if(mon.evos && mon.evos.length > 0) return;
        if(mon.requiredItem || id.includes('mega')) return;
        
        let score = 0; let goodAgainst = [];
        Object.keys(typeBalance).forEach(type => {
            let balance = typeBalance[type];
            if (balance.weak > balance.resist) {
                let defMult = getDefensiveMultiplier(mon.types, type);
                if(defMult < 1) { score += (balance.weak - balance.resist) * 2; goodAgainst.push(type); }
                if(defMult > 1) score -= 2; 
            }
        });
        if(score > 0 && goodAgainst.length > 0) candidates.push({ id, name: mon.name, score, goodAgainst });
    });
    
    candidates.sort((a,b) => b.score - a.score);
    let top = candidates.slice(0, 4);

    let html = "";
    if(top.length === 0) { html = `<p style="font-size:10px;">Your team doesn't have any major unresisted weaknesses!</p>`; } 
    else {
        top.forEach(cand => {
            let spriteName = cand.id.replace('mega', '-mega');
            let spriteUrl = CUSTOM_SPRITES[cand.id] ? CUSTOM_SPRITES[cand.id] : `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
            html += `
                <div class="suggest-card">
                    <img src="${spriteUrl}" class="suggest-sprite">
                    <div style="flex:1;">
                        <h4 class="suggest-name">${cand.name}</h4>
                        <p class="suggest-desc">Plugs weaknesses to: <span style="color:#ff4444;">${cand.goodAgainst.join(', ')}</span></p>
                    </div>
                    <button class="btn-action" style="padding:5px 10px; font-size:8px;" onclick="addSuggestion('${cand.id}', '${cand.name.replace(/'/g, "\\'")}', '${spriteUrl}')">Select</button>
                </div>
            `;
        });
    }
    document.getElementById('suggest-results').innerHTML = html;
    document.getElementById('suggest-modal').style.display = 'flex';
}

function addSuggestion(id, name, sprite) { closeSuggestModal(); showData(id, name, sprite); }

function getBaseSpecies(id) {
    let mon = showdownData[id];
    if (mon && mon.baseSpecies) return mon.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
    let stripped = id.replace(/mega[a-z]?$/, '').replace(/(alola|galar|hisui|paldea)$/, '').replace(/(wash|heat|mow|frost|fan|droopy|stretchy|curly|blade|hero)$/, '');
    return stripped;
}

function addMonToTeamQuietly(id) {
    if (currentTeam.length >= 6) return false;
    let incomingSpecies = getBaseSpecies(id);
    if (currentTeam.some(m => getBaseSpecies(m.id) === incomingSpecies)) return false; 
    if (!POKEMON_AESTHETICS[id] && !id.includes('mega')) return false; 
    let monData = showdownData[id]; if(!monData) return false;
    
     let spriteName = monData.name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace('-mega-x', '-megax').replace('-mega-y', '-megay');
     let spriteUrl = CUSTOM_SPRITES[id] ? CUSTOM_SPRITES[id] : `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
    
    let ability = monData.abilities[0] || monData.abilities['0'];
    if (id === 'pelipper') ability = 'Drizzle'; if (id === 'torkoal') ability = 'Drought';
    if (id === 'indeedeef' || id === 'indeedee') ability = 'Psychic Surge'; if (id === 'tyranitar') ability = 'Sand Stream';
    if (id === 'ninetalesalola') ability = 'Snow Warning'; if (id === 'rillaboom') ability = 'Grassy Surge';    
    if (id === 'charizardmegay') ability = 'Drought'; if (id === 'tyranitarmega') ability = 'Sand Stream'; if (id === 'abomasnowmega') ability = 'Snow Warning';

    let megaItemName = monData.item || "";
    if (id.includes('mega') && !megaItemName) {
         let baseId = id.replace(/mega[a-z]?$/, '');
         if (baseId.endsWith('x') || baseId.endsWith('y') || baseId.endsWith('z')) baseId = baseId.slice(0, -1);
         if (MEGA_MAP[baseId]) { let match = MEGA_MAP[baseId].find(m => m.id === id); if (match && match.stone && !match.stone.includes("Form") && !match.stone.includes("Rotom")) megaItemName = match.stone; }
    }
    
    currentTeam.push({ id: id, name: monData.name, sprite: spriteUrl, types: monData.types, moves: [], item: megaItemName, ability: ability, teraType: "" });
    return true;
}

function getBestDefensiveFitForAutoBuild(usedIds, currentTeamBaseSpecies) {
    let typeBalance = {};
    Object.keys(TYPE_DATA).forEach(targetType => {
        let weakCount = 0; let resistCount = 0;
        currentTeam.forEach(mon => {
            let defMult = getDefensiveMultiplier(mon.types, targetType);
            if(defMult > 1) weakCount++; if(defMult < 1) resistCount++;
            if(mon.ability && ABILITY_DEFENSES[mon.ability]) { if (ABILITY_DEFENSES[mon.ability].immuneTo && ABILITY_DEFENSES[mon.ability].immuneTo.includes(targetType)) resistCount += 2; }
        });
        typeBalance[targetType] = { weak: weakCount, resist: resistCount };
    });
    
    let candidates = [];
    Object.keys(POKEMON_AESTHETICS).forEach(id => {
        if(usedIds.has(id)) return;
        let baseSp = getBaseSpecies(id); if (currentTeamBaseSpecies.has(baseSp)) return;
        let mon = showdownData[id]; if(!mon) return;
        if(mon.evos && mon.evos.length > 0) return; if(id.includes('mega')) return; if(mon.requiredItems || mon.requiredItem) return; 
        
        let score = 0;
        Object.keys(typeBalance).forEach(type => {
            let balance = typeBalance[type];
            if (balance.weak > balance.resist) {
                let defMult = getDefensiveMultiplier(mon.types, type);
                if(defMult < 1) score += (balance.weak - balance.resist) * 2;
                if(defMult > 1) score -= 3; 
            }
        });
        score += Math.random() * 5; candidates.push({ id, score });
    });
    
    candidates.sort((a,b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].id : null;
}

function runAutoBuild() {
    let arch1 = document.getElementById('auto-arch-1').value; let arch2 = document.getElementById('auto-arch-2').value;
    currentTeam = []; let usedIds = new Set(); let currentTeamBaseSpecies = new Set();
    
    function tryAdd(id) {
        if(currentTeam.length >= 6 || usedIds.has(id)) return false;
        let baseSp = getBaseSpecies(id); if(currentTeamBaseSpecies.has(baseSp)) return false;
        let success = addMonToTeamQuietly(id);
        if(success) { usedIds.add(id); currentTeamBaseSpecies.add(baseSp); }
        return success;
    }

    let possibleMegas = [...ARCHETYPE_CORES[arch1].megas];
    if (ARCHETYPE_CORES[arch1].megaSetters.length > 0) { possibleMegas.push(...ARCHETYPE_CORES[arch1].megaSetters); possibleMegas.push(...ARCHETYPE_CORES[arch1].megaSetters); }
    if (arch2 !== 'None' && ARCHETYPE_CORES[arch2]) {
        possibleMegas = possibleMegas.concat(ARCHETYPE_CORES[arch2].megas);
        if (ARCHETYPE_CORES[arch2].megaSetters.length > 0) possibleMegas.push(...ARCHETYPE_CORES[arch2].megaSetters);
    }
    
    possibleMegas.sort(() => 0.5 - Math.random()); let chosenMega = null;
    for(let m of possibleMegas) { if(tryAdd(m)) { chosenMega = m; break; } }

    let needsA1Setter = true; if (chosenMega && ARCHETYPE_CORES[arch1].megaSetters.includes(chosenMega)) needsA1Setter = false; 
    if (needsA1Setter) { let a1Setters = [...ARCHETYPE_CORES[arch1].setters].sort(() => 0.5 - Math.random()); for(let s of a1Setters) { if(tryAdd(s)) break; } }
    let a1Abusers = [...ARCHETYPE_CORES[arch1].abusers].sort(() => 0.5 - Math.random()); for(let a of a1Abusers) { if(tryAdd(a)) break; }

    if (arch2 !== 'None' && arch1 !== arch2 && ARCHETYPE_CORES[arch2]) {
        let needsA2Setter = true; if (chosenMega && ARCHETYPE_CORES[arch2].megaSetters.includes(chosenMega)) needsA2Setter = false; 
        if (needsA2Setter) { let a2Setters = [...ARCHETYPE_CORES[arch2].setters].sort(() => 0.5 - Math.random()); for(let s of a2Setters) { if(tryAdd(s)) break; } }
        let a2Abusers = [...ARCHETYPE_CORES[arch2].abusers].sort(() => 0.5 - Math.random()); for(let a of a2Abusers) { if(tryAdd(a)) break; }
    }

    let attempts = 0;
    while(currentTeam.length < 6 && attempts < 200) { 
        attempts++; let bestFitId = getBestDefensiveFitForAutoBuild(usedIds, currentTeamBaseSpecies);
        if(bestFitId) tryAdd(bestFitId);
        else { let fallback = Object.keys(POKEMON_AESTHETICS).find(id => !usedIds.has(id) && !currentTeamBaseSpecies.has(getBaseSpecies(id)) && !id.includes('mega') && (!showdownData[id] || !showdownData[id].evos || showdownData[id].evos.length === 0)); if (fallback) tryAdd(fallback); }
    }
    saveTeam(); renderAllUI(); closeAutoBuildModal();
}

function loadTopCutTeam() {
    let val = document.getElementById('top-cut-select').value;
    if(val && TOP_CUT_TEAMS[val]) { document.getElementById('sim-opp-paste').value = TOP_CUT_TEAMS[val]; loadSimOpponent(); }
}

function openSimModal() {
    if(currentTeam.length === 0) { alert("Add Pokémon to your team first."); return; }
    simYourSelection = []; simOppTeam = [];
    let yourHtml = currentTeam.map((mon, idx) => `<div class="sim-slot" id="sim-my-slot-${idx}" onclick="toggleSimMon(${idx})"><img src="${mon.sprite}"></div>`).join('');
    document.getElementById('sim-your-team').innerHTML = yourHtml;
    document.getElementById('sim-opp-paste').value = ""; document.getElementById('top-cut-select').value = ""; document.getElementById('sim-opp-team').innerHTML = "";
    document.getElementById('sim-analysis-results').style.display = 'block'; document.getElementById('sim-matrix-results').style.display = 'none';
    document.getElementById('sim-analysis-results').innerHTML = `<p style="color:#888; font-size:12px; text-align:center;">Select 4 Pokémon and Load an Opponent to see STAB Matchup Data.</p>`;
    document.getElementById('sim-modal').style.display = 'flex';
}

function toggleSimMon(idx) {
    let slot = document.getElementById(`sim-my-slot-${idx}`); let mon = currentTeam[idx];
    if (simYourSelection.includes(mon)) { simYourSelection = simYourSelection.filter(m => m !== mon); slot.classList.remove('selected'); } 
    else { if (simYourSelection.length >= 4) return; simYourSelection.push(mon); slot.classList.add('selected'); }
    document.getElementById('sim-analysis-results').style.display = 'block'; document.getElementById('sim-matrix-results').style.display = 'none'; runSimAnalysis();
}

function loadSimOpponent() {
    let text = document.getElementById('sim-opp-paste').value; let blocks = text.trim().split(/\n\s*\n/); simOppTeam = [];
    blocks.forEach(block => {
        let lines = block.split('\n'); if (lines.length === 0 || lines[0] === '') return;
        let firstLine = lines[0].trim(); if (firstLine.includes('@')) firstLine = firstLine.split('@')[0].trim();
        firstLine = firstLine.replace(/\s*\([MFN]\)$/i, '').trim();
        let species = firstLine; let match = firstLine.match(/.*\(([^)]+)\)$/); if (match) species = match[1].trim();
        let jsonId = species.toLowerCase().replace(/[^a-z0-9]/g, ''); let monData = showdownData[jsonId] || Object.values(showdownData).find(d => d.name === species);
        if (monData) {
        let spriteName = monData.name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace('-mega-x', '-megax').replace('-mega-y', '-megay');
        let spriteUrl = CUSTOM_SPRITES[jsonId] ? CUSTOM_SPRITES[jsonId] : `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
            simOppTeam.push({ id: jsonId, name: monData.name, sprite: spriteUrl, types: monData.types });
        }
    });
    let oppHtml = simOppTeam.map(mon => `<div class="sim-slot"><img src="${mon.sprite}"></div>`).join('');
    document.getElementById('sim-opp-team').innerHTML = oppHtml;
    document.getElementById('sim-analysis-results').style.display = 'block'; document.getElementById('sim-matrix-results').style.display = 'none'; runSimAnalysis();
}

function get1v1Score(myMon, oppMon) {
    let myBaseSpe = showdownData[myMon.id] ? showdownData[myMon.id].baseStats.spe : 50; let mySpd = calcLv50Stat(myBaseSpe);
    if(myMon.item === 'Choice Scarf') mySpd = Math.floor(mySpd * 1.5); if(myMon.item === 'Iron Ball' || myMon.item === 'Macho Brace') mySpd = Math.floor(mySpd * 0.5);
    let oppBaseSpe = showdownData[oppMon.id] ? showdownData[oppMon.id].baseStats.spe : 50; let oppSpd = calcLv50Stat(oppBaseSpe);
    
    let myMaxOffense = 0; myMon.types.forEach(t => { let mult = getDefensiveMultiplier(oppMon.types, t); if (mult > myMaxOffense) myMaxOffense = mult; });
    let theirMaxOffense = 0; oppMon.types.forEach(t => { let mult = getDefensiveMultiplier(myMon.types, t); if (mult > theirMaxOffense) theirMaxOffense = mult; });

    let score = 0;
    if (myMaxOffense > theirMaxOffense) score += 1; else if (myMaxOffense < theirMaxOffense) score -= 1;
    if (mySpd > oppSpd) score += 0.5; else if (mySpd < oppSpd) score -= 0.5;
    return score;
}

function runSimAnalysis() {
    let resDiv = document.getElementById('sim-analysis-results');
    if (simYourSelection.length !== 4 || simOppTeam.length === 0) { resDiv.innerHTML = `<p style="color:#888; font-size:12px; text-align:center;">Select 4 Pokémon and Load an Opponent to see STAB Matchup Data.</p>`; return; }

    let offenseText = `<h4 style="color:#4CAF50; margin:0 0 10px 0; display:flex; align-items:center;">Offensive Pressure <span class="tooltip" style="background:#1e293b;">?<span class="tooltip-text" style="color:#fff; font-weight:normal;">Based on STAB (Same Type Attack Bonus). If a Fire-type Pokémon uses a Fire-type move, it does 50% extra damage!</span></span></h4>`;
    let defenseText = `<h4 style="color:#ff4444; margin:15px 0 10px 0; display:flex; align-items:center;">Defensive Risks <span class="tooltip" style="background:#1e293b;">?<span class="tooltip-text" style="color:#fff; font-weight:normal;">Shows which opposing STAB types will hit your Pokémon for Super Effective (2x or 4x) damage.</span></span></h4>`;

    simYourSelection.forEach(myMon => {
        let hitsSE = []; simOppTeam.forEach(oppMon => { let se = false; myMon.types.forEach(t => { if(getDefensiveMultiplier(oppMon.types, t) >= 2) se = true; }); if(se) hitsSE.push(oppMon.name); });
        if(hitsSE.length > 0) offenseText += `<div style="font-size:10px; margin-bottom:4px;"><strong style="color:#ffcc00;">${myMon.name}</strong> hits -> <span style="color:#ddd;">${hitsSE.join(', ')}</span></div>`;
    });

    simYourSelection.forEach(myMon => {
        let hitBySE = []; simOppTeam.forEach(oppMon => { let se = false; oppMon.types.forEach(t => { if(getDefensiveMultiplier(myMon.types, t) >= 2) se = true; }); if(se) hitBySE.push(oppMon.name); });
        if(hitBySE.length > 0) defenseText += `<div style="font-size:10px; margin-bottom:4px;"><strong style="color:#ffcc00;">${myMon.name}</strong> is weak to -> <span style="color:#ddd;">${hitBySE.join(', ')}</span></div>`;
    });

    resDiv.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;"><div style="flex:1; min-width:200px; background:#222; padding:10px; border-radius:4px;">${offenseText}</div><div style="flex:1; min-width:200px; background:#222; padding:10px; border-radius:4px;">${defenseText}</div></div>`;
}

function generate1v1LeadMatrix() {
    let resDiv = document.getElementById('sim-analysis-results'); let matrixDiv = document.getElementById('sim-matrix-results');
    if (currentTeam.length === 0 || simOppTeam.length === 0) { alert("You need both your team and an opponent loaded to generate a matrix!"); return; }
    resDiv.style.display = 'none'; matrixDiv.style.display = 'block';

    let legendHtml = `
        <div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 10px; margin-bottom: 10px; text-align: left;">
            <h4 style="color: #9c27b0; margin: 0 0 6px 0; font-size: 14px; display:flex; align-items:center;">
                How the 1v1 Lead Matrix Works 
                <span class="tooltip" style="background:#1e293b;">?<span class="tooltip-text" style="color:#fff; font-weight:normal;">This tool simulates Turn 1. It adds up the Speed and Type Advantage scores for a 1-on-1 matchup to tell you who has the upper hand.</span></span>
            </h4>
            <p style="font-size: 10px; color: #888; margin-top: 0; margin-bottom: 10px;">In Singles or specific VGC situations, picking the right lead is crucial. This chart compares Speed and Super Effective hits against the opponent.</p>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #ccc; line-height: 1.6;">
                <li><strong style="color: #4CAF50;">Favorable:</strong> You naturally outspeed and threaten Super Effective damage. Excellent lead!</li>
                <li><strong style="color: #81c784;">Slight Adv:</strong> You outspeed or have better typing, but not both. A safe lead.</li>
                <li><strong style="color: #aaa;">Neutral:</strong> A balanced matchup. Turn 1 will be decided by strategy.</li>
                <li><strong style="color: #e57373;">Slight Dis:</strong> You are slightly outsped or have weaker typing. Somewhat risky lead.</li>
                <li><strong style="color: #ff4444;">Poor:</strong> You are outsped and take Super Effective damage. DO NOT lead!</li>
            </ul>
        </div>
    `;
    let html = '<h3 style="color:#9c27b0; font-size:14px; margin-top:0;">Turn 1 Lead Matrix (1v1)</h3>' + legendHtml + '<div style="overflow-x: auto;"><table class="matrix-table"><tr><th style="min-width: 60px;">VS</th>';

    simOppTeam.forEach(opp => { html += `<th style="min-width: 60px;"><img src="${opp.sprite}" class="matrix-sprite"><br>${opp.name.substring(0, 10)}</th>`; }); html += '</tr>';
    currentTeam.forEach(myMon => {
        html += `<tr><th><img src="${myMon.sprite}" class="matrix-sprite"><br>${myMon.name.substring(0, 10)}</th>`;
        simOppTeam.forEach(oppMon => {
            let score = get1v1Score(myMon, oppMon);
            let cellClass = "matrix-neutral"; let cellText = "Neutral";
            if (score >= 1) { cellClass = "matrix-great"; cellText = "Favorable"; } else if (score <= -1) { cellClass = "matrix-terrible"; cellText = "Poor"; }
            else if (score > 0) { cellClass = "matrix-good"; cellText = "Slight Adv"; } else if (score < 0) { cellClass = "matrix-bad"; cellText = "Slight Dis"; }
            html += `<td class="${cellClass}">${cellText}</td>`;
        });
        html += '</tr>';
    });
    html += '</table></div>'; matrixDiv.innerHTML = html;
}

function generate2v2LeadMatrix() {
    let resDiv = document.getElementById('sim-analysis-results'); let matrixDiv = document.getElementById('sim-matrix-results');
    if (currentTeam.length < 2 || simOppTeam.length < 2) { alert("You need at least 2 Pokémon on both teams to generate a 2v2 matrix!"); return; }
    resDiv.style.display = 'none'; matrixDiv.style.display = 'block';

    let legendHtml = `
        <div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 10px; margin-bottom: 10px; text-align: left;">
            <h4 style="color: #2196F3; margin: 0 0 6px 0; font-size: 14px; display:flex; align-items:center;">
                How the Duo Lead Matrix Works 
                <span class="tooltip" style="background:#1e293b;">?<span class="tooltip-text" style="color:#fff; font-weight:normal;">This tool simulates Turn 1. It adds up the Speed and Type Advantage scores for all 4 Pokémon on the field to tell you who has the upper hand.</span></span>
            </h4>
            <p style="font-size: 10px; color: #888; margin-top: 0; margin-bottom: 10px;">In VGC Double Battles, picking your starting two Pokémon ("Leads") is crucial. This chart compares your Speed and Super Effective hits against theirs to find your safest opening pair.</p>
            <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #ccc; line-height: 1.6;">
                <li><strong style="color: #4CAF50;">Favorable:</strong> Your duo naturally outspeeds and threatens massive Super Effective damage to their duo. Excellent starting pair!</li>
                <li><strong style="color: #81c784;">Advantage:</strong> Your team has the upper hand. You likely move first, or perfectly resist their attacks.</li>
                <li><strong style="color: #aaa;">Neutral:</strong> A balanced matchup. Turn 1 will be decided by strategy (like Fake Out or Protect).</li>
                <li><strong style="color: #e57373;">Disadv:</strong> Their duo is faster and threatens your weaknesses. You will need a trick (like Tailwind or Trick Room) to survive.</li>
                <li><strong style="color: #ff4444;">Poor:</strong> Their leads completely shut down both of your Pokémon. Do not start the battle with these two!</li>
            </ul>
        </div>
    `;
    let html = '<h3 style="color:#2196F3; font-size:14px; margin-top:0;">Turn 1 Duo Lead Matrix (2v2)</h3>' + legendHtml + '<div style="overflow-x: auto;"><table class="matrix-table"><tr><th style="min-width: 60px;">VS</th>';

    let oppPairs = []; for(let i=0; i<simOppTeam.length; i++) { for(let j=i+1; j<simOppTeam.length; j++) { oppPairs.push([simOppTeam[i], simOppTeam[j]]); } }
    let myPairs = []; for(let i=0; i<currentTeam.length; i++) { for(let j=i+1; j<currentTeam.length; j++) { myPairs.push([currentTeam[i], currentTeam[j]]); } }

    oppPairs.forEach(opp => { html += `<th style="min-width: 60px;"><img src="${opp[0].sprite}" style="height:24px; image-rendering:pixelated; margin-right:-5px;"><img src="${opp[1].sprite}" style="height:24px; image-rendering:pixelated;"></th>`; }); html += '</tr>';
    myPairs.forEach(myPair => {
        html += `<tr><th><img src="${myPair[0].sprite}" style="height:24px; image-rendering:pixelated; margin-right:-5px;"><img src="${myPair[1].sprite}" style="height:24px; image-rendering:pixelated;"></th>`;
        oppPairs.forEach(oppPair => {
            let score = get1v1Score(myPair[0], oppPair[0]) + get1v1Score(myPair[0], oppPair[1]) + get1v1Score(myPair[1], oppPair[0]) + get1v1Score(myPair[1], oppPair[1]);
            let cellClass = "matrix-neutral"; let cellText = "Neutral";
            if (score >= 2) { cellClass = "matrix-great"; cellText = "Favorable"; } else if (score <= -2) { cellClass = "matrix-terrible"; cellText = "Poor"; }
            else if (score > 0) { cellClass = "matrix-good"; cellText = "Adv"; } else if (score < 0) { cellClass = "matrix-bad"; cellText = "Dis"; }
            html += `<td class="${cellClass}">${cellText}</td>`;
        });
        html += '</tr>';
    });
    html += '</table></div>'; matrixDiv.innerHTML = html;
}

function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = function(e) { document.getElementById('import-text').value = e.target.result; }; reader.readAsText(file);
}

function processImport() {
    let text = document.getElementById('import-text').value; let blocks = text.trim().split(/\n\s*\n/); let importedTeam = [];
    blocks.forEach(block => {
        let lines = block.split('\n'); if (lines.length === 0 || lines[0] === '') return;
        let firstLine = lines[0].trim(); let item = "";
        if (firstLine.includes('@')) { let parts = firstLine.split('@'); item = parts[1].trim(); firstLine = parts[0].trim(); }
        firstLine = firstLine.replace(/\s*\([MFN]\)$/i, '').trim();
        let species = firstLine; let match = firstLine.match(/.*\(([^)]+)\)$/); if (match) species = match[1].trim();
        let jsonId = species.toLowerCase().replace(/[^a-z0-9]/g, ''); if (jsonId === 'indeedeef') jsonId = 'indeedeef';

        let ability = ""; let moves = [];
        for (let i = 1; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('Ability:')) ability = line.replace('Ability:', '').trim();
            if (line.startsWith('-')) moves.push(line.replace('-', '').trim());
        }
        
        let monData = showdownData[jsonId];
        if (!monData) { let found = Object.values(showdownData).find(d => d.name === species); if (found) { monData = found; jsonId = found.id || jsonId; } }

        if (monData) {
            let spriteName = monData.name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace('-mega-x', '-megax').replace('-mega-y', '-megay');
            let spriteUrl = CUSTOM_SPRITES[jsonId] ? CUSTOM_SPRITES[jsonId] : `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
            importedTeam.push({ id: jsonId, name: monData.name, sprite: spriteUrl, types: monData.types, ability: ability, item: item, moves: moves.slice(0, 4) });
        }
    });
    
    if (importedTeam.length > 0) { currentTeam = importedTeam.slice(0, 6); saveTeam(); renderAllUI(); closeImportModal(); document.getElementById('import-text').value = ""; } 
    else { alert("Could not parse any valid Pokémon from the text."); }
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

function generateTeamSheet() {
    if (currentTeam.length === 0) { alert("Add some Pokémon to your team first!"); return; }
    let teamWord = ""; 
    let c1 = "#555", c2 = "#555", c3 = "#555";
    if (currentTeam[0]) c1 = (POKEMON_AESTHETICS[currentTeam[0].id] || { color: TYPE_COLORS[currentTeam[0].types[0]] || "#555" }).color;
    if (currentTeam[1]) c2 = (POKEMON_AESTHETICS[currentTeam[1].id] || { color: TYPE_COLORS[currentTeam[1].types[0]] || "#555" }).color; else c2 = c1;
    if (currentTeam[2]) c3 = (POKEMON_AESTHETICS[currentTeam[2].id] || { color: TYPE_COLORS[currentTeam[2].types[0]] || "#555" }).color; else c3 = c2;

    let sheetHTML = `
        <!DOCTYPE html>
        <html><head><title>VGC Open Team Sheet</title><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; min-height: 100vh; background-color: #1a1a1a; }
            body { background-image: linear-gradient(rgba(20, 20, 20, 0.88), rgba(20, 20, 20, 0.95)), linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%); color: #fff; font-family: monospace; font-size: 14px; box-sizing: border-box; }
            .content-wrapper { padding: 20px; max-width: 900px; margin: 0 auto; }
            .team-flex { display: flex; flex-wrap: wrap; justify-content: space-between; }
            .mon-container { display: flex; align-items: center; background: rgba(30, 30, 30, 0.6); padding: 15px; border-radius: 8px; page-break-inside: avoid; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.5); width: 48.5%; box-sizing: border-box; margin-bottom: 20px; }
            @media (max-width: 700px) { .mon-container { width: 100%; } }
            .mon-crest { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Pacifico', cursive; font-size: 26px; color: #fff; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); margin-right: 15px; border: 2px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.3); flex-shrink: 0; }
            .mon-sprite { width: 90px; text-align: center; flex-shrink: 0; margin-right: 10px; }
            .mon-sprite img { width: 100%; image-rendering: pixelated; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.5)); }
            .mon-details { line-height: 1.6; width: 100%; }
            .mon-name { color: #aaddff; font-weight: bold; font-size: 16px; text-shadow: 1px 1px 2px #000; }
            .mon-item { color: #ccc; font-style: italic; }
            .mon-ability { color: #fff; }
            .mon-moves { color: #ddd; margin-top: 5px; padding-left: 10px; border-left: 2px solid rgba(255, 255, 255, 0.2); }
            .team-acronym-container { text-align: center; background: rgba(30, 30, 30, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-top: 10px; }
            .team-acronym-title { color: #aaa; font-family: sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; }
            .team-acronym-word { font-family: 'Pacifico', cursive; font-size: 48px; color: #ffcc00; letter-spacing: 8px; text-shadow: 3px 3px 0px rgba(0,0,0,0.8); }
            @media print {
                @page { size: A4 portrait; margin: 0.5cm; }
                body { min-height: 297mm; background-color: #1a1a1a !important; background-image: linear-gradient(rgba(20, 20, 20, 0.88), rgba(20, 20, 20, 0.95)), linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%) !important; }
                .content-wrapper { padding: 10px; } h2 { margin: 5px 0 15px 0; font-size: 18px; }
                .mon-container { width: 48.5% !important; background: rgba(20, 20, 20, 0.8) !important; padding: 10px !important; margin-bottom: 15px !important; border: 1px solid #444 !important; }
                .mon-sprite { width: 70px; margin-right: 5px; } .mon-crest { width: 35px; height: 35px; font-size: 20px; margin-right: 10px; }
                .mon-name { font-size: 14px; } .team-acronym-container { background: rgba(20, 20, 20, 0.8) !important; padding: 10px; border: 1px solid #444 !important; }
                .print-btn { display: none !important; }
            }
        </style></head>
        <body><div class="content-wrapper"><h2 style="text-align:center; color:#ffcc00; font-family: sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">VGC Open Team Sheet</h2><div class="team-flex">
    `;

    currentTeam.forEach(mon => {
        let exportName = mon.id.includes('mega') && !mon.name.includes('-Mega') ? mon.name.replace(' (Mega)', '-Mega') : mon.name;
        let movesHTML = ""; if (mon.moves && mon.moves.length > 0) mon.moves.forEach(m => { movesHTML += `- ${m}<br>`; });
        let aesthetic = POKEMON_AESTHETICS[mon.id] || { letter: exportName.charAt(0).toUpperCase(), color: TYPE_COLORS[mon.types[0]] || "#555" };
        teamWord += aesthetic.letter;

        sheetHTML += `
            <div class="mon-container" style="border-left: 8px solid ${aesthetic.color} !important;">
                <div class="mon-crest" style="background-color: ${aesthetic.color};">${aesthetic.letter}</div>
                <div class="mon-sprite"><img src="${mon.sprite}"></div>
                <div class="mon-details">
                    <span class="mon-name">${exportName}</span> ${mon.item ? `<span class="mon-item"><br>@ ${mon.item}</span>` : ''}<br>
                    <span class="mon-ability">Ability: ${mon.ability}</span><br>
                    <div class="mon-moves">${movesHTML}</div>
                </div>
            </div>
        `;
    });

    sheetHTML += `</div><div class="team-acronym-container"><p class="team-acronym-title">Team Acronym</p><div class="team-acronym-word">${teamWord}</div></div>
        <div style="text-align:center; margin-top:20px;" class="print-btn"><button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #ff9800; border: none; border-radius: 4px; color: #111; font-weight: bold;">Print / Save as PDF</button></div>
        </div></body></html>
    `;

    let sheetWindow = window.open('', '_blank'); sheetWindow.document.write(sheetHTML); sheetWindow.document.close();
}

function analyzeArchetype() {
    let container = document.getElementById('archetype-summary');
    if (currentTeam.length === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px; margin:0;">Add Pokémon to analyze archetype.</p>'; return; }
    
    let totalMoves = 0; currentTeam.forEach(mon => { if (mon.moves && mon.moves.length > 0) totalMoves += mon.moves.length; });
    if (totalMoves === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px; margin:0;">Awaiting move selection...</p>'; return; }

    let stats = { hasTR: false, hasTailwind: false, hasDrizzle: false, hasRainAbuser: false, hasDrought: false, hasSunAbuser: false, hasSand: false, hasSnow: false, hasPsychicTerrain: false, hasExpandingForce: false, protectCount: 0, recoveryCount: 0, unawareCount: 0, perishSongCount: 0, pivotMoveCount: 0, hazardSetters: 0, suicideLeadPotential: false, dragonCount: 0, shadowTag: false };
    let typesPresent = new Set();
    
    let teamNames = currentTeam.map(m => m.name.toLowerCase());
    let hasMon = (nameFragment) => teamNames.some(n => n.includes(nameFragment));
    let hasMove = (moveName) => currentTeam.some(m => m.moves && m.moves.includes(moveName));

    currentTeam.forEach(mon => {
        let baseSpe = showdownData[mon.id]? showdownData[mon.id].baseStats.spe : 50;
        stats.avgSpeed += baseSpe; if (baseSpe >= 110) stats.highSpeedCount++;
        mon.types.forEach(t => typesPresent.add(t));
        
        if (mon.types.includes('Dragon')) stats.dragonCount++; if (mon.ability === 'Unaware') stats.unawareCount++;
        if (mon.ability === 'Drizzle') stats.hasDrizzle = true; if (['Swift Swim'].includes(mon.ability)) stats.hasRainAbuser = true;
        if (mon.ability === 'Drought') stats.hasDrought = true; if (['Chlorophyll', 'Protosynthesis'].includes(mon.ability)) stats.hasSunAbuser = true;
        if (mon.ability === 'Sand Stream') stats.hasSand = true; if (['Snow Warning', 'Chilly Reception'].includes(mon.ability)) stats.hasSnow = true;
        if (mon.ability === 'Psychic Surge') stats.hasPsychicTerrain = true; if (['Shadow Tag', 'Arena Trap'].includes(mon.ability)) stats.shadowTag = true;

        if (mon.moves) {
            if (mon.moves.includes('Trick Room')) stats.hasTR = true; if (mon.moves.includes('Tailwind')) stats.hasTailwind = true;
            if (mon.moves.includes('Expanding Force')) stats.hasExpandingForce = true;
            if (['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot'].some(m => mon.moves.includes(m))) stats.pivotMoveCount++;
            if (['Stealth Rock', 'Spikes', 'Toxic Spikes'].some(m => mon.moves.includes(m))) stats.hazardSetters++;
            if (['Recover', 'Roost', 'Soft-Boiled', 'Slack Off', 'Morning Sun', 'Synthesis'].some(m => mon.moves.includes(m))) stats.recoveryCount++;
            if (['Protect', 'Detect', 'Spiky Shield', 'Baneful Bunker'].some(m => mon.moves.includes(m))) stats.protectCount++;
            if (mon.moves.includes('Perish Song')) stats.perishSongCount++;
            if (mon.item === 'Focus Sash' && baseSpe > 100 && (mon.moves.includes('Stealth Rock') || mon.moves.includes('Taunt'))) stats.suicideLeadPotential = true;
        }
    });
    
    stats.avgSpeed /= currentTeam.length; let detectedModes = [];

    if (hasMon('dondozo') && hasMon('tatsugiri')) detectedModes.push({name: "DozoGiri", desc: "Uses Commander to grant Dondozo double omni-boosts to sweep."});
    if (hasMon('magnezone') && stats.dragonCount >= 2) detectedModes.push({name: "DragMag", desc: "Magnezone traps Steel-types to clear the path for Dragon sweepers."});
    if (stats.perishSongCount >= 1 && (stats.shadowTag || stats.protectCount >= 4)) detectedModes.push({name: "Perish Trap", desc: "Traps opponents and uses Perish Song to force KOs within 3 turns."});
    if (stats.hasDrizzle && stats.hasRainAbuser) detectedModes.push({name: "Rain Offense", desc: "Uses Drizzle to power up Water moves and double the speed of Swift Swim partners."});
    else if (stats.hasDrizzle) detectedModes.push({name: "Rain Mode", desc: "Utilizes Rain to boost Water attacks and mitigate Fire weaknesses."});
    if (stats.hasDrought && stats.hasSunAbuser) detectedModes.push({name: "Sun Offense", desc: "Capitalizes on Protosynthesis or Chlorophyll under the sun for immediate pressure."});
    else if (stats.hasDrought) detectedModes.push({name: "Sun Mode", desc: "Utilizes Sun to boost Fire attacks and mitigate Water weaknesses."});
    if (stats.hasSand) detectedModes.push({name: "Sand Mode", desc: "Uses Sandstorm for residual damage and to grant Special Defense boosts to Rock types."});
    if (stats.hasSnow) detectedModes.push({name: "Snow Mode", desc: "Sets Snow to boost Ice-type Defense and enable Aurora Veil support."});
    if (stats.hasPsychicTerrain && stats.hasExpandingForce) detectedModes.push({name: "Psyspam", desc: "Abuses Psychic Terrain to block priority and fire off high-powered Expanding Force attacks."});
    if (stats.hasTailwind) detectedModes.push({name: "Tailwind Control", desc: "Utilizes Tailwind for an immediate, team-wide speed advantage."});
    if (stats.hasTR && stats.avgSpeed < 75) detectedModes.push({name: "Hard Trick Room", desc: "Committed to speed inversion. Relies on slow juggernauts to sweep."});
    else if (stats.hasTR) detectedModes.push({name: "Trick Room Mode", desc: "Features Trick Room as an alternate form of speed control for hybrid flexibility."});

    if (detectedModes.length === 0) {
        if (stats.recoveryCount >= 3 || (stats.unawareCount >= 1 && stats.hazardSetters >= 2)) detectedModes.push({name: "Stall / Semi-Stall", desc: "Wins through attrition, passive damage (hazards/status), and extreme defensive redundancy."});
        else if (stats.suicideLeadPotential || (stats.highSpeedCount >= 4 && stats.protectCount < 2)) detectedModes.push({name: "Hyper Offense (HO)", desc: "Total aggression. Uses a lead to set hazards/screens then chains sweepers to overwhelm the foe."});
        else if (stats.pivotMoveCount >= 2 && stats.recoveryCount >= 1) detectedModes.push({name: "Bulky Offense / Pivot Balance", desc: "Uses 'Volt-Turn' momentum and bulky pivots to safely bring in wallbreakers and maintain board control."});
    }

    let archetype = "Bulky Offense / Balance"; let desc = "Relies on high-value Pokémon with natural synergy, pivoting, and a mix of offensive and defensive pressure.";
    if (detectedModes.length > 0) { archetype = detectedModes.map(m => m.name).join(" + ") + (detectedModes.length > 1 ? " (Hybrid)" : ""); desc = detectedModes.map(m => `• ${m.desc}`).join("<br>"); }

    // Use our shiny new CSS class from style.css instead of forcing inline tooltips
    function createBadge(title, tooltipText, colorHex) {
        return `<span class="synergy-badge" style="color:${colorHex}; border:1px solid ${colorHex};">${title} <span class="tooltip-text" style="color:#fff; font-weight:normal; white-space: normal; line-height: 1.5;">${tooltipText}</span></span>`;
    }

    // GAMIFIED SYNERGY BADGES & DEFENSIVE CORES
    let badges = [];
    
    // Defensive Cores
    if (typesPresent.has('Fire') && typesPresent.has('Water') && typesPresent.has('Grass')) {
        badges.push(createBadge("🔥💧🌿 F/W/G Core", "A perfectly balanced defensive core. Grass covers Water's weaknesses, Water covers Fire's, and Fire covers Grass's.", "#4ade80"));
    }
    if (typesPresent.has('Steel') && typesPresent.has('Fairy') && typesPresent.has('Dragon')) {
        badges.push(createBadge("⚙️🧚🐉 Fantasy Core", "A top-tier defensive core. Steel covers Fairy and Dragon's weaknesses, while Fairy provides immunity to Dragon.", "#f472b6"));
    }
    
    // Synergy Combos
    if ((hasMon('pelipper') || hasMon('politoed')) && (stats.hasRainAbuser || hasMon('palafin') || hasMon('archaludon'))) {
        badges.push(createBadge("⛈️ Rain Synergy", "A weather setter creates Rain, boosting Water moves and doubling the speed of Swift Swim partners.", "#60a5fa"));
    }
    if ((hasMon('torkoal') || hasMon('ninetales')) && (stats.hasSunAbuser || hasMon('charizard') || hasMon('venusaur'))) {
        badges.push(createBadge("☀️ Sun Synergy", "A weather setter creates Sun, boosting Fire moves and doubling the speed of Chlorophyll partners.", "#f87171"));
    }
    if ((hasMon('indeedee') || hasMon('tapu lele')) && (hasMon('armarouge') || hasMon('hatterene') || hasMove('Expanding Force'))) {
        badges.push(createBadge("🧠 Psyspam", "Psychic Terrain blocks priority moves (like Fake Out) and powers up the devastating multi-target move Expanding Force.", "#e879f9"));
    }
    if (hasMon('dondozo') && hasMon('tatsugiri')) {
        badges.push(createBadge("🍣 DozoGiri", "Tatsugiri jumps inside Dondozo's mouth, giving it +2 to all stats but leaving you with only one active Pokémon.", "#22d3ee"));
    }
    if (hasMove('Fake Out') && hasMove('Trick Room')) {
        badges.push(createBadge("⏱️ TR Setup", "Using Fake Out to flinch a threat allows your Trick Room setter to safely reverse the turn order.", "#a78bfa"));
    }
    if (hasMove('Earthquake') && currentTeam.some(m => m.types.includes('Flying') || m.ability === 'Levitate')) {
        badges.push(createBadge("🌍 DisQuake", "Pairing an Earthquake user with a Flying/Levitate partner lets you spam spread damage without hitting your own teammate!", "#fbbf24"));
    }
    
    let badgeHtml = badges.length > 0 ? `<div style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed #555; display:flex; gap:8px; flex-wrap:wrap;">${badges.join('')}</div>` : "";

    container.innerHTML = `<span style="color:#ffcc00; font-size:14px; font-weight:bold;">${archetype}</span><br><br><span style="color:#ccc; font-size:12px;">${desc}</span>${badgeHtml}`;
}

function getDefensiveMultiplier(defendingTypes, attackingType) {
  let mult = 1;
  defendingTypes.forEach(type => {
    if (!TYPE_DATA[type]) return;
    if (TYPE_DATA[type].weakTo.includes(attackingType)) mult *= 2;
    if (TYPE_DATA[type].resists.includes(attackingType)) mult *= 0.5;
    if (TYPE_DATA[type].immuneTo.includes(attackingType)) mult *= 0;
  });
  return mult;
}

function renderTypeChart() {
  const container = document.getElementById('type-summary-container'); container.innerHTML = '';
  if (currentTeam.length === 0) { container.innerHTML = '<p style="color: #888; font-size: 12px;">Add Pokémon to your team to see analysis.</p>'; return; }

  let extremeWeak = {}; let weaknesses = {}; let resistances = {}; let mostlyIneffective = {}; let immunities = {}; let abilityImmune = {}; let abilityResist = {}; let coverage = {};
  Object.keys(TYPE_DATA).forEach(t => { extremeWeak[t] = []; weaknesses[t] = []; resistances[t] = []; mostlyIneffective[t] = []; immunities[t] = []; abilityImmune[t] = []; abilityResist[t] = []; coverage[t] = []; });

  Object.keys(TYPE_DATA).forEach(targetType => {
    currentTeam.forEach(mon => {
      let defMult = getDefensiveMultiplier(mon.types, targetType);
      if (defMult === 4) extremeWeak[targetType].push(mon); else if (defMult === 2) weaknesses[targetType].push(mon); else if (defMult === 0.5) resistances[targetType].push(mon); else if (defMult === 0.25) mostlyIneffective[targetType].push(mon); else if (defMult === 0) immunities[targetType].push(mon);
      if (mon.ability && ABILITY_DEFENSES[mon.ability]) {
         let abilDef = ABILITY_DEFENSES[mon.ability];
         if (abilDef.immuneTo && abilDef.immuneTo.includes(targetType) && defMult !== 0) abilityImmune[targetType].push(mon);
         if (abilDef.resists && abilDef.resists.includes(targetType)) abilityResist[targetType].push(mon);
      }
      if (mon.moves) { let hasSE = mon.types.some(t => TYPE_DATA[targetType].weakTo.includes(t)); if (hasSE) coverage[targetType].push(mon); }
    });
  });

  const buildSection = (title, color, dataObj, emptyMsg) => {
    let activeTypes = Object.keys(dataObj).filter(t => dataObj[t].length > 0).sort((a, b) => dataObj[b].length - dataObj[a].length);
    let contentHtml = activeTypes.length === 0 ? `<div style="color: #888; font-size: 10px;">${emptyMsg}</div>` : activeTypes.map(t => `<div class="summary-row"><div class="type-label" style="background-color: ${TYPE_COLORS[t]}; width: 60px;">${t.substring(0,3).toUpperCase()}</div><div class="summary-sprites">${dataObj[t].map(m => `<img src="${m.sprite}" title="${m.name}">`).join('')}</div></div>`).join('');
    let totalCount = activeTypes.reduce((sum, t) => sum + dataObj[t].length, 0);
    return `<details><summary style="color: ${color};"><strong>${title}</strong><span style="background: ${color}; color: #111; padding: 2px 6px; border-radius: 10px;">${totalCount}</span></summary><div class="summary-content">${contentHtml}</div></details>`;
  };

  container.innerHTML = `
    ${buildSection('⚠️ 4x Extreme Weaknesses', '#cc0000', extremeWeak, 'No 4x weaknesses! Great job.')}
    ${buildSection('🔻 2x Weaknesses', '#ff4444', weaknesses, 'No 2x weaknesses! Perfect defense.')}
    ${buildSection('🛡️ 1/2x Resistances', '#4CAF50', resistances, 'No basic resistances.')}
    ${buildSection('🧱 1/4x Mostly Ineffective', '#2E7D32', mostlyIneffective, 'No 4x resistances.')}
    ${buildSection('🚫 Base Immunities', '#4a90e2', immunities, 'No natural immunities.')}
    ${buildSection('✨ Ability Immunities', '#9c27b0', abilityImmune, 'No ability-based immunities.')}
    ${buildSection('❄️ Ability Resistances', '#00bcd4', abilityResist, 'No ability-based resistances.')}
    ${buildSection('⚔️ SE Coverage', '#ff9800', coverage, 'No super effective STAB coverage.')}
  `;
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
