// led.js
const LedModule = (function() {
    let unsubscribe = null;

    function getLedScreenByIndex(index) {
        return Utils.modelDB.ledScreen[index] || Utils.modelDB.ledScreen[0];
    }

    function getCabPixels(cabW_mm, cabH_mm, pitch_mm) {
        return {
            pixelsW: Math.floor(cabW_mm / pitch_mm),
            pixelsH: Math.floor(cabH_mm / pitch_mm)
        };
    }

    function renderCabinetsMode() {
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
                <h3><i class="fas fa-th-large"></i> Расчёт LED-экрана по кабинетам</h3>
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
                <div class="ergo-info">
                    • Количество пикселей в кабинете = округление вниз (размер_кабинета / шаг).<br>
                    • Разрешение экрана = пиксели_кабинета × количество_кабинетов.<br>
                    • Физические размеры = размер_кабинета × количество_кабинетов.
                </div>
            </div>
        `;

        const presetSel = document.getElementById('cabinetPresetSelect');
        const customDiv = document.getElementById('customCabinetSize');
        if (presetSel) {
            presetSel.addEventListener('change', () => {
                customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                updateCabinetsCalculations();
            });
        }
        const inputs = ['cabPitchSelect', 'cabWidthCustom', 'cabHeightCustom', 'cabinetsW', 'cabinetsH'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => updateCabinetsCalculations());
        });

        updateCabinetsCalculations();
    }

    function updateCabinetsCalculations() {
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

        const state = AppState.getState();
        const ledConfig = { ...state.ledConfig };
        ledConfig.activeMode = 'cabinets';
        ledConfig.pitchIndex = pitchIdx;
        ledConfig.cabinetPreset = preset;
        ledConfig.cabinetWidth = cabW_mm;
        ledConfig.cabinetHeight = cabH_mm;
        ledConfig.cabinetsW = cabinetsW;
        ledConfig.cabinetsH = cabinetsH;
        ledConfig.width_m = width_m;
        ledConfig.height_m = height_m;
        ledConfig.resW = resW;
        ledConfig.resH = resH;
        ledConfig.area = area;
        ledConfig.power = power;
        AppState.setState({ ledConfig });
    }

    function renderResolutionMode() {
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
                <h3><i class="fas fa-bullseye"></i> Расчёт LED-экрана по разрешению</h3>
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
                <div class="ergo-info">
                    • Количество пикселей в кабинете = округление вниз (размер_кабинета / шаг).<br>
                    • Количество кабинетов = округление вверх (целевое_разрешение / пиксели_кабинета).<br>
                    • Итоговое разрешение = пиксели_кабинета × количество_кабинетов.
                </div>
            </div>
        `;

        const presetSel = document.getElementById('resCabinetPresetSelect');
        const customDiv = document.getElementById('resCustomCabinetSize');
        if (presetSel) {
            presetSel.addEventListener('change', () => {
                customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                updateResolutionCalculations();
            });
        }
        const targetResSel = document.getElementById('targetResolutionSelect');
        const customResDiv = document.getElementById('customResolution');
        if (targetResSel) {
            targetResSel.addEventListener('change', () => {
                customResDiv.style.display = targetResSel.value === 'custom' ? 'block' : 'none';
                updateResolutionCalculations();
            });
        }
        const inputs = ['resPitchSelect', 'resCabWidthCustom', 'resCabHeightCustom', 'customResW', 'customResH'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => updateResolutionCalculations());
        });

        updateResolutionCalculations();
    }

    function updateResolutionCalculations() {
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

        const state = AppState.getState();
        const ledConfig = { ...state.ledConfig };
        ledConfig.activeMode = 'resolution';
        ledConfig.pitchIndex = pitchIdx;
        ledConfig.cabinetPreset = preset;
        ledConfig.cabinetWidth = cabW_mm;
        ledConfig.cabinetHeight = cabH_mm;
        ledConfig.targetResolution = targetResSelect;
        ledConfig.customResW = targetW;
        ledConfig.customResH = targetH;
        ledConfig.cabinetsW = cabinetsW;
        ledConfig.cabinetsH = cabinetsH;
        ledConfig.width_m = width_m;
        ledConfig.height_m = height_m;
        ledConfig.resW = realW;
        ledConfig.resH = realH;
        ledConfig.area = area;
        ledConfig.power = power;
        AppState.setState({ ledConfig });
    }

    function renderStitchingMode() {
        const state = AppState.getState();
        const container = document.getElementById('ledCalculatorContainer');
        if (!container) return;

        const ledScreens = [];
        state.paths.forEach(path => {
            [...path.sourceDevices, ...path.sinkDevices].forEach(dev => {
                if (dev.type === 'ledScreen') ledScreens.push(dev);
            });
        });
        const screenOptions = ledScreens.map(s => `<option value="${s.id}" data-width="${s.width_m||0}" data-height="${s.height_m||0}" data-resw="${s.resW||0}" data-resh="${s.resH||0}" data-power="${s.powerPerSqm||0}">${s.name}</option>`).join('');

        container.innerHTML = `
            <div class="calc-card">
                <h3><i class="fas fa-object-group"></i> Сшивка LED-экранов</h3>
                <div class="setting"><label>Базовый экран:</label><select id="stitchScreenSelect"><option value="">— Выберите экран —</option>${screenOptions}</select></div>
                <div class="setting"><label>Кол-во по горизонтали:</label><input type="number" id="stitchCountW" value="${state.ledConfig.stitchCountW}" min="1" step="1"></div>
                <div class="setting"><label>Кол-во по вертикали:</label><input type="number" id="stitchCountH" value="${state.ledConfig.stitchCountH}" min="1" step="1"></div>
                <div class="result-grid">
                    <div class="result-item"><div class="result-label">Итоговое разрешение</div><div class="result-value" id="stitchRes">—</div></div>
                    <div class="result-item"><div class="result-label">Итоговый размер</div><div class="result-value" id="stitchSize">—</div><div>м</div></div>
                    <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="stitchArea">—</div><div>м²</div></div>
                    <div class="result-item"><div class="result-label">Мощность</div><div class="result-value" id="stitchPower">—</div><div>Вт</div></div>
                </div>
                <div class="ergo-info">Сшивка нескольких одинаковых LED-экранов в один логический экран.</div>
            </div>
        `;

        const stitchSelect = document.getElementById('stitchScreenSelect');
        if (stitchSelect) stitchSelect.addEventListener('change', updateStitching);
        const inputs = ['stitchCountW', 'stitchCountH'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateStitching);
        });
        updateStitching();
    }

    function updateStitching() {
        const state = AppState.getState();
        const select = document.getElementById('stitchScreenSelect');
        const selectedId = select?.value;
        let baseScreen = null;
        if (selectedId) {
            for (let path of state.paths) {
                baseScreen = [...path.sourceDevices, ...path.sinkDevices].find(d => d.id == selectedId && d.type === 'ledScreen');
                if (baseScreen) break;
            }
        }
        if (baseScreen) {
            const countW = parseInt(document.getElementById('stitchCountW')?.value) || 1;
            const countH = parseInt(document.getElementById('stitchCountH')?.value) || 1;
            const baseW_m = baseScreen.width_m || 0;
            const baseH_m = baseScreen.height_m || 0;
            const baseResW = baseScreen.resW || 0;
            const baseResH = baseScreen.resH || 0;
            const totalW_m = baseW_m * countW;
            const totalH_m = baseH_m * countH;
            const totalResW = baseResW * countW;
            const totalResH = baseResH * countH;
            const area = totalW_m * totalH_m;
            const power = area * (baseScreen.powerPerSqm || 300);

            document.getElementById('stitchRes').innerHTML = `${totalResW}×${totalResH}`;
            document.getElementById('stitchSize').innerHTML = `${totalW_m.toFixed(2)}×${totalH_m.toFixed(2)}`;
            document.getElementById('stitchArea').innerHTML = area.toFixed(2);
            document.getElementById('stitchPower').innerHTML = Math.round(power);

            const ledConfig = { ...state.ledConfig };
            ledConfig.activeMode = 'stitching';
            ledConfig.stitchedScreenId = selectedId;
            ledConfig.stitchCountW = countW;
            ledConfig.stitchCountH = countH;
            ledConfig.width_m = totalW_m;
            ledConfig.height_m = totalH_m;
            ledConfig.resW = totalResW;
            ledConfig.resH = totalResH;
            ledConfig.area = area;
            ledConfig.power = power;
            AppState.setState({ ledConfig });
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

        if (mode === 'cabinets') renderCabinetsMode();
        else if (mode === 'resolution') renderResolutionMode();
        else if (mode === 'stitching') renderStitchingMode();
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'led' && newState.ledConfig.activeMode) {
                const mode = newState.ledConfig.activeMode;
                if (mode === 'cabinets') renderCabinetsMode();
                else if (mode === 'resolution') renderResolutionMode();
                else if (mode === 'stitching') renderStitchingMode();
            }
        });

        const ledModeBtns = document.querySelectorAll('.led-mode-btn');
        ledModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'cabinets' || mode === 'resolution' || mode === 'stitching') {
                    showLedMode(mode);
                }
            });
        });

        const state = AppState.getState();
        if (state.viewMode === 'led' && state.ledConfig.activeMode) {
            const mode = state.ledConfig.activeMode;
            if (mode === 'cabinets') renderCabinetsMode();
            else if (mode === 'resolution') renderResolutionMode();
            else if (mode === 'stitching') renderStitchingMode();
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
