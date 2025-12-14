// === ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК И АВТОРИЗАЦИЯ ===

function switchTab(tabName) {
  // Для администратора: разрешаем админ-панель, анализ себестоимости, управление стажерами и дубликаты
  // 🔐 ПРОСТАЯ ЛОГИКА РОЛЕЙ
  
  // Мастер может все (никаких ограничений по вкладкам)
  if (currentUserRole === "master") {
    // Полный доступ
  }
  // Админы могут только админ-функции
  else if (currentUserRole === "admin" && !["admin", "traineeManagement"].includes(tabName)) {
    return; // Админы видят только админ-панель и управление стажерами
  }
  // Обычные пользователи не могут в админ-функции
  else if (currentUserRole === "user" && ["admin", "traineeManagement", "costAnalysis", "duplicates"].includes(tabName)) {
    return;
  }
  
  // 🔐 Блокировка, если профиль не заполнен (только для обычных пользователей)
  if (currentUserRole === "user" && tabName !== "profile" && !requireProfile()) return;

  // Скрываем все контейнеры
  document.getElementById("profileContainer").style.display = "none";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("adminContainer").style.display = "none";
  document.getElementById("mySalaryContainer").style.display = "none";
  document.getElementById("ratesContainer").style.display = "none";
  document.getElementById("costAnalysisContainer").style.display = "none";
  document.getElementById("traineeManagementContainer").style.display = "none";
  document.getElementById("duplicatesContainer").style.display = "none";

  // Удаляем fullscreen от appContainer, если был ранее
  document.getElementById("appContainer").classList.remove("fullscreen");

  // Деактивируем все вкладки
  const tabButtons = ["tabProfile", "tabApp", "tabStats", "tabCostAnalysis", "tabTraineeManagement", "tabRates", "tabMySalary", "tabDuplicates", "tabAdmin"];
  tabButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = false;
  });

  // Активируем нужную вкладку
  switch (tabName) {
    case "profile":
      document.getElementById("profileContainer").style.display = "block";
      document.getElementById("tabProfile").disabled = true;
      break;

    case "app":
      document.getElementById("appContainer").style.display = "block";
      document.getElementById("tabApp").disabled = true;
      break;

    case "stats":
      document.getElementById("statsContainer").style.display = "block";
      document.getElementById("tabStats").disabled = true;
      
      // Устанавливаем сегодняшнюю дату по умолчанию (без автозагрузки)
      const statsDate = document.getElementById("statsDate");
      if (!statsDate.value) {
        const today = new Date().toISOString().split('T')[0];
        statsDate.value = today;
      }
      break;

    case "costAnalysis":
      document.getElementById("costAnalysisContainer").style.display = "block";
      document.getElementById("tabCostAnalysis").disabled = true;
      initializeCostAnalysis();
      break;

    case "traineeManagement":
      showTraineeManagement();
      document.getElementById("tabTraineeManagement").disabled = true;
      break;

    case "rates":
      document.getElementById("ratesContainer").style.display = "block";
      document.getElementById("tabRates").disabled = true;
      break;

    case "mySalary":
      document.getElementById("mySalaryContainer").style.display = "block";
      document.getElementById("tabMySalary").disabled = true;
      break;

    case "admin":
      document.getElementById("adminContainer").style.display = "block";
      document.getElementById("tabAdmin").disabled = true;
      
      // Настраиваем админ-панель в зависимости от роли
      setupAdminPanelForRole();
      break;

    case "duplicates":
      document.getElementById("duplicatesContainer").style.display = "block";
      document.getElementById("tabDuplicates").disabled = true;
      // Загружаем статистику при открытии вкладки
      loadDuplicatesStats();
      break;
  }
}

