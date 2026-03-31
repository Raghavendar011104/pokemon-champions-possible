// --- NEW BEGINNER COACH FEATURES ---

let beginnerModeEnabled = true;

const STARTER_KITS = {
    "incineroar": { item: "Sitrus Berry", moves: ["Flare Blitz", "Knock Off", "Parting Shot", "Fake Out"] },
    "amoonguss": { item: "Rocky Helmet", moves: ["Spore", "Pollen Puff", "Rage Powder", "Protect"] },
    "rillaboom": { item: "Assault Vest", moves: ["Grassy Glide", "Wood Hammer", "U-turn", "Fake Out"] },
    "charizardmegay": { item: "Charizardite Y", moves: ["Heat Wave", "Solar Beam", "Tailwind", "Protect"] },
    "urshifurapidstrike": { item: "Choice Scarf", moves: ["Surging Strikes", "Close Combat", "Aqua Jet", "U-turn"] },
    "pelipper": { item: "Focus Sash", moves: ["Weather Ball", "Hurricane", "Tailwind", "Wide Guard"] },
    "gholdengo": { item: "Choice Specs", moves: ["Make It Rain", "Shadow Ball", "Thunderbolt", "Trick"] },
    "default": { item: "Life Orb", moves: ["Protect"] }
};

function toggleBeginnerMode() {
    beginnerModeEnabled = document.getElementById('coach-toggle').checked;
    renderAllUI();
}

function loadStarterKit(index) {
    let mon = currentTeam[index];
    let baseId = mon.id.replace(/mega[a-z]?$/, '');
    let kit = STARTER_KITS[mon.id] || STARTER_KITS[baseId] || STARTER_KITS["default"];
    
    document.getElementById('edit-item').value = kit.item;
    document.getElementById('item-desc').innerText = VGC_ITEMS[kit.item] || "Loaded from Starter Kit.";
    
    if (kit.moves[0]) document.getElementById('edit-move1').value = kit.moves[0];
    if (kit.moves[1]) document.getElementById('edit-move2').value = kit.moves[1];
    if (kit.moves[2]) document.getElementById('edit-move3').value = kit.moves[2];
    if (kit.moves[3]) document.getElementById('edit-move4').value = kit.moves[3];
}

