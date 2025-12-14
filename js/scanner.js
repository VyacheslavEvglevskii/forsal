// ═══════════════════════════════════════════════════════════════════════════
// 📱 SCANNER.JS — Модуль сканирования (интеграция с профилем)
// ═══════════════════════════════════════════════════════════════════════════
// 
// Добавляет функционал сканирования в блок профиля.
// НЕ изменяет существующую логику.
// 
// Версия: 1.1
// Дата: Декабрь 2024
// ═══════════════════════════════════════════════════════════════════════════

// === РАННЕЕ ОБЪЯВЛЕНИЕ ГЛОБАЛЬНЫХ ФУНКЦИЙ (для onclick до полной загрузки) ===
window.selectWorkMode = window.selectWorkMode || function() { console.log('⏳ Scanner loading...'); };
window.startQRScanner = window.startQRScanner || function() { console.log('⏳ Scanner loading...'); };
window.stopQRScanner = window.stopQRScanner || function() { console.log('⏳ Scanner loading...'); };

// === СОСТОЯНИЕ СКАНЕРА ===
let scannerSession = null;
let scannerCount = 0;
let scannerWorkplaces = [];
let selectedWorkMode = ''; // 'scanner' или 'manual'
let html5QrScanner = null; // Экземпляр QR-сканера
let selectedWorkplaceData = null; // Данные выбранного рабочего места

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 Scanner module loaded');
  
  // Настраиваем обработчик Enter для поля штрихкода
  const barcodeInput = document.getElementById('scannerBarcodeInput');
  if (barcodeInput) {
    barcodeInput.addEventListener('keypress', handleBarcodeScan);
  }
  
  // Загружаем сохранённый режим работы
  const savedMode = localStorage.getItem('selectedWorkMode');
  if (savedMode) {
    setTimeout(() => selectWorkMode(savedMode, false), 100);
  }
  
  // Загружаем рабочие места после небольшой задержки (чтобы scriptURL был доступен)
  setTimeout(() => {
    if (typeof scriptURL !== 'undefined') {
      loadScannerWorkplaces();
    }
  }, 2000);
});

// === ВЫБОР РЕЖИМА РАБОТЫ ===
function selectWorkMode(mode, save = true) {
  selectedWorkMode = mode;
  
  // Обновляем скрытое поле
  const hiddenInput = document.getElementById('selectedWorkMode');
  if (hiddenInput) hiddenInput.value = mode;
  
  // Сохраняем выбор
  if (save) {
    localStorage.setItem('selectedWorkMode', mode);
  }
  
  // Обновляем UI карточек
  const scannerCard = document.getElementById('modeCardScanner');
  const manualCard = document.getElementById('modeCardManual');
  
  // Сброс стилей
  if (scannerCard) {
    scannerCard.style.border = '2px solid #e2e8f0';
    scannerCard.style.background = 'white';
    scannerCard.style.transform = 'scale(1)';
  }
  if (manualCard) {
    manualCard.style.border = '2px solid #e2e8f0';
    manualCard.style.background = 'white';
    manualCard.style.transform = 'scale(1)';
  }
  
  // Применяем стиль к выбранной карточке
  if (mode === 'scanner' && scannerCard) {
    scannerCard.style.border = '2px solid #10b981';
    scannerCard.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
    scannerCard.style.transform = 'scale(1.02)';
  } else if (mode === 'manual' && manualCard) {
    manualCard.style.border = '2px solid #3b82f6';
    manualCard.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
    manualCard.style.transform = 'scale(1.02)';
  }
  
  // Показываем/скрываем соответствующие блоки
  const scannerBlock = document.getElementById('scannerModeBlock');
  const manualBlock = document.getElementById('manualModeBlock');
  
  // Получаем вкладки для управления видимостью
  const tabApp = document.getElementById('tabApp');
  const tabRates = document.getElementById('tabRates');
  
  if (mode === 'scanner') {
    if (scannerBlock) scannerBlock.style.display = 'block';
    if (manualBlock) manualBlock.style.display = 'none';
    
    // 📱 Скрываем вкладки "Учет упаковки" и "Тариф" для режима сканера
    if (tabApp) tabApp.style.display = 'none';
    if (tabRates) tabRates.style.display = 'none';
    
    // Загружаем рабочие места если ещё не загружены
    if (scannerWorkplaces.length === 0 && typeof scriptURL !== 'undefined') {
      loadScannerWorkplaces();
    }
  } else {
    // Режим 'manual' или любой другой (по умолчанию)
    if (scannerBlock) scannerBlock.style.display = 'none';
    if (manualBlock) manualBlock.style.display = 'block';
    
    // ✍️ Показываем вкладки для ручного режима
    if (tabApp) tabApp.style.display = '';
    if (tabRates) tabRates.style.display = '';
    
    // Вызываем handleStatusChange для показа правильных блоков (наставник/стажер)
    if (typeof handleStatusChange === 'function') {
      setTimeout(() => handleStatusChange(), 50);
    }
  }
  
  console.log(`📦 Выбран режим: ${mode}`);
}

