// tracts.js
const TractsModule = (function() {
    let unsubscribe = null;
    let currentSegment = null; // для модального окна добавления устройства

    // Вспомогательные функции
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function getDeviceDetail(dev) {
        let parts = [];
        if (dev.type === 'source') parts.push(`Зад: ${dev.latency} мс`);
        if (dev.type === 'tx' || dev.type === 'rx') {
            let usbStr = dev.usb ? `USB ${dev.usbVersion}` : 'USB нет';
            parts.push(`Зад: ${dev.latency} мс, ${usbStr}`);
        }
        if (dev.type === 'matrix') parts.push(`Вх/вых: ${dev.inputs}/${dev.outputs}, зад: ${dev.latencyIn+dev.latencyOut} мс`);
        if (dev.type === 'networkSwitch') parts.push(`Ком: ${dev.switchingLatency} мс, портов: ${dev.ports.length}`);
        if (!parts.length) parts.push(`Зад: ${dev.latency} мс`);
        if (dev.poeEnabled) parts.push(`PoE (${dev.poePower}W)`);
        else if (dev.ethernet) parts.push(`Ethernet`);
        return parts.join(', ');
    }

    function renderDevicesInSegment(devices, forceCollapsed = false) {
        let html='';
        devices.forEach(dev=>{
            const isExpanded = !forceCollapsed && dev.expanded !== false;
            const icon = dev.icon || 'fa-question-circle';
            const shortName = dev.shortName || dev.shortPrefix+'?';
            const displayName = isExpanded ? dev.name : shortName;
            let expandedHtml='';
            if(isExpanded){
                let usbHtml='';
                if(dev.type==='tx'||dev.type==='rx'){
                    usbHtml=`<div class="usb-control-wrapper"><label><input type="checkbox" class="usb-toggle" data-device-id="${dev.id}" ${dev.usb?'checked':''}><span>USB</span></label>${dev.usb?`<select class="usb-version-select" data-device-id="${dev.id}"><option value="2.0" ${dev.usbVersion==='2.0'?'selected':''}>2.0</option><option value="3.0" ${dev.usbVersion==='3.0'?'selected':''}>3.0</option><option value="3.1" ${dev.usbVersion==='3.1'?'selected':''}>3.1</option></select>`:''}</div>`;
                }
                let powerHtml=`<div class="power-control-wrapper"><i class="fas fa-plug"></i><input type="number" class="power-input mains-power-input" data-device-id="${dev.id}" value="${dev.powerW||0}" step="1" min="0" style="width:55px;"> Вт</div>`;
                let poeHtml='', ethernetHtml='';
                const supportsPoE=dev.poe===true, hasNetwork=dev.hasNetwork!==false;
                if(hasNetwork){
                    if(supportsPoE){
                        poeHtml=`<div class="poe-control-wrapper"><label><input type="checkbox" class="poe-toggle" data-device-id="${dev.id}" ${dev.poeEnabled?'checked':''}><span>PoE</span></label>${dev.poeEnabled?`<select class="power-input poe-power-select" data-device-id="${dev.id}"><option value="15" ${dev.poePower==15?'selected':''}>15W</option><option value="30" ${dev.poePower==30?'selected':''}>30W</option><option value="60" ${dev.poePower==60?'selected':''}>60W</option><option value="90" ${dev.poePower==90?'selected':''}>90W</option></select>`:''}</div>`;
                    }
                    if(!dev.poeEnabled){
                        ethernetHtml=`<div class="ethernet-control-wrapper"><label><input type="checkbox" class="ethernet-toggle" data-device-id="${dev.id}" ${dev.ethernet?'checked':''}><span>Ethernet</span></label></div>`;
                    }
                }
                let matrixHtml='';
                if(dev.type==='matrix'){
                    matrixHtml=`<div class="matrix-controls"><i class="fas fa-sign-in-alt"></i><input type="number" class="matrix-input matrix-inputs" data-device-id="${dev.id}" value="${dev.inputs||0}" min="1" step="1" style="width:36px;"><i class="fas fa-sign-out-alt"></i><input type="number" class="matrix-input matrix-outputs" data-device-id="${dev.id}" value="${dev.outputs||0}" min="1" step="1" style="width:36px;"></div>`;
                }
                expandedHtml=`
                    <div class="device-info"><div class="device-name">${escapeHtml(displayName)}</div><div class="device-detail">${getDeviceDetail(dev)}</div>${matrixHtml}</div>
                    <button class="device-remove" data-device-id="${dev.id}"><i class="fas fa-times"></i></button>
                    <div class="device-bottom-controls">${usbHtml}${poeHtml}${ethernetHtml}${powerHtml}</div>
                `;
            }
            let collapsedHtml=`
                <div class="device-icon"><i class="fas ${icon}"></i></div>
                <div class="device-info"><div class="device-name">${escapeHtml(shortName)}</div></div>
                <button class="device-remove" data-device-id="${dev.id}" style="position:static;"><i class="fas fa-times"></i></button>
            `;
            html+=`<div class="device-item ${isExpanded?'expanded':'collapsed'}" data-device-id="${dev.id}">
                ${isExpanded?expandedHtml:collapsedHtml}
                <button class="collapse-device-btn" data-device-id="${dev.id}" title="${isExpanded?'Свернуть':'Развернуть'}"><i class="fas ${isExpanded?'fa-compress':'fa-expand'}"></i></button>
            </div>`;
        });
        return html;
    }

    function renderSinglePath(path) {
        if (!path) { renderEmptyState(); return; }
        let delay = 0;
        const state = AppState.getState();
        const settings = state.globalSettings;
        const codecFactor = Utils.getResolutionFactor(settings) * Utils.getChromaFactor(settings) * Utils.getColorSpaceFactor(settings) * Utils.getBitDepthFactor(settings);
        path.sourceDevices.forEach(dev => {
            let d = dev.latency || 0;
            if (dev.usb) d += 0.5;
            if (dev.audioEmbed) d += 1.0;
            if (dev.type === 'tx' || dev.type === 'rx' || dev.type === 'ledProc') d *= codecFactor;
            delay += d;
        });
        state.projectSwitches.forEach(sw => {
            if (sw.switchingLatency) delay += sw.switchingLatency;
            if (sw.latencyIn) delay += sw.latencyIn;
            if (sw.latencyOut) delay += sw.latencyOut;
        });
        path.sinkDevices.forEach(dev => {
            let d = dev.latency || 0;
            if (dev.usb) d += 0.5;
            if (dev.audioEmbed) d += 1.0;
            if (dev.type === 'tx' || dev.type === 'rx' || dev.type === 'ledProc') d *= codecFactor;
            delay += d;
        });
        const frames = delay / (1000 / settings.fps);
        const html = `
            <div class="path-card" data-path-id="${path.id}">
                <div class="path-header">
                    <h3>${escapeHtml(path.name)}</h3>
                    <div class="path-latency" style="${delay > 100 ? 'background:#dc2626' : ''}">${delay.toFixed(2)} мс / ${frames.toFixed(2)} кадр.</div>
                </div>
                <div class="segments-row">
                    <div class="segment" data-path-id="${path.id}" data-segment="source">
                        <div class="segment-header"><span>Начало тракта</span><button class="add-device-btn" data-path-id="${path.id}" data-segment="source"><i class="fas fa-plus-circle"></i></button></div>
                        <div class="devices-container">${renderDevicesInSegment(path.sourceDevices)}</div>
                    </div>
                    <div class="segment" data-path-id="${path.id}" data-segment="switch">
                        <div class="segment-header"><span>Коммутация</span><button class="add-device-btn" data-path-id="${path.id}" data-segment="switch"><i class="fas fa-plus-circle"></i></button></div>
                        <div class="devices-container">${renderDevicesInSegment(state.projectSwitches)}</div>
                    </div>
                    <div class="segment" data-path-id="${path.id}" data-segment="sink">
                        <div class="segment-header"><span>Конец тракта</span><button class="add-device-btn" data-path-id="${path.id}" data-segment="sink"><i class="fas fa-plus-circle"></i></button></div>
                        <div class="devices-container">${renderDevicesInSegment(path.sinkDevices)}</div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('activePathContainer').innerHTML = html;
        attachDeviceEvents();
    }

    function renderAllTracts() {
        const state = AppState.getState();
        if (state.paths.length === 0) {
            document.getElementById('allTractsContainer').innerHTML = `<div class="empty-state"><i class="fas fa-road"></i><h3>Нет трактов</h3><p>Создайте новый тракт, чтобы начать работу</p></div>`;
            return;
        }
        const settings = state.globalSettings;
        const codecFactor = Utils.getResolutionFactor(settings) * Utils.getChromaFactor(settings) * Utils.getColorSpaceFactor(settings) * Utils.getBitDepthFactor(settings);
        let maxDelay = 0;
        const tractsHtml = state.paths.map(path => {
            let delay = 0;
            path.sourceDevices.forEach(dev => {
                let d = dev.latency || 0;
                if (dev.usb) d += 0.5;
                if (dev.audioEmbed) d += 1.0;
                if (dev.type === 'tx' || dev.type === 'rx' || dev.type === 'ledProc') d *= codecFactor;
                delay += d;
            });
            state.projectSwitches.forEach(sw => {
                if (sw.switchingLatency) delay += sw.switchingLatency;
                if (sw.latencyIn) delay += sw.latencyIn;
                if (sw.latencyOut) delay += sw.latencyOut;
            });
            path.sinkDevices.forEach(dev => {
                let d = dev.latency || 0;
                if (dev.usb) d += 0.5;
                if (dev.audioEmbed) d += 1.0;
                if (dev.type === 'tx' || dev.type === 'rx' || dev.type === 'ledProc') d *= codecFactor;
                delay += d;
            });
            if (delay > maxDelay) maxDelay = delay;
            const frames = delay / (1000 / settings.fps);
            return `
                <div class="path-card" data-path-id="${path.id}">
                    <div class="path-header">
                        <h3>${escapeHtml(path.name)}</h3>
                        <div class="path-latency" style="${delay > 100 ? 'background:#dc2626' : ''}">${delay.toFixed(2)} мс / ${frames.toFixed(2)} кадр.</div>
                    </div>
                    <div class="segments-row">
                        <div class="segment" data-path-id="${path.id}" data-segment="source">
                            <div class="segment-header"><span>Начало тракта</span></div>
                            <div class="devices-container">${renderDevicesInSegment(path.sourceDevices, true)}</div>
                        </div>
                        <div class="segment" data-path-id="${path.id}" data-segment="switch">
                            <div class="segment-header"><span>Коммутация</span></div>
                            <div class="devices-container">${renderDevicesInSegment(state.projectSwitches, true)}</div>
                        </div>
                        <div class="segment" data-path-id="${path.id}" data-segment="sink">
                            <div class="segment-header"><span>Конец тракта</span></div>
                            <div class="devices-container">${renderDevicesInSegment(path.sinkDevices, true)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        const maxFrames = maxDelay / (1000 / settings.fps);
        document.getElementById('allTractsContainer').innerHTML = `
            <div class="max-latency" style="${maxDelay > 100 ? 'background:#dc2626' : ''}">Максимальная задержка: ${maxDelay.toFixed(2)} мс (${maxFrames.toFixed(2)} кадр.)</div>
            ${tractsHtml}
        `;
        attachAllTractsEvents();
    }

    function attachAllTractsEvents() {
        document.querySelectorAll('.collapse-device-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                let deviceId = btn.dataset.deviceId;
                let device = null;
                const state = AppState.getState();
                for (let path of state.paths) {
                    device = [...path.sourceDevices, ...path.sinkDevices].find(d => d.id == deviceId);
                    if (device) break;
                }
                if (!device) device = state.projectSwitches.find(d => d.id == deviceId);
                if (device) {
                    device.expanded = !device.expanded;
                    renderAllTracts();
                }
            });
        });
        document.querySelectorAll('.device-remove').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                let deviceId = btn.dataset.deviceId;
                const state = AppState.getState();
                // release port
                const portManager = new Utils.SimplePortManager();
                portManager.setSwitches(state.projectSwitches);
                portManager.release(deviceId);
                // remove from state
                let updated = false;
                for (let path of state.paths) {
                    let idx = path.sourceDevices.findIndex(d => d.id == deviceId);
                    if (idx !== -1) { path.sourceDevices.splice(idx, 1); updated = true; break; }
                    idx = path.sinkDevices.findIndex(d => d.id == deviceId);
                    if (idx !== -1) { path.sinkDevices.splice(idx, 1); updated = true; break; }
                }
                if (!updated) {
                    let idx = state.projectSwitches.findIndex(d => d.id == deviceId);
                    if (idx !== -1) { state.projectSwitches.splice(idx, 1); updated = true; }
                }
                if (updated) {
                    AppState.setState({ ...state });
                }
            });
        });
    }

    function renderEmptyState() {
        document.getElementById('activePathContainer').innerHTML = `<div class="empty-state"><i class="fas fa-road"></i><h3>Нет трактов</h3><p>Создайте новый тракт, чтобы начать работу</p><button class="btn-primary" id="emptyStateAddPath"><i class="fas fa-plus"></i> Новый тракт</button></div>`;
        document.getElementById('emptyStateAddPath')?.addEventListener('click', () => addNewPath());
    }

    function renderPathsList() {
        const state = AppState.getState();
        let html='';
        state.paths.forEach(path=>{
            const isActive = (state.activePathId === path.id);
            html+=`<li><div class="path-name ${isActive?'active':''}" data-path-id="${path.id}" title="${escapeHtml(path.name)}">${escapeHtml(path.name)}</div>
            <div class="path-actions"><button class="rename-path" data-path-id="${path.id}" title="Переименовать"><i class="fas fa-pencil-alt"></i></button>
            <button class="delete-path" data-path-id="${path.id}" title="Удалить"><i class="fas fa-trash-alt"></i></button></div></li>`;
        });
        document.getElementById('sidebarPathsList').innerHTML = html;
        document.querySelectorAll('.path-name').forEach(el=>el.addEventListener('click',e=>{
            setActivePath(parseInt(el.dataset.pathId));
            if(window.innerWidth<=768) document.getElementById('sidebar').classList.remove('open');
        }));
        document.querySelectorAll('.rename-path').forEach(btn=>btn.addEventListener('click',e=>{
            e.stopPropagation();
            const state = AppState.getState();
            const path=state.paths.find(p=>p.id===parseInt(btn.dataset.pathId));
            if(path){
                let newName=prompt('Новое название тракта:',path.name);
                if(newName&&newName.trim()){ path.name=newName.trim(); AppState.setState({ ...state }); }
            }
        }));
        document.querySelectorAll('.delete-path').forEach(btn=>btn.addEventListener('click',e=>{
            e.stopPropagation();
            const state = AppState.getState();
            const path=state.paths.find(p=>p.id===parseInt(btn.dataset.pathId));
            if(path&&confirm(`Удалить тракт "${path.name}"?`)){
                [...path.sourceDevices,...path.sinkDevices].forEach(dev=>{
                    const portManager = new Utils.SimplePortManager();
                    portManager.setSwitches(state.projectSwitches);
                    portManager.release(dev.id);
                });
                const newPaths = state.paths.filter(p=>p.id!==path.id);
                let newActiveId = state.activePathId;
                if(newActiveId === path.id){
                    if(newPaths.length) newActiveId = newPaths[0].id;
                    else newActiveId = null;
                }
                AppState.setState({ paths: newPaths, activePathId: newActiveId });
            }
        }));
    }

    function addNewPath() {
        const state = AppState.getState();
        let newId = state.nextPathId;
        let newPath = { id: newId, name: `Тракт ${newId}`, sourceDevices: [], sinkDevices: [] };
        AppState.setState({
            paths: [...state.paths, newPath],
            nextPathId: newId + 1,
            activePathId: newId,
            viewMode: 'single'
        });
    }

    function setActivePath(id) {
        const state = AppState.getState();
        AppState.setState({
            activePathId: id,
            viewMode: 'single'
        });
    }

    function showAllTracts() {
        AppState.setState({ viewMode: 'all' });
    }

    function attachDeviceEvents() {
        document.querySelectorAll('.add-device-btn').forEach(btn=>{
            btn.addEventListener('click',e=>{
                let pathId=parseInt(btn.dataset.pathId), segment=btn.dataset.segment;
                currentSegment={pathId,segment};
                let typeSelect=document.getElementById('deviceTypeSelect');
                typeSelect.innerHTML='';
                let options=segment==='switch'?[
                    {value:'matrix',text:'Матричный коммутатор'},
                    {value:'networkSwitch',text:'Сетевой коммутатор'}
                ]:[
                    {value:'source',text:'Источник'},{value:'tx',text:'Передатчик'},{value:'rx',text:'Приёмник'},
                    {value:'splitter',text:'Сплиттер'},{value:'switch2x1',text:'Переключатель'},
                    {value:'ledProc',text:'LED-процессор'},{value:'ledScreen',text:'LED-экран'},
                    {value:'display',text:'Средство отображения'},{value:'dante',text:'Dante-устройство'}
                ];
                options.forEach(opt=>{let op=document.createElement('option');op.value=opt.value;op.textContent=opt.text;typeSelect.appendChild(op);});
                updateModelSelect(typeSelect.value);
                document.getElementById('addDeviceModal').style.display='flex';
            });
        });
        document.querySelectorAll('.device-remove').forEach(btn=>{
            btn.addEventListener('click',e=>{
                e.stopPropagation();
                let deviceId=btn.dataset.deviceId;
                const state = AppState.getState();
                const portManager = new Utils.SimplePortManager();
                portManager.setSwitches(state.projectSwitches);
                portManager.release(deviceId);
                let updated = false;
                for(let path of state.paths){
                    let idx=path.sourceDevices.findIndex(d=>d.id==deviceId);
                    if(idx!==-1){ path.sourceDevices.splice(idx,1); updated=true; break; }
                    idx=path.sinkDevices.findIndex(d=>d.id==deviceId);
                    if(idx!==-1){ path.sinkDevices.splice(idx,1); updated=true; break; }
                }
                if(!updated){
                    let idx=state.projectSwitches.findIndex(d=>d.id==deviceId);
                    if(idx!==-1){ state.projectSwitches.splice(idx,1); updated=true; }
                }
                if(updated) AppState.setState({ ...state });
            });
        });
        document.querySelectorAll('.collapse-device-btn').forEach(btn=>{
            btn.addEventListener('click',e=>{
                e.stopPropagation();
                let deviceId=btn.dataset.deviceId;
                const state = AppState.getState();
                let device=null;
                for(let path of state.paths){
                    device=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(device) break;
                }
                if(!device) device=state.projectSwitches.find(d=>d.id==deviceId);
                if(device){ device.expanded=!device.expanded; AppState.setState({ ...state }); }
            });
        });
        document.querySelectorAll('.poe-toggle').forEach(cb=>{
            cb.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=cb.dataset.deviceId;
                const state = AppState.getState();
                let device=null;
                for(let path of state.paths){
                    device=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(device) break;
                }
                if(!device) device=state.projectSwitches.find(d=>d.id==deviceId);
                if(device && device.poe!==undefined){
                    device.poeEnabled=cb.checked;
                    if(device.poeEnabled) device.ethernet=false;
                    AppState.setState({ ...state });
                }
            });
        });
        document.querySelectorAll('.ethernet-toggle').forEach(cb=>{
            cb.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=cb.dataset.deviceId;
                const state = AppState.getState();
                let device=null;
                for(let path of state.paths){
                    device=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(device) break;
                }
                if(!device) device=state.projectSwitches.find(d=>d.id==deviceId);
                if(device){
                    device.ethernet=cb.checked;
                    if(device.ethernet && device.poeEnabled) device.poeEnabled=false;
                    AppState.setState({ ...state });
                }
            });
        });
        document.querySelectorAll('.poe-power-select').forEach(sel=>{
            sel.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=sel.dataset.deviceId;
                let power=parseInt(sel.value);
                const state = AppState.getState();
                for(let path of state.paths){
                    let dev=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(dev && dev.poe===true){ dev.poePower=power; dev.powerW=power; AppState.setState({ ...state }); return; }
                }
                let sw=state.projectSwitches.find(d=>d.id==deviceId);
                if(sw && sw.poe===true){ sw.poePower=power; sw.powerW=power; AppState.setState({ ...state }); return; }
            });
        });
        document.querySelectorAll('.mains-power-input').forEach(inp=>{
            inp.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=inp.dataset.deviceId;
                let power=parseFloat(inp.value)||0;
                const state = AppState.getState();
                for(let path of state.paths){
                    let dev=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(dev){ dev.powerW=power; AppState.setState({ ...state }); return; }
                }
                let sw=state.projectSwitches.find(d=>d.id==deviceId);
                if(sw){ sw.powerW=power; AppState.setState({ ...state }); return; }
            });
        });
        document.querySelectorAll('.usb-toggle').forEach(cb=>{
            cb.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=cb.dataset.deviceId;
                const state = AppState.getState();
                for(let path of state.paths){
                    let dev=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(dev && (dev.type==='tx'||dev.type==='rx')){ dev.usb=cb.checked; AppState.setState({ ...state }); return; }
                }
            });
        });
        document.querySelectorAll('.usb-version-select').forEach(sel=>{
            sel.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=sel.dataset.deviceId;
                const state = AppState.getState();
                for(let path of state.paths){
                    let dev=[...path.sourceDevices,...path.sinkDevices].find(d=>d.id==deviceId);
                    if(dev){ dev.usbVersion=sel.value; AppState.setState({ ...state }); return; }
                }
            });
        });
        document.querySelectorAll('.matrix-inputs').forEach(inp=>{
            inp.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=inp.dataset.deviceId;
                let val=parseInt(inp.value)||1;
                const state = AppState.getState();
                let sw=state.projectSwitches.find(d=>d.id==deviceId);
                if(sw && sw.type==='matrix'){ sw.inputs=val; AppState.setState({ ...state }); }
            });
        });
        document.querySelectorAll('.matrix-outputs').forEach(inp=>{
            inp.addEventListener('change',e=>{
                e.stopPropagation();
                let deviceId=inp.dataset.deviceId;
                let val=parseInt(inp.value)||1;
                const state = AppState.getState();
                let sw=state.projectSwitches.find(d=>d.id==deviceId);
                if(sw && sw.type==='matrix'){ sw.outputs=val; AppState.setState({ ...state }); }
            });
        });
    }

    function updateModelSelect(type) {
        let models = Utils.modelDB[type] || [];
        if (type === 'tx' || type === 'rx') models = Utils.modelDB.tx;
        let options = '';
        models.forEach((m,i)=> options+=`<option value="${i}">${m.name}</option>`);
        document.getElementById('deviceModelSelect').innerHTML = options;
    }

    function createDevice(type, modelIndex, pathId, segment) {
        let model;
        if (type === 'tx' || type === 'rx') model = Utils.modelDB.tx[modelIndex];
        else model = Utils.modelDB[type][modelIndex];
        if (!model) return null;
        let base = {
            id: Date.now() + Math.random(),
            type: type,
            name: generateDeviceName(model.name.replace(/\s#\d+$/, ''), type),
            pathId: pathId,
            segment: segment,
            powerW: model.powerW,
            icon: model.icon || 'fa-question-circle',
            attachedSwitchId: null,
            attachedPortNumber: null,
            poeEnabled: false,
            ethernet: false,
            poePower: model.poePower || 15,
            hasNetwork: model.hasNetwork !== undefined ? model.hasNetwork : true,
            expanded: true,
            shortPrefix: model.shortPrefix || (type === 'source' ? 'SRC' : (type === 'tx' ? 'TX' : (type === 'rx' ? 'RX' : 'DEV'))),
            shortName: null
        };
        Object.assign(base, model);
        if (base.poe && !base.poePower) base.poePower = 15;
        if (base.poe && base.poeEnabled === undefined) base.poeEnabled = false;
        return base;
    }

    function generateDeviceName(baseName, type) {
        let maxNum = 0;
        const state = AppState.getState();
        const regex = new RegExp(`^${baseName} #(\\d+)$`);
        state.paths.forEach(path => {
            [...path.sourceDevices, ...path.sinkDevices].forEach(dev => {
                const match = dev.name.match(regex);
                if (match) { const num = parseInt(match[1], 10); if (num > maxNum) maxNum = num; }
            });
        });
        return `${baseName} #${maxNum + 1}`;
    }

    function createSwitch(type, modelIndex) {
        let model = Utils.modelDB[type][modelIndex];
        if (!model) return null;
        let sw = {
            id: AppState.getState().nextSwitchId,
            type: 'networkSwitch',
            name: model.name,
            shortName: null,
            portsCount: model.ports,
            portSpeed: model.speed,
            backplane: model.backplane,
            switchingLatency: model.switchingLatency,
            poeBudget: model.poeBudget,
            powerW: model.powerW,
            icon: "fa-network-wired",
            expanded: true,
            shortPrefix: "SW"
        };
        sw.ports = [];
        for (let i=1;i<=sw.portsCount;i++) sw.ports.push({ number:i, deviceId:null });
        return sw;
    }

    function createMatrix(type, modelIndex) {
        let model = Utils.modelDB.matrix[modelIndex];
        if (!model) return null;
        return {
            id: AppState.getState().nextSwitchId,
            type: 'matrix',
            name: model.name,
            inputs: model.inputs,
            outputs: model.outputs,
            latencyIn: model.latencyIn,
            latencyOut: model.latencyOut,
            powerW: model.powerW,
            icon: model.icon,
            expanded: true,
            shortPrefix: "MX"
        };
    }

    // Основной расчёт статистики (вызывается при изменении состояния)
    function calculateAll() {
        const state = AppState.getState();
        let totalBitrate=0, allSwitches=[], totalPoEBudget=0, usedPoE=0, mainsPower=0, totalPowerAll=0, warnings=[];
        const codecFactor=Utils.getResolutionFactor(state.globalSettings)*Utils.getChromaFactor(state.globalSettings)*Utils.getColorSpaceFactor(state.globalSettings)*Utils.getBitDepthFactor(state.globalSettings);
        // reset ports
        for(let sw of state.projectSwitches){ if(sw.type==='networkSwitch') for(let port of sw.ports) port.deviceId=null; }
        let devicesToConnect=[];
        state.paths.forEach(path=>{
            devicesToConnect.push(...path.sourceDevices.filter(d=>d.hasNetwork!==false));
            devicesToConnect.push(...path.sinkDevices.filter(d=>d.hasNetwork!==false));
        });
        devicesToConnect.push(...state.projectSwitches.filter(s=>s.type==='matrix'&&s.hasNetwork!==false));
        const portManager = new Utils.SimplePortManager();
        portManager.setSwitches(state.projectSwitches);
        for(let dev of devicesToConnect){
            const needConnect=dev.poeEnabled||dev.ethernet;
            dev.attachedSwitchId=null; dev.attachedPortNumber=null;
            if(needConnect){
                const requirePoE=dev.poeEnabled===true;
                const result=portManager.findAvailableSwitch(dev,requirePoE);
                if(!result) warnings.push(`Не удалось подключить устройство ${dev.name}: нет свободных портов${requirePoE?' / PoE':''}`);
                else{
                    const {sw,portNumber}=result;
                    const port=sw.ports.find(p=>p.number===portNumber);
                    if(port) port.deviceId=dev.id;
                    dev.attachedSwitchId=sw.id;
                    dev.attachedPortNumber=portNumber;
                }
            }
        }
        for(let sw of state.projectSwitches){
            allSwitches.push(sw);
            totalPowerAll+=sw.powerW||0;
            mainsPower+=sw.powerW||0;
            if(sw.type==='networkSwitch'&&sw.poeBudget) totalPoEBudget+=sw.poeBudget;
        }
        state.paths.forEach(path=>{
            path.sourceDevices.forEach(dev=>{
                if(dev.type==='source'||dev.type==='tx'){
                    let bitrate=Utils.calcVideoBitrate(state.globalSettings);
                    if(dev.type==='tx') bitrate*=(dev.bitrateFactor||0.8);
                    totalBitrate+=bitrate*(dev.bitrateFactor||1);
                }
                let power=dev.powerW||0;
                totalPowerAll+=power;
                if(dev.poe===true&&dev.poeEnabled) usedPoE+=dev.poePower||0;
                else mainsPower+=power;
            });
            path.sinkDevices.forEach(dev=>{
                if(dev.type==='rx'){
                    let bitrate=Utils.calcVideoBitrate(state.globalSettings);
                    if(dev.usb){ const usbSpeeds={'2.0':480,'3.0':5000,'3.1':10000}; bitrate+=usbSpeeds[dev.usbVersion]||0; }
                    totalBitrate+=bitrate*(dev.bitrateFactor||1);
                }
                let power=dev.powerW||0;
                totalPowerAll+=power;
                if(dev.poe===true&&dev.poeEnabled) usedPoE+=dev.poePower||0;
                else mainsPower+=power;
            });
        });
        if(state.ledConfig.area>0 && state.ledConfig.power>0){
            totalPowerAll+=state.ledConfig.power;
            mainsPower+=state.ledConfig.power;
        }
        for(let sw of state.projectSwitches){
            if(sw.type==='matrix'){
                let sc=state.paths.length;
                if(sc>(sw.inputs||0)) warnings.push(`Матрица ${sw.name}: входов ${sw.inputs}, а подключено трактов ${sc}`);
                if(sc>(sw.outputs||0)) warnings.push(`Матрица ${sw.name}: выходов ${sw.outputs}, а подключено трактов ${sc}`);
            }
        }
        if(warnings.length) alert(warnings.join('\n'));
        let minBackplane=allSwitches.length?Math.min(...allSwitches.map(s=>s.backplane||100))*1000:1000;
        let loadPercent=(totalBitrate/minBackplane)*100;
        if(loadPercent>100) loadPercent=100;
        document.getElementById('sidebarTotalBitrate').innerText=totalBitrate.toFixed(0);
        document.getElementById('sidebarLoadPercent').innerText=loadPercent.toFixed(1)+'%';
        const stats=portManager.getStats();
        document.getElementById('sidebarPortsUsed').innerText=stats.usedPorts;
        document.getElementById('sidebarPortsTotal').innerText=stats.totalPorts;
        document.getElementById('sidebarPoEUsed').innerText=usedPoE;
        document.getElementById('sidebarPoETotal').innerText=totalPoEBudget;
        document.getElementById('sidebarTotalPower').innerText=totalPowerAll.toFixed(0);
        document.getElementById('sidebarTotalBTU').innerText=(totalPowerAll*3.412).toFixed(0);
        document.getElementById('sidebarMulticastStatus').innerText = state.globalSettings.multicast ? 'Вкл' : 'Выкл';
        document.getElementById('sidebarQoSStatus').innerText = state.globalSettings.qos ? 'Вкл' : 'Выкл';

        // рендеринг в зависимости от viewMode
        if (state.viewMode === 'single') {
            const activePath = state.paths.find(p=>p.id===state.activePathId);
            if (activePath) renderSinglePath(activePath);
            else if (state.paths.length) setActivePath(state.paths[0].id);
            else renderEmptyState();
        } else if (state.viewMode === 'all') {
            renderAllTracts();
        }
        renderPathsList();
    }

    // Инициализация модуля: подписка на изменения, инициализация обработчиков модального окна
    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            calculateAll();
        });

        // Кнопки управления
        document.getElementById('addPathBtnSidebar').addEventListener('click', () => addNewPath());
        document.getElementById('showAllTractsBtn').addEventListener('click', () => showAllTracts());

        // Модальное окно добавления устройства
        const modal = document.getElementById('addDeviceModal');
        const modalAddBtn = document.getElementById('modalAddBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        const deviceTypeSelect = document.getElementById('deviceTypeSelect');
        const deviceModelSelect = document.getElementById('deviceModelSelect');

        deviceTypeSelect.addEventListener('change', () => updateModelSelect(deviceTypeSelect.value));
        modalAddBtn.addEventListener('click', () => {
            if(!currentSegment) return;
            let type = deviceTypeSelect.value;
            const state = AppState.getState();
            if(currentSegment.segment === 'switch'){
                if(type === 'matrix'){
                    let modelIndex = deviceModelSelect.selectedIndex;
                    let newMatrix = createMatrix(type, modelIndex);
                    if(newMatrix){
                        state.projectSwitches.push(newMatrix);
                        AppState.setState({ ...state, nextSwitchId: state.nextSwitchId + 1 });
                    }
                } else if(type === 'networkSwitch'){
                    let modelIndex = deviceModelSelect.selectedIndex;
                    let newSwitch = createSwitch(type, modelIndex);
                    if(newSwitch){
                        state.projectSwitches.push(newSwitch);
                        AppState.setState({ ...state, nextSwitchId: state.nextSwitchId + 1 });
                    }
                }
            } else {
                let modelIndex = deviceModelSelect.selectedIndex;
                let path = state.paths.find(p => p.id === currentSegment.pathId);
                if(!path) return;
                let newDev = createDevice(type, modelIndex, currentSegment.pathId, currentSegment.segment);
                if(newDev){
                    if(currentSegment.segment === 'source') path.sourceDevices.push(newDev);
                    else if(currentSegment.segment === 'sink') path.sinkDevices.push(newDev);
                    AppState.setState({ ...state });
                }
            }
            modal.style.display = 'none';
        });
        modalCancelBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', e => { if(e.target === modal) modal.style.display = 'none'; });

        // Первоначальный расчёт
        calculateAll();
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
