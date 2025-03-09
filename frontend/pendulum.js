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
    { name: "1. Zabili", bpm: 70, subdivision: 3, accentBeats: [0] },
    { name: "2. Křížem krážem", bpm: 120, subdivision: 4, accentBeats: [0] },
    { name: "3. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "4. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "5. Ani tak nehoří", bpm: 60, subdivision: 1, accentBeats: [0] },
    { name: "6. Nepůjdu od tebe", bpm: 160, subdivision: 4, accentBeats: [0] },
    { name: "7. Šibeničky", bpm: 110, subdivision: 4, accentBeats: [0] },
    { name: "8. Tmavá Nocka 2", bpm: 64, subdivision: 6, accentBeats: [0] },
    { name: "9. Ořešany", bpm: 92, subdivision: 4, accentBeats: [0] },
    { name: "10. Nebudu orat ani set", bpm: 120, subdivision: 3, accentBeats: [0] },
    { name: "11. Tam v tom lese v Bukovině", bpm: 64, subdivision: 2, accentBeats: [0] },
    { name: "12. Tam v tom lese v Bukovině", bpm: 64, subdivision: 2, accentBeats: [0] },
    { name: "13. Nocka 3", bpm: 74, subdivision: 4, accentBeats: [0] },
    { name: "14. Kterýpak jste který", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "15. Nepovídej milá mamince", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "16. Tam u řeky na kraji", bpm: 174, subdivision: 6, accentBeats: [0] },
    { name: "17. Pod javorem na tom poli", bpm: 55, subdivision: 2, accentBeats: [0] },
    { name: "18. Tam nahoře na tom kopci", bpm: 76, subdivision: 2, accentBeats: [0] },
    { name: "19. Večer zmizí", bpm: 70, subdivision: 1, accentBeats: [0] },
    { name: "20. Ach bože přebože", bpm: 176, subdivision: 8, accentBeats: [0, 3, 6] },
    { name: "21. Chytají mě chlapci", bpm: 63, subdivision: 4, accentBeats: [0] },
    { name: "22. Kamarádi moji", bpm: 80, subdivision: 4, accentBeats: [0] },
    { name: "23. Milá moje milá", bpm: 97, subdivision: 4, accentBeats: [0] },
    { name: "24. Pojďme chlapci", bpm: 144, subdivision: 4, accentBeats: [0] },
    { name: "25. Zazpívejme,chlapci", bpm: 66, subdivision: 1, accentBeats: [0] },
    { name: "26. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "27. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "28. My jsme dobří chlapci", bpm: 68, subdivision: 4, accentBeats: [0] },
    { name: "29. Nocka 5", bpm: 66, subdivision: 4, accentBeats: [0] },
    { name: "30. Chodí horou", bpm: 125, subdivision: 4, accentBeats: [0] },
    { name: "31. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "32. Jatelinka", bpm: 132, subdivision: 4, accentBeats: [0] },
    { name: "33. Tam u řeky na kraji", bpm: 174, subdivision: 6, accentBeats: [0] },
    { name: "34. Ani tak nehoří", bpm: 60, subdivision: 1, accentBeats: [0] },
    { name: "35. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "36. Kamarádi moji", bpm: 80, subdivision: 4, accentBeats: [0] },
    { name: "37. Stavěli", bpm: 147, subdivision: 4, accentBeats: [0] },
    { name: "37. Stavěli 2", bpm: 105, subdivision: 3, accentBeats: [0] },
    { name: "38. Nocka 6", bpm: 69, subdivision: 4, accentBeats: [0] },
    { name: "39. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "40. Řekněte mamce", bpm: 70, subdivision: 4, accentBeats: [0] },
    { name: "41. ", bpm: 0, subdivision: 1, accentBeats: [0] },
    { name: "42. Zabili", bpm: 70, subdivision: 3, accentBeats: [0] }
];

let currentPreset = tempoPresets[0];

function setup() {
    let canvas = createCanvas(600, 600);
    canvas.parent('metronomeCanvas'); // Place canvas in specific div

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
    display.textContent = `${currentPreset.name} (${currentPreset.bpm} BPM, Sub: ${currentPreset.subdivision}, Accent: [${currentPreset.accentBeats.map(n => n + 1).join(', ')}])`;
}

function createUI() {
    const leftContainer = document.getElementById("presetContainerLeft");
    const rightContainer = document.getElementById("presetContainerRight");

    tempoPresets.forEach((preset, index) => {
        let presetDiv = document.createElement("div");
        presetDiv.innerHTML = `
            <strong>${preset.name || "(Empty)"}</strong><br>
            ${preset.bpm > 0 ? `${preset.bpm} BPM | Sub: ${preset.subdivision} | Accent: [${preset.accentBeats.map(n => n + 1).join(', ')}]` : "—"}
        `;
        presetDiv.style.padding = "8px";
        presetDiv.style.border = "1px solid #ccc";
        presetDiv.style.borderRadius = "6px";
        presetDiv.style.backgroundColor = "#f8f8f8";
        presetDiv.style.cursor = "pointer";
        presetDiv.style.textAlign = "center";
        presetDiv.style.userSelect = "none";
        presetDiv.style.marginBottom = "8px";

        presetDiv.addEventListener("click", () => {
            presetIndex = index;
            setPreset(preset);
            highlightSelectedPreset([leftContainer, rightContainer], presetDiv);
        });

        // Place first 20 presets in left column, the rest in right column
        if (index < 20) {
            leftContainer.appendChild(presetDiv);
        } else {
            rightContainer.appendChild(presetDiv);
        }
    });
}

function highlightSelectedPreset(containers, selectedPresetDiv) {
    containers.forEach(container => {
        Array.from(container.children).forEach(div => {
            div.style.backgroundColor = "#f8f8f8";
            div.style.borderColor = "#ccc";
        });
    });
    selectedPresetDiv.style.backgroundColor = "#d0eaff";
    selectedPresetDiv.style.borderColor = "#007bff";
}


