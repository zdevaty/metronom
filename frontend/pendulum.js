let angle = -45; // Starting angle for pendulum
let bpm = 120; // Default BPM
let interval = 60000 / bpm; // Convert BPM to ms
let lastTick = 0;
let isRunning = false;
let audioCtx;
let startTime = 0;
let subdivision = 1; // Default: quarter notes
let tempoPresets = [60, 80, 100, 120, 140, 160];
let beatCount = 0; // Track beats for accenting first beat

function setup() {
    createCanvas(400, 400);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    createUI();
}

function draw() {
    background(220);
    let time = millis() - startTime;
    
    if (isRunning) {
        let totalBeatsElapsed = (time / interval) * subdivision / 2; // Count beats precisely
        let phase = (totalBeatsElapsed % 1); // Normalize phase (0 to 1)
        angle = Math.sin(phase * PI * 2) * 45; // Sync pendulum with tick
    }

    drawMetronome();
    
    if (isRunning && millis() - lastTick >= interval / subdivision) {
        playTick(beatCount % subdivision === 0);
        lastTick = millis(); // Use absolute timing to avoid drift
        beatCount++;
    }
}

function drawMetronome() {
    translate(width / 2, height / 3);
    stroke(0);
    strokeWeight(8);
    line(0, 0, 0, 150); // Base
    push();
    rotate(radians(angle));
    line(0, 0, 0, 150); // Pendulum
    pop();
}

function playTick(isFirstBeat) {
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.value = isFirstBeat ? 1200 : 800; // Higher tone for first beat
    gainNode.gain.value = isFirstBeat ? 0.3 : 0.2; // Louder first beat
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function startMetronome() {
    bpm = parseInt(document.getElementById("bpm").value);
    interval = 60000 / bpm;
    subdivision = parseInt(document.getElementById("subdivision").value);
    isRunning = true;
    startTime = millis(); // Reset start time to sync animation with ticking
    lastTick = -1000000; // Ensure first tick happens immediately
    beatCount = 0;
}

function stopMetronome() {
    isRunning = false;
}

function setPreset(presetBPM) {
    document.getElementById("bpm").value = presetBPM;
    startMetronome();
}

function createUI() {
    let controls = document.getElementById("controls");
    
    let subdivisionSelect = document.createElement("select");
    subdivisionSelect.id = "subdivision";
    let options = { "Quarter Notes": 1, "Eighth Notes": 2, "Triplets": 3, "Sixteenth Notes": 4 };
    for (let key in options) {
        let option = document.createElement("option");
        option.value = options[key];
        option.textContent = key;
        subdivisionSelect.appendChild(option);
    }
    controls.appendChild(subdivisionSelect);
    
    let presetContainer = document.createElement("div");
    tempoPresets.forEach(preset => {
        let btn = document.createElement("button");
        btn.textContent = preset + " BPM";
        btn.onclick = () => setPreset(preset);
        presetContainer.appendChild(btn);
    });
    controls.appendChild(presetContainer);
}