async function handleLogin() {
  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorElem = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");
  
  // Блокируем кнопку и показываем загрузку
  loginBtn.disabled = true;
  loginBtn.classList.add("loading");
  loginBtn.textContent = "⏳ Вхожу...";
  errorElem.textContent = "";

  try {
    const res = await fetch(`${scriptURL}?type=auth&login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`);
    const data = await res.json();

    if (data.status === "ok") {
      currentUser = login;
      currentUserRole = data.role || 'user';
      currentStatus = data.employeeStatus || 'Штат'; // Получаем статус с сервера

      localStorage.setItem("currentUser", login);
      localStorage.setItem("currentUserRole", currentUserRole);
      
      // ✅ ДОБАВЛЕНО: Обязательная загрузка настроек администратора с сервера
      try {
        await loadAdminSettingsFromServer();
        console.log("✅ Настройки администратора загружены при входе:", currentAdminSettings);
      } catch (error) {
        console.error("❌ Ошибка загрузки настроек при входе:", error);
        // При ошибке используются безопасные defaults (false) из синхронной инициализации
        showTemporaryNotification("⚠️ Настройки загружены из кэша", "warning", 2000);
      }
      // КОНЕЦ ДОБАВЛЕННОГО КОДА
      
      // 🌙 Автоматическая настройка профиля для аутсорсеров
      if (currentStatus === "Аутсорсинг") {
        setupOutsourcingProfile();
      }
      
      // 🗑️ УДАЛЕНО сохранение данных с сервера - только ручной ввод

      // Показываем админ-вкладку при необходимости (будет точно настроено ниже)
      const tabAdmin = document.getElementById("tabAdmin");
      // Временно используем старую логику, окончательная настройка произойдет ниже

      // Обновляем интерфейс: ПЕРЕД асинхронной загрузкой
      document.getElementById("loginContainer").style.display = "none";
      document.getElementById("tabContainer").style.display = "block";
      document.querySelector('[name="employeeName"]').value = currentUser;
      
      // Автоматически обновляем профиль с сервера при входе
      setTimeout(() => {
        updateProfileFromServer();
      }, 1000); // Небольшая задержка для стабилизации интерфейса
      
      // ПРОСТАЯ настройка интерфейса в зависимости от роли
      if (currentUserRole === "master") {
        // МАСТЕР: полный доступ ко всем функциям
        setupMasterInterface();
        
      } else if (currentUserRole === "admin") {
        // АДМИН: ограниченный доступ (только админ-функции)
        setupAdminInterface();
        
      } else {
        // Для обычных пользователей - обычная логика
        document.getElementById("bottomNav").style.display = "flex";
        
        // Восстанавливаем видимость обычных кнопок
        const normalTabButtons = ["tabProfile", "tabApp", "tabStats", "tabRates", "tabMySalary"];
        normalTabButtons.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.classList.remove("admin-hidden");
            btn.classList.remove("admin-visible");
            // Возвращаем стандартные стили
            btn.style.display = "";
            btn.style.visibility = "";
            btn.style.width = "";
            btn.style.padding = "";
            btn.style.margin = "";
          }
        });
        
        // 🔐 Скрываем админ-вкладки от обычных пользователей
        const adminTabButtons = ["tabCostAnalysis", "tabTraineeManagement", "tabDuplicates", "tabAdmin"];
        adminTabButtons.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.classList.add("admin-hidden");
            btn.classList.remove("admin-visible");
            // 🛡️ ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Принудительно скрываем через style
            btn.style.display = "none";
          }
        });
        
        // ✅ СРАЗУ открываем личный профиль после входа
        switchTab("profile");
        
        // 🛠️ ОЧИСТКА всех полей профиля для обеспечения ручного ввода
        document.getElementById("shiftType").value = "";
        document.getElementById("employeeStatus").value = "";
        document.getElementById("profilePackingModel").value = "";
        document.getElementById("profilePayType").value = "";
        document.getElementById("profileSalary").value = "";
        document.getElementById("nightShiftDate").value = "";
        document.getElementById("nightShiftDateBlock").style.display = "none";
        document.getElementById("salaryBlock").style.display = "none";
        
        // Восстанавливаем все опции типа оплаты
        updatePayTypeOptions("");
        
        // 🚀 Предзагружаем оклад для текущего пользователя
        preloadCurrentUserSalary();
        
        // 🛠️ Активируем кнопку сохранения и показываем подсказку
        const saveBtn = document.getElementById("saveProfileBtn");
        const hint = document.getElementById("profileHint");
        const msg = document.getElementById("profileSaved");
        const unsavedMsg = document.getElementById("profileUnsaved");
        
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Сохранить";
          saveBtn.style.opacity = "1";
          saveBtn.style.cursor = "pointer";
          saveBtn.classList.remove("save-button-pulse");
        }
        if (hint) hint.style.display = "block";
        if (msg) msg.style.display = "none";
        if (unsavedMsg) unsavedMsg.style.display = "none";
                
        // 👨‍🏫 Инициализируем блоки наставничества (после очистки полей)
        setTimeout(() => {
          // Устанавливаем статус из данных сервера если есть
          if (currentStatus) {
            document.getElementById("employeeStatus").value = currentStatus;
            handleStatusChange(); // Показываем соответствующий блок
          }
          
          // 🌙 Загружаем сохраненные данные профиля
          loadSavedProfile();
        }, 100);
        
        // 🔄 Быстрая загрузка справочников (с кэшированием)
        await Promise.all([
          loadOperations(),
          loadSetNumbers(),
          loadTodayRecords()
        ]);
        
        // 🛡️ Настраиваем валидацию в реальном времени для проверки дубликатов
        setupRealTimeValidation();
        
        // ⏰ Автоматически заполняем время начала если включен автоматический режим
        // Настройки уже готовы синхронно, применяем немедленно
        autoFillStartTime();
        
        // Загружаем остальные данные в фоне
        loadRatesTable();
        loadOperationFilter();
        // loadPackingModels(); // УБРАНО: уже загружается через preloadPackingModels в DOMContentLoaded
        
        // Прогреваем индекс объёмов для мгновенного отклика
        ensureOperationKeysIndex();
      }

      // Асинхронная фоновая загрузка (ускорение) - только для админов
      if (currentUserRole === "admin") {
        loadAllDictionariesInBackground();
      }
      
      // ⚡ Настройки уже инициализированы синхронно при загрузке страницы
      // Просто обновляем UI согласно готовым настройкам
      updateTimeFieldsUI();
      
      // 🔄 Настраиваем слушатель изменений настроек
      setupSettingsListener();
      
      // 🔄 ВОССТАНАВЛИВАЕМ периодическую синхронизацию настроек между пользователями
      startPeriodicSettingsSync();

      // 📱 Инициализация модуля сканирования
      if (typeof initScanner === 'function') {
        setTimeout(() => initScanner(), 500);
      }

      // 📱 Скрываем вкладки для режима "Сканер"
      const savedWorkMode = localStorage.getItem("profileWorkMode");
      if (savedWorkMode === "scanner") {
        const tabApp = document.getElementById("tabApp");
        const tabRates = document.getElementById("tabRates");
        if (tabApp) tabApp.style.display = "none";
        if (tabRates) tabRates.style.display = "none";
      }

      // Разблокируем кнопку после успешного входа (хотя форма скрыта)
      loginBtn.disabled = false;
      loginBtn.classList.remove("loading");
      loginBtn.textContent = "Войти";

    } else {
      errorElem.textContent = "❌ Неверный логин или PIN-код";
      // Разблокируем кнопку при ошибке
      loginBtn.disabled = false;
      loginBtn.classList.remove("loading");
      loginBtn.textContent = "Войти";
    }
  } catch (err) {
    errorElem.textContent = "❌ Ошибка подключения";
    // Разблокируем кнопку при ошибке подключения
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
    loginBtn.textContent = "Войти";
  }
}

