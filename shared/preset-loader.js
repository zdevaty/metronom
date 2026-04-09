// Preset Loader Module
class PresetLoader {
    constructor() {
        this.presets = [];
        this.currentPresetIndex = 0;
    }
    
    async loadPresets(presetFile) {
        try {
            const response = await fetch(presetFile);
            if (!response.ok) {
                throw new Error(`Failed to load presets: ${response.status} ${response.statusText}`);
            }
            this.presets = await response.json();
            this.currentPreset = this.presets[0];
            return this.presets;
        } catch (error) {
            console.error('Error loading presets:', error);
            // Fallback to empty preset
            this.presets = [{ name: "Error", bpm: 120, beatsPerMeasure: 4, accentBeats: [0], drums: true }];
            this.currentPreset = this.presets[0];
            return this.presets;
        }
    }
    
    setCurrentPreset(index) {
        if (index >= 0 && index < this.presets.length) {
            this.currentPresetIndex = index;
            this.currentPreset = this.presets[index];
            return this.currentPreset;
        }
        return null;
    }
    
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    getPresetCount() {
        return this.presets.length;
    }
    
    nextPreset() {
        this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presets.length;
        this.currentPreset = this.presets[this.currentPresetIndex];
        return this.currentPreset;
    }
    
    previousPreset() {
        this.currentPresetIndex = (this.currentPresetIndex - 1 + this.presets.length) % this.presets.length;
        this.currentPreset = this.presets[this.currentPresetIndex];
        return this.currentPreset;
    }
    
    getCurrentPresetIndex() {
        return this.currentPresetIndex;
    }
    
    updateCurrentPresetBPM(delta) {
        this.currentPreset.bpm += delta;
        return this.currentPreset.bpm;
    }
}