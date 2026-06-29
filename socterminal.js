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

// Logic: Reverse Caesar Cipher (Shift by -3)
function applyReverseCaesar(char) {
    let code = char.charCodeAt(0);
    if (code >= 97 && code <= 122) { // lowercase a-z
        return String.fromCharCode(((code - 97 - 3 + 26) % 26) + 97);
    }
    return char;
}

document.getElementById('generate-pass-btn').addEventListener('click', () => {
    if (wordsArray.length === 0) return;

    const wordCount = parseInt(document.getElementById('pass-words').value) || 3;
    const minLength = Math.min(Math.max(parseInt(document.getElementById('pass-min-length').value) || 16, 8), 64);
    const useSeparator = document.getElementById('pass-sep-special').checked;
    const specialChars = "!@#$%^&*_-+=?";
    const getRandomSpecial = () => specialChars[Math.floor(Math.random() * specialChars.length)];
    const leetMap = {'a':'4', 'e':'3', 'i':'1', 'o':'0'};

    let selectedWords = [];
    let totalLength = 0;

    while (selectedWords.length < wordCount || totalLength < minLength) {
        const randomIdx = Math.floor(Math.random() * wordsArray.length);
        let w = wordsArray[randomIdx].trim().toLowerCase();
        let chars = w.split('');

        // 1. Mandatory Leetspeak on 1 random vowel
        let vowelIndices = [];
        for(let j=0; j<chars.length; j++) {
            if(/[aeio]/.test(chars[j])) vowelIndices.push(j);
        }
        if(vowelIndices.length > 0) {
            let vIdx = vowelIndices[Math.floor(Math.random() * vowelIndices.length)];
            chars[vIdx] = leetMap[chars[vIdx]];
        }

        // 2. Mandatory Reverse Caesar on 1 random letter
        let letterIndices = [];
        for(let j=0; j<chars.length; j++) {
            if(/[a-z]/.test(chars[j])) letterIndices.push(j);
        }
        if(letterIndices.length > 0) {
            let cIdx = letterIndices[Math.floor(Math.random() * letterIndices.length)];
            chars[cIdx] = applyReverseCaesar(chars[cIdx]);
        }

        // 3. Mandatory Uppercase on 1 random letter
        letterIndices = [];
        for(let j=0; j<chars.length; j++) {
            if(/[a-z]/.test(chars[j])) letterIndices.push(j);
        }
        if(letterIndices.length > 0) {
            let uIdx = letterIndices[Math.floor(Math.random() * letterIndices.length)];
            chars[uIdx] = chars[uIdx].toUpperCase();
        }

        selectedWords.push(chars.join(''));
        const projectedSepChars = useSeparator ? Math.max(0, selectedWords.length - 1) : 0;
        totalLength = selectedWords.join('').length + projectedSepChars;
    }

    let phrase = useSeparator 
      ? selectedWords.reduce((acc, word, idx) => idx === 0 ? word : acc + getRandomSpecial() + word, '') 
      : selectedWords.join('');

    // Scrub dictionary spaces
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
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
    });
});


// ==========================================
// RANDOM PICKER ENGINE (Arisan Data Stream)
// ==========================================
let peserta = ["ROOT_USER", "SYS_ADMIN", "GUEST_01", "CYBER_NINJA", "NEO", "TRINITY"];
let pemenang = [];
let audioCtx;
const activeSounds = { scanningOsc: null, scanningGain: null };

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        if (type === 'type') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800 + Math.random()*400, now);
            osc.connect(gain); gain.connect(audioCtx.destination);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'scramble_start') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
            osc.connect(gain); gain.connect(audioCtx.destination);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'scanning_loop_start') {
            if(activeSounds.scanningOsc) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = 200;
            osc.connect(gain); gain.connect(audioCtx.destination);
            gain.gain.value = 0.03;
            osc.start();
            activeSounds.scanningOsc = osc;
            activeSounds.scanningGain = gain;
        } else if (type === 'scanning_loop_stop') {
            if(activeSounds.scanningOsc) {
                activeSounds.scanningGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                activeSounds.scanningOsc.stop(now + 0.1);
                activeSounds.scanningOsc = null;
                activeSounds.scanningGain = null;
            }
        } else if (type === 'lock_target') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.setValueAtTime(0, now + 0.1);
            osc.frequency.setValueAtTime(1200, now + 0.15);
            gain.gain.setValueAtTime(0.1, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'win') {
            const freqs = [440, 554.37, 659.25];
            freqs.forEach(f => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = f;
                osc.connect(gain); gain.connect(audioCtx.destination);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                osc.start(now); osc.stop(now + 1.5);
            });
        }
    } catch(e) { /* Ignore audio context blocks */ }
}

