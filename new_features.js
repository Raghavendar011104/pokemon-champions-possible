// --- NEW BEGINNER COACH FEATURES ---

let beginnerModeEnabled = true;

// 1. Starter Kit Auto-Fill Database
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
    
    alert(`Loaded standard VGC Starter Kit for ${mon.name}!`);
}
// 2 & 3. Role Tags & Turn 1 Flow Indicators
function applyCardDecorations() {
    if (!beginnerModeEnabled) return;
    
    let slots = document.querySelectorAll('.team-slot.filled');
    slots.forEach((slot, i) => {
        let mon = currentTeam[i];
        if (!mon) return;

        // Flow Icons (Added pointer-events: auto so native tooltips work!)
        let iconsHTML = "";
        if (mon.moves.includes('Fake Out')) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Fake Out">✋</span>`;
        if (['Protect', 'Detect', 'Spiky Shield', 'Wide Guard'].some(m => mon.moves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Protect">🛡️</span>`;
        if (['Follow Me', 'Rage Powder'].some(m => mon.moves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Redirection">🧲</span>`;
        if (['Tailwind', 'Trick Room', 'Icy Wind', 'Electroweb'].some(m => mon.moves.includes(m))) iconsHTML += `<span style="pointer-events: auto; cursor: help;" title="Has Speed Control">⏱️</span>`;
        
        if (iconsHTML !== "") {
            slot.insertAdjacentHTML('beforeend', `<div class="flow-icons">${iconsHTML}</div>`);
        }

        // Role Tags with Tooltip Explanations
        let tagClass = ""; let tagText = ""; let tagDesc = "";
        let atk = showdownData[mon.id] ? showdownData[mon.id].baseStats.atk : 50;
        let spa = showdownData[mon.id] ? showdownData[mon.id].baseStats.spa : 50;
        let isSupport = ['Fake Out', 'Parting Shot', 'Spore', 'Tailwind', 'Will-O-Wisp'].filter(m => mon.moves.includes(m)).length >= 2;

        if (isSupport || mon.item === 'Mental Herb') { 
            tagClass = "tag-support"; 
            tagText = "SUPPORT"; 
            tagDesc = "Focuses on helping the team with speed control, redirection, or status moves rather than direct damage.";
        }
        else if (mon.item === 'Assault Vest' || mon.item === 'Rocky Helmet' || mon.ability === 'Regenerator') { 
            tagClass = "tag-tank"; 
            tagText = "BULKY/TANK"; 
            tagDesc = "Designed to take multiple hits and disrupt the opponent while surviving longer than standard attackers.";
        }
        else if (atk > spa) { 
            tagClass = "tag-physical"; 
            tagText = "PHYSICAL"; 
            tagDesc = "A primary attacker that uses its Attack stat. Be careful, its damage can be reduced by Intimidate and Burn!";
        }
        else { 
            tagClass = "tag-special"; 
            tagText = "SPECIAL"; 
            tagDesc = "A primary attacker that uses its Special Attack stat. Great because it ignores Intimidate and Burn penalties.";
        }

        if (mon.moves.length > 0) {
            slot.insertAdjacentHTML('beforeend', `
                <div class="role-tag ${tagClass} tooltip" style="width: auto !important; height: auto !important; border-radius: 4px !important; pointer-events: auto; cursor: help; margin: 0;">
                    ${tagText}
                    <span class="tooltip-text" style="font-weight: normal; text-transform: none; bottom: 150%; white-space: normal; font-size: 10px; color: #fff;">${tagDesc}</span>
                </div>
            `);
        }
    });
}

// 4. The Rookie Mistake Checker
function runRookieMistakeChecker() {
    let container = document.getElementById('rookie-mistake-container');
    if (!container) {
        document.getElementById('speed-tier-container').insertAdjacentHTML('afterend', `<div id="rookie-mistake-container"></div>`);
        container = document.getElementById('rookie-mistake-container');
    }
    
    if (!beginnerModeEnabled || currentTeam.length === 0) {
        container.innerHTML = "";
        return;
    }

    let mistakes = [];
    let protectCount = 0;
    let speedControl = false;
    let weatherSetters = 0;

    currentTeam.forEach(mon => {
        // Assault Vest Anti-Synergy
        if (mon.item === 'Assault Vest') {
            let hasStatus = mon.moves.some(m => {
                let moveData = movesData[m.toLowerCase().replace(/[^a-z0-9]/g, '')];
                return moveData && moveData.category === "Status";
            });
            if (hasStatus) mistakes.push(`<strong>Assault Vest Error:</strong> ${mon.name} holds an Assault Vest but has a Status move. The vest prevents you from using it!`);
        }

        if (['Protect', 'Detect', 'Spiky Shield'].some(m => mon.moves.includes(m))) protectCount++;
        if (['Tailwind', 'Trick Room', 'Icy Wind', 'Electroweb'].some(m => mon.moves.includes(m))) speedControl = true;
        if (['Drizzle', 'Drought', 'Sand Stream', 'Snow Warning'].includes(mon.ability)) weatherSetters++;
    });

    if (currentTeam.length >= 4 && protectCount < 2) {
        mistakes.push(`<strong>Vulnerable Team:</strong> You only have ${protectCount} Protect users. In VGC Doubles, having 3-4 Pokémon with Protect is highly recommended to stall out opponent strategies.`);
    }
    if (currentTeam.length >= 4 && !speedControl) {
        mistakes.push(`<strong>No Speed Control:</strong> Your team has no Tailwind, Trick Room, or Icy Wind. You will be at the mercy of the opponent's pace!`);
    }
    if (weatherSetters > 1) {
        mistakes.push(`<strong>Weather Clash:</strong> You have multiple auto-weather setters. They will override each other and mess up your synergy!`);
    }

    if (mistakes.length > 0) {
        let html = `<h4 style="margin:0 0 5px 0; color:#ef4444; font-size:12px;">🚨 Rookie Coach Alerts</h4>`;
        mistakes.forEach(m => html += `<div class="rookie-alert">⚠️ <span>${m}</span></div>`);
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div style="background:#14532d; border-left:4px solid #4ade80; padding:10px; margin-bottom:8px; border-radius:4px; font-size:11px; color:#a7f3d0;">✅ <strong>Coach Says:</strong> Your team fundamentals look solid! No major rookie mistakes detected.</div>`;
    }
}

// 5. Offensive Coverage Analyzer
function generateOffensiveCoverage() {
    let container = document.getElementById('offensive-coverage-container');
    if (!container) {
        let typeSumContainer = document.getElementById('type-summary-container');
        typeSumContainer.insertAdjacentHTML('beforebegin', `
            <div style="display:flex; gap:5px; margin-bottom:10px; border-bottom:1px solid #444;">
                <button id="tab-def-cov" class="coverage-tab-btn active" onclick="switchCoverageTab('def')">🛡️ Defenses</button>
                <button id="tab-off-cov" class="coverage-tab-btn" onclick="switchCoverageTab('off')">⚔️ Offenses</button>
            </div>
        `);
        typeSumContainer.insertAdjacentHTML('afterend', `<div id="offensive-coverage-container" style="display:none;"></div>`);
        container = document.getElementById('offensive-coverage-container');
    }

    let hitTypes = new Set();
    currentTeam.forEach(mon => {
        if (mon.moves) {
            mon.moves.forEach(mName => {
                let moveId = mName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let moveData = movesData[moveId] || Object.values(movesData).find(d => d.name === mName);
                if (moveData && moveData.category !== "Status") {
                    hitTypes.add(moveData.type);
                    
                    // --- DYNAMIC MOVE SMART OVERRIDES ---
                    
                    // 1. Make Weather Ball context-aware
                    if (moveId === 'weatherball') {
                        if (currentTeam.some(m => m.ability === 'Drizzle')) hitTypes.add('Water');
                        if (currentTeam.some(m => m.ability === 'Drought')) hitTypes.add('Fire');
                        if (currentTeam.some(m => ['Snow Warning', 'Chilly Reception'].includes(m.ability))) hitTypes.add('Ice');
                        if (currentTeam.some(m => m.ability === 'Sand Stream')) hitTypes.add('Rock');
                    }
                    
                    // 2. Make Tera Blast context-aware
                    if (moveId === 'terablast' && mon.teraType) {
                        hitTypes.add(mon.teraType);
                    }
                    
                    // 3. Make Ivy Cudgel context-aware
                    if (moveId === 'ivycudgel') {
                        if (mon.id === 'ogerponhearthflame') hitTypes.add('Fire');
                        if (mon.id === 'ogerponwellspring') hitTypes.add('Water');
                        if (mon.id === 'ogerponcornerstone') hitTypes.add('Rock');
                    }
                }
            });
        }
    });

    let misses = [];
    Object.keys(TYPE_DATA).forEach(targetType => {
        let canHitSE = false;
        hitTypes.forEach(atkType => {
            if (TYPE_DATA[targetType] && TYPE_DATA[targetType].weakTo.includes(atkType)) canHitSE = true;
        });
        if (!canHitSE) misses.push(targetType);
    });

    if (misses.length === 0) {
        container.innerHTML = `<div style="color:#4ade80; font-size:11px; padding:10px; background:#14532d; border-radius:4px;">Perfect Coverage! Your equipped attacks can hit EVERY type for Super Effective damage.</div>`;
    } else {
        container.innerHTML = `
            <p style="font-size:10px; color:#aaa; margin-top:0;">Based on your equipped moves, you cannot hit these types for Super Effective damage:</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${misses.map(t => `<div class="type-label" style="background-color: ${TYPE_COLORS[t]}; filter: grayscale(50%); opacity: 0.8;">${t.toUpperCase()}</div>`).join('')}
            </div>
        `;
    }
}

function switchCoverageTab(tab) {
    if (tab === 'def') {
        document.getElementById('type-summary-container').style.display = 'block';
        document.getElementById('offensive-coverage-container').style.display = 'none';
        document.getElementById('tab-def-cov').classList.add('active');
        document.getElementById('tab-off-cov').classList.remove('active');
    } else {
        document.getElementById('type-summary-container').style.display = 'none';
        document.getElementById('offensive-coverage-container').style.display = 'block';
        document.getElementById('tab-off-cov').classList.add('active');
        document.getElementById('tab-def-cov').classList.remove('active');
    }
}

// 6. Share Card Generator (Canvas)
function drawShareCard() {
    if (currentTeam.length === 0) { alert("Add Pokémon to your team first!"); return; }
    
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 420;
    const ctx = canvas.getContext('2d');

    // Draw Background
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
    
    ctx.fillStyle = '#ffcc00'; ctx.font = '24px "Press Start 2P", monospace, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(document.getElementById('team-name-input').value || "My VGC Team", 400, 40);

    let loadedImages = 0;
    
    currentTeam.forEach((mon, i) => {
        let row = i < 3 ? 0 : 1;
        let col = i % 3;
        let x = 30 + (col * 250);
        let y = 70 + (row * 160);

        ctx.fillStyle = '#1e293b'; ctx.fillRoundRect = function(x,y,w,h,r) { this.beginPath(); this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r); this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); this.fill(); }
        ctx.fillRoundRect(x, y, 230, 140, 10);

        ctx.fillStyle = '#aaddff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
        let exportName = mon.id.includes('mega') && !mon.name.includes('-Mega') ? mon.name.replace(' (Mega)', '-Mega') : mon.name;
        ctx.fillText(exportName, x + 85, y + 25);
        
        ctx.fillStyle = '#ccc'; ctx.font = 'italic 12px sans-serif';
        if (mon.item) ctx.fillText(`@ ${mon.item}`, x + 85, y + 42);
        
        ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
        ctx.fillText(`Ability: ${mon.ability}`, x + 85, y + 60);

        ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif';
        if (mon.moves) {
            mon.moves.forEach((move, mIdx) => { ctx.fillText(`- ${move}`, x + 85, y + 80 + (mIdx * 16)); });
        }

        let img = new Image();
        img.crossOrigin = "anonymous"; // Bypass CORS for Canvas
        img.onload = () => {
            ctx.drawImage(img, x + 5, y + 30, 70, 70);
            loadedImages++;
            if (loadedImages === currentTeam.length) {
                let link = document.createElement('a');
                link.download = 'VGC_Team.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        };
        img.onerror = () => { loadedImages++; };
        img.src = mon.sprite;
    });
}

// Master Hook
function runNewFeaturesHook() {
    applyCardDecorations();
    runRookieMistakeChecker();
    generateOffensiveCoverage();
}
