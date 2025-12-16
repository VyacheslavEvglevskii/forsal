// ===== ПРОСТЫЕ АДМИН-НАСТРОЙКИ (устойчивая минимальная версия) =====

// Безопасные настройки по умолчанию (fail‑closed)
let currentAdminSettings = {
  allow_record_editing: false,
  allow_record_deletion: false,
  auto_end_time_enabled: false,
  force_deal_paytype: false,
};

let hasUnsavedChanges = false;

// Кэш настроек в памяти + срок действия
let adminSettingsCache = null;
let adminSettingsCacheTime = 0;
const ADMIN_SETTINGS_CACHE_DURATION = 30 * 60 * 1000; // 30 минут

let isLoadingAdminSettings = false;
let settingsSyncInterval = null;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * 🔧 Проверка доступности сервера
 */
async function testServerConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут
    
    const response = await fetch(`${scriptURL}?type=getAdminSettings`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    
    const text = await response.text();
    try {
      JSON.parse(text);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Некорректный ответ сервера' };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, error: 'Таймаут соединения (10 сек)' };
    }
    return { ok: false, error: error.message };
  }
}

window.testServerConnection = testServerConnection;

/**
 * 🔧 Тестирование и отображение статуса соединения с сервером
 */
async function testAndShowServerStatus() {
  const btn = document.getElementById("testConnectionBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Проверка...";
  }
  
  try {
    const result = await testServerConnection();
    
    if (result.ok) {
      showAdminNotification("✅ Соединение с сервером работает!", "success");
      console.log("✅ Тест соединения успешен");
    } else {
      showAdminNotification(`❌ Ошибка соединения: ${result.error}`, "error");
      console.error("❌ Тест соединения провален:", result.error);
      
      // Дополнительная диагностика
      console.log("🔍 Диагностика:");
      console.log("   - URL сервера:", scriptURL);
      console.log("   - Онлайн статус:", navigator.onLine ? "Да" : "Нет");
    }
  } catch (error) {
    showAdminNotification(`❌ Ошибка теста: ${error.message}`, "error");
    console.error("❌ Исключение при тесте:", error);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🔌 Тест соединения";
    }
  }
}

window.testAndShowServerStatus = testAndShowServerStatus;

function getAdminSetting(key, defaultValue = false) {
  return currentAdminSettings[key] !== undefined
    ? currentAdminSettings[key]
    : defaultValue;
}

function applyAdminSettingsToUI() {
  // Обновляем поле времени окончания
  if (typeof updateTimeFieldsUI === "function") {
    updateTimeFieldsUI();
  }

  // Обновляем кнопки в уже отрисованной статистике
  if (typeof updateButtonsInCachedStats === "function") {
    const statsContainer = document.getElementById("statsCards");
    if (
      statsContainer &&
      statsContainer.innerHTML &&
      !statsContainer.innerHTML.includes("⏳")
    ) {
      updateButtonsInCachedStats(statsContainer);
    }
  }
  
  // 🎯 Обновляем localStorage с актуальным типом оплаты
  syncPayTypeToLocalStorage();
  
  // 🎯 Обновляем UI профиля если он открыт
  const profileContainer = document.getElementById("profileContainer");
  const employeeStatus = document.getElementById("employeeStatus")?.value || "";
  
  if (profileContainer && employeeStatus && typeof updatePayTypeOptions === "function") {
    updatePayTypeOptions(employeeStatus);
    
    // 🎯 Принудительно загружаем оклад если переключились на "Оклад + сделка"
    const forceDealPaytype = getAdminSetting('force_deal_paytype', false);
    if (forceDealPaytype && employeeStatus !== "Аутсорсинг") {
      const salaryBlock = document.getElementById("salaryBlock");
      const salaryInput = document.getElementById("profileSalary");
      
      if (salaryBlock && salaryInput) {
        salaryBlock.style.display = "block";
        
        // Принудительно загружаем оклад с сервера
        const currentUser = localStorage.getItem("currentUser");
        const shiftType = document.getElementById("shiftType")?.value;
        
        if (currentUser) {
          console.log("💰 Принудительная загрузка оклада после смены настроек...");
          
          if (shiftType && typeof fetchSalaryByShift === "function") {
            fetchSalaryByShift(currentUser, shiftType)
              .then(salary => {
                if (salary) {
                  salaryInput.value = salary;
                  console.log(`💰 Оклад загружен: ${salary}`);
                }
              })
              .catch(err => console.warn("Ошибка загрузки оклада:", err));
          } else if (typeof fetchSalaryFromServer === "function") {
            fetchSalaryFromServer(currentUser)
              .then(salary => {
                if (salary) {
                  salaryInput.value = salary;
                  console.log(`💰 Оклад загружен: ${salary}`);
                }
              })
              .catch(err => console.warn("Ошибка загрузки оклада:", err));
          }
        }
      }
    }
  }
}

