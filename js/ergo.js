// ergo.js
const ErgoModule = (function() {
    let unsubscribe = null;
    let participants = [];

    // Вспомогательная функция для получения текущих экранов из трактов
    function getScreensList() {
        const state = AppState.getState();
        const screens = [{ id: 'custom', name: '— Ручной ввод —', width: 0, height: 0, resolutionW: 0, resolutionH: 0 }];
        state.paths.forEach(path => {
            [...path.sourceDevices, ...path.sinkDevices].forEach(dev => {
                if (dev.type === 'display' || dev.type === 'ledScreen') {
                    let w = 0, h = 0, rw = 0, rh = 0;
                    if (dev.type === 'display') {
                        w = 1200; h = 700; rw = 1920; rh = 1080;
                    } else if (dev.type === 'ledScreen') {
                        w = dev.width_m ? dev.width_m * 1000 : 0;
                        h = dev.height_m ? dev.height_m * 1000 : 0;
                        rw = dev.resW || 0;
                        rh = dev.resH || 0;
                    }
                    screens.push({
                        id: dev.id,
                        name: dev.name,
                        width: w,
                        height: h,
                        resolutionW: rw,
                        resolutionH: rh
                    });
                }
            });
        });
        return screens;
    }

    function renderCalculator(activeTab = 'distance') {
        const screens = getScreensList();
        const container = document.getElementById('ergoCalculatorContainer');
        if (!container) return;

        const screenSelectHtml = `<div class="screen-selector">
            <label>Выберите экран:</label>
            <select id="ergoScreenSelect">${screens.map(s => `<option value="${s.id}" data-width="${s.width}" data-height="${s.height}" data-resw="${s.resolutionW}" data-resh="${s.resolutionH}">${s.name}</option>`).join('')}</select>
            <div id="manualScreenParams" style="margin-top: 12px; display: none;">
                <div class="ergo-row">
                    <div class="ergo-field"><label>Ширина экрана (мм):</label><input type="number" id="screenWidth" value="1200" step="10"></div>
                    <div class="ergo-field"><label>Высота экрана (мм):</label><input type="number" id="screenHeight" value="700" step="10"></div>
                </div>
                <div class="ergo-row">
                    <div class="ergo-field"><label>Разрешение по ширине (пикс):</label><input type="number" id="screenResW" value="1920" step="1"></div>
                    <div class="ergo-field"><label>Разрешение по высоте (пикс):</label><input type="number" id="screenResH" value="1080" step="1"></div>
                </div>
            </div>
        </div>`;

        container.innerHTML = `
            <div class="ergo-calc">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                    <button class="btn-secondary" id="closeErgoBtn"><i class="fas fa-times"></i> Закрыть калькулятор</button>
                </div>
                <div class="ergo-tabs" id="ergoTabs">
                    <div class="ergo-tab ${activeTab === 'distance' ? 'active' : ''}" data-tab="distance">Расчёт расстояния/высоты</div>
                    <div class="ergo-tab ${activeTab === 'zov' ? 'active' : ''}" data-tab="zov">Зона оптимальной видимости (ЗОВ)</div>
                </div>
                <div id="distanceTab" style="display: ${activeTab === 'distance' ? 'block' : 'none'};">
                    <div class="ergo-mode-switch" id="ergoModeSwitch">
                        <button class="ergo-mode-btn active" data-mode="exact">Точный (tg α)</button>
                        <button class="ergo-mode-btn" data-mode="approx">Приближённый (коэфф.)</button>
                    </div>
                    ${screenSelectHtml}
                    <div id="ergoDistanceCalc">
                        <h4>📏 Расчёт расстояния до экрана по высоте символа</h4>
                        <div class="ergo-row">
                            <div class="ergo-field">
                                <label>Высота символа h (мм):</label>
                                <input type="number" id="ergoCharHeight" value="28" step="1" min="1">
                            </div>
                            <div class="ergo-field">
                                <label>Категория информации:</label>
                                <select id="ergoInfoTypeDist">
                                    <option value="min">Минимальная читаемость (α=0.25°)</option>
                                    <option value="optimal" selected>Оптимальные условия (α=0.38°)</option>
                                    <option value="critical">Критическая информация (α=0.55°)</option>
                                </select>
                            </div>
                        </div>
                        <div class="ergo-result">
                            <div class="big-number" id="ergoDistanceResult">—</div>
                            <div class="small-text">максимальное расстояние (метров)</div>
                            <div id="pixelInfoDist" style="font-size:0.8rem; margin-top:8px;"></div>
                        </div>
                    </div>
                    <div id="ergoHeightCalc" style="margin-top: 16px;">
                        <h4>📏 Расчёт минимальной высоты символа по известному расстоянию до экрана</h4>
                        <div class="ergo-row">
                            <div class="ergo-field">
                                <label>Расстояние до экрана L (мм):</label>
                                <input type="number" id="ergoDistanceMM" value="4000" step="100" min="100">
                            </div>
                            <div class="ergo-field">
                                <label>Категория информации:</label>
                                <select id="ergoInfoTypeHeight">
                                    <option value="min">Минимальная читаемость (α=0.25°)</option>
                                    <option value="optimal" selected>Оптимальные условия (α=0.38°)</option>
                                    <option value="critical">Критическая информация (α=0.55°)</option>
                                </select>
                            </div>
                        </div>
                        <div class="ergo-result">
                            <div class="big-number" id="ergoHeightResult">—</div>
                            <div class="small-text">минимальная высота символов (мм)</div>
                            <div id="pixelInfoHeight" style="font-size:0.8rem; margin-top:8px;"></div>
                        </div>
                    </div>
                    <div class="ergo-info">
                        📖 Согласно методике ITPP (Новикова, Переверзев).<br>
                        • α = 0.25° — минимальная различимость (14–16 угл. мин)<br>
                        • α = 0.38° — оптимальные условия (20–22 угл. мин)<br>
                        • α = 0.55° — критическая информация (30–35 угл. мин)<br>
                        Формулы: h = L·tg(α)  |  L = h / tg(α).<br>
                        Приближённый режим использует коэффициенты: 0.004, 0.007, 0.009.
                    </div>
                </div>
                <div id="zovTab" style="display: ${activeTab === 'zov' ? 'block' : 'none'};">
                    <h4>📐 Зона оптимальной видимости (ЗОВ)</h4>
                    <div class="screen-selector" style="margin-bottom: 12px;">
                        <label>Выберите экран для расчёта:</label>
                        <select id="zovScreenSelect">${screens.map(s => `<option value="${s.id}" data-width="${s.width}" data-height="${s.height}" data-resw="${s.resolutionW}" data-resh="${s.resolutionH}">${s.name}</option>`).join('')}</select>
                        <div id="zovManualParams" style="margin-top: 12px; display: none;">
                            <div class="ergo-row">
                                <div class="ergo-field"><label>Ширина экрана (мм):</label><input type="number" id="zovScreenWidth" value="1200" step="10"></div>
                                <div class="ergo-field"><label>Высота экрана (мм):</label><input type="number" id="zovScreenHeight" value="700" step="10"></div>
                            </div>
                            <div class="ergo-row">
                                <div class="ergo-field"><label>Разрешение по ширине (пикс):</label><input type="number" id="zovScreenResW" value="1920" step="1"></div>
                                <div class="ergo-field"><label>Разрешение по высоте (пикс):</label><input type="number" id="zovScreenResH" value="1080" step="1"></div>
                            </div>
                        </div>
                    </div>
                    <div class="ergo-row">
                        <div class="ergo-field">
                            <label>Положение строки (% от высоты):</label>
                            <input type="number" id="rowPosition" value="50" step="10" min="0" max="100">
                        </div>
                        <div class="ergo-field">
                            <label>Критический угол α (градусы):</label>
                            <input type="number" id="criticalAngle" value="0.38" step="0.05" min="0.1" max="1.0">
                        </div>
                    </div>
                    <div class="participant-list" id="participantList"></div>
                    <button class="btn-secondary btn-small" id="addParticipantBtn"><i class="fas fa-user-plus"></i> Добавить участника</button>
                    <div class="ergo-result" style="margin-top: 16px;">
                        <div><strong>Коэффициент эргономики Кэ:</strong> <span id="keValue" class="ke-value">—</span> / 10</div>
                        <div id="keDetails" style="font-size:0.8rem; margin-top:8px;"></div>
                    </div>
                    <div class="ergo-info">
                        * Координаты участников задаются в мм, начало координат – центр экрана, ось Y – нормаль к экрану.<br>
                        Для каждого участника рассчитывается доля строки, попадающая в зону оптимальной видимости (угол ≥ критического).<br>
                        Кэ = (средняя доля по всем участникам) × 10.
                    </div>
                </div>
            </div>
        `;

        attachDistanceEventHandlers();
        attachZovEventHandlers();

        // ========== ОБРАБОТЧИКИ ВКЛАДОК ==========
        const tabs = container.querySelectorAll('.ergo-tab');
        const distanceTabDiv = container.querySelector('#distanceTab');
        const zovTabDiv = container.querySelector('#zovTab');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                if (!tabName) return;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tabName === 'distance') {
                    distanceTabDiv.style.display = 'block';
                    zovTabDiv.style.display = 'none';
                } else {
                    distanceTabDiv.style.display = 'none';
                    zovTabDiv.style.display = 'block';
                    updateZOV();
                }
            });
        });

       // ========== КНОПКА ЗАКРЫТИЯ ==========
