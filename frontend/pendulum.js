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
let tickSound = new Audio("tick.mp3");
let accentSound = new Audio("tock.mp3");

// Preset list with BPM and subdivision pairs
let tempoPresets = [
    { name: "Nocka 1", bpm: 60, subdivision: 1 },
    { name: "Nocka 2", bpm: 75, subdivision: 2 },
    { name: "Nocka 3", bpm: 90, subdivision: 3 },
    { name: "Nocka 4", bpm: 110, subdivision: 4 },
    { name: "Nocka 5", bpm: 130, subdivision: 2 },
    { name: "Nocka 6", bpm: 150, subdivision: 3 }
];

function setup() {
    createCanvas(400, 400);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    createUI();
    window.addEventListener("keydown", handleKeyPress);
    updatePresetDisplay();
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
    if (isFirstBeat) {
        accentSound.currentTime = 0;
        accentSound.play();
    } else {
        tickSound.currentTime = 0;
        tickSound.play();
    }
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
    angle = -45;
}

function setPreset(preset) {
    document.getElementById("bpm").value = preset.bpm;
    document.getElementById("subdivision").value = preset.subdivision;
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
    } else if (event.key === " ") { // Spacebar
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
    display.textContent = `${tempoPresets[presetIndex].name} (${tempoPresets[presetIndex].bpm} BPM, Sub: ${tempoPresets[presetIndex].subdivision})`;
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
        btn.textContent = preset.name + ` (${preset.bpm} BPM, Sub: ${preset.subdivision})`;
        btn.onclick = () => {
            presetIndex = index;
            setPreset(preset);
        };
        presetContainer.appendChild(btn);
    });
    controls.appendChild(presetContainer);
}