const canvas = document.getElementById('arisanCanvas');
const ctx = canvas.getContext('2d');
let CW, CH;
        
function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 1.5; 
    canvas.height = rect.height * 1.5;
    CW = canvas.width;
    CH = canvas.height;
}
window.addEventListener('resize', resizeCanvas);

class DataTag {
    constructor(text, index) {
        this.text = text;
        this.index = index;
        this.x = Math.random() * CW;
        this.y = Math.random() * CH;
        this.baseVx = (Math.random() - 0.5) * 1.5;
        this.baseVy = (Math.random() - 0.5) * 1.5;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.fontSize = 12 + Math.random() * 8; 
        this.opacity = 0.3 + Math.random() * 0.5; 
        this.isTarget = false; 
        this.isFadingOut = false; 
    }

    update(state) {
        if (state === 'IDLE') {
            this.vx = this.baseVx; this.vy = this.baseVy;
            if(this.isFadingOut) { this.opacity += (1 - this.opacity) * 0.1; this.isFadingOut = false;} 
        } else if (state === 'SCRAMBLE') {
            this.vx = (Math.random() - 0.5) * 40; 
            this.vy = (Math.random() - 0.5) * 40;
            if (Math.random() < 0.05) { this.x = Math.random() * CW; this.y = Math.random() * CH; }
            this.opacity = 0.2 + Math.random() * 0.8; 
        } else if (state === 'SCANNING') {
            if (this.isTarget) {
                this.vx = (CW/2 - this.x) * 0.05;
                this.vy = (CH/2 - this.y) * 0.05;
                this.fontSize += (40 - this.fontSize) * 0.05; 
                this.opacity += (1 - this.opacity) * 0.1; 
            } else {
                this.vx *= 0.9; this.vy *= 0.9;
                this.opacity *= 0.9; this.isFadingOut = true;
            }
        }
        this.x += this.vx; this.y += this.vy;
        if(state !== 'SCANNING' || !this.isTarget) {
            if (this.x < -100) this.x = CW + 100;
            if (this.x > CW + 100) this.x = -100;
            if (this.y < -50) this.y = CH + 50;
            if (this.y > CH + 50) this.y = -50;
        }
    }

