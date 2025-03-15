const VISUAL_OFFSET_MS = -0; // Visual offset in milliseconds (adjust as needed)

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
let flashAlpha = 0; // Controls flash intensity
const FLASH_DECAY = 10; // How fast the flash fades out

let tempoPresets = [
    { name: "1. Zabili", bpm: 70, beatsPerMeasure: 3, subdivision: 1, accentBeats: [0], drums: true},
    { name: "2. Křížem krážem", bpm: 120, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "3. Tmavá nocka 1", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "4. Z Kokavy", bpm: 76, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "5. Ani tak nehoří", bpm: 60, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "6. Nepůjdu od tebe", bpm: 160, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "7. Šibeničky", bpm: 110, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "8. Tmavá Nocka 2", bpm: 64, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "9. Horní, Dolní Ořešany", bpm: 92, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "10. Nebudu orat ani set", bpm: 120, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "11. Tam v tom lese v Bukovině", bpm: 64, beatsPerMeasure: 4, subdivision: 2, accentBeats: [0], drums: true},
    { name: "12. Tam v tom lese v Bukovině", bpm: 64, beatsPerMeasure: 4, subdivision: 2, accentBeats: [0], drums: true},
    { name: "13. Tmavá nocka 3", bpm: 74, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "14. Kterýpak jste který", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "15. Nepovídej milá mamince", bpm: 94, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "16. Tam u řeky na kraji", bpm: 174, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "17. Pod javorem na tom poli", bpm: 55, beatsPerMeasure: 4, subdivision: 2, accentBeats: [0], drums: true},
    { name: "18. Tam nahoře na tom kopci", bpm: 76, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "19. Večer zmizí", bpm: 70, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "20. Ach bože přebože", bpm: 176, beatsPerMeasure: 8, subdivision: 1, accentBeats: [0, 3, 6], drums: true},
    { name: "21. Chytají mě chlapci", bpm: 63, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "22. Kamarádi moji", bpm: 80, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "23. Milá moje milá", bpm: 97, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "24. Pojďme chlapci", bpm: 144, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "25. Zazpívejme,chlapci", bpm: 66, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "26. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "27. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "28. My jsme dobří chlapci", bpm: 68, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "29. Nocka 5", bpm: 66, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "30. Chodí horou", bpm: 125, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "31. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "32. Jatelinka", bpm: 132, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "33. Tam u řeky na kraji", bpm: 174, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "34. Ani tak nehoří", bpm: 60, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "35. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "36. Kamarádi moji", bpm: 80, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "37. Stavěli", bpm: 147, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "37. Stavěli 2", bpm: 105, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "38. Nocka 6", bpm: 69, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "39. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "40. Řekněte mamce", bpm: 70, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true},
    { name: "41. ", bpm: 0, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: false},
    { name: "42. Zabili", bpm: 70, beatsPerMeasure: 4, subdivision: 1, accentBeats: [0], drums: true }
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

        // **Trigger flash only on whole beats (not subdivisions)**
        if (beatInMeasure % subdivision === 0) {
            flashAlpha = isAccented ? 200 : 100; // Brighter flash on accented beats
        }

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
    display.textContent = `${currentPreset.name} (${currentPreset.bpm} BPM, Dob: ${currentPreset.beatsPerMeasure}, Sub: ${currentPreset.subdivision}, Accent: [${currentPreset.accentBeats.map(n => n + 1).join(', ')}])`;
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

    tempoPresets.forEach((preset, index) => {
        let presetDiv = document.createElement("div");
        presetDiv.innerHTML = `
            <strong>${preset.name || "(Empty)"}</strong><br>
            ${preset.bpm > 0 ? `${preset.bpm} BPM | Dob: ${preset.beatsPerMeasure} | Sub: ${preset.subdivision} | Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]` : "—"}
        `;
        presetDiv.style.padding = "8px";
        presetDiv.style.border = "1px solid #555";
        presetDiv.style.borderRadius = "6px";
        presetDiv.style.cursor = "pointer";
        presetDiv.style.textAlign = "center";
        presetDiv.style.userSelect = "none";
        presetDiv.style.marginBottom = "8px";

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
        if (index < 23) {
            leftContainer.appendChild(presetDiv);
        } else {
            rightContainer.appendChild(presetDiv);
        }
    });
}

function highlightSelectedPreset(containers, selectedPresetDiv) {
    containers.forEach(container => {
        Array.from(container.children).forEach((div, index) => {
            let preset = tempoPresets[index]; // Get corresponding preset

            if (!preset.drums) {
                // Keep gray tint for presets without drums
                div.style.backgroundColor = "#222";
                div.style.borderColor = "#444";
                div.style.color = "#888";
            } else {
                // Normal colors for other presets
                div.style.backgroundColor = "#333";
                div.style.borderColor = "#555";
                div.style.color = "#ddd";
            }
        });
    });

    // Apply highlight only to the selected preset
    selectedPresetDiv.style.backgroundColor = "#005299";
    selectedPresetDiv.style.borderColor = "#66b8ff";
    selectedPresetDiv.style.color = "#fff";
}
