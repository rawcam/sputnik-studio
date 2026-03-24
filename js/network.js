// network.js
const NetworkModule = (function() {
    let unsubscribe = null;

    function syncToState() {
        const state = AppState.getState();
        const settings = state.globalSettings;

        const cable = document.getElementById('globalCable').value;
        const multicast = document.getElementById('globalMulticast').checked;
        const qos = document.getElementById('globalQoS').checked;
        const networkType = document.getElementById('networkType').value;
        const syncProtocol = document.getElementById('syncProtocol').value;
        const redundancy = document.getElementById('redundancy').checked;

        if (settings.cable !== cable ||
            settings.multicast !== multicast ||
            settings.qos !== qos ||
            settings.networkType !== networkType ||
            settings.syncProtocol !== syncProtocol ||
            settings.redundancy !== redundancy) {
            AppState.setState({
                globalSettings: {
                    ...settings,
                    cable, multicast, qos, networkType, syncProtocol, redundancy
                }
            });
        }
    }

    function syncFromState(settings) {
        document.getElementById('globalCable').value = settings.cable;
        document.getElementById('globalMulticast').checked = settings.multicast;
        document.getElementById('globalQoS').checked = settings.qos;
        document.getElementById('networkType').value = settings.networkType;
        document.getElementById('syncProtocol').value = settings.syncProtocol;
        document.getElementById('redundancy').checked = settings.redundancy;

        document.getElementById('sidebarMulticastStatus').innerText = settings.multicast ? 'Вкл' : 'Выкл';
        document.getElementById('sidebarQoSStatus').innerText = settings.qos ? 'Вкл' : 'Выкл';
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            syncFromState(newState.globalSettings);
        });

        const elements = ['globalCable', 'globalMulticast', 'globalQoS', 'networkType', 'syncProtocol', 'redundancy'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', syncToState);
                if (el.type === 'checkbox') el.addEventListener('click', syncToState);
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