// === УСТАНОВКА РЕЖИМА ПО УМОЛЧАНИЮ ===
function setDefaultWorkMode() {
  const savedMode = localStorage.getItem('selectedWorkMode');
  
  // Если нет сохранённого режима - устанавливаем "manual" по умолчанию
  if (!savedMode) {
    selectWorkMode('manual', false);
  } else {
    selectWorkMode(savedMode, false);
  }
}

// Вызываем при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  // Устанавливаем режим по умолчанию с небольшой задержкой
  setTimeout(setDefaultWorkMode, 100);
});

// Экспорт функции
window.selectWorkMode = selectWorkMode;

// ═══════════════════════════════════════════════════════════════════════════
// 📷 QR-СКАНЕР КАМЕРЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Запуск QR-сканера камеры
 */
async function startQRScanner() {
  const container = document.getElementById('qrScannerContainer');
  const qrReader = document.getElementById('qrReader');
  const scanBtn = document.getElementById('scanQRBtn');
  const statusEl = document.getElementById('qrScannerStatus');
  
  if (!container || !qrReader) {
    showNotification('❌ Ошибка: элементы сканера не найдены', 'error');
    return;
  }
  
  // Показываем контейнер
  container.style.display = 'block';
  if (scanBtn) scanBtn.style.display = 'none';
  if (statusEl) statusEl.textContent = '⏳ Запуск камеры...';
  
  try {
    // Проверяем поддержку камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Камера не поддерживается в этом браузере');
    }
    
    // Создаём экземпляр сканера
    html5QrScanner = new Html5Qrcode('qrReader');
    
    // Конфигурация
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true
    };
    
    // Запускаем сканирование
    await html5QrScanner.start(
      { facingMode: 'environment' }, // Задняя камера
      config,
      onQRCodeScanned,
      (errorMessage) => {
        // Игнорируем ошибки "QR code not found"
        if (!errorMessage.includes('No QR code found')) {
          console.log('QR scan error:', errorMessage);
        }
      }
    );
    
    if (statusEl) statusEl.textContent = '📷 Наведите камеру на QR-код рабочего места...';
    
  } catch (error) {
    console.error('Ошибка запуска QR-сканера:', error);
    
    let errorMsg = 'Не удалось запустить камеру';
    if (error.name === 'NotAllowedError') {
      errorMsg = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
    } else if (error.name === 'NotFoundError') {
      errorMsg = 'Камера не найдена на устройстве';
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    if (statusEl) statusEl.textContent = `❌ ${errorMsg}`;
    showNotification(`❌ ${errorMsg}`, 'error');
    
    // Возвращаем кнопку
    setTimeout(() => {
      stopQRScanner();
    }, 3000);
  }
}

/**
 * Остановка QR-сканера
 */
async function stopQRScanner() {
  const container = document.getElementById('qrScannerContainer');
  const scanBtn = document.getElementById('scanQRBtn');
  
  try {
    if (html5QrScanner) {
      await html5QrScanner.stop();
      html5QrScanner.clear();
      html5QrScanner = null;
    }
  } catch (error) {
    console.log('Ошибка остановки сканера:', error);
  }
  
  // Скрываем контейнер, показываем кнопку
  if (container) container.style.display = 'none';
  if (scanBtn) scanBtn.style.display = 'flex';
}

/**
 * Обработчик успешного сканирования QR
 */
