// Shared configuration for metronome app
const MetronomeConfig = {
    // Visual settings
    VISUAL_OFFSET_MS: -0,
    FLASH_DECAY: 50,
    
    // Canvas settings
    canvasWidth: 800,
    canvasHeight: 800,
    pendulumLengthRatio: 0.7,
    
    // UI settings
    presetColumnSplit: 23, // First N presets go to left column
    
    // Audio settings
    tickSound: 'tick.mp3',
    tockSound: 'tock.mp3',
    
    // Variant-specific configurations
    variants: {
        main: {
            title: 'Metronome',
            presetFile: '/shared/presets-main.json'
        },
        zvukovka: {
            title: 'Zvukovka',
            presetFile: '/shared/presets-zvukovka.json'
        }
    }
};

// Detect current variant based on URL
function detectVariant() {
    return window.location.pathname.includes('/zvukovka/') ? 'zvukovka' : 'main';
}

// Get configuration for current variant
function getMetronomeConfig() {
    const variant = detectVariant();
    return {
        ...MetronomeConfig,
        ...MetronomeConfig.variants[variant],
        variant: variant
    };
}