// led.js
const LedModule = (function() {
    let unsubscribe = null;
    let isUpdating = false; // флаг, предотвращающий рекурсивные обновления

    function getLedScreenByIndex(index) {
        return Utils.modelDB.ledScreen[index] || Utils.modelDB.ledScreen[0];
    }

    function getCabPixels(cabW_mm, cabH_mm, pitch_mm) {
        return {
            pixelsW: Math.floor(cabW_mm / pitch_mm),
            pixelsH: Math.floor(cabH_mm / pitch_mm)
        };
    }

    function renderCalculator(activeTab = 'resolution') {
        const state = AppState.getState();
        const ledConfig = state.ledConfig;
        const container = document.getElementById('ledCalculatorContainer');
        if (!container) return;

        const pitchOptions = Utils.modelDB.ledScreen.map((m, i) =>
            `<option value="${i}" ${ledConfig.pitchIndex == i ? 'selected' : ''}>${m.name}</option>`
        ).join('');

        const presetOptions = `
            <option value="600x337.5" ${ledConfig.cabinetPreset == '600x337.5' ? 'selected' : ''}>600×337.5 мм</option>
            <option value="500x500" ${ledConfig.cabinetPreset == '500x500' ? 'selected' : ''}>500×500 мм</option>
            <option value="640x480" ${ledConfig.cabinetPreset == '640x480' ? 'selected' : ''}>640×480 мм</option>
            <option value="960x540" ${ledConfig.cabinetPreset == '960x540' ? 'selected' : ''}>960×540 мм</option>
            <option value="custom" ${ledConfig.cabinetPreset == 'custom' ? 'selected' : ''}>Свой</option>
        `;

        container.innerHTML = `
            <div class="calc-card">
                <div class="ergo-tabs" style="margin-bottom: 20px;">
                    <div class="ergo-tab ${activeTab === 'resolution' ? 'active' : ''}" data-tab="resolution">По разрешению</div>
                    <div class="ergo-tab ${activeTab === 'cabinets' ? 'active' : ''}" data-tab="cabinets">По кабинетам</div>
                </div>

                <div id="resolutionTab" style="display: ${activeTab === 'resolution' ? 'block' : 'none'};">
                    <h3><i class="fas fa-bullseye"></i> Подбор количества кабинетов под заданное разрешение</h3>
                    <div class="setting"><label>Шаг пикселя:</label><select id="resPitchSelect">${pitchOptions}</select></div>
                    <div class="setting"><label>Размер кабинета:</label><select id="resCabinetPresetSelect">${presetOptions}</select></div>
                    <div id="resCustomCabinetSize" style="display: ${ledConfig.cabinetPreset === 'custom' ? 'block' : 'none'}; margin-top: 8px;">
                        <div class="setting"><label>Ширина кабинета (мм):</label><input type="number" id="resCabWidthCustom" value="${ledConfig.cabinetWidth}" step="1"></div>
                        <div class="setting"><label>Высота кабинета (мм):</label><input type="number" id="resCabHeightCustom" value="${ledConfig.cabinetHeight}" step="1"></div>
                    </div>
                    <div class="setting"><label>Желаемое разрешение:</label><select id="targetResolutionSelect">
                        <option value="fhd" ${ledConfig.targetResolution == 'fhd' ? 'selected' : ''}>Full HD (1920×1080)</option>
                        <option value="4k" ${ledConfig.targetResolution == '4k' ? 'selected' : ''}>4K (3840×2160)</option>
                        <option value="8k" ${ledConfig.targetResolution == '8k' ? 'selected' : ''}>8K (7680×4320)</option>
                        <option value="custom" ${ledConfig.targetResolution == 'custom' ? 'selected' : ''}>Своё</option>
                    </select></div>
                    <div id="customResolution" style="display: ${ledConfig.targetResolution === 'custom' ? 'block' : 'none'};">
                        <div class="setting"><label>Ширина (пикс):</label><input type="number" id="customResW" value="${ledConfig.customResW}" step="1"></div>
                        <div class="setting"><label>Высота (пикс):</label><input type="number" id="customResH" value="${ledConfig.customResH}" step="1"></div>
                    </div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Требуемое разрешение</div><div class="result-value" id="reqRes">—</div></div>
                        <div class="result-item"><div class="result-label">Реальное разрешение</div><div class="result-value" id="realRes">—</div></div>
                        <div class="result-item"><div class="result-label">Кол-во кабинетов</div><div class="result-value" id="resCabinetsCount">—</div></div>
                        <div class="result-item"><div class="result-label">Размер экрана</div><div class="result-value" id="resSize">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="resArea">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Мощность</div><div class="result-value" id="resPower">—</div><div>Вт</div></div>
                    </div>
                    <div class="ergo-info">Количество пикселей в кабинете = округление вниз (размер_кабинета / шаг). Количество кабинетов округляется вверх для покрытия разрешения.</div>
                </div>

                <div id="cabinetsTab" style="display: ${activeTab === 'cabinets' ? 'block' : 'none'};">
                    <h3><i class="fas fa-th-large"></i> Расчёт по заданному количеству кабинетов</h3>
                    <div class="setting"><label>Шаг пикселя:</label><select id="cabPitchSelect">${pitchOptions}</select></div>
                    <div class="setting"><label>Размер кабинета:</label><select id="cabinetPresetSelect">${presetOptions}</select></div>
                    <div id="customCabinetSize" style="display: ${ledConfig.cabinetPreset === 'custom' ? 'block' : 'none'}; margin-top: 8px;">
                        <div class="setting"><label>Ширина кабинета (мм):</label><input type="number" id="cabWidthCustom" value="${ledConfig.cabinetWidth}" step="1"></div>
                        <div class="setting"><label>Высота кабинета (мм):</label><input type="number" id="cabHeightCustom" value="${ledConfig.cabinetHeight}" step="1"></div>
                    </div>
                    <div class="setting"><label>Кол-во кабинетов по горизонтали:</label><input type="number" id="cabinetsW" value="${ledConfig.cabinetsW}" min="1" step="1"></div>
                    <div class="setting"><label>Кол-во кабинетов по вертикали:</label><input type="number" id="cabinetsH" value="${ledConfig.cabinetsH}" min="1" step="1"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Разрешение</div><div class="result-value" id="cabResResult">—</div></div>
                        <div class="result-item"><div class="result-label">Размер экрана</div><div class="result-value" id="cabSizeResult">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="cabAreaResult">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Мощность</div><div class="result-value" id="cabPowerResult">—</div><div>Вт</div></div>
                    </div>
                    <div class="ergo-info">Количество пикселей в кабинете = округление вниз (размер_кабинета / шаг). Разрешение = пиксели_кабинета × кол-во кабинетов.</div>
                </div>
            </div>
        `;

        // Навешиваем обработчики
        attachResolutionHandlers();
        attachCabinetsHandlers();

        // Обработка переключения вкладок
        const tabs = container.querySelectorAll('.ergo-tab');
        const resolutionTab = document.getElementById('resolutionTab');
        const cabinetsTab = document.getElementById('cabinetsTab');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tabName === 'resolution') {
                    resolutionTab.style.display = 'block';
                    cabinetsTab.style.display = 'none';
                    updateResolutionCalculations(true); // true = skipSetState
                } else {
                    resolutionTab.style.display = 'none';
                    cabinetsTab.style.display = 'block';
                    updateCabinetsCalculations(true);
                }
            });
        });

        // Первичный расчёт
        if (activeTab === 'resolution') updateResolutionCalculations(true);
        else updateCabinetsCalculations(true);
    }

    function attachResolutionHandlers() {
        const presetSel = document.getElementById('resCabinetPresetSelect');
        const customDiv = document.getElementById('resCustomCabinetSize');
        if (presetSel) {
            presetSel.addEventListener('change', () => {
                customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                updateResolutionCalculations(false);
            });
        }
        const targetResSel = document.getElementById('targetResolutionSelect');
        const customResDiv = document.getElementById('customResolution');
        if (targetResSel) {
            targetResSel.addEventListener('change', () => {
                customResDiv.style.display = targetResSel.value === 'custom' ? 'block' : 'none';
                updateResolutionCalculations(false);
            });
        }
        const inputs = ['resPitchSelect', 'resCabWidthCustom', 'resCabHeightCustom', 'customResW', 'customResH'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => updateResolutionCalculations(false));
        });
    }

    function attachCabinetsHandlers() {
        const presetSel = document.getElementById('cabinetPresetSelect');
        const customDiv = document.getElementById('customCabinetSize');
        if (presetSel) {
            presetSel.addEventListener('change', () => {
                customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                updateCabinetsCalculations(false);
            });
        }
        const inputs = ['cabPitchSelect', 'cabWidthCustom', 'cabHeightCustom', 'cabinetsW', 'cabinetsH'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => updateCabinetsCalculations(false));
        });
    }

    function updateResolutionCalculations(skipSetState = false) {
        if (isUpdating) return;
        isUpdating = true;

        try {
            const pitchIdx = parseInt(document.getElementById('resPitchSelect')?.value || 0);
            const pitch = getLedScreenByIndex(pitchIdx).pitch;
            const powerPerSqm = getLedScreenByIndex(pitchIdx).powerPerSqm;

            const preset = document.getElementById('resCabinetPresetSelect')?.value || '600x337.5';
            let cabW_mm = 600, cabH_mm = 337.5;
            if (preset === 'custom') {
                cabW_mm = parseFloat(document.getElementById('resCabWidthCustom')?.value) || 600;
                cabH_mm = parseFloat(document.getElementById('resCabHeightCustom')?.value) || 337.5;
            } else {
                const [w, h] = preset.split('x').map(Number);
                cabW_mm = w; cabH_mm = h;
            }

            const targetResSelect = document.getElementById('targetResolutionSelect')?.value || 'fhd';
            let targetW = 1920, targetH = 1080;
            if (targetResSelect === 'fhd') { targetW = 1920; targetH = 1080; }
            else if (targetResSelect === '4k') { targetW = 3840; targetH = 2160; }
            else if (targetResSelect === '8k') { targetW = 7680; targetH = 4320; }
            else {
                targetW = parseInt(document.getElementById('customResW')?.value) || 1920;
                targetH = parseInt(document.getElementById('customResH')?.value) || 1080;
            }

            const { pixelsW, pixelsH } = getCabPixels(cabW_mm, cabH_mm, pitch);
            const cabinetsW = Math.ceil(targetW / pixelsW);
            const cabinetsH = Math.ceil(targetH / pixelsH);
            const realW = pixelsW * cabinetsW;
            const realH = pixelsH * cabinetsH;
            const width_m = (cabinetsW * cabW_mm) / 1000;
            const height_m = (cabinetsH * cabH_mm) / 1000;
            const area = width_m * height_m;
            const power = area * powerPerSqm;

            document.getElementById('reqRes').innerHTML = `${targetW}×${targetH}`;
            document.getElementById('realRes').innerHTML = `${realW}×${realH}`;
            document.getElementById('resCabinetsCount').innerHTML = `${cabinetsW}×${cabinetsH}`;
            document.getElementById('resSize').innerHTML = `${width_m.toFixed(2)}×${height_m.toFixed(2)}`;
            document.getElementById('resArea').innerHTML = area.toFixed(2);
            document.getElementById('resPower').innerHTML = Math.round(power);

            if (!skipSetState) {
                const state = AppState.getState();
                const ledConfig = { ...state.ledConfig };
                let changed = false;
                if (ledConfig.pitchIndex !== pitchIdx) { ledConfig.pitchIndex = pitchIdx; changed = true; }
                if (ledConfig.cabinetPreset !== preset) { ledConfig.cabinetPreset = preset; changed = true; }
                if (ledConfig.cabinetWidth !== cabW_mm) { ledConfig.cabinetWidth = cabW_mm; changed = true; }
                if (ledConfig.cabinetHeight !== cabH_mm) { ledConfig.cabinetHeight = cabH_mm; changed = true; }
                if (ledConfig.targetResolution !== targetResSelect) { ledConfig.targetResolution = targetResSelect; changed = true; }
                if (ledConfig.customResW !== targetW) { ledConfig.customResW = targetW; changed = true; }
                if (ledConfig.customResH !== targetH) { ledConfig.customResH = targetH; changed = true; }
                if (ledConfig.cabinetsW !== cabinetsW) { ledConfig.cabinetsW = cabinetsW; changed = true; }
                if (ledConfig.cabinetsH !== cabinetsH) { ledConfig.cabinetsH = cabinetsH; changed = true; }
                if (ledConfig.width_m !== width_m) { ledConfig.width_m = width_m; changed = true; }
                if (ledConfig.height_m !== height_m) { ledConfig.height_m = height_m; changed = true; }
                if (ledConfig.resW !== realW) { ledConfig.resW = realW; changed = true; }
                if (ledConfig.resH !== realH) { ledConfig.resH = realH; changed = true; }
                if (ledConfig.area !== area) { ledConfig.area = area; changed = true; }
                if (ledConfig.power !== power) { ledConfig.power = power; changed = true; }
                if (changed) AppState.setState({ ledConfig });
            }
        } finally {
            isUpdating = false;
        }
    }

    function updateCabinetsCalculations(skipSetState = false) {
        if (isUpdating) return;
        isUpdating = true;

        try {
            const pitchIdx = parseInt(document.getElementById('cabPitchSelect')?.value || 0);
            const pitch = getLedScreenByIndex(pitchIdx).pitch;
            const powerPerSqm = getLedScreenByIndex(pitchIdx).powerPerSqm;

            const preset = document.getElementById('cabinetPresetSelect')?.value || '600x337.5';
            let cabW_mm = 600, cabH_mm = 337.5;
            if (preset === 'custom') {
                cabW_mm = parseFloat(document.getElementById('cabWidthCustom')?.value) || 600;
                cabH_mm = parseFloat(document.getElementById('cabHeightCustom')?.value) || 337.5;
            } else {
                const [w, h] = preset.split('x').map(Number);
                cabW_mm = w; cabH_mm = h;
            }

            const cabinetsW = parseInt(document.getElementById('cabinetsW')?.value) || 1;
            const cabinetsH = parseInt(document.getElementById('cabinetsH')?.value) || 1;

            const { pixelsW, pixelsH } = getCabPixels(cabW_mm, cabH_mm, pitch);
            const resW = pixelsW * cabinetsW;
            const resH = pixelsH * cabinetsH;
            const width_m = (cabinetsW * cabW_mm) / 1000;
            const height_m = (cabinetsH * cabH_mm) / 1000;
            const area = width_m * height_m;
            const power = area * powerPerSqm;

            document.getElementById('cabResResult').innerHTML = `${resW}×${resH}`;
            document.getElementById('cabSizeResult').innerHTML = `${width_m.toFixed(2)}×${height_m.toFixed(2)}`;
            document.getElementById('cabAreaResult').innerHTML = area.toFixed(2);
            document.getElementById('cabPowerResult').innerHTML = Math.round(power);

            if (!skipSetState) {
                const state = AppState.getState();
                const ledConfig = { ...state.ledConfig };
                let changed = false;
                if (ledConfig.pitchIndex !== pitchIdx) { ledConfig.pitchIndex = pitchIdx; changed = true; }
                if (ledConfig.cabinetPreset !== preset) { ledConfig.cabinetPreset = preset; changed = true; }
                if (ledConfig.cabinetWidth !== cabW_mm) { ledConfig.cabinetWidth = cabW_mm; changed = true; }
                if (ledConfig.cabinetHeight !== cabH_mm) { ledConfig.cabinetHeight = cabH_mm; changed = true; }
                if (ledConfig.cabinetsW !== cabinetsW) { ledConfig.cabinetsW = cabinetsW; changed = true; }
                if (ledConfig.cabinetsH !== cabinetsH) { ledConfig.cabinetsH = cabinetsH; changed = true; }
                if (ledConfig.width_m !== width_m) { ledConfig.width_m = width_m; changed = true; }
                if (ledConfig.height_m !== height_m) { ledConfig.height_m = height_m; changed = true; }
                if (ledConfig.resW !== resW) { ledConfig.resW = resW; changed = true; }
                if (ledConfig.resH !== resH) { ledConfig.resH = resH; changed = true; }
                if (ledConfig.area !== area) { ledConfig.area = area; changed = true; }
                if (ledConfig.power !== power) { ledConfig.power = power; changed = true; }
                if (changed) AppState.setState({ ledConfig });
            }
        } finally {
            isUpdating = false;
        }
    }

    function showLedMode(mode) {
        const state = AppState.getState();
        if (state.viewMode === 'led' && state.ledConfig.activeMode === mode) return;
        state.viewMode = 'led';
        state.ledConfig.activeMode = mode;
        AppState.setState(state);

        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('ergoCalculatorContainer').style.display = 'none';
        document.getElementById('soundCalculatorContainer').style.display = 'none';
        document.getElementById('vcCalculatorContainer').style.display = 'none';
        const ledContainer = document.getElementById('ledCalculatorContainer');
        ledContainer.style.display = '';

        const activeTab = (mode === 'cabinets') ? 'cabinets' : 'resolution';
        renderCalculator(activeTab);
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'led' && newState.ledConfig.activeMode) {
                const activeTab = (newState.ledConfig.activeMode === 'cabinets') ? 'cabinets' : 'resolution';
                renderCalculator(activeTab);
            }
        });

        const ledModeBtns = document.querySelectorAll('.led-mode-btn');
        ledModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode) showLedMode(mode);
            });
        });

        const state = AppState.getState();
        if (state.viewMode === 'led' && state.ledConfig.activeMode) {
            const activeTab = (state.ledConfig.activeMode === 'cabinets') ? 'cabinets' : 'resolution';
            renderCalculator(activeTab);
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
