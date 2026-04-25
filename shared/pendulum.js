// Refactored metronome implementation using shared modules
const VISUAL_OFFSET_MS = 0;
const START_ANGLE = -45;
const DEFAULT_BPM = 120;
const PENDULUM_ARC_START = -135;
const PENDULUM_ARC_END = -45;
const PENDULUM_SWING_AMPLITUDE = 45;
const PENDULUM_PIVOT_Y_RATIO = 0.85;

const LOOKAHEAD_SEC = 0.05;
const SCHEDULER_PERIOD_MS = 25;
const FLASH_DURATION_SEC = 0.08;
const FLASH_ACCENT_ALPHA = 230;
const FLASH_NORMAL_ALPHA = 140;
const FLASH_ACCENT_COLOR = '#ffaa22';
const FLASH_NORMAL_COLOR = '#ffffff';

class MetronomeState {
    constructor() {
        this.angle = START_ANGLE;
        this.bpm = DEFAULT_BPM;
        this.rate = DEFAULT_BPM / 60;       // beats per second
        this.phaseAnchorTime = 0;           // audio context time at the anchor
        this.phaseAnchorValue = 0;          // phase value at the anchor
        this.nextScheduledBeat = 0;         // next integer beat not yet queued
        this.isRunning = false;
        this.audioCtx = null;
        this.presetIndex = 0;
        this.tickBuffer = null;
        this.accentBuffer = null;
        this.flashOverlay = null;
    }
}

const config = getMetronomeConfig();
const presetLoader = new PresetLoader();
const state = new MetronomeState();

function phaseAt(t) {
    return state.phaseAnchorValue + (t - state.phaseAnchorTime) * state.rate;
}

function timeOfBeat(n) {
    return state.phaseAnchorTime + (n - state.phaseAnchorValue) / state.rate;
}

async function setup() {
    let canvas = createCanvas(config.canvasWidth, config.canvasHeight);
    canvas.parent('metronomeCanvas');

    state.flashOverlay = document.createElement('div');
    state.flashOverlay.id = 'flashOverlay';
    state.flashOverlay.style.cssText =
        'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(state.flashOverlay);

    try {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.error('Fatal error: Failed to initialize audio context:', error);
        return;
    }

    try {
        await presetLoader.loadPresets(config.presetFile);
        console.log('Presets loaded successfully');
    } catch (error) {
        console.error('Failed to load presets:', error);
    }

    const initialPreset = presetLoader.getCurrentPreset();
    if (initialPreset) state.bpm = initialPreset.bpm;

    loadSounds();
    createUI();
    window.addEventListener("keydown", handleKeyPress);
    updatePresetDisplay();
}

function draw() {
    background(0);

    let flashAlpha = 0;
    let flashColor = FLASH_NORMAL_COLOR;

    if (state.isRunning) {
        const t = state.audioCtx.currentTime + VISUAL_OFFSET_MS / 1000;
        const phi = phaseAt(t);

        // Pendulum cycles every 2 beats: phase 0 -> -45°, phase 1 -> +45°, phase 2 -> -45°.
        const swingPhase = (((phi % 2) + 2) % 2) * Math.PI;
        state.angle = -Math.cos(swingPhase) * PENDULUM_SWING_AMPLITUDE;

        const lastBeat = Math.floor(phi);
        if (lastBeat >= 0) {
            const sinceLastBeat = (phi - lastBeat) / state.rate;
            if (sinceLastBeat < FLASH_DURATION_SEC) {
                const preset = presetLoader.getCurrentPreset();
                if (preset) {
                    const beatInBar = lastBeat % preset.beatsPerMeasure;
                    const accented = preset.accentBeats.includes(beatInBar);
                    const baseAlpha = accented ? FLASH_ACCENT_ALPHA : FLASH_NORMAL_ALPHA;
                    flashAlpha = baseAlpha * (1 - sinceLastBeat / FLASH_DURATION_SEC);
                    flashColor = accented ? FLASH_ACCENT_COLOR : FLASH_NORMAL_COLOR;
                }
            }
        }
    }

    if (state.flashOverlay) {
        state.flashOverlay.style.background = flashColor;
        state.flashOverlay.style.opacity = flashAlpha / 255;
    }

    drawMetronome();
}

function drawMetronome() {
    push();
    translate(width / 2, height * PENDULUM_PIVOT_Y_RATIO);

    const pendulumLength = height * config.pendulumLengthRatio;
    const arcDiameter = pendulumLength * 2;

    noStroke();
    fill(30);
    arc(0, 0, arcDiameter, arcDiameter, radians(PENDULUM_ARC_START), radians(PENDULUM_ARC_END), PIE);

    rotate(radians(state.angle - 180));
    stroke(255);
    strokeWeight(8);
    line(0, 0, 0, pendulumLength);
    pop();
}

