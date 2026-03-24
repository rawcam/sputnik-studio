// video.js
const VideoModule = (function() {
    let unsubscribe = null;

    function syncToState() {
        const state = AppState.getState();
        const settings = state.globalSettings;

        const resolution = document.getElementById('resolutionSidebar').value;
        const chroma = document.getElementById('chromaSidebar').value;
        const fps = parseInt(document.getElementById('fpsSidebar').value);
        const colorSpace = document.getElementById('colorSpace').value;
        const bitDepth = document.getElementById('bitDepth').value;

        if (settings.resolution !== resolution ||
            settings.chroma !== chroma ||
            settings.fps !== fps ||
            settings.colorSpace !== colorSpace ||
            settings.bitDepth !== bitDepth) {
            AppState.setState({
                globalSettings: {
                    ...settings,
                    resolution,
                    chroma,
                    fps,
                    colorSpace,
                    bitDepth
                }
            });
        }
    }

    function syncFromState(settings) {
        const resolutionSelect = document.getElementById('resolutionSidebar');
        const chromaSelect = document.getElementById('chromaSidebar');
        const fpsSelect = document.getElementById('fpsSidebar');
        const colorSpaceSelect = document.getElementById('colorSpace');
        const bitDepthSelect = document.getElementById('bitDepth');

        if (resolutionSelect.value !== settings.resolution) resolutionSelect.value = settings.resolution;
        if (chromaSelect.value !== settings.chroma) chromaSelect.value = settings.chroma;
        if (fpsSelect.value !== settings.fps.toString()) fpsSelect.value = settings.fps;
        if (colorSpaceSelect.value !== settings.colorSpace) colorSpaceSelect.value = settings.colorSpace;
        if (bitDepthSelect.value !== settings.bitDepth.toString()) bitDepthSelect.value = settings.bitDepth;
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            syncFromState(newState.globalSettings);
        });

        const elements = ['resolutionSidebar', 'chromaSidebar', 'fpsSidebar', 'colorSpace', 'bitDepth'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', syncToState);
            }
        });

        const initialState = AppState.getState();
        syncFromState(initialState.globalSettings);
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