function autoFillStartTime() {
  const autoEndTimeEnabled = getAdminSetting('auto_end_time_enabled', false);
  
  if (!autoEndTimeEnabled) return;
  
  const startTimeField = document.querySelector('[name="startTime"]');
  
  if (startTimeField && !startTimeField.value) {
    const currentTime = new Date();
    const timeString = currentTime.toTimeString().slice(0, 5);
    startTimeField.value = timeString;
    console.log(`⏰ Автоматически установлено время начала: ${timeString}`);
    showNotification(`⏰ Время начала установлено автоматически: ${timeString}`, "info");
  }
}

window.autoFillStartTime = autoFillStartTime;

// === ВЫХОД ИЗ СИСТЕМЫ ===
function handleLogout() {
  // 🔄 Сброс состояния
  currentUser = "";
  currentUserRole = "user";
  currentShift = "";
  currentStatus = "";

  // Очищаем все CSS классы для кнопок навигации
  const allTabButtons = ["tabProfile", "tabApp", "tabStats", "tabRates", "tabMySalary", "tabCostAnalysis", "tabTraineeManagement", "tabDuplicates", "tabAdmin"];
  allTabButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.remove("admin-hidden", "admin-visible");
      btn.style.display = "";
      btn.style.visibility = "";
      btn.style.width = "";
      btn.style.padding = "";
      btn.style.margin = "";
    }
  });

  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentUserRole");

  // 🔐 Очистка формы входа
  const loginInput = document.getElementById("login");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  
  if (loginInput) loginInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (loginInput) loginInput.focus();
  
  // 🔄 Сброс состояния кнопки входа
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
    loginBtn.textContent = "Войти";
  }

  // 👤 Очистка профиля
  const employeeNameInput = document.querySelector('[name="employeeName"]');
  if (employeeNameInput) employeeNameInput.value = "";
  const shiftTypeSelect = document.getElementById("shiftType");
  const statusSelect = document.getElementById("employeeStatus");
  const nightShiftDateInput = document.getElementById("nightShiftDate");
  const nightShiftDateBlock = document.getElementById("nightShiftDateBlock");
  const profileSaved = document.getElementById("profileSaved");
  const profileHint = document.getElementById("profileHint");

  if (shiftTypeSelect) shiftTypeSelect.value = "";
  if (statusSelect) statusSelect.value = "";
  if (nightShiftDateInput) nightShiftDateInput.value = "";
  if (nightShiftDateBlock) nightShiftDateBlock.style.display = "none";
  if (profileSaved) profileSaved.style.display = "none";
  if (profileHint) profileHint.style.display = "block";
  
  // 🌙 Очистка настроек аутсорсера
  if (typeof clearOutsourcingSettings === "function") {
    clearOutsourcingSettings();
  }
  
  // Восстанавливаем все опции типа оплаты
  if (typeof updatePayTypeOptions === "function") {
    updatePayTypeOptions("");
  }

  // 🔒 Отключение кнопки учёта
  const tabApp = document.getElementById("tabApp");
  const tabMySalary = document.getElementById("tabMySalary");
  if (tabApp) {
    tabApp.disabled = true;
    tabApp.innerHTML = "🔒";
  }
  // 🛠️ Показываем вкладку "Моя зарплата" (как до входа)
  if (tabMySalary) tabMySalary.style.display = "inline-block";

  // ❌ Очистка статистики
  if (typeof closeStats === "function") {
    closeStats(); // очищает statsCards, totalWage и statsLogs
  }

  // 📉 Очистка полей фильтра статистики
  const operationFilter = document.getElementById("operationFilter");
  const statsDate = document.getElementById("statsDate");
  if (operationFilter) operationFilter.value = "";
  if (statsDate) statsDate.value = "";

  // 💵 Очистка зарплатных данных
  const mySalaryOutput = document.getElementById("mySalaryOutput");
  const totalQty = document.getElementById("totalQty");
  const salaryStart = document.getElementById("salaryStart");
  const salaryEnd = document.getElementById("salaryEnd");
  if (mySalaryOutput) mySalaryOutput.innerHTML = "";
  if (totalQty) totalQty.textContent = "";
  if (salaryStart) salaryStart.value = "";
  if (salaryEnd) salaryEnd.value = "";

  // 🧼 Скрытие всех контейнеров
  const containers = [
    "loginContainer",
    "tabContainer",
    "appContainer",
    "statsContainer",
    "profileContainer",
    "ratesContainer",
    "adminContainer",
    "shiftLeaderContainer",
    "mySalaryContainer",
    "costAnalysisContainer",
    "traineeManagementContainer",
    "duplicatesContainer"
  ];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === "loginContainer") ? "block" : "none";
  });

  // Восстанавливаем видимость только обычных навигационных кнопок (админ-вкладки остаются скрытыми)
  const tabButtons = ["tabProfile", "tabApp", "tabStats", "tabRates", "tabMySalary"];
  tabButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "inline-block";
  });
  
  // 🔐 Админ-вкладки остаются скрытыми
  const adminTabs = ["tabCostAnalysis", "tabTraineeManagement", "tabDuplicates", "tabAdmin"];
  adminTabs.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "none";
  });

  // 🧽 Сброс модальных окон
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";

  // 🔄 Остановка периодической синхронизации настроек
  if (typeof stopPeriodicSettingsSync === "function") {
    stopPeriodicSettingsSync();
  }

  // 👇 Скрытие нижнего меню
  const nav = document.getElementById("bottomNav");
  if (nav) {
    nav.style.opacity = "0";
    setTimeout(() => {
      nav.style.display = "none";
      nav.style.opacity = "1";
    }, 200);
  }
}