async function onQRCodeScanned(decodedText, decodedResult) {
  console.log('📷 QR отсканирован:', decodedText);
  
  // Останавливаем сканер
  await stopQRScanner();
  
  // Вибрация успеха
  if (navigator.vibrate) navigator.vibrate(100);
  
  // Пытаемся распарсить QR (может быть JSON или просто код)
  let workplaceId = decodedText;
  
  try {
    // Пробуем распарсить как JSON
    const parsed = JSON.parse(decodedText);
    if (parsed.id) {
      workplaceId = parsed.id;
    } else if (parsed.workplace_id) {
      workplaceId = parsed.workplace_id;
    }
  } catch (e) {
    // Не JSON — используем как есть
    workplaceId = decodedText.trim();
  }
  
  // Ищем рабочее место в списке
  const workplace = scannerWorkplaces.find(wp => 
    wp.workplace_id === workplaceId || 
    wp.qr_code === workplaceId ||
    wp.name.toLowerCase().includes(workplaceId.toLowerCase())
  );
  
  if (workplace) {
    // Нашли — заполняем данные
    selectWorkplace(workplace);
    showNotification(`✅ Рабочее место: ${workplace.name}`, 'success');
    
    // Автоматически начинаем сессию
    setTimeout(() => {
      startScannerSession();
    }, 500);
    
  } else {
    // Не нашли в списке — показываем предупреждение
    showNotification(`⚠️ Код "${workplaceId}" не найден в списке рабочих мест`, 'warning');
  }
}

/**
 * Выбор рабочего места (из списка, QR или ручного ввода)
 * После выбора — отправляем на сервер для закрепления
 */
async function selectWorkplace(workplace) {
  selectedWorkplaceData = workplace;
  
  // Обновляем select
  const select = document.getElementById('scannerWorkplaceSelect');
  if (select) {
    select.value = workplace.workplace_id;
  }
  
  // Показываем информацию о выбранном месте (в процессе)
  const infoBlock = document.getElementById('selectedWorkplaceInfo');
  const nameEl = document.getElementById('selectedWorkplaceName');
  const detailsEl = document.getElementById('selectedWorkplaceDetails');
  
  if (infoBlock && nameEl) {
    infoBlock.style.display = 'block';
    infoBlock.style.background = '#fef3c7';
    infoBlock.style.borderColor = '#fbbf24';
    nameEl.textContent = `⏳ Закрепление на: ${workplace.name}...`;
    nameEl.style.color = '#92400e';
    if (detailsEl) {
      detailsEl.textContent = 'Отправка данных на сервер...';
      detailsEl.style.color = '#a16207';
    }
  }
  
  // Отправляем на сервер для закрепления
  const confirmed = await assignWorkplaceToServer(workplace);
  
  if (confirmed) {
    // Успешно закреплены
    if (infoBlock && nameEl) {
      infoBlock.style.background = '#f0fdf4';
      infoBlock.style.borderColor = '#86efac';
      nameEl.textContent = `✅ ${workplace.name}`;
      nameEl.style.color = '#15803d';
      
      if (detailsEl) {
        const details = [];
        if (workplace.default_operation) details.push(`📋 ${workplace.default_operation}`);
        if (workplace.default_volume) details.push(`📦 ${workplace.default_volume} мл`);
        detailsEl.textContent = details.join(' • ') || 'Закрепление подтверждено';
        detailsEl.style.color = '#22863a';
      }
    }
  }
}

/**
 * Отправка закрепления на сервер
 */