    draw(ctx, state) {
        if (this.isFadingOut && this.opacity < 0.01) return;
        ctx.font = `bold ${this.fontSize}px ui-monospace, SFMono-Regular, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if (state === 'SCANNING' && this.isTarget) {
            ctx.fillStyle = `rgba(250, 240, 0, ${this.opacity})`; // Secondary color (Yellow)
            ctx.shadowColor = '#FAF000'; ctx.shadowBlur = 20;
            
            const w = ctx.measureText(this.text).width + 40;
            const h = this.fontSize + 40;
            ctx.strokeStyle = `rgba(250, 240, 0, ${this.opacity})`; ctx.lineWidth = 2;
            const len = 15;
            ctx.beginPath(); ctx.moveTo(this.x - w/2, this.x - w/2 + len); ctx.lineTo(this.x - w/2, this.y - h/2); ctx.lineTo(this.x - w/2 + len, this.y - h/2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x + w/2 - len, this.y - h/2); ctx.lineTo(this.x + w/2, this.y - h/2); ctx.lineTo(this.x + w/2, this.y - h/2 + len); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x - w/2, this.y + h/2 - len); ctx.lineTo(this.x - w/2, this.y + h/2); ctx.lineTo(this.x - w/2 + len, this.y + h/2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x + w/2 - len, this.y + h/2); ctx.lineTo(this.x + w/2, this.y + h/2); ctx.lineTo(this.x + w/2, this.y + h/2 - len); ctx.stroke();
        } else {
            ctx.fillStyle = `rgba(0, 242, 234, ${this.opacity})`; // Primary color (Cyan)
            ctx.shadowBlur = 0; 
            if (state === 'SCRAMBLE' && Math.random() < 0.1) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)'; 
                ctx.fillText(this.text, this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10);
            }
        }
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}

let tags = [];
let animState = 'IDLE'; 
let animTimer = 0;
let targetScrambleFrames = 180; 
let scanningFrames = 120; 
let selectedWinnerData = null;

function initTags() {
    const pesertaAktif = peserta.filter(p => !pemenang.includes(p));
    tags = pesertaAktif.map((nama, i) => new DataTag(nama, i));
}

function updateStatusUI() {
    const statusEl = document.getElementById('recStatus');
    const btn = document.getElementById('btnKocok');
    
    if (animState === 'IDLE') {
        statusEl.textContent = 'IDLE';
        statusEl.style.color = 'var(--primary-color)';
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'INITIATE_DATA_SCRAMBLE';
        btn.style.opacity = '1';
    } else if (animState === 'SCRAMBLE') {
        statusEl.textContent = 'SCRAMBLING_DATA...';
        statusEl.style.color = 'var(--secondary-color)';
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'PROCESSING...';
        btn.style.opacity = '0.5';
    } else if (animState === 'SCANNING') {
        statusEl.textContent = 'ISOLATING_TARGET...';
        statusEl.style.color = 'var(--secondary-color)';
    }
}

function drawCanvasHUD(ctx) {
    ctx.fillStyle = 'rgba(0, 242, 234, 0.15)';
    for(let x = 0; x < CW; x += 40) {
        for(let y = 0; y < CH; y += 40) {
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

function animateLoop() {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.4)'; 
    ctx.fillRect(0, 0, CW, CH);
    drawCanvasHUD(ctx);
    
    if (animState === 'SCRAMBLE') {
        animTimer++;
        if(activeSounds.scanningOsc && activeSounds.scanningOsc.frequency) {
            activeSounds.scanningOsc.frequency.setValueAtTime(100 + Math.random() * 800, audioCtx.currentTime);
        }
        if (animTimer > targetScrambleFrames) {
            animState = 'SCANNING'; animTimer = 0;
            playSound('scanning_loop_stop'); playSound('lock_target'); 
            
            if (tags.length > 0) {
                const winIndex = Math.floor(Math.random() * tags.length);
                tags[winIndex].isTarget = true;
                selectedWinnerData = tags[winIndex].text;
            }
            updateStatusUI();
        }
    } else if (animState === 'SCANNING') {
        animTimer++;
        if (animTimer % 4 === 0) { 
            ctx.strokeStyle = 'rgba(0, 242, 234, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, CH/2); ctx.lineTo(CW, CH/2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke();
        }
        if (animTimer > scanningFrames) {
            animState = 'IDLE'; 
            if (selectedWinnerData) {
                pemenang.push(selectedWinnerData); 
                tampilkanPemenangModal(selectedWinnerData);
            }
        }
    }
    tags.forEach(tag => { tag.update(animState); tag.draw(ctx, animState); });
    requestAnimationFrame(animateLoop);
}

document.getElementById('btnKocok').addEventListener('click', () => {
    initAudio(); 
    let durasi = parseInt(document.getElementById('inputDurasi').value);
    if (isNaN(durasi) || durasi < 3) durasi = 3; 
    document.getElementById('inputDurasi').value = durasi; 
    targetScrambleFrames = durasi * 60; 

    const pesertaAktif = peserta.filter(p => !pemenang.includes(p));
    if (peserta.length === 0 || pesertaAktif.length === 0) return;
    if (animState !== 'IDLE') return;

    animState = 'SCRAMBLE'; animTimer = 0; selectedWinnerData = null;
    tags.forEach(t => { t.isTarget = false; t.isFadingOut = false; t.opacity = 0.3 + Math.random() * 0.5; });
    updateStatusUI();
    playSound('scramble_start');
    setTimeout(() => playSound('scanning_loop_start'), 300); 
});

// OWASP Safe DOM Rendering
function renderUI() {
    const pesertaAktif = peserta.filter(p => !pemenang.includes(p));
    document.getElementById('canvasEntityCount').textContent = pesertaAktif.length;
    document.getElementById('totalPeserta').textContent = peserta.length;

    const listP = document.getElementById('listPeserta');
    listP.textContent = ''; 
    
    if (peserta.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.textAlign = 'center'; emptyLi.style.opacity = '0.3'; emptyLi.style.padding = '0.5rem';
        emptyLi.textContent = '> NULL';
        listP.appendChild(emptyLi);
    } else {
        peserta.forEach((nama, index) => {
            const isWinner = pemenang.includes(nama);
            const li = document.createElement('li');
            li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
            li.style.padding = '0.35rem'; li.style.borderBottom = '1px solid rgba(0, 242, 234, 0.2)';
            
            const divLeft = document.createElement('div');
            divLeft.style.display = 'flex'; divLeft.style.alignItems = 'center'; divLeft.style.gap = '0.5rem';
            
            const spanIdx = document.createElement('span');
            spanIdx.textContent = `[${index}]`; spanIdx.style.opacity = '0.5'; spanIdx.style.fontSize = '0.65rem';
            
            const nameEl = document.createElement(isWinner ? 'del' : 'span');
            nameEl.textContent = nama;
            if (isWinner) nameEl.style.opacity = '0.4';

            divLeft.appendChild(spanIdx); divLeft.appendChild(nameEl);
            
            if (isWinner) {
                const tag = document.createElement('span');
                tag.textContent = 'EXT'; tag.style.fontSize = '0.5rem'; tag.style.background = 'rgba(250,240,0,0.2)'; tag.style.color = 'var(--secondary-color)'; tag.style.padding = '1px 3px'; tag.style.marginLeft = '5px';
                divLeft.appendChild(tag);
            }
            li.appendChild(divLeft);
            listP.appendChild(li);
        });
    }

    const listW = document.getElementById('listPemenang');
    const emptyW = document.getElementById('emptyPemenang');
    listW.textContent = ''; 
    
    if (pemenang.length === 0) {
        emptyW.style.display = 'flex';
    } else {
        emptyW.style.display = 'none';
        [...pemenang].reverse().forEach((nama, i) => {
            const li = document.createElement('li');
            li.style.display = 'flex'; li.style.alignItems = 'center'; li.style.gap = '0.5rem';
            li.style.padding = '0.3rem 0.5rem'; li.style.borderLeft = '2px solid var(--secondary-color)';
            li.style.background = 'rgba(250,240,0,0.1)'; li.style.marginBottom = '4px';
            
            const spanRnd = document.createElement('span');
            spanRnd.textContent = `RES_${String(pemenang.length - i).padStart(2, '0')}:`; spanRnd.style.opacity = '0.4'; spanRnd.style.fontSize = '0.65rem';
            
            const strongName = document.createElement('strong');
            strongName.textContent = nama; strongName.style.color = 'var(--secondary-color)';
            
            li.appendChild(spanRnd); li.appendChild(strongName);
            listW.appendChild(li);
        });
    }
    initTags();
}

document.getElementById('inputNama').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') document.getElementById('btnSimpan').click();
});

document.getElementById('btnSimpan').addEventListener('click', () => {
    const input = document.getElementById('inputNama');
    let nama = input.value.trim().toUpperCase().replace(/\s+/g, '_');
    if (nama.length > 20) nama = nama.substring(0, 20);
    if (!nama) return;
    if (peserta.includes(nama)) return; // Simple deduplication block
    peserta.push(nama);
    playSound('type');
    input.value = '';
    renderUI();
});

document.getElementById('btnPurge').addEventListener('click', () => {
    pemenang = []; playSound('type'); renderUI();
});

function tampilkanPemenangModal(nama) {
    playSound('win');
    const modal = document.getElementById('modalPemenang');
    document.getElementById('namaPemenangModal').textContent = nama;
    
    modal.classList.remove('hidden');
    
    // Adapted Confetti to Cyan/Yellow Theme
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 20, spread: 360, ticks: 80, zIndex: 100, colors: ['#00F2EA', '#FAF000', '#ffffff', '#009e99'] };

    function randomInRange(min, max) { return Math.random() * (max - min) + min; }
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 40 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.9), y: 0 }, shapes: ['square'], gravity: 1.2, scalar: randomInRange(0.5, 1.2) }));
    }, 250);
}

document.getElementById('btnAcknowledge').addEventListener('click', () => {
    playSound('type');
    const modal = document.getElementById('modalPemenang');
    modal.classList.add('hidden');
    animState = 'IDLE';
    updateStatusUI();
    renderUI(); 
});


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

    // Init Random Picker
    resizeCanvas();
    renderUI();
    animateLoop();
});