/**
 * 🎯 Синхронизация типа оплаты в localStorage на основе настроек администратора
 */
function syncPayTypeToLocalStorage() {
  try {
    const employeeStatus = document.getElementById("employeeStatus")?.value || "";
    if (!employeeStatus) return;
    
    const payType = getPayTypeFromAdminSettings(employeeStatus);
    const currentValue = localStorage.getItem("profilePayType");
    
    if (currentValue !== payType) {
      localStorage.setItem("profilePayType", payType);
      console.log(`🔄 localStorage.profilePayType обновлён: "${currentValue}" → "${payType}"`);
    }
  } catch (e) {
    console.warn("Ошибка синхронизации profilePayType:", e);
  }
}

function updateSettingsButtons() {
  const saveBtn = document.getElementById("saveSettingsBtn");
  const resetBtn = document.getElementById("resetSettingsBtn");
  if (!saveBtn || !resetBtn) return;

  if (hasUnsavedChanges) {
    saveBtn.style.display = "inline-block";
    resetBtn.style.display = "inline-block";
  } else {
    saveBtn.style.display = "none";
    resetBtn.style.display = "none";
  }
}

function showAdminNotification(message, type = "info") {
  if (typeof showNotification === "function") {
    showNotification(message, type);
  } else if (typeof console !== "undefined") {
    console.log(message);
  }
}

// ===== ОТКРЫТИЕ / ЗАКРЫТИЕ ПАНЕЛИ =====

async function toggleAdminSettings() {
  const container = document.getElementById("adminSettingsContainer");
  if (!container) return;

  const isVisible = container.style.display !== "none";
  if (isVisible) {
    hideAdminSettings();
  } else {
    container.style.display = "block";
    await loadAdminSettings();
  }
}

function hideAdminSettings() {
  const container = document.getElementById("adminSettingsContainer");
  if (!container) return;

  if (hasUnsavedChanges) {
    if (
      !confirm(
        "У вас есть несохранённые изменения настроек. Закрыть без сохранения?"
      )
    ) {
      return;
    }
  }

  container.style.display = "none";
  hasUnsavedChanges = false;
  updateSettingsButtons();
}

// ===== ЗАГРУЗКА / ОТОБРАЖЕНИЕ НАСТРОЕК =====

async function loadAdminSettings() {
  const contentDiv = document.getElementById("adminSettingsContent");
  if (!contentDiv) return;

  contentDiv.innerHTML =
    '<div style="text-align:center; padding:20px; color:#6b7280;">⏳ Загрузка настроек...</div>';

  try {
    await loadAdminSettingsFromServer();
  } catch (e) {
    console.warn("Не удалось загрузить настройки администратора:", e);
  }

  renderAdminSettings(currentAdminSettings);
  hasUnsavedChanges = false;
  updateSettingsButtons();
}