function loadSounds() {
    fetch(config.tickSound)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load tick sound: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(data => state.audioCtx.decodeAudioData(data))
        .then(buffer => state.tickBuffer = buffer)
        .catch(error => {
            console.error('Fatal error: Failed to load tick sound:', error);
        });

    fetch(config.tockSound)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load tock sound: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(data => state.audioCtx.decodeAudioData(data))
        .then(buffer => state.accentBuffer = buffer)
        .catch(error => {
            console.error('Fatal error: Failed to load tock sound:', error);
        });
}

function playTickAt(audioTime, isAccented) {
    if (!state.tickBuffer || !state.accentBuffer) {
        console.error('Fatal error: Audio buffers not loaded');
        return;
    }
    const source = state.audioCtx.createBufferSource();
    source.buffer = isAccented ? state.accentBuffer : state.tickBuffer;
    source.connect(state.audioCtx.destination);
    source.start(audioTime);
}

function scheduleTicks() {
    if (!state.isRunning) return;

    const preset = presetLoader.getCurrentPreset();
    if (!preset) {
        setTimeout(scheduleTicks, SCHEDULER_PERIOD_MS);
        return;
    }

    const horizon = state.audioCtx.currentTime + LOOKAHEAD_SEC;
    while (timeOfBeat(state.nextScheduledBeat) <= horizon) {
        const t = timeOfBeat(state.nextScheduledBeat);
        const beatInBar = state.nextScheduledBeat % preset.beatsPerMeasure;
        const isAccented = preset.accentBeats.includes(beatInBar);
        playTickAt(t, isAccented);
        state.nextScheduledBeat++;
    }

    setTimeout(scheduleTicks, SCHEDULER_PERIOD_MS);
}

function startMetronome() {
    if (!state.audioCtx) {
        console.error('Fatal error: Audio context not initialized');
        return;
    }

    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume().then(() => {
            console.log('Audio context resumed');
            _startMetronomeAfterAudioReady();
        }).catch(error => {
            console.error('Failed to resume audio context:', error);
        });
        return;
    }

    _startMetronomeAfterAudioReady();
}

function _startMetronomeAfterAudioReady() {
    const preset = presetLoader.getCurrentPreset();
    if (preset) {
        state.bpm = preset.bpm;
    }
    state.rate = state.bpm / 60;
    state.phaseAnchorTime = state.audioCtx.currentTime;
    state.phaseAnchorValue = 0;
    state.nextScheduledBeat = 0;
    state.isRunning = true;
    scheduleTicks();
}

function setBPM(newBpm) {
    state.bpm = newBpm;
    if (!state.isRunning) {
        state.rate = newBpm / 60;
        return;
    }
    const t = state.audioCtx.currentTime;
    state.phaseAnchorValue = phaseAt(t);
    state.phaseAnchorTime = t;
    state.rate = newBpm / 60;
}

function stopMetronome() {
    state.isRunning = false;
    state.angle = START_ANGLE;
}

function setPreset(preset) {
    presetLoader.setCurrentPreset(state.presetIndex);
    if (preset) state.bpm = preset.bpm;
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
        setBPM(state.bpm + 1);
        updatePresetDisplay();
    } else if (event.key === "ArrowDown") {
        setBPM(state.bpm - 1);
        updatePresetDisplay();
    }

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

    const presetNameElement = document.querySelector('.preset-name');
    const presetDetailsElement = document.querySelector('.preset-details');

    if (!presetNameElement || !presetDetailsElement) {
        console.warn('Preset display elements not found');
        return;
    }

    if (preset) {
        presetNameElement.textContent = preset.name;
        presetDetailsElement.textContent =
            `${state.bpm} BPM, Dob: ${preset.beatsPerMeasure}, Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]`;
    } else {
        presetNameElement.textContent = 'Loading...';
        presetDetailsElement.textContent = '';
    }
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

    if (!leftContainer || !rightContainer) {
        console.warn('Preset containers not found');
        return;
    }

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

        if (index < config.presetColumnSplit) {
            leftContainer.appendChild(presetDiv);
        } else {
            rightContainer.appendChild(presetDiv);
        }
    });
}

function highlightSelectedPreset(containers, selectedPresetDiv) {
    if (!presetLoader.presets || presetLoader.presets.length === 0) {
        console.warn('Cannot highlight preset - no presets loaded');
        return;
    }

    if (!containers || containers.length === 0) {
        console.warn('No containers provided for highlighting');
        return;
    }

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

    if (selectedPresetDiv) {
        selectedPresetDiv.classList.add('selected');
    }
}
