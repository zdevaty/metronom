let angle = -45; // Starting angle for pendulum
let bpm = 120; // Default BPM
let interval = 60000 / bpm; // Convert BPM to ms
let lastTick = 0;
let isRunning = false;
let audioCtx;
let startTime = 0;

function setup() {
    createCanvas(400, 400);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startTime = millis(); // Reference time to sync animation with ticking
}

function draw() {
    background(220);
    let time = millis() - startTime;
    
    if (isRunning) {
        let phase = (time / 2 % interval) / interval; // Normalize phase (0 to 1)
        angle = Math.sin(phase * PI * 2) * 45; // Sync pendulum with tick
    }

    drawMetronome();
    
    if (isRunning && time - lastTick >= interval) {
        playTick();
        lastTick = time;
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

function playTick() {
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.value = 1000;
    gainNode.gain.value = 0.2;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function startMetronome() {
    bpm = parseInt(document.getElementById("bpm").value);
    interval = 60000 / bpm;
    isRunning = true;
    startTime = millis(); // Reset start time to sync animation with ticking
    lastTick = -1000; // Trigger tick on zero interval
}

function stopMetronome() {
    isRunning = false;
    angle = -45;
}