// === ФУНКЦИИ НАСТРОЙКИ ИНТЕРФЕЙСА ДЛЯ АДМИНА / МАСТЕРА ===

// 🔐 МАСТЕР: Настройка полного доступа
function setupMasterInterface() {
  console.log("🔐 Настройка интерфейса для мастера (полный доступ)");

  // Полностью скрываем обычные кнопки
  const normalTabButtons = ["tabProfile", "tabApp", "tabStats", "tabRates", "tabMySalary"];
  normalTabButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.style.display = "none";
      btn.style.visibility = "hidden";
      console.log(`🔒 Полностью скрыта кнопка: ${id}`);
    }
  });

  // Показываем все админ-кнопки для мастера
  const masterTabs = ["tabAdmin", "tabCostAnalysis", "tabTraineeManagement", "tabDuplicates"];
  masterTabs.forEach((tabId) => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.style.display = "inline-block";
      tab.style.visibility = "visible";
      console.log(`✅ Показана кнопка: ${tabId}`);
    }
  });

  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "flex";
  switchTab("admin"); // Открываем полную админ-панель
}

// 👨‍💼 АДМИН: Настройка ограниченного доступа (только 3 функции)
function setupAdminInterface() {
  console.log("👨‍💼 Настройка интерфейса для админа (ограниченный доступ)");

  // Полностью скрываем все обычные кнопки
  const normalTabButtons = ["tabProfile", "tabApp", "tabStats", "tabRates", "tabMySalary"];
  normalTabButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.style.display = "none";
      btn.style.visibility = "hidden";
      console.log(`🔒 Полностью скрыта кнопка: ${id}`);
    }
  });

  // Полностью скрываем лишние админ-кнопки
  const hiddenAdminTabs = ["tabCostAnalysis", "tabDuplicates"];
  hiddenAdminTabs.forEach((tabId) => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.style.display = "none";
      tab.style.visibility = "hidden";
      console.log(`🔒 Полностью скрыта админ-кнопка: ${tabId}`);
    }
  });

  // Показываем только нужные кнопки
  const visibleTabs = ["tabAdmin", "tabTraineeManagement"];
  visibleTabs.forEach((tabId) => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.style.display = "inline-block";
      tab.style.visibility = "visible";
      console.log(`✅ Показана кнопка: ${tabId}`);
    }
  });

  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "flex";
  switchTab("admin"); // Открываем админ-панель
}

