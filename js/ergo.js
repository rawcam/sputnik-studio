// ergo.js
const ErgoModule = (function() {
    let unsubscribe = null;
    function init() {
        console.log('ErgoModule stub');
        unsubscribe = AppState.subscribe(()=>{});
    }
    function destroy() {
        if (unsubscribe) unsubscribe();
    }
    return { init, destroy };
})();
