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

let tempoPresets = [
    { name: "1. Zabili", bpm: 70, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "2. Křížem krážem", bpm: 120, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "3. Tmavá nocka 1", bpm: 75, beatsPerMeasure: 2, accentBeats: [0], drums: false},
    { name: "4. Z Kokavy", bpm: 76, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "5. Ani tak nehoří", bpm: 60, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "6. Nepůjdu od tebe", bpm: 160, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "7. Šibeničky", bpm: 110, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "8. Tmavá Nocka 2", bpm: 64, beatsPerMeasure: 6, accentBeats: [0], drums: true},
    { name: "9. Horní, Dolní Ořešany", bpm: 87, beatsPerMeasure: 2, accentBeats: [0], drums: true},
    { name: "10. Nebudu orat ani set", bpm: 120, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "11. + 12. Tam v tom lese v Bukovině", bpm: 128, beatsPerMeasure: 2, accentBeats: [0], drums: true},
    { name: "13. Tmavá nocka 3", bpm: 74, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "14. Kterýpak jste který", bpm: 82, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "15. Nepovídej milá mamince", bpm: 94, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "16. Tam u řeky na kraji", bpm: 174, beatsPerMeasure: 3, accentBeats: [0], drums: true},
    { name: "17. Pod javorem na tom poli", bpm: 165, beatsPerMeasure: 3, accentBeats: [0], drums: true},
    { name: "18. Tam nahoře na tom kopci", bpm: 76, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "19. Večer zmizí", bpm: 78, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "20. Ach bože přebože", bpm: 176, beatsPerMeasure: 8, accentBeats: [0, 3, 6], drums: true},
    { name: "21. Chytají mě chlapci", bpm: 58, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "22. Kamarádi moji", bpm: 80, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "23. Milá moje milá", bpm: 97, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "24. Pojďme chlapci", bpm: 144, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "25. Zazpívejme,chlapci", bpm: 66, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "26. Jede forman dolinou", bpm: 144, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "27. Tmavá nocka 4", bpm: 65, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "28. My jsme dobří chlapci", bpm: 68, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "29. Nocka 5", bpm: 66, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "30. Chodí horou", bpm: 125, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "31. Nepůjdu od tebe", bpm: 68, beatsPerMeasure: 4, accentBeats: [0], drums: false},
    { name: "32. Jatelinka", bpm: 132, beatsPerMeasure: 4, accentBeats: [0], drums: true},
    { name: "33. Tam u řeky na kraji", bpm: 174, beatsPerMeasure: 3, accentBeats: [0], drums: true},
    { name: "34. Ani tak nehoří", bpm: 60, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "35. Z Kokavy", bpm: 76, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "36. Kamarádi moji", bpm: 80, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "37. Stavěli, stavěli", bpm: 147, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "37. Stavěli, stavěli 2", bpm: 105, beatsPerMeasure: 3, accentBeats: [0], drums: true},
    { name: "38. Nocka 6", bpm: 69, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "39. Bylo tu, není tu", bpm: 0, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "40. Řekněte mamce", bpm: 70, beatsPerMeasure: 1, accentBeats: [0], drums: true},
    { name: "41. Z Kokavy", bpm: 76, beatsPerMeasure: 1, accentBeats: [0], drums: false},
    { name: "42. Zabili", bpm: 70, beatsPerMeasure: 1, accentBeats: [0], drums: true }
];

let currentPreset = tempoPresets[0];

function setup() {
    let canvas = createCanvas(800, 800);
    canvas.parent('metronomeCanvas'); // Place canvas in specific div

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

    const pendulumLength = height * 0.7;
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
    fetch("tick.mp3").then(response => response.arrayBuffer()).then(data => {
        audioCtx.decodeAudioData(data, buffer => tickBuffer = buffer);
    });
    fetch("tock.mp3").then(response => response.arrayBuffer()).then(data => {
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
        let beatInMeasure = beatCount % currentPreset.beatsPerMeasure;
        let isAccented = currentPreset.accentBeats.includes(beatInMeasure);

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
    bpm = currentPreset.bpm;
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
    } else if (event.key === "ArrowUp") {
        currentPreset.bpm++;
        updateBPM();
        updatePresetDisplay();
    } else if (event.key === "ArrowDown") {
        currentPreset.bpm--;
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
    display.textContent = `${currentPreset.name} (${currentPreset.bpm} BPM, Dob: ${currentPreset.beatsPerMeasure}, Accent: [${currentPreset.accentBeats.map(n => n + 1).join(', ')}])`;
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

    tempoPresets.forEach((preset, index) => {
        let presetDiv = document.createElement("div");
        presetDiv.innerHTML = `
            <strong>${preset.name}</strong><br>
            <span class="small-text">
                ${preset.bpm > 0 ? `${preset.bpm} BPM | Dob: ${preset.beatsPerMeasure} | Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]` : "—"}
            </span>
        `;
        presetDiv.style.padding = "1px";
        presetDiv.style.border = "1px solid #555";
        presetDiv.style.borderRadius = "2px";
        presetDiv.style.cursor = "pointer";
        presetDiv.style.textAlign = "center";
        presetDiv.style.lineHeight = "1";
        presetDiv.style.userSelect = "none";
        presetDiv.style.marginBottom = "2px";

        if (!preset.drums) {
            presetDiv.style.backgroundColor = "#222"; // Darker gray
            presetDiv.style.color = "#888"; // Lighter text
            presetDiv.style.borderColor = "#444"; // Softer border
        } else {
            presetDiv.style.backgroundColor = "#333"; // Normal background
            presetDiv.style.color = "#ddd"; // Normal text color
            presetDiv.style.borderColor = "#555"; // Normal border
        }

        presetDiv.addEventListener("click", () => {
            presetIndex = index;
            setPreset(preset);
            highlightSelectedPreset([leftContainer, rightContainer], presetDiv);
        });

        // Place first 20 presets in left column, the rest in right column
        if (index < 22) {
            leftContainer.appendChild(presetDiv);
        } else {
            rightContainer.appendChild(presetDiv);
        }
    });
}

function highlightSelectedPreset(containers, selectedPresetDiv) {
    presetIter = 0;
    containers.forEach(container => {
        Array.from(container.children).forEach((div) => {
            let preset = tempoPresets[presetIter++]; // Get corresponding preset

            if (!preset.drums) {
                // Keep gray tint for presets without drums
                div.style.backgroundColor = "#222";
                div.style.color = "#888";
                div.style.borderColor = "#444";
            } else {
                // Normal colors for other presets
                div.style.backgroundColor = "#333";
                div.style.color = "#ddd";
                div.style.borderColor = "#555";
            }
        });
    });

    // Apply highlight only to the selected preset
    selectedPresetDiv.style.backgroundColor = "#005299";
    selectedPresetDiv.style.borderColor = "#66b8ff";
    selectedPresetDiv.style.color = "#fff";
}