// ⚙️ Настройка админ-панели в зависимости от роли
function setupAdminPanelForRole() {
  console.log(`⚙️ Настройка админ-панели для роли: ${currentUserRole}`);

  if (currentUserRole === "admin") {
    // Для обычных админов: скрываем лишние кнопки, оставляем только 3 функции
    const allowedButtons = [
      "loadShiftStats", // 📊 Сводка по смене
      "showSeniorShiftForm", // ➕ Добавить старшего смены
      "showTraineeManagement", // 👨‍🎓 Управление стажерами (через кнопку)
    ];

    // Скрываем все кнопки в админ-панели кроме разрешенных
    const adminContainer = document.getElementById("adminContainer");
    if (adminContainer) {
      const allButtons = adminContainer.querySelectorAll("button");
      allButtons.forEach((button) => {
        const onclick = button.getAttribute("onclick");
        const isAllowed = allowedButtons.some(
          (allowed) => onclick && onclick.includes(allowed)
        );

        // Всегда показываем кнопку выхода
        const isLogoutButton = onclick && onclick.includes("handleLogout");

        if (!isAllowed && !isLogoutButton) {
          button.style.display = "none";
          console.log(`🔒 Скрыта кнопка: ${onclick}`);
        } else {
          button.style.display = "inline-block";
          console.log(`✅ Показана кнопка: ${onclick}`);
        }
      });
    }
  } else if (currentUserRole === "master") {
    // Для мастера: показываем все кнопки
    const adminContainer = document.getElementById("adminContainer");
    if (adminContainer) {
      const allButtons = adminContainer.querySelectorAll("button");
      allButtons.forEach((button) => {
        button.style.display = "inline-block";
      });
    }
    console.log("🔐 Мастер: все функции доступны");
  }
}


