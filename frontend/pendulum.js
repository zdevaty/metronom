let angle = -45; // Starting angle for pendulum
let bpm = 120; // Default BPM
let interval = 60000 / bpm; // Convert BPM to ms
let lastTick = 0;
let isRunning = false;
let audioCtx;
let startTime = 0;
let subdivision = 1; // Default: quarter notes
let beatCount = 0; // Track beats for accenting first beat
let presetIndex = 0; // Track selected preset
let tickBuffer, accentBuffer;
let nextTickTime = 0;

let tempoPresets = [
    { name: "Nocka 1", bpm: 60, subdivision: 1, accentBeats: [0] },
    { name: "Nocka 2", bpm: 90, subdivision: 3, accentBeats: [0, 1] },
    { name: "Nocka 3", bpm: 90, subdivision: 3, accentBeats: [0, 2] },
    { name: "Nocka 4", bpm: 110, subdivision: 4, accentBeats: [0, 1] },
    { name: "Nocka 5", bpm: 130, subdivision: 2, accentBeats: [1] },
    { name: "Nocka 6", bpm: 150, subdivision: 3, accentBeats: [0, 1, 2] }
];
let currentPreset = tempoPresets[0];

function setup() {
    createCanvas(400, 400);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    loadSounds();
    createUI();
    window.addEventListener("keydown", handleKeyPress);
    updatePresetDisplay();
}

function loadSounds() {
    fetch("tick.mp3").then(response => response.arrayBuffer()).then(data => {
        audioCtx.decodeAudioData(data, buffer => tickBuffer = buffer);
    });
    fetch("tock.mp3").then(response => response.arrayBuffer()).then(data => {
        audioCtx.decodeAudioData(data, buffer => accentBuffer = buffer);
    });
}

function draw() {
    background(220);
    let time = millis() - startTime;
    
    if (isRunning) {
        let totalBeatsElapsed = (time / interval) / 2; // Count beats precisely
        let phase = (totalBeatsElapsed - 0.25 % 1); // Normalize phase (0 to 1). -0.25 to beat in extremes, not center
        angle = Math.sin(phase * PI * 2) * 45; // Sync pendulum with tick
    }

    drawMetronome();
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

function playTick(isAccented) {
    let source = audioCtx.createBufferSource();
    source.buffer = isAccented ? accentBuffer : tickBuffer;
    source.connect(audioCtx.destination);
    source.start(nextTickTime);
}

function scheduleTicks() {
    if (!isRunning) return;
    while (nextTickTime < audioCtx.currentTime + 0.1) {
        let beatInMeasure = beatCount % subdivision;
        let isAccented = currentPreset.accentBeats.includes(beatInMeasure);
        playTick(isAccented);
        nextTickTime += interval / 1000 / subdivision;
        beatCount++;
    }
    setTimeout(scheduleTicks, 25);
}

function startMetronome() {
    bpm = currentPreset.bpm;
    interval = 60000 / bpm;
    subdivision = currentPreset.subdivision;
    isRunning = true;
    startTime = millis();
    nextTickTime = audioCtx.currentTime;
    beatCount = 0;
    scheduleTicks();
}

function stopMetronome() {
    isRunning = false;
    angle = -45;
}

function setPreset(preset) {
    currentPreset = preset;
    startMetronome();
    updatePresetDisplay();
}

function handleKeyPress(event) {
    if (event.key === "ArrowRight") {
        presetIndex = (presetIndex + 1) % tempoPresets.length;
        setPreset(tempoPresets[presetIndex]);
    } else if (event.key === "ArrowLeft") {
        presetIndex = (presetIndex - 1 + tempoPresets.length) % tempoPresets.length;
        setPreset(tempoPresets[presetIndex]);
    } else if (event.key === " ") {
        isRunning ? stopMetronome() : startMetronome();
    }
}

function updatePresetDisplay() {
    let display = document.getElementById("presetDisplay");
    if (!display) {
        display = document.createElement("div");
        display.id = "presetDisplay";
        display.style.marginTop = "10px";
        document.body.appendChild(display);
    }
    display.textContent = `${currentPreset.name} (${currentPreset.bpm} BPM, Sub: ${currentPreset.subdivision}, Accent: [${currentPreset.accentBeats.map(n => n + 1).join(', ')}])`;
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
    tempoPresets.forEach((preset, index) => {
        let btn = document.createElement("button");
        btn.textContent = `${preset.name} (${preset.bpm} BPM, Sub: ${preset.subdivision}, Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}])`;
        btn.onclick = () => {
            presetIndex = index;
            setPreset(preset);
        };
        presetContainer.appendChild(btn);
    });
    controls.appendChild(presetContainer);
}