const closeBtn = container.querySelector('#closeErgoBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        console.log('Закрытие эргономического калькулятора');
        // Возвращаемся к предыдущему режиму (тракты)
        const state = AppState.getState();
        const lastViewMode = localStorage.getItem('lastViewMode') || 'single';
        console.log('lastViewMode:', lastViewMode);
        
        // Восстанавливаем viewMode
        if (lastViewMode === 'single') {
            if (state.activePathId) {
                state.viewMode = 'single';
                AppState.setState(state);
            } else if (state.paths.length) {
                state.viewMode = 'single';
                state.activePathId = state.paths[0].id;
                AppState.setState(state);
            } else {
                // Создаём тракт, если их нет
                const newPath = { id: state.nextPathId++, name: `Тракт ${state.nextPathId - 1}`, sourceDevices: [], sinkDevices: [] };
                state.paths.push(newPath);
                state.activePathId = newPath.id;
                state.viewMode = 'single';
                AppState.setState(state);
            }
        } else {
            state.viewMode = lastViewMode;
            AppState.setState(state);
        }
        
        // Скрываем контейнер эргономики
        const ergoContainer = document.getElementById('ergoCalculatorContainer');
        if (ergoContainer) ergoContainer.style.display = 'none';
        
        // Показываем соответствующий контейнер трактов
        if (state.viewMode === 'single') {
            document.getElementById('activePathContainer').style.display = '';
        } else {
            document.getElementById('allTractsContainer').style.display = '';
        }
        
        // Восстанавливаем кнопку в сайдбаре
        const ergoBtn = document.getElementById('showErgoCalcBtn');
        if (ergoBtn) {
            ergoBtn.classList.remove('btn-inactive');
            ergoBtn.classList.add('btn-primary');
            ergoBtn.innerHTML = '<i class="fas fa-calculator"></i> Показать калькулятор';
        }
        
        // Принудительно пересчитываем всё
        if (typeof calculateAll === 'function') calculateAll();
    });
}
        updateDistanceCalculations();
        updateZOV();
    }

    function attachDistanceEventHandlers() {
        // Переключение режима точный/приближённый
        const modeBtns = document.querySelectorAll('.ergo-mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateDistanceCalculations();
            });
        });

        // Обновление при изменении экрана
        const screenSelect = document.getElementById('ergoScreenSelect');
        const manualDiv = document.getElementById('manualScreenParams');
        const screenWidth = document.getElementById('screenWidth');
        const screenHeight = document.getElementById('screenHeight');
        const screenResW = document.getElementById('screenResW');
        const screenResH = document.getElementById('screenResH');

        function updateScreenParams() {
            const selected = screenSelect.options[screenSelect.selectedIndex];
            if (selected.value === 'custom') {
                manualDiv.style.display = 'block';
            } else {
                manualDiv.style.display = 'none';
            }
            updateDistanceCalculations();
        }

        screenSelect.addEventListener('change', updateScreenParams);
        screenWidth.addEventListener('input', updateDistanceCalculations);
        screenHeight.addEventListener('input', updateDistanceCalculations);
        screenResW.addEventListener('input', updateDistanceCalculations);
        screenResH.addEventListener('input', updateDistanceCalculations);

        // Поля ввода
        const inputs = ['ergoCharHeight', 'ergoInfoTypeDist', 'ergoDistanceMM', 'ergoInfoTypeHeight'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateDistanceCalculations);
                if (el.tagName === 'SELECT') el.addEventListener('change', updateDistanceCalculations);
            }
        });

        updateScreenParams();
    }

    function attachZovEventHandlers() {
        // Сбор участников
        participants = [
            { x: -1500, y: 3000, z: 0 },
            { x: 1500, y: 3000, z: 0 }
        ];
        renderParticipantList();

        document.getElementById('addParticipantBtn')?.addEventListener('click', () => {
            participants.push({ x: 0, y: 3000, z: 0 });
            renderParticipantList();
            updateZOV();
        });

        const zovScreenSelect = document.getElementById('zovScreenSelect');
        const zovManualDiv = document.getElementById('zovManualParams');
        const zovScreenWidth = document.getElementById('zovScreenWidth');
        const zovScreenHeight = document.getElementById('zovScreenHeight');
        const zovScreenResW = document.getElementById('zovScreenResW');
        const zovScreenResH = document.getElementById('zovScreenResH');

        function updateZOVScreen() {
            const selected = zovScreenSelect.options[zovScreenSelect.selectedIndex];
            if (selected.value === 'custom') {
                zovManualDiv.style.display = 'block';
            } else {
                zovManualDiv.style.display = 'none';
            }
            updateZOV();
        }

        zovScreenSelect.addEventListener('change', updateZOVScreen);
        zovScreenWidth.addEventListener('input', updateZOV);
        zovScreenHeight.addEventListener('input', updateZOV);
        zovScreenResW.addEventListener('input', updateZOV);
        zovScreenResH.addEventListener('input', updateZOV);
        document.getElementById('rowPosition')?.addEventListener('input', updateZOV);
        document.getElementById('criticalAngle')?.addEventListener('input', updateZOV);

        updateZOVScreen();
    }

    function renderParticipantList() {
        const container = document.getElementById('participantList');
        if (!container) return;
        let html = '';
        participants.forEach((p, idx) => {
            html += `
                <div class="participant-item">
                    <div class="participant-header">
                        <strong>Участник ${idx+1}</strong>
                        <button class="btn-small remove-participant" data-idx="${idx}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div class="participant-coords">
                        <label>X (мм): <input type="number" class="participant-x" data-idx="${idx}" value="${p.x}" step="100"></label>
                        <label>Y (мм): <input type="number" class="participant-y" data-idx="${idx}" value="${p.y}" step="100"></label>
                        <label>Z (мм): <input type="number" class="participant-z" data-idx="${idx}" value="${p.z}" step="100"></label>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        document.querySelectorAll('.participant-x, .participant-y, .participant-z').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(inp.dataset.idx);
                const val = parseFloat(inp.value);
                if (!isNaN(val)) {
                    if (inp.classList.contains('participant-x')) participants[idx].x = val;
                    else if (inp.classList.contains('participant-y')) participants[idx].y = val;
                    else participants[idx].z = val;
                    updateZOV();
                }
            });
        });

        document.querySelectorAll('.remove-participant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx);
                participants.splice(idx, 1);
                renderParticipantList();
                updateZOV();
            });
        });
    }

    function updateDistanceCalculations() {
        const mode = document.querySelector('.ergo-mode-btn.active')?.dataset.mode || 'exact';
        const angleDeg = { min: 0.25, optimal: 0.38, critical: 0.55 };
        const approxK = { min: 0.004, optimal: 0.007, critical: 0.009 };

        // Расстояние по высоте символа
        const h = parseFloat(document.getElementById('ergoCharHeight')?.value);
        const infoTypeDist = document.getElementById('ergoInfoTypeDist')?.value;
        if (!isNaN(h) && h > 0 && infoTypeDist) {
            let L_mm;
            if (mode === 'exact') {
                const rad = angleDeg[infoTypeDist] * Math.PI / 180;
                const tanVal = Math.tan(rad);
                L_mm = h / tanVal;
            } else {
                const k = approxK[infoTypeDist];
                L_mm = h / k;
            }
            const L_m = L_mm / 1000;
            document.getElementById('ergoDistanceResult').innerText = L_m.toFixed(2);
            const screenHeight = parseFloat(document.getElementById('screenHeight')?.value) || 0;
            const screenResH = parseInt(document.getElementById('screenResH')?.value) || 0;
            if (screenHeight > 0 && screenResH > 0) {
                const pixels = (h / screenHeight) * screenResH;
                document.getElementById('pixelInfoDist').innerHTML = `≈ ${pixels.toFixed(1)} пикселей по вертикали`;
            } else {
                document.getElementById('pixelInfoDist').innerHTML = '';
            }
        } else {
            document.getElementById('ergoDistanceResult').innerText = '—';
            document.getElementById('pixelInfoDist').innerHTML = '';
        }

        // Высота символа по расстоянию
        const L_input = parseFloat(document.getElementById('ergoDistanceMM')?.value);
        const infoTypeHeight = document.getElementById('ergoInfoTypeHeight')?.value;
        if (!isNaN(L_input) && L_input > 0 && infoTypeHeight) {
            let h_mm;
            if (mode === 'exact') {
                const rad = angleDeg[infoTypeHeight] * Math.PI / 180;
                const tanVal = Math.tan(rad);
                h_mm = L_input * tanVal;
            } else {
                const k = approxK[infoTypeHeight];
                h_mm = L_input * k;
            }
            document.getElementById('ergoHeightResult').innerText = h_mm.toFixed(1);
            const screenHeight = parseFloat(document.getElementById('screenHeight')?.value) || 0;
            const screenResH = parseInt(document.getElementById('screenResH')?.value) || 0;
            if (screenHeight > 0 && screenResH > 0) {
                const pixels = (h_mm / screenHeight) * screenResH;
                document.getElementById('pixelInfoHeight').innerHTML = `≈ ${pixels.toFixed(1)} пикселей по вертикали`;
            } else {
                document.getElementById('pixelInfoHeight').innerHTML = '';
            }
        } else {
            document.getElementById('ergoHeightResult').innerText = '—';
            document.getElementById('pixelInfoHeight').innerHTML = '';
        }
    }

    function updateZOV() {
        const zovScreenSelect = document.getElementById('zovScreenSelect');
        const selected = zovScreenSelect.options[zovScreenSelect.selectedIndex];
        let screenW = 0, screenH = 0;
        if (selected.value === 'custom') {
            screenW = parseFloat(document.getElementById('zovScreenWidth')?.value) || 0;
            screenH = parseFloat(document.getElementById('zovScreenHeight')?.value) || 0;
        } else {
            screenW = parseFloat(selected.dataset.width) || 0;
            screenH = parseFloat(selected.dataset.height) || 0;
        }

        const rowPos = parseFloat(document.getElementById('rowPosition')?.value) / 100;
        const critAngleRad = parseFloat(document.getElementById('criticalAngle')?.value) * Math.PI / 180;
        const yCoord = (1 - rowPos) * screenH - screenH/2;

        let totalZone = 0;
        let details = [];
        participants.forEach((p, idx) => {
            const Xp = p.x;
            const Yp = p.y;
            const Zp = p.z;
            const leftX = -screenW/2;
            const rightX = screenW/2;

            function angleToPoint(x, y, z) {
                const dx = x - Xp;
                const dy = y - Yp;
                const dz = z - Zp;
                const dist = Math.hypot(dx, dz);
                return Math.atan2(dist, dy);
            }

            const angleLeft = angleToPoint(leftX, yCoord, 0);
            const angleRight = angleToPoint(rightX, yCoord, 0);
            if (angleLeft >= critAngleRad && angleRight >= critAngleRad) {
                totalZone += 1;
                details.push(`Участник ${idx+1}: 100%`);
            } else if (angleLeft < critAngleRad && angleRight < critAngleRad) {
                totalZone += 0;
                details.push(`Участник ${idx+1}: 0%`);
            } else {
                const diff = angleRight - angleLeft;
                const t = (critAngleRad - angleLeft) / diff;
                const coverage = t > 0 ? (angleRight >= critAngleRad ? 1 - t : t) : 0;
                totalZone += coverage;
                details.push(`Участник ${idx+1}: ${Math.round(coverage*100)}%`);
            }
        });

        const avgZone = participants.length ? totalZone / participants.length : 0;
        const ke = avgZone * 10;
        document.getElementById('keValue').innerText = ke.toFixed(1);
        document.getElementById('keDetails').innerHTML = details.join('<br>');
    }

    function showErgoCalculator() {
        const state = AppState.getState();
        if (state.viewMode === 'ergo') return;
        // Запоминаем текущий режим, чтобы потом вернуться
        localStorage.setItem('lastViewMode', state.viewMode);
        state.viewMode = 'ergo';
        AppState.setState(state);

        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('soundCalculatorContainer').style.display = 'none';
        document.getElementById('ledCalculatorContainer').style.display = 'none';
        document.getElementById('vcCalculatorContainer').style.display = 'none';
        const ergoContainer = document.getElementById('ergoCalculatorContainer');
        ergoContainer.style.display = '';

        renderCalculator('distance');

        // Изменяем внешний вид кнопки в сайдбаре
        const ergoBtn = document.getElementById('showErgoCalcBtn');
        if (ergoBtn) {
            ergoBtn.classList.remove('btn-primary');
            ergoBtn.classList.add('btn-inactive');
            ergoBtn.innerHTML = '<i class="fas fa-calculator"></i> Показать калькулятор';
        }
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'ergo') {
                // Если переключились на эргономику извне, перерисовываем
                const container = document.getElementById('ergoCalculatorContainer');
                if (container && container.style.display !== 'none') {
                    renderCalculator('distance');
                }
            }
        });

        const ergoBtn = document.getElementById('showErgoCalcBtn');
        if (ergoBtn) {
            ergoBtn.addEventListener('click', showErgoCalculator);
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
