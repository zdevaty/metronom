// Refactored metronome implementation using shared modules
const VISUAL_OFFSET_MS = -0; // Visual offset in milliseconds (adjust as needed)
const START_ANGLE = -45; // Starting angle for pendulum
const DEFAULT_BPM = 120; // Default BPM
const FLASH_DECAY = 50; // How fast the flash fades out
const PENDULUM_ARC_START = -135; // Pendulum arc start angle
const PENDULUM_ARC_END = -45; // Pendulum arc end angle
const PENDULUM_SWING_AMPLITUDE = 45; // Pendulum swing amplitude in degrees
const PENDULUM_PIVOT_Y_RATIO = 0.85; // Pendulum pivot Y position ratio

// Encapsulate metronome state in a class
class MetronomeState {
    constructor() {
        this.angle = START_ANGLE;
        this.bpm = DEFAULT_BPM;
        this.interval = 60000 / this.bpm;
        this.lastTick = 0;
        this.isRunning = false;
        this.audioCtx = null;
        this.startTime = 0;
        this.beatCount = 0;
        this.presetIndex = 0;
        this.tickBuffer = null;
        this.accentBuffer = null;
        this.nextTickTime = 0;
        this.flashAlpha = 0;
    }
}

// Initialize shared modules
const config = getMetronomeConfig();
const presetLoader = new PresetLoader();
const state = new MetronomeState();

async function setup() {
    let canvas = createCanvas(config.canvasWidth, config.canvasHeight);
    canvas.parent('metronomeCanvas'); // Place canvas in specific div

    // Initialize audio context
    try {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.error('Fatal error: Failed to initialize audio context:', error);
        return;
    }
    
    // Load presets first
    try {
        await presetLoader.loadPresets(config.presetFile);
        console.log('Presets loaded successfully');
    } catch (error) {
        console.error('Failed to load presets:', error);
    }
    
    loadSounds();
    createUI();
    window.addEventListener("keydown", handleKeyPress);
    updatePresetDisplay();
}

function draw() {
    background(0); // Dark background
    let time = millis() - state.startTime + VISUAL_OFFSET_MS; // offset added here

    if (state.isRunning) {
        let totalBeatsElapsed = (time / state.interval) / 2;
        let phase = (totalBeatsElapsed - 0.25 % 1);
        state.angle = Math.sin(phase * PI * 2) * PENDULUM_SWING_AMPLITUDE;
    }

    // **Apply the flash effect as a white overlay**
    if (state.flashAlpha > 0) {
        fill(255, state.flashAlpha); // White overlay with variable transparency
        rect(0, 0, width, height); // Cover entire screen
        state.flashAlpha = max(0, state.flashAlpha - FLASH_DECAY); // Reduce flash gradually
    }

    drawMetronome();
}

function drawMetronome() {
    push();
    // Set the pivot clearly visible, a bit down from top center
    translate(width / 2, height * PENDULUM_PIVOT_Y_RATIO);

    const pendulumLength = height * config.pendulumLengthRatio;
    const arcDiameter = pendulumLength * 2;

    // Draw the visible swing range
    noStroke();
    fill(30);
    arc(0, 0, arcDiameter, arcDiameter, radians(PENDULUM_ARC_START), radians(PENDULUM_ARC_END), PIE);

    // Rotate pendulum (upside down)
    rotate(radians(state.angle - 180));
    stroke(255);
    strokeWeight(8);
    line(0, 0, 0, pendulumLength);
    pop();
}

function loadSounds() {
    // Load tick sound with error handling
    fetch(config.tickSound)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load tick sound: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(data => state.audioCtx.decodeAudioData(data))
        .then(buffer => state.tickBuffer = buffer)
        .catch(error => {
            console.error('Fatal error: Failed to load tick sound:', error);
            // This is fatal - metronome won't work without sounds
        });

    // Load tock sound with error handling
    fetch(config.tockSound)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load tock sound: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(data => state.audioCtx.decodeAudioData(data))
        .then(buffer => state.accentBuffer = buffer)
        .catch(error => {
            console.error('Fatal error: Failed to load tock sound:', error);
            // This is fatal - metronome won't work without sounds
        });
}

function playTick(isAccented) {
    // Check if audio buffers are loaded
    if (!state.tickBuffer || !state.accentBuffer) {
        console.error('Fatal error: Audio buffers not loaded');
        return;
    }

    let source = state.audioCtx.createBufferSource();
    source.buffer = isAccented ? state.accentBuffer : state.tickBuffer;
    source.connect(state.audioCtx.destination);
    source.start(state.nextTickTime);
}

function scheduleTicks() {
    if (!state.isRunning) return;
    while (state.nextTickTime < state.audioCtx.currentTime + 0.1) {
        let beatInMeasure = state.beatCount % presetLoader.getCurrentPreset().beatsPerMeasure;
        let isAccented = presetLoader.getCurrentPreset().accentBeats.includes(beatInMeasure);

        playTick(isAccented);

        state.flashAlpha = isAccented ? 200 : 100; // Brighter flash on accented beats

        state.nextTickTime += state.interval / 1000;
        state.beatCount++;
    }
    setTimeout(scheduleTicks, 25);
}

function startMetronome() {
    // Check if audio context is ready
    if (!state.audioCtx) {
        console.error('Fatal error: Audio context not initialized');
        return;
    }

    updateBPM();
    state.isRunning = true;
    state.startTime = millis();
    state.nextTickTime = state.audioCtx.currentTime;
    state.beatCount = 0;
    scheduleTicks();
}

