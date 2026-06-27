// ==========================================
// SYSTEM CLOCKS & UPTIME
// ==========================================
function updateClocks() {
    const now = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    
    const formatTime = (offsetHours) => {
        const targetTime = new Date(now.getTime() + (offsetHours * 3600 * 1000));
        const dd = String(targetTime.getUTCDate()).padStart(2, '0');
        const mmm = months[targetTime.getUTCMonth()];
        const yyyy = targetTime.getUTCFullYear();
        const hh = String(targetTime.getUTCHours()).padStart(2, '0');
        const min = String(targetTime.getUTCMinutes()).padStart(2, '0');
        const ss = String(targetTime.getUTCSeconds()).padStart(2, '0');
        return `${dd}-${mmm}-${yyyy} ${hh}:${min}:${ss}`;
    };

    document.getElementById('clock-utc').textContent = `UTC [ ${formatTime(0)} ]`;
    document.getElementById('clock-utc3').textContent = `UTC+3 [ ${formatTime(3)} ]`;
    document.getElementById('clock-utc7').textContent = `UTC+7 [ ${formatTime(7)} ]`;
}

function calculateUptime() {
    const launchDate = new Date("2026-02-15T00:00:00Z"); 
    const currentDate = new Date();
    const differenceInTime = currentDate.getTime() - launchDate.getTime();
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
    document.getElementById('uptime-days').textContent = differenceInDays >= 0 ? differenceInDays : 0;
}

setInterval(updateClocks, 1000);
updateClocks();
window.addEventListener('DOMContentLoaded', calculateUptime);


// ==========================================
// SECURE FORENSIC INGESTION ENGINE
// ==========================================
function initSecureDropzone(cfg) {
    const zone = document.getElementById(cfg.zoneId);
    const input = document.getElementById(cfg.inputId);
    const warnEl = document.getElementById(cfg.warnId);
    const manifestEl = document.getElementById(cfg.manifestId);

    if (!zone || !input) return;

    const triggerWarning = (text) => {
        warnEl.textContent = `[SYS_WARN]: ${text}`;
        warnEl.classList.remove('hidden');
    };

    const clearWarning = () => {
        warnEl.textContent = '';
        warnEl.classList.add('hidden');
    };

    const processPayload = (fileList) => {
        clearWarning();
        const accepted = [];
        const rejected = [];

        Array.from(fileList).forEach(file => {
            const lowerName = file.name.toLowerCase();
            const isAuthorized = cfg.allowedExts.some(ext => lowerName.endsWith(ext));

            if (isAuthorized) {
                accepted.push(file);
            } else {
                rejected.push(file.name);
            }
        });

        if (rejected.length > 0) {
            triggerWarning(`Ignored unauthorized format(s): [ ${rejected.join(', ')} ]. Strictly expecting: ${cfg.allowedExts.join(' ')}`);
        }

        if (manifestEl && accepted.length > 0) {
            manifestEl.textContent = ''; 
            accepted.forEach(f => {
                const row = document.createElement('div');
                row.className = 'manifest-row';
                const isEncryptedArchive = f.name.endsWith('.zip') || f.name.endsWith('.7z');
                const tag = isEncryptedArchive ? '[CONTAINER: ENCRYPTED]' : '[MOUNTED]';
                row.textContent = `${tag} ${f.name} — (${(f.size / 1024).toFixed(2)} KB)`;
                manifestEl.appendChild(row);
            });
        }

        if (cfg.onSuccess && accepted.length > 0) {
            cfg.onSuccess(accepted);
        }
    };

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => processPayload(e.target.files));

    ['dragenter', 'dragover'].forEach(eName => {
        zone.addEventListener(eName, (e) => { e.preventDefault(); zone.classList.add('active-drag'); });
    });

    ['dragleave', 'drop'].forEach(eName => {
        zone.addEventListener(eName, (e) => { e.preventDefault(); zone.classList.remove('active-drag'); });
    });

    zone.addEventListener('drop', (e) => processPayload(e.dataTransfer.files));
}


// ==========================================
// PASSWORD GENERATOR LOGIC
// ==========================================
const WORDS_JSON_URL = "./words.json"; 
let wordsArray = [];

const leetMap = {
    'o': '0', 'O': '0', 'i': '1', 'I': '1', 'e': '3', 'E': '3',
    'A': '4', 'a': '4', 'G': '6', 'g': '9', 'S': '5', 's': '5',
    'T': '7', 't': '7', 'B': '8', 'b': '8'
};

const specialChars = "!@#$%^&*_-+=?";

