// led.js
const LedModule = (function() {
    let unsubscribe = null;

    function getLedScreenByIndex(index) {
        return Utils.modelDB.ledScreen[index] || Utils.modelDB.ledScreen[0];
    }

    // Вспомогательная функция для получения целого числа пикселей в кабинете
    function getCabPixels(cabW_mm, cabH_mm, pitch_mm) {
        const pixelsW = Math.floor(cabW_mm / pitch_mm);
        const pixelsH = Math.floor(cabH_mm / pitch_mm);
        return { pixelsW, pixelsH };
    }

    function renderCalculator(mode) {
        const state = AppState.getState();
        const ledConfig = state.ledConfig;
        const container = document.getElementById('ledCalculatorContainer');
        if (!container) return;

        let html = '';
        if (mode === 'cabinets') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-th-large"></i> Расчёт LED-экрана по кабинетам</h3>
                    <div class="setting"><label>Шаг пикселя:</label><select id="cabPitchSelect">${Utils.modelDB.ledScreen.map((m,i)=>`<option value="${i}" ${ledConfig.pitchIndex==i?'selected':''}>${m.name}</option>`).join('')}</select></div>
                    <div class="setting"><label>Размер кабинета:</label><select id="cabinetPresetSelect"><option value="600x337.5" ${ledConfig.cabinetPreset=='600x337.5'?'selected':''}>600×337.5 мм</option><option value="500x500" ${ledConfig.cabinetPreset=='500x500'?'selected':''}>500×500 мм</option><option value="640x480" ${ledConfig.cabinetPreset=='640x480'?'selected':''}>640×480 мм</option><option value="960x540" ${ledConfig.cabinetPreset=='960x540'?'selected':''}>960×540 мм</option><option value="custom" ${ledConfig.cabinetPreset=='custom'?'selected':''}>Свой</option></select></div>
                    <div id="customCabinetSize" style="display:${ledConfig.cabinetPreset==='custom'?'block':'none'};"><div class="setting"><label>Ширина кабинета (мм):</label><input type="number" id="cabWidthCustom" value="${ledConfig.cabinetWidth}" step="1"></div><div class="setting"><label>Высота кабинета (мм):</label><input type="number" id="cabHeightCustom" value="${ledConfig.cabinetHeight}" step="1"></div></div>
                    <div class="setting"><label>Кол-во кабинетов по горизонтали:</label><input type="number" id="cabinetsW" value="${ledConfig.cabinetsW}" min="1" step="1"></div>
                    <div class="setting"><label>Кол-во кабинетов по вертикали:</label><input type="number" id="cabinetsH" value="${ledConfig.cabinetsH}" min="1" step="1"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Ширина экрана</div><div class="result-value" id="cabWidthResult">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Высота экрана</div><div class="result-value" id="cabHeightResult">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Разрешение</div><div class="result-value" id="cabResResult">—</div><div>пикс</div></div>
                        <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="cabAreaResult">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Потребляемая мощность</div><div class="result-value" id="cabPowerResult">—</div><div>Вт</div></div>
                    </div>
                    <div class="ergo-info">Разрешение = (ширина кабинета / шаг) с округлением вниз × кол-во кабинетов. Мощность = площадь × удельная мощность (Вт/м²).</div>
                </div>
            `;
        } else if (mode === 'resolution') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-bullseye"></i> Расчёт LED-экрана по разрешению</h3>
                    <div class="setting"><label>Шаг пикселя:</label><select id="resPitchSelect">${Utils.modelDB.ledScreen.map((m,i)=>`<option value="${i}" ${ledConfig.pitchIndex==i?'selected':''}>${m.name}</option>`).join('')}</select></div>
                    <div class="setting"><label>Размер кабинета:</label><select id="resCabinetPresetSelect"><option value="600x337.5" ${ledConfig.cabinetPreset=='600x337.5'?'selected':''}>600×337.5 мм</option><option value="500x500" ${ledConfig.cabinetPreset=='500x500'?'selected':''}>500×500 мм</option><option value="640x480" ${ledConfig.cabinetPreset=='640x480'?'selected':''}>640×480 мм</option><option value="960x540" ${ledConfig.cabinetPreset=='960x540'?'selected':''}>960×540 мм</option><option value="custom" ${ledConfig.cabinetPreset=='custom'?'selected':''}>Свой</option></select></div>
                    <div id="resCustomCabinetSize" style="display:${ledConfig.cabinetPreset==='custom'?'block':'none'};"><div class="setting"><label>Ширина кабинета (мм):</label><input type="number" id="resCabWidthCustom" value="${ledConfig.cabinetWidth}" step="1"></div><div class="setting"><label>Высота кабинета (мм):</label><input type="number" id="resCabHeightCustom" value="${ledConfig.cabinetHeight}" step="1"></div></div>
                    <div class="setting"><label>Желаемое разрешение:</label><select id="targetResolutionSelect"><option value="fhd" ${ledConfig.targetResolution=='fhd'?'selected':''}>Full HD (1920×1080)</option><option value="4k" ${ledConfig.targetResolution=='4k'?'selected':''}>4K (3840×2160)</option><option value="8k" ${ledConfig.targetResolution=='8k'?'selected':''}>8K (7680×4320)</option><option value="custom" ${ledConfig.targetResolution=='custom'?'selected':''}>Своё</option></select></div>
                    <div id="customResolution" style="display:${ledConfig.targetResolution==='custom'?'block':'none'};"><div class="setting"><label>Ширина (пикс):</label><input type="number" id="customResW" value="${ledConfig.customResW}" step="1"></div><div class="setting"><label>Высота (пикс):</label><input type="number" id="customResH" value="${ledConfig.customResH}" step="1"></div></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Требуемое разрешение</div><div class="result-value" id="reqRes">—</div></div>
                        <div class="result-item"><div class="result-label">Реальное разрешение</div><div class="result-value" id="realRes">—</div></div>
                        <div class="result-item"><div class="result-label">Размер экрана</div><div class="result-value" id="resSize">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Кол-во кабинетов</div><div class="result-value" id="resCabinetsCount">—</div></div>
                        <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="resArea">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Мощность</div><div class="result-value" id="resPower">—</div><div>Вт</div></div>
                    </div>
                    <div class="ergo-info">Система подбирает ближайшее количество кабинетов, покрывающее заданное разрешение, используя целое число пикселей в кабинете (округляя размер кабинета вниз).</div>
                </div>
            `;
        } else if (mode === 'stitching') {
            const state = AppState.getState();
            const ledScreens = [];
            state.paths.forEach(path => {
                [...path.sourceDevices, ...path.sinkDevices].forEach(dev => {
                    if (dev.type === 'ledScreen') ledScreens.push(dev);
                });
            });
            const screenOptions = ledScreens.map(s => `<option value="${s.id}" data-width="${s.width_m||0}" data-height="${s.height_m||0}" data-resw="${s.resW||0}" data-resh="${s.resH||0}" data-pitch="${s.pitch||0}" data-power="${s.powerPerSqm||0}">${s.name}</option>`).join('');
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-object-group"></i> Сшивка LED-экранов</h3>
                    <div class="setting"><label>Базовый экран:</label><select id="stitchScreenSelect"><option value="">— Выберите экран —</option>${screenOptions}</select></div>
                    <div class="setting"><label>Кол-во по горизонтали:</label><input type="number" id="stitchCountW" value="${ledConfig.stitchCountW}" min="1" step="1"></div>
                    <div class="setting"><label>Кол-во по вертикали:</label><input type="number" id="stitchCountH" value="${ledConfig.stitchCountH}" min="1" step="1"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Итоговое разрешение</div><div class="result-value" id="stitchRes">—</div></div>
                        <div class="result-item"><div class="result-label">Итоговый размер</div><div class="result-value" id="stitchSize">—</div><div>м</div></div>
                        <div class="result-item"><div class="result-label">Площадь</div><div class="result-value" id="stitchArea">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Мощность</div><div class="result-value" id="stitchPower">—</div><div>Вт</div></div>
                    </div>
                    <div class="ergo-info">Сшивка нескольких одинаковых LED-экранов в один логический экран. Используются целые разрешения исходных экранов.</div>
                </div>
            `;
        }

        container.innerHTML = html;
        attachEventHandlers(mode);
        updateCalculations(mode, true);
    }

    function attachEventHandlers(mode) {
        if (mode === 'cabinets') {
            const presetSel = document.getElementById('cabinetPresetSelect');
            const customDiv = document.getElementById('customCabinetSize');
            if (presetSel) {
                presetSel.addEventListener('change', () => {
                    customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                    updateCalculations(mode);
                });
            }
            const inputs = ['cabPitchSelect', 'cabWidthCustom', 'cabHeightCustom', 'cabinetsW', 'cabinetsH'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => updateCalculations(mode));
            });
        } else if (mode === 'resolution') {
            const presetSel = document.getElementById('resCabinetPresetSelect');
            const customDiv = document.getElementById('resCustomCabinetSize');
            if (presetSel) {
                presetSel.addEventListener('change', () => {
                    customDiv.style.display = presetSel.value === 'custom' ? 'block' : 'none';
                    updateCalculations(mode);
                });
            }
            const targetResSel = document.getElementById('targetResolutionSelect');
            const customResDiv = document.getElementById('customResolution');
            if (targetResSel) {
                targetResSel.addEventListener('change', () => {
                    customResDiv.style.display = targetResSel.value === 'custom' ? 'block' : 'none';
                    updateCalculations(mode);
                });
            }
            const inputs = ['resPitchSelect', 'resCabWidthCustom', 'resCabHeightCustom', 'customResW', 'customResH'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => updateCalculations(mode));
            });
        } else if (mode === 'stitching') {
            const stitchSelect = document.getElementById('stitchScreenSelect');
            if (stitchSelect) stitchSelect.addEventListener('change', () => updateCalculations(mode));
            const inputs = ['stitchCountW', 'stitchCountH'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => updateCalculations(mode));
            });
        }
    }

    function updateCalculations(mode, skipSetState = false) {
        const state = AppState.getState();
        let ledConfig = { ...state.ledConfig };
        let changed = false;

        if (mode === 'cabinets') {
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

            const cW = parseInt(document.getElementById('cabinetsW')?.value) || 1;
            const cH = parseInt(document.getElementById('cabinetsH')?.value) || 1;

            // Вычисляем целое число пикселей в кабинете
            const { pixelsW: pxW, pixelsH: pxH } = getCabPixels(cabW_mm, cabH_mm, pitch);

            const width_m = (cW * cabW_mm) / 1000;
            const height_m = (cH * cabH_mm) / 1000;
            const resW = pxW * cW;
            const resH = pxH * cH;
            const area = width_m * height_m;
            const power = area * powerPerSqm;

            // Обновляем конфигурацию
            if (ledConfig.pitchIndex !== pitchIdx) { ledConfig.pitchIndex = pitchIdx; changed = true; }
            if (ledConfig.cabinetPreset !== preset) { ledConfig.cabinetPreset = preset; changed = true; }
            if (ledConfig.cabinetWidth !== cabW_mm) { ledConfig.cabinetWidth = cabW_mm; changed = true; }
            if (ledConfig.cabinetHeight !== cabH_mm) { ledConfig.cabinetHeight = cabH_mm; changed = true; }
            if (ledConfig.cabinetsW !== cW) { ledConfig.cabinetsW = cW; changed = true; }
            if (ledConfig.cabinetsH !== cH) { ledConfig.cabinetsH = cH; changed = true; }
            if (ledConfig.width_m !== width_m) { ledConfig.width_m = width_m; changed = true; }
            if (ledConfig.height_m !== height_m) { ledConfig.height_m = height_m; changed = true; }
            if (ledConfig.resW !== resW) { ledConfig.resW = resW; changed = true; }
            if (ledConfig.resH !== resH) { ledConfig.resH = resH; changed = true; }
            if (ledConfig.area !== area) { ledConfig.area = area; changed = true; }
            if (ledConfig.power !== power) { ledConfig.power = power; changed = true; }

            document.getElementById('cabWidthResult').innerText = width_m.toFixed(2);
            document.getElementById('cabHeightResult').innerText = height_m.toFixed(2);
            document.getElementById('cabResResult').innerText = `${resW}×${resH}`;
            document.getElementById('cabAreaResult').innerText = area.toFixed(2);
            document.getElementById('cabPowerResult').innerText = Math.round(power);

        } else if (mode === 'resolution') {
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

            // Целое количество пикселей в кабинете
            const { pixelsW: pxW, pixelsH: pxH } = getCabPixels(cabW_mm, cabH_mm, pitch);

            let cW = Math.ceil(targetW / pxW);
            let cH = Math.ceil(targetH / pxH);
            if (cW < 1) cW = 1;
            if (cH < 1) cH = 1;

            const realResW = pxW * cW;
            const realResH = pxH * cH;
            const width_m = (cW * cabW_mm) / 1000;
            const height_m = (cH * cabH_mm) / 1000;
            const area = width_m * height_m;
            const power = area * powerPerSqm;

            if (ledConfig.pitchIndex !== pitchIdx) { ledConfig.pitchIndex = pitchIdx; changed = true; }
            if (ledConfig.cabinetPreset !== preset) { ledConfig.cabinetPreset = preset; changed = true; }
            if (ledConfig.cabinetWidth !== cabW_mm) { ledConfig.cabinetWidth = cabW_mm; changed = true; }
            if (ledConfig.cabinetHeight !== cabH_mm) { ledConfig.cabinetHeight = cabH_mm; changed = true; }
            if (ledConfig.targetResolution !== targetResSelect) { ledConfig.targetResolution = targetResSelect; changed = true; }
            if (ledConfig.customResW !== targetW) { ledConfig.customResW = targetW; changed = true; }
            if (ledConfig.customResH !== targetH) { ledConfig.customResH = targetH; changed = true; }
            if (ledConfig.width_m !== width_m) { ledConfig.width_m = width_m; changed = true; }
            if (ledConfig.height_m !== height_m) { ledConfig.height_m = height_m; changed = true; }
            if (ledConfig.resW !== realResW) { ledConfig.resW = realResW; changed = true; }
            if (ledConfig.resH !== realResH) { ledConfig.resH = realResH; changed = true; }
            if (ledConfig.area !== area) { ledConfig.area = area; changed = true; }
            if (ledConfig.power !== power) { ledConfig.power = power; changed = true; }

            document.getElementById('reqRes').innerHTML = `${targetW}×${targetH}`;
            document.getElementById('realRes').innerHTML = `${realResW}×${realResH}`;
            document.getElementById('resSize').innerHTML = `${width_m.toFixed(2)}×${height_m.toFixed(2)}`;
            document.getElementById('resCabinetsCount').innerHTML = `${cW}×${cH}`;
            document.getElementById('resArea').innerHTML = area.toFixed(2);
            document.getElementById('resPower').innerHTML = Math.round(power);

        } else if (mode === 'stitching') {
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

                if (ledConfig.stitchedScreenId !== selectedId) { ledConfig.stitchedScreenId = selectedId; changed = true; }
                if (ledConfig.stitchCountW !== countW) { ledConfig.stitchCountW = countW; changed = true; }
                if (ledConfig.stitchCountH !== countH) { ledConfig.stitchCountH = countH; changed = true; }
                if (ledConfig.width_m !== totalW_m) { ledConfig.width_m = totalW_m; changed = true; }
                if (ledConfig.height_m !== totalH_m) { ledConfig.height_m = totalH_m; changed = true; }
                if (ledConfig.resW !== totalResW) { ledConfig.resW = totalResW; changed = true; }
                if (ledConfig.resH !== totalResH) { ledConfig.resH = totalResH; changed = true; }
                if (ledConfig.area !== area) { ledConfig.area = area; changed = true; }
                if (ledConfig.power !== power) { ledConfig.power = power; changed = true; }

                document.getElementById('stitchRes').innerHTML = `${totalResW}×${totalResH}`;
                document.getElementById('stitchSize').innerHTML = `${totalW_m.toFixed(2)}×${totalH_m.toFixed(2)}`;
                document.getElementById('stitchArea').innerHTML = area.toFixed(2);
                document.getElementById('stitchPower').innerHTML = Math.round(power);
            }
        }

        if (!skipSetState && changed) {
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

        renderCalculator(mode);
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'led' && newState.ledConfig.activeMode) {
                renderCalculator(newState.ledConfig.activeMode);
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
            showLedMode(state.ledConfig.activeMode);
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
