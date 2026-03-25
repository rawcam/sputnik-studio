// storage.js – полная версия с полем имени проекта и расширенным отчётом
const StorageModule = (function() {
    let unsubscribe = null;

    // Экранирование HTML
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function saveToLocalStorage() {
        const state = AppState.getState();
        const projectData = {
            version: '6.1.0',
            globalSettings: state.globalSettings,
            paths: state.paths,
            projectSwitches: state.projectSwitches,
            ledConfig: state.ledConfig,
            soundConfig: state.soundConfig,
            vcConfig: state.vcConfig,
            nextPathId: state.nextPathId,
            nextSwitchId: state.nextSwitchId,
            activePathId: state.activePathId,
            viewMode: state.viewMode
        };
        localStorage.setItem('sputnik_studio_project', JSON.stringify(projectData));
        alert('Проект сохранён в браузере');
    }

    function exportToJson() {
        const state = AppState.getState();
        const projectData = {
            version: '6.1.0',
            exportDate: new Date().toISOString(),
            globalSettings: state.globalSettings,
            paths: state.paths,
            projectSwitches: state.projectSwitches,
            ledConfig: state.ledConfig,
            soundConfig: state.soundConfig,
            vcConfig: state.vcConfig,
            nextPathId: state.nextPathId,
            nextSwitchId: state.nextSwitchId,
            activePathId: state.activePathId,
            viewMode: state.viewMode
        };
        const json = JSON.stringify(projectData, null, 2);
        const fileName = `sputnik-studio_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Проект экспортирован в файл ${fileName}`);
    }

    function importFromJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (confirm('Загрузить проект из файла? Текущий проект будет заменён.')) {
                        AppState.setState({
                            globalSettings: data.globalSettings,
                            paths: data.paths,
                            projectSwitches: data.projectSwitches,
                            ledConfig: data.ledConfig,
                            soundConfig: data.soundConfig,
                            vcConfig: data.vcConfig,
                            nextPathId: data.nextPathId,
                            nextSwitchId: data.nextSwitchId,
                            activePathId: data.activePathId,
                            viewMode: data.viewMode || 'single'
                        });
                        const settings = data.globalSettings;
                        document.getElementById('resolutionSidebar').value = settings.resolution;
                        document.getElementById('chromaSidebar').value = settings.chroma;
                        document.getElementById('fpsSidebar').value = settings.fps;
                        document.getElementById('colorSpace').value = settings.colorSpace;
                        document.getElementById('bitDepth').value = settings.bitDepth;
                        document.getElementById('globalCable').value = settings.cable;
                        document.getElementById('globalMulticast').checked = settings.multicast;
                        document.getElementById('globalQoS').checked = settings.qos;
                        document.getElementById('networkType').value = settings.networkType;
                        document.getElementById('syncProtocol').value = settings.syncProtocol;
                        document.getElementById('redundancy').checked = settings.redundancy;
                        Utils.updateAllShortNames(AppState.getState());
                        alert('Проект загружен');
                    }
                } catch(err) {
                    alert('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ========== НОВАЯ ФУНКЦИЯ ПЕЧАТИ ОТЧЁТА ==========
    function printReport() {
        const state = AppState.getState();
        const settings = state.globalSettings;
        const now = new Date();
        const dateStr = now.toLocaleString();
        const version = '6.1.0';

        // Получаем имя проекта из localStorage (сохраняется через поле ввода)
        let projectName = localStorage.getItem('sputnik_project_name') || 'Новый проект';

        // Вспомогательные функции для пересчёта результатов звука
        function getSoundResults() {
            const cfg = state.soundConfig;
            const mode = cfg.activeMode;
            let results = {};
            if (mode === 'spl') {
                const spl = cfg.sensitivity + 10 * Math.log10(cfg.sourcePower) - 20 * Math.log10(cfg.distance) + cfg.headroom + cfg.roomGain;
                results.spl = spl.toFixed(1);
            } else if (mode === 'drop') {
                const drop = cfg.sourceType === 'point' ? 20 * Math.log10(cfg.endDistance / cfg.startDistance) : 10 * Math.log10(cfg.endDistance / cfg.startDistance);
                results.drop = drop.toFixed(1);
            } else if (mode === 'power') {
                const change = 10 * Math.log10(cfg.powerChangeTo / cfg.powerChangeFrom);
                results.change = change.toFixed(1);
            } else if (mode === 'rt60') {
                const A = cfg.avgAbsorption * cfg.roomArea;
                const rt60 = (0.161 * cfg.roomVolume) / A;
                results.rt60 = rt60.toFixed(2);
            } else if (mode === 'speakers') {
                const area = cfg.roomLength * cfg.roomWidth;
                const step = 1.5 * cfg.roomHeight;
                const cols = Math.ceil(cfg.roomLength / step);
                const rows = Math.ceil(cfg.roomWidth / step);
                const count = cols * rows || 1;
                const totalPower = count * cfg.speakerPower;
                const splAtListener = cfg.speakerSensitivity + 10 * Math.log10(cfg.speakerPower) - 20 * Math.log10(cfg.roomHeight);
                results = { area: area.toFixed(1), count, totalPower, spl: splAtListener.toFixed(1) };
            }
            return { mode, cfg, results };
        }

        function getVcResults() {
            const cfg = state.vcConfig;
            if (cfg.activeMode === 'codec') {
                let bitrate = 0;
                if (cfg.codecPreset === 'trueconf') bitrate = 2.5;
                else if (cfg.codecPreset === 'vinteo') bitrate = 1.5;
                else if (cfg.codecPreset === 'cisco') bitrate = 2.0;
                else if (cfg.codecPreset === 'poly') bitrate = 2.0;
                else if (cfg.codecPreset === 'yealink') bitrate = 1.8;
                if (cfg.resolution === '720p') bitrate *= 0.5;
                else if (cfg.resolution === '4K') bitrate *= 2.5;
                bitrate *= (cfg.fps / 30);
                const up = bitrate;
                const down = bitrate * cfg.participants;
                return { mode: 'codec', up: up.toFixed(1), down: down.toFixed(1) };
            } else {
                let bitrate = 0;
                if (cfg.codecPreset === 'trueconf') bitrate = 2.5;
                else if (cfg.codecPreset === 'vinteo') bitrate = 1.5;
                else if (cfg.codecPreset === 'cisco') bitrate = 2.0;
                if (cfg.resolution === '720p') bitrate *= 0.5;
                else if (cfg.resolution === '4K') bitrate *= 2.5;
                bitrate *= (cfg.fps / 30);
                const total = bitrate * cfg.multipointParticipants;
                return { mode: 'multipoint', perUser: bitrate.toFixed(1), total: total.toFixed(1) };
            }
        }

        // Собираем тракты в таблицу
        let tractsHtml = '';
        if (state.paths.length === 0) {
            tractsHtml = '<p>Нет трактов</p>';
        } else {
            tractsHtml = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width:100%;"><thead><tr><th>Название тракта</th><th>Источники</th><th>Приёмники</th><th>Коммутация</th><th>Задержка (мс)</th></tr></thead><tbody>';
            state.paths.forEach(path => {
                let delay = 0;
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
                const sourceNames = path.sourceDevices.map(d => d.name).join(', ');
                const sinkNames = path.sinkDevices.map(d => d.name).join(', ');
                const switchNames = state.projectSwitches.map(s => s.name).join(', ');
                tractsHtml += `<tr><td>${escapeHtml(path.name)}</td><td>${sourceNames || '—'}</td><td>${sinkNames || '—'}</td><td>${switchNames || '—'}</td><td>${delay.toFixed(2)}</td></tr>`;
            });
            tractsHtml += '</tbody></table>';
        }

        const sound = getSoundResults();
        const vc = getVcResults();
        const led = {
            width_m: state.ledConfig.width_m,
            height_m: state.ledConfig.height_m,
            resW: state.ledConfig.resW,
            resH: state.ledConfig.resH,
            area: state.ledConfig.area,
            power: state.ledConfig.power
        };

        // Данные из виджетов
        const totalPower = document.getElementById('sidebarTotalPower')?.innerText || '0';
        const totalBTU = document.getElementById('sidebarTotalBTU')?.innerText || '0';
        const totalBitrate = document.getElementById('sidebarTotalBitrate')?.innerText || '0';
        const loadPercent = document.getElementById('sidebarLoadPercent')?.innerText || '0%';
        const portsUsed = document.getElementById('sidebarPortsUsed')?.innerText || '0';
        const portsTotal = document.getElementById('sidebarPortsTotal')?.innerText || '0';
        const poeUsed = document.getElementById('sidebarPoEUsed')?.innerText || '0';
        const poeTotal = document.getElementById('sidebarPoETotal')?.innerText || '0';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Технический отчёт Sputnik Studio</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; line-height: 1.4; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
                    h2 { margin-top: 25px; color: #1e2b3c; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                    th { background: #f0f0f0; }
                    .section { margin-bottom: 30px; }
                    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
                    .value { font-weight: bold; }
                    .subnote { font-size: 0.85em; color: #666; margin-top: 5px; }
                    @media print {
                        body { margin: 0; }
                        .page-break { page-break-before: always; }
                    }
                </style>
            </head>
            <body>
                <h1>Технический отчёт</h1>
                <div class="meta">
                    <strong>Проект:</strong> ${escapeHtml(projectName)}<br>
                    <strong>Версия ПО:</strong> ${version}<br>
                    <strong>Дата отчёта:</strong> ${dateStr}<br>
                </div>

                <div class="section">
                    <h2>1. Видеонастройки</h2>
                    <table>
                        <tr><th>Параметр</th><th>Значение</th></tr>
                        <tr><td>Разрешение</td><td>${settings.resolution}</td></tr>
                        <tr><td>Субдискретизация</td><td>${settings.chroma}</td></tr>
                        <tr><td>Частота кадров (FPS)</td><td>${settings.fps}</td></tr>
                        <tr><td>Цветовое пространство</td><td>${settings.colorSpace}</td></tr>
                        <tr><td>Глубина цвета (бит)</td><td>${settings.bitDepth}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h2>2. Сетевые настройки</h2>
                    <table>
                        <tr><th>Параметр</th><th>Значение</th></tr>
                        <tr><td>Среда передачи</td><td>${settings.cable}</td></tr>
                        <tr><td>Multicast</td><td>${settings.multicast ? 'Вкл' : 'Выкл'}</td></tr>
                        <tr><td>QoS</td><td>${settings.qos ? 'Вкл' : 'Выкл'}</td></tr>
                        <tr><td>Тип сети</td><td>${settings.networkType}</td></tr>
                        <tr><td>Синхронизация</td><td>${settings.syncProtocol}</td></tr>
                        <tr><td>Резервирование</td><td>${settings.redundancy ? 'Да' : 'Нет'}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h2>3. Тракты</h2>
                    ${tractsHtml}
                </div>

                <div class="section">
                    <h2>4. Сводная статистика сети и питания</h2>
                    <table>
                        <tr><th>Показатель</th><th>Значение</th></tr>
                        <tr><td>Суммарный битрейт</td><td>${totalBitrate} Мбит/с</td></tr>
                        <tr><td>Загрузка сети</td><td>${loadPercent}</td></tr>
                        <tr><td>Использованные порты / всего</td><td>${portsUsed} / ${portsTotal}</td></tr>
                        <tr><td>Использованный PoE-бюджет / всего</td><td>${poeUsed} / ${poeTotal} Вт</td></tr>
                        <tr><td>Общая активная мощность</td><td>${totalPower} Вт</td></tr>
                        <tr><td>Тепловыделение</td><td>${totalBTU} BTU/ч</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h2>5. LED-экран</h2>
                    <table>
                        <tr><th>Параметр</th><th>Значение</th></tr>
                        <tr><td>Активный режим</td><td>${state.ledConfig.activeMode}</td></tr>
                        <tr><td>Размер экрана (м)</td><td>${led.width_m.toFixed(2)} × ${led.height_m.toFixed(2)}</td></tr>
                        <tr><td>Разрешение</td><td>${led.resW} × ${led.resH}</td></tr>
                        <tr><td>Площадь</td><td>${led.area.toFixed(2)} м²</td></tr>
                        <tr><td>Потребляемая мощность</td><td>${Math.round(led.power)} Вт</td></tr>
                    </table>
                    <div class="subnote">Данные актуальны для последнего выполненного расчёта LED.</div>
                </div>

                <div class="section">
                    <h2>6. Акустический расчёт</h2>
                    <p><strong>Активный режим:</strong> ${sound.mode}</p>
                    <table>
                        ${sound.mode === 'spl' ? `<tr><th>SPL на расстоянии ${sound.cfg.distance} м</th><td>${sound.results.spl} дБ</td></tr>` : ''}
                        ${sound.mode === 'drop' ? `<tr><th>Падение SPL от ${sound.cfg.startDistance} до ${sound.cfg.endDistance} м</th><td>${sound.results.drop} дБ</td></tr>` : ''}
                        ${sound.mode === 'power' ? `<tr><th>Изменение SPL при смене мощности</th><td>${sound.results.change} дБ</td></tr>` : ''}
                        ${sound.mode === 'rt60' ? `<tr><th>Время реверберации RT60</th><td>${sound.results.rt60} с</td></tr>` : ''}
                        ${sound.mode === 'speakers' ? `
                            <tr><th>Площадь помещения</th><td>${sound.results.area} м²</td></tr>
                            <tr><th>Количество громкоговорителей</th><td>${sound.results.count}</td></tr>
                            <tr><th>Общая мощность</th><td>${sound.results.totalPower} Вт</td></tr>
                            <tr><th>SPL в центре зоны</th><td>${sound.results.spl} дБ</td></tr>
                        ` : ''}
                    </table>
                    <div class="subnote">Параметры расчёта соответствуют последним выбранным настройкам в разделе SOUND.</div>
                </div>

                <div class="section">
                    <h2>7. Видеоконференцсвязь (ВКС)</h2>
                    <p><strong>Режим:</strong> ${vc.mode === 'codec' ? 'P2P-конференция' : 'Многоточечный вызов'}</p>
                    <table>
                        ${vc.mode === 'codec' ? `
                            <tr><th>Рекомендуемый битрейт отправки</th><td>${vc.up} Мбит/с</td></tr>
                            <tr><th>Рекомендуемый битрейт приёма</th><td>${vc.down} Мбит/с</td></tr>
                        ` : `
                            <tr><th>Битрейт на одного участника</th><td>${vc.perUser} Мбит/с</td></tr>
                            <tr><th>Суммарный битрейт (MCU)</th><td>${vc.total} Мбит/с</td></tr>
                        `}
                    </table>
                    <div class="subnote">Расчёт выполнен для выбранных параметров (кодек, разрешение, FPS, количество участников).</div>
                </div>

                <div class="section">
                    <h2>8. Эргономика</h2>
                    <p><em>Для корректного отображения данных в этом разделе необходимо выполнить расчёт в калькуляторе эргономики.</em></p>
                    <p>Настройки и результаты можно увидеть непосредственно в интерфейсе.</p>
                </div>

                <div class="section">
                    <h2>9. Примечания</h2>
                    <ul>
                        <li>Все расчёты выполнены в соответствии с методиками, заложенными в Sputnik Studio.</li>
                        <li>Данные о мощности и тепловыделении являются расчётными и могут отличаться от реальных в зависимости от конкретных моделей оборудования.</li>
                        <li>Для точного подбора ИБП и кондиционеров рекомендуется использовать специализированные программы.</li>
                    </ul>
                </div>

                <div class="meta" style="margin-top: 40px; text-align: center;">
                    Отчёт сформирован автоматически в Sputnik Studio v${version}.<br>
                    ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }

    function resetProject() {
        if (confirm('Сбросить все данные? Текущий проект будет удалён.')) {
            localStorage.removeItem('sputnik_studio_project');
            location.reload();
        }
    }

    function init() {
        const savedProject = localStorage.getItem('sputnik_studio_project');
        if (savedProject && confirm('Обнаружен сохранённый проект. Загрузить его?')) {
            try {
                const data = JSON.parse(savedProject);
                AppState.setState({
                    globalSettings: data.globalSettings,
                    paths: data.paths,
                    projectSwitches: data.projectSwitches,
                    ledConfig: data.ledConfig,
                    soundConfig: data.soundConfig,
                    vcConfig: data.vcConfig,
                    nextPathId: data.nextPathId,
                    nextSwitchId: data.nextSwitchId,
                    activePathId: data.activePathId,
                    viewMode: data.viewMode || 'single'
                });
                const settings = data.globalSettings;
                document.getElementById('resolutionSidebar').value = settings.resolution;
                document.getElementById('chromaSidebar').value = settings.chroma;
                document.getElementById('fpsSidebar').value = settings.fps;
                document.getElementById('colorSpace').value = settings.colorSpace;
                document.getElementById('bitDepth').value = settings.bitDepth;
                document.getElementById('globalCable').value = settings.cable;
                document.getElementById('globalMulticast').checked = settings.multicast;
                document.getElementById('globalQoS').checked = settings.qos;
                document.getElementById('networkType').value = settings.networkType;
                document.getElementById('syncProtocol').value = settings.syncProtocol;
                document.getElementById('redundancy').checked = settings.redundancy;
                Utils.updateAllShortNames(AppState.getState());
                alert('Проект загружен из браузера');
            } catch(e) {
                console.error(e);
            }
        } else {
            const state = AppState.getState();
            if (state.paths.length === 0) {
                if (state.viewMode !== 'single') AppState.setState({ viewMode: 'single' });
                if (state.activePathId !== null) AppState.setState({ activePathId: null });
            }
        }

        // Подписка на изменения состояния
        unsubscribe = AppState.subscribe(() => {});

        // Обработчики кнопок управления
        document.getElementById('saveToBrowserBtn').addEventListener('click', saveToLocalStorage);
        document.getElementById('exportJsonBtn').addEventListener('click', exportToJson);
        document.getElementById('importJsonBtn').addEventListener('click', importFromJson);
        document.getElementById('printReportBtnSidebar').addEventListener('click', printReport);
        document.getElementById('resetProjectBtn').addEventListener('click', () => {
            const resetModal = document.getElementById('resetModal');
            if (resetModal) resetModal.style.display = 'flex';
        });
        document.getElementById('wikiBtnSidebar').addEventListener('click', () => {
            window.open('wiki.html', '_blank');
        });

        // Сохранение имени проекта из поля ввода
        const projectNameInput = document.getElementById('projectNameInput');
        if (projectNameInput) {
            const savedName = localStorage.getItem('sputnik_project_name');
            if (savedName) projectNameInput.value = savedName;
            projectNameInput.addEventListener('change', () => {
                localStorage.setItem('sputnik_project_name', projectNameInput.value);
            });
        }

        // Модалка сброса
        const resetModal = document.getElementById('resetModal');
        const closeResetModal = document.getElementById('closeResetModal');
        const cancelResetBtn = document.getElementById('cancelResetBtn');
        const confirmResetBtn = document.getElementById('confirmResetBtn');
        const saveBeforeResetBtn = document.getElementById('saveBeforeResetBtn');

        if (closeResetModal) closeResetModal.addEventListener('click', () => resetModal.style.display = 'none');
        if (cancelResetBtn) cancelResetBtn.addEventListener('click', () => resetModal.style.display = 'none');
        if (confirmResetBtn) confirmResetBtn.addEventListener('click', () => {
            resetModal.style.display = 'none';
            resetProject();
        });
        if (saveBeforeResetBtn) saveBeforeResetBtn.addEventListener('click', () => {
            saveToLocalStorage();
            resetModal.style.display = 'none';
            resetProject();
        });
        window.addEventListener('click', e => { if (e.target === resetModal) resetModal.style.display = 'none'; });
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