function renderAdminSettings(settings) {
  const contentDiv = document.getElementById("adminSettingsContent");
  if (!contentDiv) return;

  const categories = {
    "Управление записями": [
      {
        key: "allow_record_editing",
        title: "Редактирование записей",
        description:
          "Разрешить пользователям редактировать свои записи в статистике",
      },
      {
        key: "allow_record_deletion",
        title: "Удаление записей",
        description:
          "Разрешить пользователям удалять свои записи в статистике",
      },
    ],
    "Контроль времени": [
      {
        key: "auto_end_time_enabled",
        title: "Автоматическое время окончания",
        description:
          "Автоматически подставлять текущее время как время окончания при отправке данных",
      },
    ],
    "Профиль пользователей": [
      {
        key: "force_deal_paytype",
        title: "Глобальный тип оплаты",
        description:
          'Выключено → все "Сделка" | Включено → "Оклад + сделка" (кроме аутсорсеров)',
      },
    ],
  };

  let html = '<div class="admin-settings-grid">';

  Object.entries(categories).forEach(([categoryName, items]) => {
    html += `<div class="settings-category"><h4>${categoryName}</h4>`;
    items.forEach((setting) => {
      const isActive = settings[setting.key] !== false;
      html += `
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${setting.title}</div>
            <div class="setting-description">${setting.description}</div>
          </div>
          <button
            class="toggle-switch ${isActive ? "active" : ""}"
            onclick="toggleSetting('${setting.key}')"
            data-setting="${setting.key}"
          ></button>
        </div>
      `;
    });
    html += "</div>";
  });

  html += "</div>";
  contentDiv.innerHTML = html;
}

function toggleSetting(settingKey) {
  const toggle = document.querySelector(`[data-setting="${settingKey}"]`);
  if (!toggle) return;

  const currentValue = getAdminSetting(settingKey, true);
  const newValue = !currentValue;

  currentAdminSettings[settingKey] = newValue;

  if (newValue) {
    toggle.classList.add("active");
  } else {
    toggle.classList.remove("active");
  }

  hasUnsavedChanges = true;
  updateSettingsButtons();
}

// ===== СОХРАНЕНИЕ / СБРОС =====