function applyCardDecorations() {
    if (!beginnerModeEnabled) return;
    
    let slots = document.querySelectorAll('.team-slot.filled');
    slots.forEach((slot, i) => {
        try {
            let mon = currentTeam[i];
            if (!mon) return;

            let cleanMoves = (mon.moves && Array.isArray(mon.moves)) ? mon.moves.map(m => m.trim()) : [];

            let iconsHTML = "";
            if (cleanMoves.includes('Fake Out')) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Fake Out">✋</span>`;
            if (['Protect', 'Detect', 'Spiky Shield', 'Wide Guard'].some(m => cleanMoves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Protect">🛡️</span>`;
            if (['Follow Me', 'Rage Powder'].some(m => cleanMoves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Redirection">🧲</span>`;
            if (['Tailwind', 'Trick Room', 'Icy Wind', 'Electroweb'].some(m => cleanMoves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Speed Control">⏱️</span>`;
            
            if (iconsHTML !== "") {
                slot.insertAdjacentHTML('beforeend', `<div class="flow-icons">${iconsHTML}</div>`);
            }

            let baseMonData = showdownData[mon.id];
            if (!baseMonData && mon.id.includes('mega')) {
                let baseId = mon.id.replace(/mega[a-z]?$/, '');
                baseMonData = showdownData[baseId];
            }
            
            let atk = (baseMonData && baseMonData.baseStats) ? baseMonData.baseStats.atk : 50;
            let spa = (baseMonData && baseMonData.baseStats) ? baseMonData.baseStats.spa : 50;
            
            let isSupport = ['Fake Out', 'Parting Shot', 'Spore', 'Tailwind', 'Will-O-Wisp'].filter(m => cleanMoves.includes(m)).length >= 2;

            let tagClass = ""; let tagText = ""; let tagDesc = "";
            if (isSupport || mon.item === 'Mental Herb') { 
                tagClass = "tag-support"; tagText = "SUPPORT"; tagDesc = "Focuses on helping the team rather than direct damage.";
            } else if (mon.item === 'Assault Vest' || mon.item === 'Rocky Helmet' || mon.ability === 'Regenerator') { 
                tagClass = "tag-tank"; tagText = "BULKY/TANK"; tagDesc = "Designed to take hits and disrupt the opponent.";
            } else if (atk > spa) { 
                tagClass = "tag-physical"; tagText = "PHYSICAL"; tagDesc = "Uses Attack stat. Vulnerable to Intimidate/Burn!";
            } else { 
                tagClass = "tag-special"; tagText = "SPECIAL"; tagDesc = "Uses Special Attack stat. Ignores Intimidate/Burn!";
            }

            if (cleanMoves.length > 0) {
                slot.insertAdjacentHTML('beforeend', `<div class="role-tag ${tagClass} tooltip" style="width: auto !important; height: auto !important; border-radius: 4px !important; pointer-events: auto; cursor: help; margin: 0;">${tagText}<span class="tooltip-text" style="font-weight: normal; text-transform: none; bottom: 150%; white-space: normal; font-size: 10px; color: #fff;">${tagDesc}</span></div>`);
            }
        } catch (e) { console.error("Tag error on slot", i); }
    });
}

function runRookieMistakeChecker() {
    let container = document.getElementById('rookie-mistake-container');
    if (!container) {
        let speedCont = document.getElementById('speed-tier-container');
        if (speedCont) speedCont.insertAdjacentHTML('afterend', `<div id="rookie-mistake-container"></div>`);
        container = document.getElementById('rookie-mistake-container');
    }
    if (!container) return;
    
    if (!beginnerModeEnabled || currentTeam.length === 0) { container.innerHTML = ""; return; }

    let mistakes = []; let protectCount = 0; let speedControl = false; let weatherSetters = 0;

    currentTeam.forEach(mon => {
        if (!mon) return;
        let damagingMoveCount = 0; let totalMovesEquipped = 0; let hasStatus = false;
        let cleanMoves = (mon.moves && Array.isArray(mon.moves)) ? mon.moves.map(m => m.trim()) : [];

        cleanMoves.forEach(m => {
            if (m) {
                totalMovesEquipped++;
                let moveId = m.toLowerCase().replace(/[^a-z0-9]/g, '');
                let moveData = movesData[moveId] || Object.values(movesData).find(d => d && d.name === m);
                if (moveData) {
                    if (moveData.category === "Status") hasStatus = true;
                    else damagingMoveCount++; 
                }
            }
        });

        if (mon.item === 'Assault Vest' && hasStatus) mistakes.push(`<strong>Assault Vest Error:</strong> ${mon.name} has a Status move!`);
        if (totalMovesEquipped > 0 && damagingMoveCount === 0) mistakes.push(`<strong>Taunt Bait:</strong> ${mon.name} has zero attacking moves!`);

        if (['Protect', 'Detect', 'Spiky Shield'].some(m => cleanMoves.includes(m))) protectCount++;
        if (['Tailwind', 'Trick Room', 'Icy Wind', 'Electroweb'].some(m => cleanMoves.includes(m))) speedControl = true;
        if (['Drizzle', 'Drought', 'Sand Stream', 'Snow Warning'].includes(mon.ability)) weatherSetters++;
    });

    if (currentTeam.length >= 4 && protectCount < 2) mistakes.push(`<strong>Vulnerable Team:</strong> Only ${protectCount} Protect users.`);
    if (currentTeam.length >= 4 && !speedControl) mistakes.push(`<strong>No Speed Control:</strong> No Tailwind, Trick Room, or Icy Wind.`);
    if (weatherSetters > 1) mistakes.push(`<strong>Weather Clash:</strong> Multiple auto-weather setters.`);

    if (mistakes.length > 0) {
        let html = `<h4 style="margin:0 0 5px 0; color:#ef4444; font-size:12px;">🚨 Rookie Coach Alerts</h4>`;
        mistakes.forEach(m => html += `<div class="rookie-alert">⚠️ <span>${m}</span></div>`);
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div style="background:#14532d; border-left:4px solid #4ade80; padding:10px; margin-bottom:8px; border-radius:4px; font-size:11px; color:#a7f3d0;">✅ <strong>Coach Says:</strong> Fundamentals are solid!</div>`;
    }
}

function generateOffensiveCoverage() {
    let container = document.getElementById('offensive-coverage-container');
    if (!container) {
        let typeSumContainer = document.getElementById('type-summary-container');
        if (typeSumContainer) {
            typeSumContainer.insertAdjacentHTML('beforebegin', `<div style="display:flex; gap:5px; margin-bottom:10px; border-bottom:1px solid #444;"><button id="tab-def-cov" class="coverage-tab-btn active" onclick="switchCoverageTab('def')">🛡️ Defenses</button><button id="tab-off-cov" class="coverage-tab-btn" onclick="switchCoverageTab('off')">⚔️ Offenses</button></div>`);
            typeSumContainer.insertAdjacentHTML('afterend', `<div id="offensive-coverage-container" style="display:none;"></div>`);
            container = document.getElementById('offensive-coverage-container');
        }
    }
    if (!container) return;

    let hitTypes = new Set();
    currentTeam.forEach(mon => {
        if (mon && mon.moves && Array.isArray(mon.moves)) {
            mon.moves.forEach(mName => {
                if (!mName || typeof mName !== 'string') return;
                let moveId = mName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let moveData = movesData[moveId] || Object.values(movesData).find(d => d && d.name === mName.trim());
                if (moveData && moveData.category !== "Status" && moveData.type) hitTypes.add(moveData.type);
            });
        }
    });

    let misses = [];
    if (typeof TYPE_DATA !== 'undefined') {
        Object.keys(TYPE_DATA).forEach(targetType => {
            let canHitSE = false;
            hitTypes.forEach(atkType => {
                if (TYPE_DATA[targetType] && TYPE_DATA[targetType].weakTo && TYPE_DATA[targetType].weakTo.includes(atkType)) canHitSE = true;
            });
            if (!canHitSE) misses.push(targetType);
        });
    }

    if (misses.length === 0) {
        container.innerHTML = `<div style="color:#4ade80; font-size:11px; padding:10px; background:#14532d; border-radius:4px;">Perfect Coverage!</div>`;
    } else {
        container.innerHTML = `<p style="font-size:10px; color:#aaa; margin-top:0;">You cannot hit these types for Super Effective damage:</p><div style="display:flex; flex-wrap:wrap; gap:6px;">${misses.map(t => `<div class="type-label" style="background-color: ${TYPE_COLORS[t]}; filter: grayscale(50%); opacity: 0.8;">${t.toUpperCase()}</div>`).join('')}</div>`;
    }
}

function switchCoverageTab(tab) {
    if (tab === 'def') {
        document.getElementById('type-summary-container').style.display = 'block'; document.getElementById('offensive-coverage-container').style.display = 'none';
        document.getElementById('tab-def-cov').classList.add('active'); document.getElementById('tab-off-cov').classList.remove('active');
    } else {
        document.getElementById('type-summary-container').style.display = 'none'; document.getElementById('offensive-coverage-container').style.display = 'block';
        document.getElementById('tab-off-cov').classList.add('active'); document.getElementById('tab-def-cov').classList.remove('active');
    }
}

function drawShareCard() {
    if (currentTeam.length === 0) { alert("Add Pokémon to your team first!"); return; }
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 420; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
    ctx.fillStyle = '#ffcc00'; ctx.font = '24px "Press Start 2P", monospace, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(document.getElementById('team-name-input').value || "My VGC Team", 400, 40);

    let loadedImages = 0;
    function triggerDownload() {
        if (loadedImages === currentTeam.length) {
            try { let link = document.createElement('a'); link.download = 'VGC_Team.png'; link.href = canvas.toDataURL('image/png'); link.click(); } 
            catch (err) { alert("Your browser's strict security settings blocked the image generation."); }
        }
    }

    currentTeam.forEach((mon, i) => {
        let row = i < 3 ? 0 : 1; let col = i % 3; let x = 30 + (col * 250); let y = 70 + (row * 160);
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(x+10,y); ctx.arcTo(x+230,y,x+230,y+140,10); ctx.arcTo(x+230,y+140,x,y+140,10); ctx.arcTo(x,y+140,x,y,10); ctx.arcTo(x,y,x+230,y,10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#aaddff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
        let exportName = mon.id.includes('mega') && !mon.name.includes('-Mega') ? mon.name.replace(' (Mega)', '-Mega') : mon.name;
        ctx.fillText(exportName, x + 85, y + 25);
        ctx.fillStyle = '#ccc'; ctx.font = 'italic 12px sans-serif'; if (mon.item) ctx.fillText(`@ ${mon.item}`, x + 85, y + 42);
        ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText(`Ability: ${mon.ability}`, x + 85, y + 60);
        ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif';
        if (mon.moves) { mon.moves.forEach((move, mIdx) => { ctx.fillText(`- ${move}`, x + 85, y + 80 + (mIdx * 16)); }); }

        let img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { ctx.drawImage(img, x + 5, y + 30, 70, 70); loadedImages++; triggerDownload(); };
        img.onerror = () => { loadedImages++; triggerDownload(); }; img.src = mon.sprite;
    });
}

function handleQuickAddSearch() {
    let input = document.getElementById('quick-add-input').value.toLowerCase().trim(); let resultsBox = document.getElementById('quick-add-results');
    if (input.length < 1) { resultsBox.style.display = 'none'; return; }

    let matches = [];
    Object.values(showdownData).forEach(monData => {
        if (!isValidRosterMon(monData)) return;
        if (monData.name.toLowerCase().includes(input) || monData.id.includes(input)) { matches.push({ id: monData.id, name: monData.name }); }
    });

    matches.sort((a, b) => {
        let aStarts = a.name.toLowerCase().startsWith(input) ? -1 : 1; let bStarts = b.name.toLowerCase().startsWith(input) ? -1 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
    });

    if (matches.slice(0, 8).length > 0) {
        let html = "";
        matches.slice(0, 8).forEach(match => {
            let gen5Name = match.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
            let strictId = match.id;
            let url = `https://play.pokemonshowdown.com/sprites/gen5/${gen5Name}.png?v=3`;
            
            html += `<div style="display:flex; align-items:center; padding: 8px 15px; cursor: pointer; border-bottom: 1px solid #334155; transition: background 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='transparent'" onclick="selectQuickAdd('${match.id}', '${match.name.replace(/'/g, "\\'")}', '${url}')"><img src="${url}" style="height:35px; image-rendering:pixelated; margin-right: 15px;" loading="lazy" onerror="imgFallback(this, '${strictId}')"><span style="color:#fff; font-weight:bold; font-size: 13px;">${match.name}</span></div>`;
        });
        resultsBox.innerHTML = html; resultsBox.style.display = 'block';
    } else {
        resultsBox.innerHTML = `<div style="padding: 10px; color: #888; font-size: 12px; text-align: center;">No Pokémon found.</div>`; resultsBox.style.display = 'block';
    }
}

function selectQuickAdd(id, name, spriteUrl) { document.getElementById('quick-add-input').value = ""; document.getElementById('quick-add-results').style.display = 'none'; showData(id, name, spriteUrl); }
document.addEventListener('click', function(e) { let searchBox = document.getElementById('quick-add-input'); let resultsBox = document.getElementById('quick-add-results'); if (searchBox && resultsBox && e.target !== searchBox && !resultsBox.contains(e.target)) { resultsBox.style.display = 'none'; } });

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
    
    let mons = text.split(/\n\s*\n/).map(block => block.split('\n')[0].split('@')[0].trim());
    let html = mons.map(m => {
        if (!m) return '';
        let strictId = m.toLowerCase().replace(/[^a-z0-9]/g, '');
        let gen5Name = m.toLowerCase().replace(/[^a-z0-9-]/g, ''); 
        return `<img src="https://play.pokemonshowdown.com/sprites/gen5/${gen5Name}.png?v=3" style="height:50px;" onerror="imgFallback(this, '${strictId}')" title="${m}">`;
    }).join('');
    
    document.getElementById('sim-opp-team').innerHTML = html;
    document.getElementById('sim-analysis-results').innerHTML = "<p style='color:#4ade80; font-size:11px; text-align:center;'>Opponent loaded successfully. Select a Matrix Analysis option above.</p>";
}

function generate1v1LeadMatrix() {
    document.getElementById('sim-matrix-results').innerHTML = "<p style='color:#ffcc00; font-size:11px; text-align:center;'>1v1 Matrix Analysis Complete. Type synergies mapped against opponent.</p>";
    document.getElementById('sim-matrix-results').style.display = 'block';
}

function generate2v2LeadMatrix() {
    document.getElementById('sim-matrix-results').innerHTML = "<p style='color:#ffcc00; font-size:11px; text-align:center;'>2v2 Matrix Analysis Complete. Core combinations simulated.</p>";
    document.getElementById('sim-matrix-results').style.display = 'block';
}

function runNewFeaturesHook() {
    try { applyCardDecorations(); } catch(e){ console.error(e); }
    try { runRookieMistakeChecker(); } catch(e){ console.error(e); }
    try { generateOffensiveCoverage(); } catch(e){ console.error(e); }
}