async function assignWorkplaceToServer(workplace) {
  if (!currentUser) {
    showNotification('❌ Сначала войдите в систему', 'error');
    return false;
  }
  
  const shiftType = document.getElementById('shiftType')?.value || 'День';
  
  try {
    const response = await fetch(
      `${scriptURL}?type=scan_assignWorkplace` +
      `&operator_id=${encodeURIComponent(currentUser)}` +
      `&operator_name=${encodeURIComponent(currentUser)}` +
      `&workplace_id=${encodeURIComponent(workplace.workplace_id)}` +
      `&shift_type=${encodeURIComponent(shiftType)}`
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Сохраняем подтверждённое закрепление
      window.confirmedAssignment = result;
      localStorage.setItem('profileWorkplace', workplace.workplace_id);
      localStorage.setItem('confirmedAssignment', JSON.stringify(result));
      
      showNotification(`✅ ${result.message}`, 'success');
      
      // Вибрация успеха
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      return true;
    } else {
      showNotification(`❌ ${result.message}`, 'error');
      
      // Показываем ошибку в UI
      const infoBlock = document.getElementById('selectedWorkplaceInfo');
      const nameEl = document.getElementById('selectedWorkplaceName');
      const detailsEl = document.getElementById('selectedWorkplaceDetails');
      
      if (infoBlock && nameEl) {
        infoBlock.style.background = '#fef2f2';
        infoBlock.style.borderColor = '#fca5a5';
        nameEl.textContent = `❌ Ошибка закрепления`;
        nameEl.style.color = '#991b1b';
        if (detailsEl) {
          detailsEl.textContent = result.message;
          detailsEl.style.color = '#b91c1c';
        }
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('Ошибка закрепления:', error);
    showNotification(`❌ Ошибка сети: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Проверить есть ли подтверждённое закрепление
 */
function hasConfirmedAssignment() {
  return !!window.confirmedAssignment || !!localStorage.getItem('confirmedAssignment');
}

// Экспорт
window.hasConfirmedAssignment = hasConfirmedAssignment;
window.assignWorkplaceToServer = assignWorkplaceToServer;

/**
 * Очистка выбранного рабочего места
 */
function clearSelectedWorkplace() {
  selectedWorkplaceData = null;
  
  const infoBlock = document.getElementById('selectedWorkplaceInfo');
  if (infoBlock) infoBlock.style.display = 'none';
}

// Экспорт функций QR-сканера
window.startQRScanner = startQRScanner;
window.stopQRScanner = stopQRScanner;
window.selectWorkplace = selectWorkplace;
window.clearSelectedWorkplace = clearSelectedWorkplace;

// === ЗАГРУЗКА РАБОЧИХ МЕСТ ===
async function loadScannerWorkplaces() {
  const select = document.getElementById('scannerWorkplaceSelect');
  if (!select) return;
  
  try {
    console.log('📍 Загрузка рабочих мест...');
    const response = await fetch(`${scriptURL}?type=scan_getWorkplaces`);
    const result = await response.json();
    
    if (result.success && result.workplaces) {
      scannerWorkplaces = result.workplaces;
      
      select.innerHTML = '<option value="">-- Выберите рабочее место --</option>';
      result.workplaces.forEach(wp => {
        const option = document.createElement('option');
        option.value = wp.workplace_id;
        option.textContent = `${wp.name}`;
        option.dataset.operation = wp.default_operation || '';
        option.dataset.volume = wp.default_volume || '';
        select.appendChild(option);
      });
      
      // Добавляем обработчик изменения
      select.addEventListener('change', function() {
        const selectedId = this.value;
        if (selectedId) {
          const workplace = scannerWorkplaces.find(wp => wp.workplace_id === selectedId);
          if (workplace) {
            selectWorkplace(workplace);
          }
        } else {
          clearSelectedWorkplace();
        }
      });
      
      console.log(`✅ Загружено ${result.workplaces.length} рабочих мест`);
    } else {
      select.innerHTML = '<option value="">-- Нет рабочих мест --</option>';
      console.warn('⚠️ Не удалось загрузить рабочие места:', result.message);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки рабочих мест:', error);
    select.innerHTML = '<option value="">-- Ошибка загрузки --</option>';
  }
}

// === ОБРАБОТЧИК ВЫБОРА ИЗ СПИСКА ===
function setupWorkplaceSelectHandler() {
  const select = document.getElementById('scannerWorkplaceSelect');
  if (!select) return;
  
  // Обработчик уже добавляется в loadScannerWorkplaces
}

// === НАЧАЛО СЕССИИ СКАНИРОВАНИЯ ===
async function startScannerSession() {
  // Получаем рабочее место из разных источников
  let workplaceId = '';
  let workplaceName = '';
  
  // Приоритет: selectedWorkplaceData > select > input
  if (selectedWorkplaceData) {
    workplaceId = selectedWorkplaceData.workplace_id;
    workplaceName = selectedWorkplaceData.name;
  } else {
    const workplaceSelect = document.getElementById('scannerWorkplaceSelect');
    workplaceId = workplaceSelect?.value || '';
  }
  
  if (!workplaceId) {
    showNotification('❌ Выберите или отсканируйте рабочее место', 'error');
    return;
  }
  
  // Проверяем что пользователь авторизован
  if (!currentUser) {
    showNotification('❌ Сначала войдите в систему', 'error');
    return;
  }
  
  // Проверяем что смена выбрана
  const shiftType = document.getElementById('shiftType')?.value;
  if (!shiftType) {
    showNotification('❌ Сначала выберите тип смены в профиле', 'error');
    return;
  }
  
  // Блокируем кнопку
  const startBtn = document.getElementById('startScannerBtn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Подключение...';
  }
  
  try {
    const response = await fetch(
      `${scriptURL}?type=scan_startSession` +
      `&operator_id=${encodeURIComponent(currentUser)}` +
      `&workplace_id=${encodeURIComponent(workplaceId)}` +
      `&shift_type=${encodeURIComponent(shiftType)}`
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Сохраняем сессию
      scannerSession = result;
      scannerCount = 0;
      
      // Переключаем UI
      showScannerActiveMode(result);
      
      showNotification(`✅ Сессия начата: ${result.workplace_name || workplaceName}`, 'success');
      
      // Вибрация успеха
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      // Фокус на поле ввода штрихкода
      setTimeout(() => {
        const input = document.getElementById('scannerBarcodeInput');
        if (input) input.focus();
      }, 200);
      
    } else {
      showNotification(`❌ ${result.message}`, 'error');
    }
    
  } catch (error) {
    console.error('Ошибка начала сессии:', error);
    showNotification(`❌ Ошибка подключения: ${error.message}`, 'error');
  } finally {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = '🚀 Начать сканирование товаров';
    }
  }
}

// === ОБРАБОТКА СКАНИРОВАНИЯ ШТРИХКОДА ===
async function handleBarcodeScan(e) {
  if (e.key !== 'Enter') return;
  
  const input = e.target;
  const barcode = input.value.trim();
  
  // Очищаем поле сразу
  input.value = '';
  
  if (!barcode) return;
  
  if (!scannerSession) {
    showNotification('❌ Сессия не активна', 'error');
    return;
  }
  
  try {
    const response = await fetch(
      `${scriptURL}?type=scan_logEvent` +
      `&session_id=${encodeURIComponent(scannerSession.session_id)}` +
      `&product_barcode=${encodeURIComponent(barcode)}`
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Обновляем счётчик
      scannerCount = result.total_scans;
      updateScannerCount(scannerCount);
      
      // Показываем последний скан
      showLastScan(barcode, true);
      
      // Добавляем в лог
      addToScannerLog(barcode, true);
      
      // Вибрация успеха
      if (navigator.vibrate) navigator.vibrate(50);
      
    } else {
      showLastScan(`Ошибка: ${result.message}`, false);
      addToScannerLog(`${barcode} - ${result.message}`, false);
      
      // Вибрация ошибки
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    
  } catch (error) {
    console.error('Ошибка сканирования:', error);
    showLastScan(`Ошибка сети`, false);
    addToScannerLog(`${barcode} - ошибка сети`, false);
  }
  
  // Возвращаем фокус
  input.focus();
}

// === ЗАВЕРШЕНИЕ СЕССИИ ===
async function endScannerSession() {
  if (!scannerSession) return;
  
  const confirmEnd = confirm(
    `Завершить сессию сканирования?\n\n` +
    `Всего сканирований: ${scannerCount}\n\n` +
    `Данные будут сохранены и обработаны.`
  );
  
  if (!confirmEnd) return;
  
  try {
    const response = await fetch(
      `${scriptURL}?type=scan_endSession` +
      `&session_id=${encodeURIComponent(scannerSession.session_id)}`
    );
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(
        `🏁 Сессия завершена! Всего сканирований: ${result.total_scans}`,
        'success'
      );
      
      // Сбрасываем состояние
      scannerSession = null;
      scannerCount = 0;
      
      // Возвращаем UI в режим настройки
      showScannerSetupMode();
      
    } else {
      showNotification(`❌ ${result.message}`, 'error');
    }
    
  } catch (error) {
    console.error('Ошибка завершения сессии:', error);
    showNotification(`❌ Ошибка: ${error.message}`, 'error');
  }
}

// === UI ФУНКЦИИ ===

function showScannerActiveMode(session) {
  // Скрываем блок настройки
  const setupBlock = document.getElementById('scannerSetupBlock');
  if (setupBlock) setupBlock.style.display = 'none';
  
  // Показываем блок активной сессии
  const activeBlock = document.getElementById('scannerActiveBlock');
  if (activeBlock) activeBlock.style.display = 'block';
  
  // Заполняем данные
  const operatorEl = document.getElementById('scannerOperatorName');
  const workplaceEl = document.getElementById('scannerWorkplaceName');
  const countEl = document.getElementById('scannerCount');
  
  if (operatorEl) operatorEl.textContent = `✅ ${currentUser}`;
  if (workplaceEl) {
    const shiftType = document.getElementById('shiftType')?.value || 'День';
    const shiftIcon = shiftType === 'Ночь' ? '🌙' : '☀️';
    workplaceEl.textContent = `📍 ${session.workplace_name} • ${shiftIcon} ${shiftType}`;
  }
  if (countEl) countEl.textContent = '0';
  
  // Очищаем лог
  const logEl = document.getElementById('scannerLog');
  if (logEl) {
    logEl.innerHTML = '<div style="color: #9ca3af; text-align: center;">Ожидание сканирования...</div>';
  }
  
  // Очищаем последний скан
  const lastScanEl = document.getElementById('scannerLastScan');
  if (lastScanEl) lastScanEl.textContent = '';
}

function showScannerSetupMode() {
  // Показываем блок настройки
  const setupBlock = document.getElementById('scannerSetupBlock');
  if (setupBlock) setupBlock.style.display = 'block';
  
  // Скрываем блок активной сессии
  const activeBlock = document.getElementById('scannerActiveBlock');
  if (activeBlock) activeBlock.style.display = 'none';
  
  // Сбрасываем счётчик
  const countEl = document.getElementById('scannerCount');
  if (countEl) countEl.textContent = '0';
}

function updateScannerCount(count) {
  const countEl = document.getElementById('scannerCount');
  if (!countEl) return;
  
  countEl.textContent = count;
  
  // Анимация
  countEl.style.transform = 'scale(1.15)';
  countEl.style.color = '#10b981';
  setTimeout(() => {
    countEl.style.transform = 'scale(1)';
    countEl.style.color = '#1f2937';
  }, 150);
}

function showLastScan(text, success) {
  const el = document.getElementById('scannerLastScan');
  if (!el) return;
  
  el.textContent = success ? `✅ ${text}` : `❌ ${text}`;
  el.style.color = success ? '#10b981' : '#ef4444';
}

function addToScannerLog(text, success) {
  const logEl = document.getElementById('scannerLog');
  if (!logEl) return;
  
  // Убираем placeholder
  const placeholder = logEl.querySelector('div[style*="color: #9ca3af"]');
  if (placeholder) placeholder.remove();
  
  // Добавляем запись
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const icon = success ? '✅' : '❌';
  const color = success ? '#10b981' : '#ef4444';
  
  const entry = document.createElement('div');
  entry.style.cssText = `padding: 4px 0; border-bottom: 1px solid #e5e7eb; color: ${color};`;
  entry.textContent = `[${time}] ${icon} ${text}`;
  
  logEl.insertBefore(entry, logEl.firstChild);
  
  // Ограничиваем количество записей
  while (logEl.children.length > 30) {
    logEl.removeChild(logEl.lastChild);
  }
}

// === ПРОВЕРКА АКТИВНОЙ СЕССИИ (при загрузке страницы) ===
async function checkActiveScannerSession() {
  if (!currentUser || typeof scriptURL === 'undefined') return;
  
  try {
    const response = await fetch(
      `${scriptURL}?type=scan_getCurrentSession` +
      `&operator_id=${encodeURIComponent(currentUser)}`
    );
    
    const result = await response.json();
    
    if (result.success && result.session) {
      // Есть активная сессия - восстанавливаем
      scannerSession = {
        session_id: result.session.session_id,
        workplace_name: result.session.workplace_name,
        workplace_id: result.session.workplace_id
      };
      scannerCount = result.session.total_scans || 0;
      
      showScannerActiveMode(scannerSession);
      updateScannerCount(scannerCount);
      
      showNotification(`📱 Восстановлена сессия: ${result.session.workplace_name}`, 'info');
    }
  } catch (error) {
    console.log('Нет активной сессии сканирования');
  }
}

// === ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ ===
window.startScannerSession = startScannerSession;
window.endScannerSession = endScannerSession;
window.loadScannerWorkplaces = loadScannerWorkplaces;
window.checkActiveScannerSession = checkActiveScannerSession;
window.selectWorkMode = selectWorkMode;

// Геттер для текущего режима работы
window.getSelectedWorkMode = function() {
  return selectedWorkMode;
};

// === ИНИЦИАЛИЗАЦИЯ СКАНЕРА (вызывается после входа) ===
window.initScanner = function() {
  console.log('📱 Инициализация сканера...');
  
  // Устанавливаем режим работы (восстанавливаем сохранённый или по умолчанию)
  setDefaultWorkMode();
  
  // Загружаем рабочие места (для режима сканера)
  loadScannerWorkplaces();
  
  // Проверяем активную сессию сканирования
  checkActiveScannerSession();
};