async function fetchWords() {
    try {
        const response = await fetch(WORDS_JSON_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        const rawData = await response.json();
        wordsArray = [];
        for (const key in rawData) {
            if (Array.isArray(rawData[key])) {
                wordsArray = wordsArray.concat(rawData[key]);
            }
        }
        wordsArray = wordsArray.filter(word => word !== "...");
    } catch (error) {
        console.warn("[SYS_WARN] Failed to fetch words.json, using fallback dictionary.");
        wordsArray = ["cyber", "terminal", "matrix", "network", "system", "hacker", "breach", "firewall"];
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchWords();

    // Intake Dropzones Boot
    initSecureDropzone({ zoneId: 'zone-mail', inputId: 'input-mail', warnId: 'warn-mail', manifestId: 'manifest-mail', allowedExts: ['.eml', '.msg', '.zip', '.7z'] });
    initSecureDropzone({ zoneId: 'zone-doc', inputId: 'input-doc', warnId: 'warn-doc', manifestId: 'manifest-doc', allowedExts: ['.doc', '.docx', '.docm', '.xls', '.xlsx', '.xlsm', '.pdf', '.vbs', '.ps1', '.zip', '.7z'] });
    initSecureDropzone({
        zoneId: 'zone-bvc', inputId: 'input-bvc', warnId: 'warn-bvc', allowedExts: ['.csv', '.txt'],
        onSuccess: (files) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const textarea = document.getElementById('bvc-input');
                if (textarea) { textarea.value = e.target.result.trim(); textarea.dispatchEvent(new Event('input')); }
            };
            reader.readAsText(files[0]);
        }
    });
});

document.getElementById('generate-pass-btn').addEventListener('click', () => {
    if (wordsArray.length === 0) return;

    const wordCount = parseInt(document.getElementById('pass-words').value) || 3;
    let rawMinLen = parseInt(document.getElementById('pass-min-length').value) || 16;
    const minLength = Math.min(Math.max(rawMinLen, 8), 64);
    
    const specStart = document.getElementById('pass-spec-start').checked;
    const specEnd = document.getElementById('pass-spec-end').checked;
    const capStart = document.getElementById('pass-cap-start').checked;
    const capEnd = document.getElementById('pass-cap-end').checked;
    const numStart = document.getElementById('pass-num-start').checked; // Grabbed UI state
    const numEnd = document.getElementById('pass-num-end').checked;     // Grabbed UI state
    const useLeet = document.getElementById('pass-leet').checked;
    const useSeparator = document.getElementById('pass-sep-special').checked;

    const getRandomSpecial = () => specialChars[Math.floor(Math.random() * specialChars.length)];
    const getRandomNum = () => String(Math.floor(Math.random() * 90 + 10)); // Generates clean 2-digit number (e.g. "47")

    let selectedWords = [];
    let totalLength = 0;

    while (selectedWords.length < wordCount || totalLength < minLength) {
        const randomIdx = Math.floor(Math.random() * wordsArray.length);
        let w = wordsArray[randomIdx].trim().toLowerCase();
        
        if (capStart && w.length > 0) w = w.charAt(0).toUpperCase() + w.slice(1);
        if (capEnd && w.length > 1) {
            w = w.slice(0, -1) + w.slice(-1).toUpperCase();
        } else if (capEnd && w.length === 1) w = w.toUpperCase();

        selectedWords.push(w);
        
        const projectedSepChars = useSeparator ? Math.max(0, selectedWords.length - 1) : 0;
        const projectedNumChars = (numStart ? 2 : 0) + (numEnd ? 2 : 0);
        totalLength = selectedWords.join('').length + projectedSepChars + projectedNumChars;
    }

    let phrase = useSeparator 
      ? selectedWords.reduce((acc, word, idx) => idx === 0 ? word : acc + getRandomSpecial() + word, '') 
      : selectedWords.join('');

    if (useLeet) phrase = phrase.split('').map(char => leetMap[char] || char).join('');

    // Attach Numbers inside phrase boundaries
    if (numStart) phrase = getRandomNum() + phrase;
    if (numEnd) phrase = phrase + getRandomNum();

    // Attach Specials outside phrase boundaries
    if (specStart) phrase = getRandomSpecial() + phrase;
    if (specEnd) phrase = phrase + getRandomSpecial();

    phrase = phrase.replace(/\s/g, () => getRandomSpecial());

    document.getElementById('pass-output').value = phrase;
    document.getElementById('pass-length-display').textContent = `[${phrase.length} CHARS]`;
});

document.getElementById('copy-pass-btn').addEventListener('click', () => {
    const output = document.getElementById('pass-output');
    if (!output.value) return;
    
    navigator.clipboard.writeText(output.value).then(() => {
        const btn = document.getElementById('copy-pass-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
    });
});


// ==========================================
// WHEEL OF SPIN LOGIC
// ==========================================
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const segmentInput = document.getElementById('segmentCount');
const namesContainer = document.getElementById('namesList');
const updateBtn = document.getElementById('updateBtn');
const spinPlayBtn = document.getElementById('spinPlayBtn');
const historyBody = document.getElementById('historyBody');
const noHistoryMsg = document.getElementById('noHistory');
const activeCountLabel = document.getElementById('activeCount');
const emptyMessage = document.getElementById('emptyMessage');

let names = []; 
let rotation = 0;
let velocity = 0;
let friction = 0.988;
let isSpinning = false;
let winningSegmentIdx = -1;
let showResultVisuals = false; 
let historyLog = [];

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 210;
const colors = ['#00F2EA', '#FAF000'];

function initWheel() {
    const savedNames = localStorage.getItem('wheelNames');
    if (savedNames) { names = JSON.parse(savedNames); segmentInput.value = names.length; } 
    else { generateDefaultNames(); }
    updateInputs(true);
    requestAnimationFrame(animate);
}

function generateDefaultNames() {
    const count = parseInt(segmentInput.value) || 6;
    names = Array.from({length: count}, (_, i) => `TARGET_${i+1}`);
}

segmentInput.addEventListener('change', (e) => {
    const newCount = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 48);
    if (newCount > names.length) {
        for(let i = names.length; i < newCount; i++) names.push(`TARGET_${i+1}`);
    } else if (newCount < names.length) {
        names = names.slice(0, newCount);
    }
    updateInputs(true);
});

