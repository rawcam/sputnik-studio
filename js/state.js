// state.js
const AppState = (function() {
    let state = {
        globalSettings: {
            resolution: '4K',
            chroma: '422',
            fps: 60,
            colorSpace: 'YCbCr',
            bitDepth: 10,
            cable: 'Cat6',
            multicast: false,
            qos: false,
            networkType: 'managed',
            syncProtocol: 'ptp',
            redundancy: false
        },
        paths: [],
        projectSwitches: [],
        ledConfig: {
            activeMode: 'cabinets',
            pitchIndex: 0,
            cabinetPreset: '600x337.5',
            cabinetWidth: 600,
            cabinetHeight: 337.5,
            cabinetsW: 1,
            cabinetsH: 1,
            targetResolution: 'fhd',
            customResW: 1920,
            customResH: 1080,
            stitchedScreenId: null,
            stitchCountW: 2,
            stitchCountH: 1,
            width_m: 0, height_m: 0, resW: 0, resH: 0, area: 0, power: 0
        },
        soundConfig: {
            sensitivity: 89, sourcePower: 1, distance: 1, headroom: 9, roomGain: 3,
            sourceType: 'point', startDistance: 1, endDistance: 16,
            powerChangeFrom: 1, powerChangeTo: 2, activeMode: 'spl',
            roomVolume: 200, roomArea: 100, avgAbsorption: 0.2,
            roomLength: 10, roomWidth: 10, roomHeight: 3, speakerPower: 30, speakerSensitivity: 90, requiredSPL: 85
        },
        vcConfig: {
            activeMode: 'codec',
            codecPreset: 'trueconf',
            resolution: '1080p',
            fps: 30,
            participants: 2,
            multipointParticipants: 4
        },
        nextPathId: 1,
        nextSwitchId: 1,
        activePathId: null,
        viewMode: 'single'
    };

    const listeners = [];

    function getState() {
        return state;
    }

    function setState(updater) {
        const newState = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, newState);
        listeners.forEach(fn => fn(state));
    }

    function subscribe(fn) {
        listeners.push(fn);
        return () => {
            const index = listeners.indexOf(fn);
            if (index !== -1) listeners.splice(index, 1);
        };
    }

    return { getState, setState, subscribe };
})();
