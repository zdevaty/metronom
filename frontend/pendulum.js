// Refactored metronome implementation using shared modules
const VISUAL_OFFSET_MS = -0; // Visual offset in milliseconds (adjust as needed)

let angle = -45; // Starting angle for pendulum
let bpm = 120; // Default BPM
let interval = 60000 / bpm; // Convert BPM to ms
let lastTick = 0;
let isRunning = false;
let audioCtx;
let startTime = 0;
let beatCount = 0; // Track beats for accenting first beat
let presetIndex = 0; // Track selected preset
let tickBuffer, accentBuffer;
let nextTickTime = 0;
let flashAlpha = 0; // Controls flash intensity
const FLASH_DECAY = 50; // How fast the flash fades out

// Initialize shared modules
const config = getMetronomeConfig();
const presetLoader = new PresetLoader();

async function setup() {
    let canvas = createCanvas(config.canvasWidth, config.canvasHeight);
    canvas.parent('metronomeCanvas'); // Place canvas in specific div

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
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
    let time = millis() - startTime + VISUAL_OFFSET_MS; // offset added here

    if (isRunning) {
        let totalBeatsElapsed = (time / interval) / 2;
        let phase = (totalBeatsElapsed - 0.25 % 1);
        angle = Math.sin(phase * PI * 2) * 45;
    }

    // **Apply the flash effect as a white overlay**
    if (flashAlpha > 0) {
        fill(255, flashAlpha); // White overlay with variable transparency
        rect(0, 0, width, height); // Cover entire screen
        flashAlpha = max(0, flashAlpha - FLASH_DECAY); // Reduce flash gradually
    }

    drawMetronome();
}

function drawMetronome() {
    push();
    // Set the pivot clearly visible, a bit down from top center
    translate(width / 2, height * 0.85);

    const pendulumLength = height * config.pendulumLengthRatio;
    const arcDiameter = pendulumLength * 2;

    // Draw the visible swing range
    noStroke();
    fill(30);
    arc(0, 0, arcDiameter, arcDiameter, radians(-135), radians(-45), PIE);

    // Rotate pendulum (upside down)
    rotate(radians(angle - 180));
    stroke(255);
    strokeWeight(8);
    line(0, 0, 0, pendulumLength);
    pop();
}

function loadSounds() {
    fetch(config.tickSound).then(response => response.arrayBuffer()).then(data => {
        audioCtx.decodeAudioData(data, buffer => tickBuffer = buffer);
    });
    fetch(config.tockSound).then(response => response.arrayBuffer()).then(data => {
        audioCtx.decodeAudioData(data, buffer => accentBuffer = buffer);
    });
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
        let beatInMeasure = beatCount % presetLoader.getCurrentPreset().beatsPerMeasure;
        let isAccented = presetLoader.getCurrentPreset().accentBeats.includes(beatInMeasure);

        playTick(isAccented);

        flashAlpha = isAccented ? 200 : 100; // Brighter flash on accented beats

        nextTickTime += interval / 1000;
        beatCount++;
    }
    setTimeout(scheduleTicks, 25);
}

function startMetronome() {
    updateBPM();
    isRunning = true;
    startTime = millis();
    nextTickTime = audioCtx.currentTime;
    beatCount = 0;
    scheduleTicks();
}

function updateBPM() {
    let oldInterval = interval;
    bpm = presetLoader.getCurrentPreset().bpm;
    interval = 60000 / bpm;

    // Calculate how far into the current beat we are (in audio context time)
    let timeNow = audioCtx.currentTime;
    let timeSinceLastTick = timeNow - (nextTickTime - oldInterval / 1000);
    let beatProgressRatio = timeSinceLastTick / (oldInterval / 1000);

    // Adjust next tick time based on new interval
    nextTickTime = timeNow + ((1 - beatProgressRatio) * (interval / 1000));

    // Also update startTime to keep visuals synchronized
    let visualTimeNow = millis();
    let timeSinceVisualStart = visualTimeNow - startTime;
    let visualProgressRatio = timeSinceVisualStart / oldInterval;

    // Recalculate startTime for visuals
    startTime = visualTimeNow - visualProgressRatio * interval;
}

function stopMetronome() {
    isRunning = false;
    angle = -45;
}

function setPreset(preset) {
    presetLoader.setCurrentPreset(presetIndex);
    startMetronome();
    updatePresetDisplay();
}

function handleKeyPress(event) {
    if (event.key === "ArrowRight") {
        presetLoader.nextPreset();
        presetIndex = presetLoader.getCurrentPresetIndex();
        setPreset(presetLoader.getCurrentPreset());
    } else if (event.key === "ArrowLeft") {
        presetLoader.previousPreset();
        presetIndex = presetLoader.getCurrentPresetIndex();
        setPreset(presetLoader.getCurrentPreset());
    } else if (event.key === " ") {
        isRunning ? stopMetronome() : startMetronome();
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
    let selectedPresetDiv = allPresets[presetIndex];

    if (selectedPresetDiv) {
        highlightSelectedPreset(containers, selectedPresetDiv);
    }
}

function updatePresetDisplay() {
    let display = document.getElementById("presetDisplay");
    let preset = presetLoader.getCurrentPreset();
    
    if (preset) {
        document.querySelector('.preset-name').textContent = preset.name;
        document.querySelector('.preset-details').textContent = 
            `${preset.bpm} BPM, Dob: ${preset.beatsPerMeasure}, Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]`;
    } else {
        document.querySelector('.preset-name').textContent = 'Loading...';
        document.querySelector('.preset-details').textContent = '';
    }
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

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
            presetIndex = index;
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

    // Reset all presets to their default styling
    containers.forEach(container => {
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