function updateInputs(fromInit = false) {
    const count = Math.min(Math.max(parseInt(segmentInput.value) || 1, 1), 48);
    if (!fromInit && count !== names.length) generateDefaultNames();
    
    namesContainer.textContent = ''; 
    names.forEach((name, i) => {
        const div = document.createElement('div');
        div.className = 'name-input-wrapper';
        
        const span = document.createElement('span');
        span.className = 'idx'; span.textContent = i + 1;
        
        const input = document.createElement('input');
        input.type = 'text'; input.maxLength = 25; input.dataset.idx = i;
        input.className = 'name-input'; input.placeholder = 'Name...'; input.value = name; 
        
        div.appendChild(span); div.appendChild(input); namesContainer.appendChild(div);
    });

    document.querySelectorAll('.name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            names[parseInt(e.target.dataset.idx)] = e.target.value || `TARGET_${parseInt(e.target.dataset.idx) + 1}`;
            saveToLocal(); drawWheel();
        });
    });

    activeCountLabel.textContent = `${names.length} ACTIVE`;
    emptyMessage.style.display = names.length > 0 ? 'none' : 'block';
    saveToLocal(); drawWheel();
}

function saveToLocal() { localStorage.setItem('wheelNames', JSON.stringify(names)); }

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (names.length === 0) return;
    const sliceAngle = (Math.PI * 2) / names.length;
    
    names.forEach((name, i) => {
        const startAngle = rotation + (i * sliceAngle);
        ctx.save(); ctx.beginPath(); ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.fillStyle = colors[i % colors.length];
        ctx.strokeStyle = '#050505'; ctx.lineWidth = 2;
        
        if (showResultVisuals && i === winningSegmentIdx) { 
          ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fillStyle = '#ffffff';
        }
        ctx.fill(); ctx.stroke();
        
        ctx.translate(centerX, centerY); ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#050505';
        ctx.font = 'bold 13px ui-monospace, SFMono-Regular, monospace'; 
        ctx.fillText(name.substring(0, 25), radius - 20, 4); ctx.restore();
    });
}

function animate() {
    if (Math.abs(velocity) > 0.001) {
        rotation += velocity; velocity *= friction;
        if (!isSpinning) { isSpinning = true; showResultVisuals = false; spinPlayBtn.classList.add('spinning-state'); }
    } else if (isSpinning) { 
      velocity = 0; isSpinning = false; calculateWinner(); 
    }
    drawWheel(); requestAnimationFrame(animate);
}

spinPlayBtn.addEventListener('click', () => {
    if (names.length === 0 || isSpinning) return;
    velocity = 0.25 + Math.random() * 0.15;
});

function calculateWinner() {
    if (names.length === 0) return;
    const sliceSize = (Math.PI * 2) / names.length;
    winningSegmentIdx = Math.floor(((Math.PI * 1.5) - (((rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2))) / sliceSize);
    winningSegmentIdx = (winningSegmentIdx % names.length + names.length) % names.length;
    
    const winner = names[winningSegmentIdx];
    showResultVisuals = true; spinPlayBtn.classList.remove('spinning-state');
    
    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}`;
    historyLog.unshift({ round: historyLog.length + 1, name: winner, time: timeStr });
    updateHistoryTable();
    
    setTimeout(() => { 
      names.splice(winningSegmentIdx, 1); winningSegmentIdx = -1; showResultVisuals = false; 
      segmentInput.value = names.length; updateInputs(true); 
    }, 2500);
}

function updateHistoryTable() {
    historyBody.textContent = ''; 
    if (historyLog.length > 0) noHistoryMsg.style.display = 'none';
    
    historyLog.forEach(item => {
        const tr = document.createElement('tr');
        const tdRound = document.createElement('td'); tdRound.textContent = `#${item.round}`;
        const tdName = document.createElement('td'); tdName.style.color = 'var(--secondary-color)'; tdName.textContent = item.name; 
        const tdTime = document.createElement('td'); tdTime.textContent = item.time;
        tr.appendChild(tdRound); tr.appendChild(tdName); tr.appendChild(tdTime);
        historyBody.appendChild(tr);
    });
}

updateBtn.addEventListener('click', () => { 
  historyLog = []; updateHistoryTable(); noHistoryMsg.style.display = 'block';
  generateDefaultNames(); updateInputs(); rotation = 0; spinPlayBtn.classList.remove('spinning-state');
});

window.addEventListener('DOMContentLoaded', initWheel);
