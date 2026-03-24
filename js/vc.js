// vc.js
const VcModule = (function() {
    let unsubscribe = null;

    function renderCalculator(mode) {
        const state = AppState.getState();
        const vcConfig = state.vcConfig;
        const container = document.getElementById('vcCalculatorContainer');
        if (!container) return;

        let html = '';
        if (mode === 'codec') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-satellite-dish"></i> Расчёт битрейта для видеокодека</h3>
                    <div class="setting"><label>Кодек / платформа:</label><select id="codecPreset">
                        <option value="trueconf" ${vcConfig.codecPreset==='trueconf'?'selected':''}>TrueConf (H.264/AVC)</option>
                        <option value="vinteo" ${vcConfig.codecPreset==='vinteo'?'selected':''}>Vinteo IVA (H.265)</option>
                        <option value="cisco" ${vcConfig.codecPreset==='cisco'?'selected':''}>Cisco Webex (H.264)</option>
                        <option value="poly" ${vcConfig.codecPreset==='poly'?'selected':''}>Poly (H.264)</option>
                        <option value="yealink" ${vcConfig.codecPreset==='yealink'?'selected':''}>Yealink (H.264/H.265)</option>
                    </select></div>
                    <div class="setting"><label>Разрешение:</label><select id="vcResolution"><option value="720p">720p</option><option value="1080p" selected>1080p</option><option value="4K">4K</option></select></div>
                    <div class="setting"><label>FPS:</label><select id="vcFps"><option value="15">15</option><option value="30" selected>30</option><option value="60">60</option></select></div>
                    <div class="setting"><label>Количество участников (P2P):</label><input type="number" id="vcParticipants" value="${vcConfig.participants}" min="1" step="1"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Рекомендуемый битрейт (отправка)</div><div class="result-value" id="vcBitrateUp">—</div><div>Мбит/с</div></div>
                        <div class="result-item"><div class="result-label">Рекомендуемый битрейт (приём)</div><div class="result-value" id="vcBitrateDown">—</div><div>Мбит/с</div></div>
                        <div class="result-item"><div class="result-label">Требования к сети</div><div class="result-value" id="vcNetworkReq">—</div></div>
                    </div>
                    <div class="ergo-info">Расчёт основан на средних значениях для платформ. Для многоточечных вызовов битрейт умножается на количество участников.</div>
                </div>
            `;
        } else if (mode === 'multipoint') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-users"></i> Многоточечный вызов (MCU)</h3>
                    <div class="setting"><label>Кодек / платформа:</label><select id="mpCodecPreset">
                        <option value="trueconf" ${vcConfig.codecPreset==='trueconf'?'selected':''}>TrueConf</option>
                        <option value="vinteo" ${vcConfig.codecPreset==='vinteo'?'selected':''}>Vinteo IVA</option>
                        <option value="cisco" ${vcConfig.codecPreset==='cisco'?'selected':''}>Cisco Webex</option>
                    </select></div>
                    <div class="setting"><label>Разрешение:</label><select id="mpResolution"><option value="720p">720p</option><option value="1080p" selected>1080p</option><option value="4K">4K</option></select></div>
                    <div class="setting"><label>FPS:</label><select id="mpFps"><option value="15">15</option><option value="30" selected>30</option><option value="60">60</option></select></div>
                    <div class="setting"><label>Количество участников:</label><input type="number" id="mpParticipants" value="${vcConfig.multipointParticipants}" min="2" step="1"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Битрейт на одного участника</div><div class="result-value" id="mpPerUser">—</div><div>Мбит/с</div></div>
                        <div class="result-item"><div class="result-label">Суммарный битрейт (MCU)</div><div class="result-value" id="mpTotal">—</div><div>Мбит/с</div></div>
                        <div class="result-item"><div class="result-label">Рекомендация по каналу</div><div class="result-value" id="mpChannel">—</div></div>
                    </div>
                    <div class="ergo-info">Для многоточечного вызова используется модель MCU: каждый участник отправляет один поток, а получает столько, сколько нужно (но обычно суммарный битрейт на стороне сервера выше).</div>
                </div>
            `;
        }

        container.innerHTML = html;
        attachEventHandlers(mode);
        updateCalculations(mode, true);
    }

    function attachEventHandlers(mode) {
        if (mode === 'codec') {
            const elements = ['codecPreset', 'vcResolution', 'vcFps', 'vcParticipants'];
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.removeEventListener('change', () => updateCalculations(mode));
                    el.removeEventListener('input', () => updateCalculations(mode));
                    el.addEventListener('change', () => updateCalculations(mode));
                    if (el.type === 'number') el.addEventListener('input', () => updateCalculations(mode));
                }
            });
        } else if (mode === 'multipoint') {
            const elements = ['mpCodecPreset', 'mpResolution', 'mpFps', 'mpParticipants'];
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.removeEventListener('change', () => updateCalculations(mode));
                    el.removeEventListener('input', () => updateCalculations(mode));
                    el.addEventListener('change', () => updateCalculations(mode));
                    if (el.type === 'number') el.addEventListener('input', () => updateCalculations(mode));
                }
            });
        }
    }

    function updateCalculations(mode, skipSetState = false) {
        const state = AppState.getState();
        let vcConfig = { ...state.vcConfig };
        let changed = false;

        if (mode === 'codec') {
            const preset = document.getElementById('codecPreset')?.value || 'trueconf';
            const resolution = document.getElementById('vcResolution')?.value || '1080p';
            const fps = parseInt(document.getElementById('vcFps')?.value) || 30;
            const participants = parseInt(document.getElementById('vcParticipants')?.value) || 1;

            let bitratePerStream = 0;
            if (preset === 'trueconf') bitratePerStream = 2.5;
            else if (preset === 'vinteo') bitratePerStream = 1.5;
            else if (preset === 'cisco') bitratePerStream = 2.0;
            else if (preset === 'poly') bitratePerStream = 2.0;
            else if (preset === 'yealink') bitratePerStream = 1.8;

            if (resolution === '720p') bitratePerStream *= 0.5;
            else if (resolution === '4K') bitratePerStream *= 2.5;
            bitratePerStream = bitratePerStream * (fps / 30);

            const up = bitratePerStream;
            const down = bitratePerStream * participants;
            document.getElementById('vcBitrateUp').innerText = up.toFixed(1);
            document.getElementById('vcBitrateDown').innerText = down.toFixed(1);
            const req = `Для ${participants} участников: ${down.toFixed(1)} Мбит/с (приём). Рекомендуется канал от ${Math.ceil(down+2)} Мбит/с.`;
            document.getElementById('vcNetworkReq').innerText = req;

            if (vcConfig.codecPreset !== preset) { vcConfig.codecPreset = preset; changed = true; }
            if (vcConfig.resolution !== resolution) { vcConfig.resolution = resolution; changed = true; }
            if (vcConfig.fps !== fps) { vcConfig.fps = fps; changed = true; }
            if (vcConfig.participants !== participants) { vcConfig.participants = participants; changed = true; }
        } else if (mode === 'multipoint') {
            const preset = document.getElementById('mpCodecPreset')?.value || 'trueconf';
            const resolution = document.getElementById('mpResolution')?.value || '1080p';
            const fps = parseInt(document.getElementById('mpFps')?.value) || 30;
            const participants = parseInt(document.getElementById('mpParticipants')?.value) || 2;

            let bitratePerStream = 0;
            if (preset === 'trueconf') bitratePerStream = 2.5;
            else if (preset === 'vinteo') bitratePerStream = 1.5;
            else if (preset === 'cisco') bitratePerStream = 2.0;

            if (resolution === '720p') bitratePerStream *= 0.5;
            else if (resolution === '4K') bitratePerStream *= 2.5;
            bitratePerStream = bitratePerStream * (fps / 30);

            const total = bitratePerStream * participants;
            document.getElementById('mpPerUser').innerText = bitratePerStream.toFixed(1);
            document.getElementById('mpTotal').innerText = total.toFixed(1);
            document.getElementById('mpChannel').innerText = `Рекомендуется канал от ${Math.ceil(total+2)} Мбит/с (симметричный)`;

            if (vcConfig.codecPreset !== preset) { vcConfig.codecPreset = preset; changed = true; }
            if (vcConfig.resolution !== resolution) { vcConfig.resolution = resolution; changed = true; }
            if (vcConfig.fps !== fps) { vcConfig.fps = fps; changed = true; }
            if (vcConfig.multipointParticipants !== participants) { vcConfig.multipointParticipants = participants; changed = true; }
        }

        if (!skipSetState && changed) {
            AppState.setState({ vcConfig });
        }
    }

    function showVcMode(mode) {
        const state = AppState.getState();
        if (state.viewMode === 'vc' && state.vcConfig.activeMode === mode) return;
        state.viewMode = 'vc';
        state.vcConfig.activeMode = mode;
        AppState.setState(state);

        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('ergoCalculatorContainer').style.display = 'none';
        document.getElementById('soundCalculatorContainer').style.display = 'none';
        document.getElementById('ledCalculatorContainer').style.display = 'none';
        const vcContainer = document.getElementById('vcCalculatorContainer');
        vcContainer.style.display = '';

        renderCalculator(mode);
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'vc' && newState.vcConfig.activeMode) {
                renderCalculator(newState.vcConfig.activeMode);
            }
        });

        const vcModeBtns = document.querySelectorAll('.vc-mode-btn');
        vcModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode) showVcMode(mode);
            });
        });

        const state = AppState.getState();
        if (state.viewMode === 'vc' && state.vcConfig.activeMode) {
            showVcMode(state.vcConfig.activeMode);
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
