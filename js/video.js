// tracts.js (или led.js, sound.js и т.д.)
const VideoModule = (function() {
    let unsubscribe = null;
    function init() {
        console.log('TractsModule stub');
        unsubscribe = AppState.subscribe(()=>{});
    }
    function destroy() {
        if (unsubscribe) unsubscribe();
    }
    return { init, destroy };
})();