async function saveAllAdminSettings() {
  const saveBtn = document.getElementById("saveSettingsBtn");
  if (!saveBtn) return;

  const originalText = saveBtn.textContent;

  try {
    saveBtn.textContent = "💾 Сохранение...";
    saveBtn.disabled = true;

    // 🔧 ИСПРАВЛЕНО: Отправляем все настройки одним запросом через POST
    const settingsToSave = JSON.stringify(currentAdminSettings);
    
    // Пробуем POST запрос (более надёжный для Google Apps Script)
    let response;
    let data;
    
    try {
      // Способ 1: POST с FormData
      const formData = new FormData();
      formData.append('type', 'updateAdminSettings');
      formData.append('settings', settingsToSave);
      
      response = await fetch(scriptURL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      data = text ? JSON.parse(text) : { status: 'ok' };
      
    } catch (postError) {
      console.warn("POST не сработал, пробуем GET:", postError.message);
      
      // Способ 2: Fallback на GET запросы по одному
      const entries = Object.entries(currentAdminSettings);
      const promises = entries.map(async ([key, value]) => {
        try {
          const resp = await fetch(
            `${scriptURL}?type=updateAdminSetting&key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`,
            { 
              method: 'GET',
              mode: 'cors',
              cache: 'no-cache'
            }
          );

          if (!resp.ok) {
            return { status: "error", message: `HTTP ${resp.status}` };
          }

          const text = await resp.text();
          if (!text) return { status: "ok" };

          try {
            const parsed = JSON.parse(text);
            if (parsed && (parsed.status === "error" || parsed.error)) {
              return { status: "error", message: parsed.message || parsed.error };
            }
            return parsed || { status: "ok" };
          } catch {
            return { status: "ok" };
          }
        } catch (fetchErr) {
          return { status: "error", message: fetchErr.message };
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r && r.status === "error");
      
      if (errors.length === entries.length) {
        // Все запросы упали - критическая ошибка
        throw new Error("Сервер недоступен. Проверьте подключение к интернету.");
      } else if (errors.length > 0) {
        console.warn("Некоторые настройки не сохранились:", errors);
      }
      
      data = { status: 'ok' };
    }
    
    // Проверяем ответ
    if (data && (data.status === "error" || data.error)) {
      throw new Error(data.message || data.error || "Ошибка сервера");
    }

    hasUnsavedChanges = false;
    updateSettingsButtons();

    adminSettingsCache = { ...currentAdminSettings };
    adminSettingsCacheTime = Date.now();
    try {
      localStorage.setItem(
        "adminSettingsCache",
        JSON.stringify({
          settings: adminSettingsCache,
          timestamp: adminSettingsCacheTime,
        })
      );
    } catch (e) {
      console.warn("Не удалось сохранить adminSettingsCache в localStorage:", e);
    }

    applyAdminSettingsToUI();
    showAdminNotification("✅ Настройки успешно сохранены", "success");

    broadcastSettingsUpdate();
  } catch (error) {
    console.error("Ошибка сохранения настроек:", error);
    
    // 🔧 Более понятные сообщения об ошибках
    let userMessage = error.message;
    
    if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
      userMessage = 'Нет связи с сервером. Проверьте интернет-подключение.';
      
      // Проверяем соединение
      testServerConnection().then(result => {
        if (!result.ok) {
          console.error("Тест соединения:", result.error);
        }
      });
    } else if (error.message.includes('NetworkError')) {
      userMessage = 'Сетевая ошибка. Попробуйте позже.';
    } else if (error.message.includes('CORS')) {
      userMessage = 'Ошибка доступа к серверу (CORS). Обратитесь к администратору.';
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      userMessage = 'Сервер не отвечает. Попробуйте позже.';
    }
    
    showAdminNotification(`❌ Ошибка сохранения: ${userMessage}`, "error");
    
    // 🔧 Предлагаем сохранить локально как временное решение
    if (confirm("Сервер недоступен. Сохранить настройки локально?\n\nНастройки будут работать только на этом устройстве до синхронизации с сервером.")) {
      saveSettingsLocally();
    }
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

/**
 * 🔧 Локальное сохранение настроек (fallback при недоступности сервера)
 */
function saveSettingsLocally() {
  try {
    adminSettingsCache = { ...currentAdminSettings };
    adminSettingsCacheTime = Date.now();
    
    localStorage.setItem(
      "adminSettingsCache",
      JSON.stringify({
        settings: adminSettingsCache,
        timestamp: adminSettingsCacheTime,
        localOnly: true // Флаг что это локальные настройки
      })
    );
    
    hasUnsavedChanges = false;
    updateSettingsButtons();
    applyAdminSettingsToUI();
    
    showAdminNotification("💾 Настройки сохранены локально. Синхронизируйте с сервером позже.", "info");
  } catch (e) {
    console.error("Ошибка локального сохранения:", e);
    showAdminNotification("❌ Не удалось сохранить локально", "error");
  }
}

async function resetAdminSettings() {
  if (
    !confirm(
      "Сбросить все настройки к значениям по умолчанию? Это действие нельзя отменить."
    )
  ) {
    return;
  }

  currentAdminSettings = {
    allow_record_editing: false,
    allow_record_deletion: false,
    auto_end_time_enabled: false,
    force_deal_paytype: false,
  };

  renderAdminSettings(currentAdminSettings);
  hasUnsavedChanges = true;
  updateSettingsButtons();
  showAdminNotification(
    "🔄 Настройки сброшены к значениям по умолчанию. Не забудьте сохранить!",
    "info"
  );
}

// Очистка кэша статистики по кнопке в админ-панели
async function clearStatsCache() {
  if (typeof statsCache === "undefined") return;

  const memoryCount = statsCache.size || 0;
  let localStorageCount = 0;

  try {
    const keys = Object.keys(localStorage);
    localStorageCount = keys.filter((k) => k.startsWith("stats_")).length;
  } catch {
    /* ignore */
  }

  const total = memoryCount + localStorageCount;
  if (
    !confirm(
      `Очистить кэш статистики?\n\nВ кэше: ${total} записей (${memoryCount} в памяти, ${localStorageCount} в хранилище)`
    )
  ) {
    return;
  }

  try {
    statsCache.clear();
    if (typeof clearStatsFromLocalStorage === "function") {
      await clearStatsFromLocalStorage();
    }
    showAdminNotification(`🗑️ Кэш статистики очищен (${total} записей)`, "success");
  } catch (e) {
    console.error("Ошибка очистки кэша статистики:", e);
  }
}

// ===== UI: поле времени окончания =====

function updateTimeFieldsUI() {
  const autoEndTimeEnabled = getAdminSetting("auto_end_time_enabled", false);

  const endTimeField = document.querySelector('[name="endTime"]');
  const endTimeLabel = document.querySelector(
    'label[for="endTime"], label:has([name="endTime"])'
  );

  if (autoEndTimeEnabled) {
    if (endTimeField) {
      endTimeField.disabled = true;
      endTimeField.placeholder = "Заполнится автоматически";
      endTimeField.style.backgroundColor = "#f3f4f6";
      endTimeField.style.color = "#6b7280";
    }
    if (endTimeLabel) {
      let clean = endTimeLabel.innerHTML.replace(
        /<span.*?автоматически.*?<\/span>/g,
        ""
      );
      clean = clean.replace(/\s*\(автоматически\)/g, "");
      if (clean.includes("Время окончания:")) {
        endTimeLabel.innerHTML = clean.replace(
          "Время окончания:",
          "Время окончания: <span style='color:#10b981; font-size:12px;'>(автоматически)</span>"
        );
      } else {
        endTimeLabel.innerHTML =
          clean +
          " <span style='color:#10b981; font-size:12px;'>(автоматически)</span>";
      }
    }
  } else {
    if (endTimeField) {
      endTimeField.disabled = false;
      endTimeField.placeholder = "";
      endTimeField.style.backgroundColor = "";
      endTimeField.style.color = "";
    }
    if (endTimeLabel) {
      let clean = endTimeLabel.innerHTML.replace(
        /<span.*?автоматически.*?<\/span>/g,
        ""
      );
      clean = clean.replace(/\s*\(автоматически\)/g, "");
      endTimeLabel.innerHTML = clean;
    }
  }
}

// ===== СИНХРОНИЗАЦИЯ ЧЕРЕЗ localStorage =====

function broadcastSettingsUpdate() {
  try {
    localStorage.setItem("adminSettingsUpdated", Date.now().toString());
  } catch {
    /* ignore */
  }
}

function setupSettingsListener() {
  window.addEventListener("storage", (e) => {
    if (e.key !== "adminSettingsUpdated" || !e.newValue) return;

    try {
      const cached = localStorage.getItem("adminSettingsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.settings) {
          currentAdminSettings = {
            ...currentAdminSettings,
            ...parsed.settings,
          };
          adminSettingsCache = parsed.settings;
          adminSettingsCacheTime = parsed.timestamp || Date.now();
          applyAdminSettingsToUI();
          showAdminNotification(
            "🔄 Настройки системы обновлены администратором",
            "info"
          );
        }
      }
    } catch (err) {
      console.warn("Ошибка обработки adminSettingsUpdated:", err);
    }
  });
}

// ===== ПРЕДЗАГРУЗКА / ФОНОВАЯ СИНХРОНИЗАЦИЯ =====

function initializeAdminSettingsInstantly() {
  try {
    const cached = localStorage.getItem("adminSettingsCache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.settings) {
        currentAdminSettings = {
          ...currentAdminSettings,
          ...parsed.settings,
        };
        adminSettingsCache = parsed.settings;
        adminSettingsCacheTime = parsed.timestamp || Date.now();
      }
    }
  } catch (e) {
    console.warn("Ошибка чтения adminSettingsCache:", e);
  }

  applyAdminSettingsToUI();

  // Старт фоновой синхронизации через 3 секунды
  setTimeout(() => {
    syncAdminSettingsInBackground().catch((e) =>
      console.warn("Фоновая синхронизация настроек не критична:", e)
    );
  }, 3000);
}

async function syncAdminSettingsInBackground() {
  try {
    const cached = localStorage.getItem("adminSettingsCache");
    if (cached) {
      const parsed = JSON.parse(cached);
      const now = Date.now();
      if (parsed.timestamp && now - parsed.timestamp < ADMIN_SETTINGS_CACHE_DURATION) {
        currentAdminSettings = {
          ...currentAdminSettings,
          ...(parsed.settings || {}),
        };
        adminSettingsCache = parsed.settings || null;
        adminSettingsCacheTime = parsed.timestamp;
        applyAdminSettingsToUI();
        return;
      }
    }
  } catch (e) {
    console.warn("Ошибка синхронизации из localStorage:", e);
  }

  await loadAdminSettingsFromServer().catch((e) =>
    console.warn("Фоновая загрузка настроек не удалась:", e)
  );
}

function preloadAdminSettings() {
  try {
    const cached = localStorage.getItem("adminSettingsCache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.settings) {
        currentAdminSettings = {
          ...currentAdminSettings,
          ...parsed.settings,
        };
        adminSettingsCache = parsed.settings;
        adminSettingsCacheTime = parsed.timestamp || Date.now();
      }
    }
  } catch (e) {
    console.warn("Ошибка предзагрузки adminSettingsCache:", e);
  }
}

async function loadAdminSettingsInBackground() {
  if (isLoadingAdminSettings) return;

  const now = Date.now();
  if (
    adminSettingsCache &&
    now - adminSettingsCacheTime < ADMIN_SETTINGS_CACHE_DURATION
  ) {
    currentAdminSettings = { ...currentAdminSettings, ...adminSettingsCache };
    applyAdminSettingsToUI();
    return;
  }

  await loadAdminSettingsFromServer();
}

async function loadAdminSettingsFromServer() {
  if (isLoadingAdminSettings) return;

  isLoadingAdminSettings = true;

  try {
    const response = await fetch(`${scriptURL}?type=getAdminSettings`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.settings) {
      throw new Error(data.error || "Некорректный ответ сервера");
    }

    currentAdminSettings = {
      ...currentAdminSettings,
      ...data.settings,
    };
    adminSettingsCache = data.settings;
    adminSettingsCacheTime = Date.now();

    try {
      localStorage.setItem(
        "adminSettingsCache",
        JSON.stringify({
          settings: adminSettingsCache,
          timestamp: adminSettingsCacheTime,
        })
      );
    } catch (e) {
      console.warn("Не удалось сохранить adminSettingsCache:", e);
    }

    applyAdminSettingsToUI();
  } catch (error) {
    console.warn("Не удалось загрузить настройки администратора:", error);
  } finally {
    isLoadingAdminSettings = false;
  }
}

// ===== ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ =====

function startPeriodicSettingsSync() {
  if (settingsSyncInterval) {
    clearInterval(settingsSyncInterval);
  }

  // 🔄 Синхронизация каждые 15 секунд - ВСЕГДА с сервера (без кэша)
  settingsSyncInterval = setInterval(() => {
    forceLoadAdminSettingsFromServer().catch((e) =>
      console.warn("Ошибка периодической синхронизации настроек:", e)
    );
  }, 15 * 1000);
}

/**
 * 🔄 Принудительная загрузка настроек с сервера (игнорирует кэш)
 * Используется для периодической синхронизации в реальном времени
 */
async function forceLoadAdminSettingsFromServer() {
  try {
    const response = await fetch(`${scriptURL}?type=getAdminSettings`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.settings) {
      return;
    }

    // Проверяем изменились ли настройки
    const oldForceDealPaytype = currentAdminSettings.force_deal_paytype;
    const newForceDealPaytype = data.settings.force_deal_paytype;
    
    const settingsChanged = JSON.stringify(currentAdminSettings) !== JSON.stringify({...currentAdminSettings, ...data.settings});

    // Обновляем настройки
    currentAdminSettings = {
      ...currentAdminSettings,
      ...data.settings,
    };
    adminSettingsCache = data.settings;
    adminSettingsCacheTime = Date.now();

    // Сохраняем в localStorage
    try {
      localStorage.setItem(
        "adminSettingsCache",
        JSON.stringify({
          settings: adminSettingsCache,
          timestamp: adminSettingsCacheTime,
        })
      );
    } catch (e) {
      console.warn("Не удалось сохранить adminSettingsCache:", e);
    }

    // Применяем к UI только если настройки изменились
    if (settingsChanged) {
      console.log("🔄 Настройки изменились! Применяем обновления...");
      console.log(`   force_deal_paytype: ${oldForceDealPaytype} → ${newForceDealPaytype}`);
      applyAdminSettingsToUI();
    }
  } catch (error) {
    // Тихо игнорируем ошибки при периодической синхронизации
  }
}

function stopPeriodicSettingsSync() {
  if (settingsSyncInterval) {
    clearInterval(settingsSyncInterval);
    settingsSyncInterval = null;
  }
}

// ===== ОПРЕДЕЛЕНИЕ ТИПА ОПЛАТЫ ИЗ НАСТРОЕК АДМИНИСТРАТОРА =====

/**
 * 🎯 Получение типа оплаты на основе настроек администратора
 * Используется при отправке записей для гарантии актуальности
 * 
 * @param {string} employeeStatus - Статус сотрудника (Штатный/Аутсорсинг)
 * @returns {string} - "Сделка" или "Оклад + сделка"
 */
function getPayTypeFromAdminSettings(employeeStatus) {
  // 🚚 Аутсорсеры: ВСЕГДА "Сделка" (не затрагиваются тумблером)
  if (employeeStatus === "Аутсорсинг") {
    console.log("🎯 Тип оплаты: Сделка (аутсорсинг)");
    return "Сделка";
  }
  
  // 🔛 Проверяем настройку администратора
  const forceDealPaytype = getAdminSetting('force_deal_paytype', false);
  
  if (forceDealPaytype) {
    // Тумблер ВКЛЮЧЕН → все на "Оклад + сделка"
    console.log("🎯 Тип оплаты: Оклад + сделка (из настроек администратора)");
    return "Оклад + сделка";
  } else {
    // Тумблер ВЫКЛЮЧЕН → все на "Сделка"
    console.log("🎯 Тип оплаты: Сделка (из настроек администратора)");
    return "Сделка";
  }
}

// Экспортируем ключевые функции в глобальную область (используются в index.html и auth-and-tabs.js)
window.toggleAdminSettings = toggleAdminSettings;
window.hideAdminSettings = hideAdminSettings;
window.saveAllAdminSettings = saveAllAdminSettings;
window.resetAdminSettings = resetAdminSettings;
window.clearStatsCache = clearStatsCache;
window.updateTimeFieldsUI = updateTimeFieldsUI;
window.broadcastSettingsUpdate = broadcastSettingsUpdate;
window.setupSettingsListener = setupSettingsListener;
window.initializeAdminSettingsInstantly = initializeAdminSettingsInstantly;
window.syncAdminSettingsInBackground = syncAdminSettingsInBackground;
window.preloadAdminSettings = preloadAdminSettings;
window.loadAdminSettingsInBackground = loadAdminSettingsInBackground;
window.loadAdminSettingsFromServer = loadAdminSettingsFromServer;
window.startPeriodicSettingsSync = startPeriodicSettingsSync;
window.stopPeriodicSettingsSync = stopPeriodicSettingsSync;
window.getPayTypeFromAdminSettings = getPayTypeFromAdminSettings;