function updateBPM() {
    let oldInterval = state.interval;
    state.bpm = presetLoader.getCurrentPreset().bpm;
    state.interval = 60000 / state.bpm;

    // Calculate how far into the current beat we are (in audio context time)
    let timeNow = state.audioCtx.currentTime;
    let timeSinceLastTick = timeNow - (state.nextTickTime - oldInterval / 1000);
    let beatProgressRatio = timeSinceLastTick / (oldInterval / 1000);

    // Adjust next tick time based on new interval
    state.nextTickTime = timeNow + ((1 - beatProgressRatio) * (state.interval / 1000));

    // Also update startTime to keep visuals synchronized
    let visualTimeNow = millis();
    let timeSinceVisualStart = visualTimeNow - state.startTime;
    let visualProgressRatio = timeSinceVisualStart / oldInterval;

    // Recalculate startTime for visuals
    state.startTime = visualTimeNow - visualProgressRatio * state.interval;
}

function stopMetronome() {
    state.isRunning = false;
    state.angle = START_ANGLE;
}

function setPreset(preset) {
    presetLoader.setCurrentPreset(state.presetIndex);
    startMetronome();
    updatePresetDisplay();
}

function handleKeyPress(event) {
    if (event.key === "ArrowRight") {
        presetLoader.nextPreset();
        state.presetIndex = presetLoader.getCurrentPresetIndex();
        setPreset(presetLoader.getCurrentPreset());
    } else if (event.key === "ArrowLeft") {
        presetLoader.previousPreset();
        state.presetIndex = presetLoader.getCurrentPresetIndex();
        setPreset(presetLoader.getCurrentPreset());
    } else if (event.key === " ") {
        state.isRunning ? stopMetronome() : startMetronome();
    } else if (event.key === "ArrowUp") {
        presetLoader.updateCurrentPresetBPM(1);
        updateBPM();
        updatePresetDisplay();
    } else if (event.key === "ArrowDown") {
        presetLoader.updateCurrentPresetBPM(-1);
        updateBPM();
        updatePresetDisplay();
    }

    // **Find the selected preset's div and highlight it**
    const containers = [document.getElementById("presetContainerLeft"), document.getElementById("presetContainerRight")];
    let allPresets = [...containers[0].children, ...containers[1].children];
    let selectedPresetDiv = allPresets[state.presetIndex];

    if (selectedPresetDiv) {
        highlightSelectedPreset(containers, selectedPresetDiv);
    }
}

function updatePresetDisplay() {
    let display = document.getElementById("presetDisplay");
    let preset = presetLoader.getCurrentPreset();
    
    // Add null checks for DOM elements
    const presetNameElement = document.querySelector('.preset-name');
    const presetDetailsElement = document.querySelector('.preset-details');
    
    if (!presetNameElement || !presetDetailsElement) {
        console.warn('Preset display elements not found');
        return;
    }
    
    if (preset) {
        presetNameElement.textContent = preset.name;
        presetDetailsElement.textContent = 
            `${preset.bpm} BPM, Dob: ${preset.beatsPerMeasure}, Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]`;
    } else {
        presetNameElement.textContent = 'Loading...';
        presetDetailsElement.textContent = '';
    }
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

    // Add null checks for containers
    if (!leftContainer || !rightContainer) {
        console.warn('Preset containers not found');
        return;
    }

    // Check if presets are loaded
    if (!presetLoader.presets || presetLoader.presets.length === 0) {
        console.warn('No presets available for UI creation');
        return;
    }

    presetLoader.presets.forEach((preset, index) => {
        let presetDiv = document.createElement("div");
        presetDiv.className = `preset-item ${preset.drums ? 'drums-true' : 'drums-false'}`;
        presetDiv.innerHTML = `
            <strong>${preset.name}</strong><br>
            <span class="small-text">
                ${preset.bpm > 0 ? `${preset.bpm} BPM | Dob: ${preset.beatsPerMeasure} | Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]` : "—"}
            </span>
        `;

        presetDiv.addEventListener("click", () => {
            state.presetIndex = index;
            presetLoader.setCurrentPreset(index);
            setPreset(presetLoader.getCurrentPreset());
            highlightSelectedPreset([leftContainer, rightContainer], presetDiv);
        });

        // Place first N presets in left column, the rest in right column
        if (index < config.presetColumnSplit) {
            leftContainer.appendChild(presetDiv);
        } else {
            rightContainer.appendChild(presetDiv);
        }
    });
}

function highlightSelectedPreset(containers, selectedPresetDiv) {
    // Check if presets are loaded
    if (!presetLoader.presets || presetLoader.presets.length === 0) {
        console.warn('Cannot highlight preset - no presets loaded');
        return;
    }

    // Add null check for containers
    if (!containers || containers.length === 0) {
        console.warn('No containers provided for highlighting');
        return;
    }

    // Reset all presets to their default styling
    containers.forEach(container => {
        if (!container) return;
        
        Array.from(container.children).forEach((div) => {
            const presetIndex = Array.from(container.children).indexOf(div);
            const preset = presetLoader.presets[presetIndex];
            
            if (preset) {
                div.className = `preset-item ${preset.drums ? 'drums-true' : 'drums-false'}`;
            }
        });
    });

    // Apply highlight only to the selected preset
    if (selectedPresetDiv) {
        selectedPresetDiv.classList.add('selected');
    }
}