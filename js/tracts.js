// tracts.js – финальная стабильная версия
const TractsModule = (function() {
    let unsubscribe = null;
    let currentModalCallback = null;
    let portManager = null;
    let isUpdating = false;

    // ... (все вспомогательные функции остаются без изменений) ...

    function addNewPath() {
        const state = AppState.getState();
        let newPath = { id: state.nextPathId++, name: `Тракт ${state.nextPathId - 1}`, sourceDevices: [], sinkDevices: [] };
        state.paths.push(newPath);
        AppState.setState(state);
        setActivePath(newPath.id);
    }

    function setActivePath(id) {
        const state = AppState.getState();
        if (state.activePathId === id) return;
        state.activePathId = id;
        state.viewMode = 'single';
        AppState.setState(state);
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('activePathContainer').style.display = '';
        calculateAll();
    }

    function showAllTracts() {
        const state = AppState.getState();
        if (state.viewMode === 'all') return;
        state.viewMode = 'all';
        AppState.setState(state);
        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = '';
        calculateAll();
    }

    function renderEmptyState() {
        const container = document.getElementById('activePathContainer');
        container.innerHTML = `<div class="empty-state"><i class="fas fa-road"></i><h3>Нет трактов</h3><p>Создайте новый тракт, чтобы начать работу</p><button class="btn-primary" id="emptyStateAddPath"><i class="fas fa-plus"></i> Новый тракт</button></div>`;
        document.getElementById('emptyStateAddPath')?.addEventListener('click', () => addNewPath());
    }

    function renderPathsList() {
        const state = AppState.getState();
        let html = '';
        state.paths.forEach(path => {
            const isActive = (state.activePathId === path.id);
            html += `<li><div class="path-name ${isActive ? 'active' : ''}" data-path-id="${path.id}" title="${escapeHtml(path.name)}">${escapeHtml(path.name)}</div>
            <div class="path-actions"><button class="rename-path" data-path-id="${path.id}" title="Переименовать"><i class="fas fa-pencil-alt"></i></button>
            <button class="delete-path" data-path-id="${path.id}" title="Удалить"><i class="fas fa-trash-alt"></i></button></div></li>`;
        });
        document.getElementById('sidebarPathsList').innerHTML = html;

        document.querySelectorAll('.path-name').forEach(el => {
            el.addEventListener('click', e => {
                setActivePath(parseInt(el.dataset.pathId));
                if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
            });
        });
        document.querySelectorAll('.rename-path').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const path = state.paths.find(p => p.id === parseInt(btn.dataset.pathId));
                if (path) {
                    let newName = prompt('Новое название тракта:', path.name);
                    if (newName && newName.trim()) {
                        path.name = newName.trim();
                        AppState.setState(state);
                    }
                }
            });
        });
        document.querySelectorAll('.delete-path').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const path = state.paths.find(p => p.id === parseInt(btn.dataset.pathId));
                if (path && confirm(`Удалить тракт "${path.name}"?`)) {
                    [...path.sourceDevices, ...path.sinkDevices].forEach(dev => portManager.release(dev.id));
                    state.paths = state.paths.filter(p => p.id !== path.id);
                    if (state.activePathId === path.id) {
                        if (state.paths.length) setActivePath(state.paths[0].id);
                        else setActivePath(null);
                    }
                    AppState.setState(state);
                }
            });
        });
    }

    function calculateAll() {
        if (isUpdating) return;
        isUpdating = true;
        try {
            const state = AppState.getState();
            const settings = state.globalSettings;

            // Сброс портов
            for (let sw of state.projectSwitches) {
                if (sw.type === 'networkSwitch') {
                    for (let port of sw.ports) port.deviceId = null;
                }
            }

            // Подключение устройств
            let devicesToConnect = [];
            state.paths.forEach(path => {
                devicesToConnect.push(...path.sourceDevices.filter(d => d.hasNetwork !== false));
                devicesToConnect.push(...path.sinkDevices.filter(d => d.hasNetwork !== false));
            });
            devicesToConnect.push(...state.projectSwitches.filter(s => s.type === 'matrix' && s.hasNetwork !== false));
            for (let dev of devicesToConnect) {
                const needConnect = dev.poeEnabled || dev.ethernet;
                dev.attachedSwitchId = null;
                dev.attachedPortNumber = null;
                if (needConnect) {
                    const requirePoE = dev.poeEnabled === true;
                    const result = portManager.findAvailableSwitch(dev, requirePoE);
                    if (!result) {
                        console.warn(`Не удалось подключить устройство ${dev.name}: нет свободных портов${requirePoE ? ' / PoE' : ''}`);
                    } else {
                        const { sw, portNumber } = result;
                        const port = sw.ports.find(p => p.number === portNumber);
                        if (port) port.deviceId = dev.id;
                        dev.attachedSwitchId = sw.id;
                        dev.attachedPortNumber = portNumber;
                    }
                }
            }

            // Расчёт битрейта, мощности и пр.
            let totalBitrate = 0, totalPoEBudget = 0, usedPoE = 0, mainsPower = 0, totalPowerAll = 0;
            for (let sw of state.projectSwitches) {
                totalPowerAll += sw.powerW || 0;
                mainsPower += sw.powerW || 0;
                if (sw.type === 'networkSwitch' && sw.poeBudget) totalPoEBudget += sw.poeBudget;
            }
            state.paths.forEach(path => {
                path.sourceDevices.forEach(dev => {
                    if (dev.type === 'source' || dev.type === 'tx') {
                        let bitrate = Utils.calcVideoBitrate(settings);
                        if (dev.type === 'tx') bitrate *= (dev.bitrateFactor || 0.8);
                        totalBitrate += bitrate * (dev.bitrateFactor || 1);
                    }
                    let power = dev.powerW || 0;
                    totalPowerAll += power;
                    if (dev.poe === true && dev.poeEnabled) usedPoE += dev.poePower || 0;
                    else mainsPower += power;
                });
                path.sinkDevices.forEach(dev => {
                    if (dev.type === 'rx') {
                        let bitrate = Utils.calcVideoBitrate(settings);
                        if (dev.usb) { const usbSpeeds = { '2.0': 480, '3.0': 5000, '3.1': 10000 }; bitrate += usbSpeeds[dev.usbVersion] || 0; }
                        totalBitrate += bitrate * (dev.bitrateFactor || 1);
                    }
                    let power = dev.powerW || 0;
                    totalPowerAll += power;
                    if (dev.poe === true && dev.poeEnabled) usedPoE += dev.poePower || 0;
                    else mainsPower += power;
                });
            });
            if (state.ledConfig.area > 0 && state.ledConfig.power > 0) {
                totalPowerAll += state.ledConfig.power;
                mainsPower += state.ledConfig.power;
            }

            let minBackplane = state.projectSwitches.length ? Math.min(...state.projectSwitches.map(s => s.backplane || 100)) * 1000 : 1000;
            let loadPercent = (totalBitrate / minBackplane) * 100;
            if (loadPercent > 100) loadPercent = 100;

            document.getElementById('sidebarTotalBitrate').innerText = totalBitrate.toFixed(0);
            document.getElementById('sidebarLoadPercent').innerText = loadPercent.toFixed(1) + '%';
            const stats = portManager.getStats();
            document.getElementById('sidebarPortsUsed').innerText = stats.usedPorts;
            document.getElementById('sidebarPortsTotal').innerText = stats.totalPorts;
            document.getElementById('sidebarPoEUsed').innerText = usedPoE;
            document.getElementById('sidebarPoETotal').innerText = totalPoEBudget;
            document.getElementById('sidebarTotalPower').innerText = totalPowerAll.toFixed(0);
            document.getElementById('sidebarTotalBTU').innerText = (totalPowerAll * 3.412).toFixed(0);
            document.getElementById('sidebarMulticastStatus').innerText = settings.multicast ? 'Вкл' : 'Выкл';
            document.getElementById('sidebarQoSStatus').innerText = settings.qos ? 'Вкл' : 'Выкл';

            // Отображение в зависимости от viewMode
            if (state.viewMode === 'single') {
                const activePath = state.paths.find(p => p.id === state.activePathId);
                if (activePath) {
                    renderSinglePath(activePath);
                } else {
                    renderEmptyState();
                }
            } else if (state.viewMode === 'all') {
                renderAllTracts();
            }
            // Для других режимов (led, sound, vc, ergo, power) рендеринг выполняется их собственными модулями
            renderPathsList();
        } finally {
            isUpdating = false;
        }
    }

    function init() {
        portManager = new Utils.SimplePortManager();
        unsubscribe = AppState.subscribe((newState) => {
            portManager.setSwitches(newState.projectSwitches);
            calculateAll();
        });

        document.getElementById('addPathBtnSidebar').addEventListener('click', () => addNewPath());
        document.getElementById('showAllTractsBtn').addEventListener('click', () => showAllTracts());

        const modal = document.getElementById('addDeviceModal');
        const modalAddBtn = document.getElementById('modalAddBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        const deviceTypeSelect = document.getElementById('deviceTypeSelect');
        const deviceModelSelect = document.getElementById('deviceModelSelect');

        deviceTypeSelect.addEventListener('change', () => updateModelSelect(deviceTypeSelect.value));

        modalAddBtn.addEventListener('click', () => {
            if (!currentModalCallback) return;
            let type = deviceTypeSelect.value;
            let modelIndex = deviceModelSelect.selectedIndex;
            const state = AppState.getState();
            if (currentModalCallback.segment === 'switch') {
                if (type === 'matrix') {
                    let newMatrix = createMatrix(type, modelIndex);
                    if (newMatrix) {
                        state.projectSwitches.push(newMatrix);
                        Utils.updateAllShortNames(state);
                        AppState.setState(state);
                    }
                } else if (type === 'networkSwitch') {
                    let newSwitch = createSwitch(type, modelIndex);
                    if (newSwitch) {
                        state.projectSwitches.push(newSwitch);
                        Utils.updateAllShortNames(state);
                        AppState.setState(state);
                    }
                }
            } else {
                let path = state.paths.find(p => p.id === currentModalCallback.pathId);
                if (!path) return;
                let newDev = createDevice(type, modelIndex, currentModalCallback.pathId, currentModalCallback.segment);
                if (newDev) {
                    if (currentModalCallback.segment === 'source') path.sourceDevices.push(newDev);
                    else if (currentModalCallback.segment === 'sink') path.sinkDevices.push(newDev);
                    Utils.updateAllShortNames(state);
                    AppState.setState(state);
                }
            }
            modal.style.display = 'none';
            currentModalCallback = null;
        });

        modalCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            currentModalCallback = null;
        });
        window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

        // Убираем автоматическое создание тракта
        const initialState = AppState.getState();
        if (initialState.paths.length === 0) {
            // Не создаём тракт, просто отображаем пустое состояние
            renderEmptyState();
        } else {
            setActivePath(initialState.paths[0].id);
        }
        calculateAll();
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    // ... остальные функции (createDevice, createSwitch, etc.) остаются без изменений ...

    // ВАЖНО: вставить все вспомогательные функции (createDevice, createSwitch, renderDevicesInSegment, etc.) из предыдущей стабильной версии
    // Они не должны измениться.

    return { init, destroy };
})();
