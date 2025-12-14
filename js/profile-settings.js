// === ФУНКЦИИ ОКЛАДА И АУТСОРСИНГ-ПРОФИЛЯ ===

// === ФУНКЦИЯ: Загрузка оклада с кэшированием ===
async function getSalaryWithCache(employee) {
  if (!employee) {
    console.warn("getSalaryWithCache: employee пустой");
    return null;
  }

  // Проверяем кэш
  const cached = dataCache.salaries[employee];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.salary;
  }

  // Пытаемся загрузить из localStorage
  const localData = tryLoadSalaryFromStorage(employee);
  if (localData !== null) {
    // Сохраняем в оперативный кэш
    dataCache.salaries[employee] = {
      salary: localData,
      timestamp: Date.now() - 1000 // Чуть старше, чтобы обновилось в фоне
    };
    
    // Обновляем в фоне
    setTimeout(() => {
      fetchSalaryFromServer(employee);
    }, 500);
    
    return localData;
  }

  // Загружаем с сервера
  return await fetchSalaryFromServer(employee);
}

// Функция загрузки оклада с сервера
async function fetchSalaryFromServer(employee) {
  try {
    const res = await fetch(`${scriptURL}?type=getSalary&employee=${encodeURIComponent(employee)}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const salary = String(data.salary || "");
    
    // Сохраняем в кэш
    dataCache.salaries[employee] = {
      salary: salary,
      timestamp: Date.now()
    };
    
    // Сохраняем в localStorage
    saveSalaryToStorage(employee, salary);
    
    return salary;
    
  } catch (err) {
    console.error(`❌ Ошибка загрузки оклада для "${employee}":`, err);
    
    // Пытаемся загрузить из localStorage как fallback
    const fallback = tryLoadSalaryFromStorage(employee);
    if (fallback !== null) {
      return fallback;
    }
    
    return null;
  }
}

// 🌙 Новая функция для загрузки оклада с учетом смены
async function fetchSalaryByShift(employee, shiftType) {
  try {
    const res = await fetch(`${scriptURL}?type=getSalaryByShift&employee=${encodeURIComponent(employee)}&shift=${encodeURIComponent(shiftType)}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const salary = String(data.salary || "");
    
    return salary;
    
  } catch (err) {
    console.error(`❌ Ошибка загрузки оклада для "${employee}" (${shiftType}):`, err);
    return null;
  }
}

// ⚡ ОПТИМИЗИРОВАННАЯ функция обновления оклада при изменении смены
async function updateSalaryForShift(shiftType) {
  const currentUser = localStorage.getItem("currentUser");
  const payType = document.getElementById("profilePayType").value;
  const salaryInput = document.getElementById("profileSalary");
  
  // Обновляем оклад только если выбран "Оклад + сделка"
  if (payType !== "Оклад + сделка" || !currentUser || !shiftType) {
    return;
  }
  
  try {
    // ⚡ Сначала пытаемся получить из кэша
    const cachedSalary = getCachedSalary(currentUser, shiftType);
    
    if (cachedSalary !== null) {
      // ⚡ Мгновенное обновление из кэша
      salaryInput.value = cachedSalary;
      return;
    }
    
    // Загружаем с сервера только если нет в кэше
    salaryInput.placeholder = "⏳ Загрузка...";
    const salary = await fetchSalaryWithFallback(currentUser, shiftType);
    
    if (salary !== null) {
      salaryInput.value = salary;
      salaryInput.placeholder = "";
      
      // Кэшируем результат
      cacheSalary(currentUser, shiftType, salary);
    }
  } catch (err) {
    console.error("❌ Ошибка обновления оклада:", err);
    salaryInput.placeholder = "Ошибка загрузки";
  }
}

/**
 * ⚡ Загрузка оклада с fallback логикой
 */
async function fetchSalaryWithFallback(employee, shiftType) {
  try {
    // Сначала пытаемся использовать новую оптимизированную функцию
    const res = await fetch(`${scriptURL}?type=getSalaryByShift&employee=${encodeURIComponent(employee)}&shift=${encodeURIComponent(shiftType)}`);
    
    if (res.ok) {
      const data = await res.json();
      if (data.salary !== undefined && !data.error) {
        const salary = String(data.salary || "");
        return salary;
      }
    }
    
    // Если новый API не работает, пробуем старый
    const fallbackRes = await fetch(`${scriptURL}?type=getSalary&employee=${encodeURIComponent(employee)}`);
    
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const salary = String(fallbackData.salary || "");
      return salary;
    }
    
    throw new Error("Оба API недоступны");
    
  } catch (error) {
    console.error(`❌ Ошибка загрузки оклада для "${employee}" (${shiftType}):`, error);
    return null;
  }
}

// ⚡ КЭШИРОВАНИЕ ОКЛАДОВ
var salaryCache = new Map();
var salaryCacheExpiry = 10 * 60 * 1000; // 10 минут

/**
 * ⚡ Получение кэшированного оклада
 */
function getCachedSalary(employee, shiftType) {
  const cacheKey = `${employee}|${shiftType}`;
  const cached = salaryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < salaryCacheExpiry) {
    return cached.salary;
  }
  
  return null;
}

/**
 * ⚡ Кэширование оклада
 */
function cacheSalary(employee, shiftType, salary) {
  const cacheKey = `${employee}|${shiftType}`;
  salaryCache.set(cacheKey, {
    salary: salary,
    timestamp: Date.now()
  });
  console.log(`✅ Оклад кэширован для ${employee} (${shiftType}): ${salary}`);
}

/**
 * ⚡ Оптимизированная загрузка оклада с сервера
 */
async function fetchSalaryByShiftOptimized(employee, shiftType) {
  try {
    // ⚡ Показываем индикатор загрузки
    const salaryInput = document.getElementById("profileSalary");
    const originalPlaceholder = salaryInput.placeholder;
    salaryInput.placeholder = "⏳ Загрузка...";
    
    const res = await fetch(`${scriptURL}?type=getSalaryByShift&employee=${encodeURIComponent(employee)}&shift=${encodeURIComponent(shiftType)}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Проверяем на ошибки сервера
    if (data.error) {
      throw new Error(data.error);
    }
    
    const salary = String(data.salary || "");
    
    // Восстанавливаем placeholder
    salaryInput.placeholder = originalPlaceholder;
    
    console.log(`⚡ Быстро загружен оклад для ${employee} (${shiftType}): ${salary}`);
    return salary;
    
  } catch (err) {
    console.error(`❌ Ошибка быстрой загрузки оклада для "${employee}" (${shiftType}):`, err);
    
    // Восстанавливаем placeholder
    const salaryInput = document.getElementById("profileSalary");
    if (salaryInput) {
      salaryInput.placeholder = "Не удалось загрузить";
    }
    
    return null;
  }
}

/**
 * ⚡ Предзагрузка окладов для обеих смен
 */
async function preloadSalaries(employee) {
  if (!employee) return;
  
  try {
    console.log(`⚡ Предзагрузка окладов для ${employee}...`);
    
    // Загружаем оклады для обеих смен параллельно
    const [daySalary, nightSalary] = await Promise.all([
      fetchSalaryByShiftOptimized(employee, "День"),
      fetchSalaryByShiftOptimized(employee, "Ночь")
    ]);
    
    // Кэшируем результаты
    if (daySalary) cacheSalary(employee, "День", daySalary);
    if (nightSalary) cacheSalary(employee, "Ночь", nightSalary);
    
    console.log(`✅ Предзагрузка окладов завершена: День=${daySalary}, Ночь=${nightSalary}`);
    
  } catch (error) {
    console.warn(`⚠️ Ошибка предзагрузки окладов для ${employee}:`, error);
  }
}

// 🌙 Функция автоматической настройки профиля для аутсорсеров
function setupOutsourcingProfile() {
  console.log("🚚 Настройка профиля аутсорсера");
  
  // Автоматически устанавливаем статус "Аутсорсинг"
  const statusSelect = document.getElementById("employeeStatus");
  if (statusSelect) {
    statusSelect.value = "Аутсорсинг";
    statusSelect.disabled = true; // Блокируем изменение
    statusSelect.style.backgroundColor = "#f3f4f6";
    statusSelect.style.cursor = "not-allowed";
  }
  
  // Автоматически устанавливаем тип оплаты "Сделка"
  const payTypeSelect = document.getElementById("profilePayType");
  if (payTypeSelect) {
    // Сначала обновляем опции для аутсорсинга
    updatePayTypeOptions("Аутсорсинг");
    
    // Затем устанавливаем "Сделка"
    payTypeSelect.value = "Сделка";
    payTypeSelect.disabled = true; // Блокируем изменение
    payTypeSelect.style.backgroundColor = "#f3f4f6";
    payTypeSelect.style.cursor = "not-allowed";
  }
  
  // Скрываем блок оклада для аутсорсеров
  const salaryBlock = document.getElementById("salaryBlock");
  if (salaryBlock) {
    salaryBlock.style.display = "none";
  }
  
  // Скрываем ненужные вкладки для аутсорсеров (оставляем статистику для редактирования записей)
  const tabMySalary = document.getElementById("tabMySalary");
  const tabRates = document.getElementById("tabRates");
  
  if (tabMySalary) tabMySalary.style.display = "none";
  if (tabRates) tabRates.style.display = "none";
  
  // 📊 СТАТИСТИКА ОСТАЕТСЯ ДОСТУПНОЙ для редактирования и удаления записей
  
  // Скрываем блоки тарифов и расчета оплаты для аутсорсеров
  const rateInfo = document.getElementById("rateInfo");
  const calcBlock = document.getElementById("calcBlock");
  
  if (rateInfo) rateInfo.style.display = "none";
  if (calcBlock) calcBlock.style.display = "none";
  
  // Добавляем индикатор аутсорсера
  addOutsourcingIndicator();
  
  console.log("✅ Профиль аутсорсера настроен");
}

// 🌙 Функция добавления индикатора аутсорсера
function addOutsourcingIndicator() {
  // Проверяем есть ли уже индикатор
  if (document.getElementById("outsourcingIndicator")) return;
  
  // Создаем индикатор
  const indicator = document.createElement("div");
  indicator.id = "outsourcingIndicator";
  indicator.innerHTML = "🚚 Аутсорсинг";
  indicator.style.cssText = `
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 8px 16px;
    border-radius: 12px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    border: 2px solid #fbbf24;
  `;
  
  // Вставляем в начало профиля
  const profileContainer = document.getElementById("profileContainer");
  const firstChild = profileContainer.querySelector("h2");
  if (firstChild) {
    firstChild.insertAdjacentElement("afterend", indicator);
  }
}

// 🌙 Функция очистки настроек аутсорсера
function clearOutsourcingSettings() {
  // Разблокируем поля
  const statusSelect = document.getElementById("employeeStatus");
  if (statusSelect) {
    statusSelect.disabled = false;
    statusSelect.style.backgroundColor = "";
    statusSelect.style.cursor = "";
  }
  
  const payTypeSelect = document.getElementById("profilePayType");
  if (payTypeSelect) {
    // Проверяем настройку автоматических типов оплаты
    const autoPayTypeByStatus = getAdminSetting('force_deal_paytype', false);
    const currentStatus = document.getElementById("employeeStatus")?.value || "";
    
    // Обновляем опции типа оплаты согласно текущему статусу и настройкам
    updatePayTypeOptions(currentStatus);
  }
  
  // Показываем блок оклада
  const salaryBlock = document.getElementById("salaryBlock");
  if (salaryBlock) {
    salaryBlock.style.display = "none"; // Скрыто по умолчанию
  }
  
  // Показываем вкладки для обычных пользователей
  const tabMySalary = document.getElementById("tabMySalary");
  const tabStats = document.getElementById("tabStats");
  const tabRates = document.getElementById("tabRates");
  
  if (tabMySalary) tabMySalary.style.display = "inline-block";
  if (tabStats) tabStats.style.display = "inline-block"; 
  if (tabRates) tabRates.style.display = "inline-block";
  
  // Показываем блоки тарифов и расчета оплаты для обычных пользователей
  const rateInfo = document.getElementById("rateInfo");
  const calcBlock = document.getElementById("calcBlock");
  
  // Не показываем их принудительно, пусть updateRateDisplay() решает
  if (rateInfo) rateInfo.style.display = "";
  if (calcBlock) calcBlock.style.display = "";
  
  // Удаляем индикатор аутсорсера
  const indicator = document.getElementById("outsourcingIndicator");
  if (indicator) {
    indicator.remove();
  }
}

// Функция сохранения оклада в localStorage
function saveSalaryToStorage(employee, salary) {
  try {
    const salariesCache = JSON.parse(localStorage.getItem('salariesCache') || '{}');
    salariesCache[employee] = {
      salary: salary,
      timestamp: Date.now()
    };
    localStorage.setItem('salariesCache', JSON.stringify(salariesCache));
  } catch (e) {
    console.warn(`Не удалось сохранить оклад для "${employee}" в localStorage:`, e);
  }
}

// Функция загрузки оклада из localStorage
function tryLoadSalaryFromStorage(employee) {
  try {
    const salariesCache = JSON.parse(localStorage.getItem('salariesCache') || '{}');
    const cached = salariesCache[employee];
    
    if (cached) {
      // Проверяем что данные не старше 24 часов
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа
      if (Date.now() - cached.timestamp < maxAge) {
        return cached.salary;
      }
    }
  } catch (e) {
    console.warn(`Ошибка при загрузке оклада "${employee}" из localStorage:`, e);
  }
  return null;
}

// Предзагрузка оклада для текущего пользователя
function preloadCurrentUserSalary() {
  const currentUser = localStorage.getItem("currentUser");
  if (currentUser) {
    // Предзагружаем оклад из localStorage
    const cachedSalary = tryLoadSalaryFromStorage(currentUser);
    if (cachedSalary !== null) {
      dataCache.salaries[currentUser] = {
        salary: cachedSalary,
        timestamp: Date.now() - 1000 // Чуть старше для фонового обновления
      };
      
      // Обновляем в фоне
      setTimeout(() => {
        fetchSalaryFromServer(currentUser);
      }, 2000);
    }
  }
}

// Функция "умного" заполнения поля оклада
function smartFillSalaryField() {
  const currentUser = localStorage.getItem("currentUser");
  const salaryInput = document.getElementById("profileSalary");
  
  if (!currentUser || !salaryInput) return;
  
  // Проверяем есть ли оклад в кэше
  const cached = dataCache.salaries[currentUser];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    salaryInput.value = cached.salary;
    return;
  }
  
  // Проверяем localStorage
  const localSalary = tryLoadSalaryFromStorage(currentUser);
  if (localSalary !== null) {
    salaryInput.value = localSalary;
    console.log(`💰 Загружен оклад из localStorage: ${localSalary}`);
    
    // Обновляем кэш и проверяем актуальность в фоне
    dataCache.salaries[currentUser] = {
      salary: localSalary,
      timestamp: Date.now() - 1000
    };
    
    setTimeout(() => {
      fetchSalaryFromServer(currentUser).then(newSalary => {
        if (newSalary && newSalary !== localSalary) {
          salaryInput.value = newSalary;
          console.log(`💰 Обновлен оклад с сервера: ${newSalary}`);
        }
      });
    }, 1000);
    return;
  }
  
  // Если нет кэша - загружаем с сервера
  console.log("💰 Нет кэша оклада, загружаем с сервера...");
  const currentShift = document.getElementById("shiftType")?.value;
  
  if (currentShift) {
    // Загружаем по смене
    fetchSalaryByShift(currentUser, currentShift)
      .then(salary => {
        if (salary) {
          salaryInput.value = salary;
          console.log(`💰 Загружен оклад с сервера по смене: ${salary}`);
        }
      })
      .catch(error => {
        console.warn("Ошибка загрузки оклада по смене:", error);
      });
  } else {
    // Загружаем общий оклад
    fetchSalaryFromServer(currentUser)
      .then(salary => {
        if (salary) {
          salaryInput.value = salary;
          console.log(`💰 Загружен общий оклад с сервера: ${salary}`);
        }
      })
      .catch(error => {
        console.warn("Ошибка загрузки общего оклада:", error);
      });
  }
}

// === ФУНКЦИЯ: Управление доступными типами оплаты ===
function updatePayTypeOptions(employeeStatus) {
  const payTypeSelect = document.getElementById("profilePayType");
  const payTypeInfo = document.getElementById("payTypeInfo");
  if (!payTypeSelect) return;
  
  // 🎯 ПРОСТАЯ ЛОГИКА: один тумблер для всех (кроме аутсорсеров)
  const globalPayTypeEnabled = getAdminSetting('force_deal_paytype', false);
  
  // Сохраняем текущее значение
  const currentValue = payTypeSelect.value;
  
  // Очищаем все опции
  payTypeSelect.innerHTML = '';
  
  // Добавляем базовую опцию
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Выберите --';
  payTypeSelect.appendChild(defaultOption);
  
  if (employeeStatus === "Аутсорсинг") {
    // 🚚 Аутсорсеры: всегда только "Сделка" (не затрагиваются тумблером)
    const dealOption = document.createElement('option');
    dealOption.value = 'Сделка';
    dealOption.textContent = 'Сделка';
    payTypeSelect.appendChild(dealOption);
    
    payTypeSelect.value = 'Сделка';
    payTypeSelect.disabled = true;
    payTypeSelect.style.backgroundColor = "#f3f4f6";
    payTypeSelect.style.cursor = "not-allowed";
    payTypeSelect.title = "Для аутсорсеров доступна только Сделка";
    
  } else if (globalPayTypeEnabled) {
    // 🔛 ТУМБЛЕР ВКЛЮЧЕН → все на "Оклад + сделка"
    const salaryOption = document.createElement('option');
    salaryOption.value = 'Оклад + сделка';
    salaryOption.textContent = 'Оклад + сделка (установлено администратором)';
    payTypeSelect.appendChild(salaryOption);
    
    payTypeSelect.value = 'Оклад + сделка';
    payTypeSelect.disabled = true;
    payTypeSelect.style.backgroundColor = "#f3f4f6";
    payTypeSelect.style.cursor = "not-allowed";
    payTypeSelect.title = "Тип оплаты установлен администратором";
    
    // 💰 ПОКАЗЫВАЕМ И ЗАГРУЖАЕМ БЛОК ОКЛАДА
    const salaryBlock = document.getElementById("salaryBlock");
    if (salaryBlock) {
      salaryBlock.style.display = "block";
      console.log("💰 Показываем блок оклада для принудительного 'Оклад + сделка'");
      
      // Загружаем оклад
      smartFillSalaryField();
    }
    
  } else {
    // 🔄 ТУМБЛЕР ВЫКЛЮЧЕН → все на "Сделка"
    const dealOption = document.createElement('option');
    dealOption.value = 'Сделка';
    dealOption.textContent = 'Сделка (установлено администратором)';
    payTypeSelect.appendChild(dealOption);
    
    payTypeSelect.value = 'Сделка';
    payTypeSelect.disabled = true;
    payTypeSelect.style.backgroundColor = "#f3f4f6";
    payTypeSelect.style.cursor = "not-allowed";
    payTypeSelect.title = "Тип оплаты установлен администратором";
    
    // 💰 СКРЫВАЕМ БЛОК ОКЛАДА для "Сделка"
    const salaryBlock = document.getElementById("salaryBlock");
    if (salaryBlock) {
      salaryBlock.style.display = "none";
      console.log("💰 Скрываем блок оклада для принудительной 'Сделка'");
    }
  }
  
  // Управляем отображением информационного сообщения
  if (payTypeInfo) {
    if (employeeStatus === "Аутсорсинг") {
      payTypeInfo.style.display = "block";
      payTypeInfo.innerHTML = "🚚 Для аутсорсеров всегда \"Сделка\"";
      payTypeInfo.style.color = "#f59e0b";
    } else if (globalPayTypeEnabled) {
      payTypeInfo.style.display = "block";
      payTypeInfo.innerHTML = "🔛 Администратор установил для всех \"Оклад + сделка\"";
      payTypeInfo.style.color = "#059669";
    } else {
      payTypeInfo.style.display = "block";
      payTypeInfo.innerHTML = "🔄 Администратор установил для всех \"Сделка\"";
      payTypeInfo.style.color = "#0ea5e9";
    }
  }
}

// === ФУНКЦИЯ: Активация кнопки сохранения при изменениях ===
function activateSaveButton() {
  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn && saveBtn.disabled) {
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Сохранить";
    saveBtn.style.opacity = "1";
    saveBtn.style.cursor = "pointer";
    saveBtn.classList.add("save-button-pulse"); // Добавляем анимацию
    
    // Скрываем сообщение о сохранении
    const msg = document.getElementById("profileSaved");
    if (msg) msg.style.display = "none";
    
    // Показываем предупреждение о несохраненных изменениях
    const unsavedMsg = document.getElementById("profileUnsaved");
    if (unsavedMsg) unsavedMsg.style.display = "block";
  }
}

// === ФУНКЦИЯ: Установка слушателя для profilePayType ===
function setupPayTypeListener() {
  const payTypeSelect = document.getElementById("profilePayType");
  if (!payTypeSelect) return;
  
  payTypeSelect.addEventListener("change", async function() {
    const salaryBlock = document.getElementById("salaryBlock");
    const salaryInput = document.getElementById("profileSalary");
    
    activateSaveButton();
    
    if (this.value === "Оклад + сделка") {
      salaryBlock.style.display = "block";
      
      // Мгновенно заполняем из кэша если есть
      smartFillSalaryField();
      
      // Подгружаем оклад с сервера для актуальности
      const currentUser = localStorage.getItem("currentUser") || "";
      
      if (!currentUser) {
        salaryInput.value = "";
        return;
      }
      
      try {        
        // 🌙 Используем новую функцию с учетом типа смены
        const shiftType = document.getElementById("shiftType").value;
        if (shiftType) {
          const salary = await fetchSalaryByShift(currentUser, shiftType);
          salaryInput.value = salary || "";
        } else {
          // Fallback к старой функции если смена не выбрана
          const salary = await getSalaryWithCache(currentUser);
          salaryInput.value = salary || "";
        }
      } catch (err) {
        salaryInput.value = "";
      }
    } else {
      salaryBlock.style.display = "none";
      salaryInput.value = "";
    }
  });
}

// === ЛОГИКА: Инициализация слушателя для profilePayType ===
setupPayTypeListener();

// === ЛОГИКА: Активация кнопки сохранения при изменении модели упаковки ===
document.getElementById("profilePackingModel").addEventListener("change", function() {
  activateSaveButton();
  
  // Также обновляем отображение тарифа (существующая логика)
  updateRateDisplay();
});

// === ЛОГИКА: Активация кнопки сохранения при изменении смены ===
document.getElementById("shiftType").addEventListener("change", function() {
  const nightShiftBlock = document.getElementById("nightShiftDateBlock");
  const nightShiftInput = document.getElementById("nightShiftDate");
  
  if (this.value === "Ночь") {
    nightShiftBlock.style.display = "block";
    
    // Автоматически предлагаем вчерашний день если поле пустое
    if (!nightShiftInput.value) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      nightShiftInput.value = yesterday.toISOString().split('T')[0];
    }
  } else {
    nightShiftBlock.style.display = "none";
    nightShiftInput.value = "";
  }
  
  // 🌙 Обновляем оклад при изменении типа смены (с защитой от ReferenceError)
  if (typeof updateSalaryForShift === "function") {
    updateSalaryForShift(this.value);
  }
  
  activateSaveButton();
});

// === ЛОГИКА: Кнопки быстрого выбора даты ===
document.getElementById("setYesterday").addEventListener("click", function() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  document.getElementById("nightShiftDate").value = yesterday.toISOString().split('T')[0];
  activateSaveButton();
});

document.getElementById("setToday").addEventListener("click", function() {
  const today = new Date();
  document.getElementById("nightShiftDate").value = today.toISOString().split('T')[0];
  activateSaveButton();
});

// === ЛОГИКА: Активация кнопки сохранения при изменении даты ночной смены ===
document.getElementById("nightShiftDate").addEventListener("change", function() {
  activateSaveButton();
});

// === ЛОГИКА: Активация кнопки сохранения при изменении статуса ===
document.getElementById("employeeStatus").addEventListener("change", function() {
  activateSaveButton();
  
  // Обновляем доступные опции типа оплаты
  updatePayTypeOptions(this.value);
  
  // Обрабатываем блок оклада в зависимости от выбранного типа оплаты
  if (this.value === "Аутсорсинг") {
    // Скрываем блок оклада для аутсорсинга
    document.getElementById("salaryBlock").style.display = "none";
    document.getElementById("profileSalary").value = "";
  } else if (this.value === "Штат") {
    // Показываем блок оклада для штатных и загружаем оклад
    document.getElementById("salaryBlock").style.display = "block";
    
    // Мгновенно заполняем из кэша если есть
    smartFillSalaryField();
    
    // Автоматически загружаем оклад с сервера для актуальности с учетом смены
    const currentUser = localStorage.getItem("currentUser") || "";
    if (currentUser) {
      // 🌙 Используем новую функцию с учетом типа смены
      const shiftType = document.getElementById("shiftType").value;
      if (shiftType) {
        fetchSalaryByShift(currentUser, shiftType)
          .then(salary => {
            document.getElementById("profileSalary").value = salary || "";
          })
          .catch(() => {
            document.getElementById("profileSalary").value = "";
          });
      } else {
        // Fallback к старой функции если смена не выбрана
        getSalaryWithCache(currentUser)
          .then(salary => {
            document.getElementById("profileSalary").value = salary || "";
          })
          .catch(() => {
            document.getElementById("profileSalary").value = "";
          });
      }
    }
  }
  
  // Активируем кнопку сохранения еще раз, так как изменился тип оплаты
  activateSaveButton();
  
  // Управляем отображением вкладки "Моя зарплата"
  const tabMySalary = document.getElementById("tabMySalary");
  if (tabMySalary) {
    tabMySalary.style.display = (this.value === "Аутсорсинг") ? "none" : "inline-block";
  }
});

function isProfileComplete() {
  // 📦 Определяем режим работы
  const workMode = typeof getSelectedWorkMode === 'function' ? getSelectedWorkMode() : 'manual';
  const isScanner = workMode === 'scanner';
  
  // Базовые проверки
  if (!currentShift || !currentStatus) return false;
  
  if (isScanner) {
    // 📱 Режим СКАНЕР: нужно рабочее место
    const workplaceId = localStorage.getItem("profileWorkplace") || "";
    return !!workplaceId;
  } else {
    // ✍️ Режим РУЧНОЙ ВВОД: нужны тип оплаты и модель упаковки
    const packingModel = document.getElementById("profilePackingModel")?.value || "";
    const payType = document.getElementById("profilePayType")?.value || "";
    
    let isComplete = !!packingModel && !!payType;
    
    if (payType === "Оклад + сделка") {
      const salary = document.getElementById("profileSalary")?.value || "";
      isComplete = isComplete && salary.trim() !== "";
    }
    
    return isComplete;
  }
}

function requireProfile() {
  if (!isProfileComplete()) {
    alert("⚠️ Сначала заполните профиль и нажмите «Сохранить»");
    switchTab("profile");
    return false;
  }
  return true;
}

// ⚡ ОПТИМИЗИРОВАННАЯ функция сохранения профиля (перенесена из index.html)
async function saveProfile() {
  const saveBtn = document.getElementById("saveProfileBtn");
  
  // ⚡ Защита от повторных нажатий
  if (saveBtn && saveBtn.disabled) {
    return;
  }
  
  // ⚡ Мгновенная блокировка UI
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "⏳ Сохранение...";
  }
  
  try {
    const shiftSelect = document.getElementById("shiftType");
    const statusSelect = document.getElementById("employeeStatus");
    const packingModelSelect = document.getElementById("profilePackingModel");
    const payTypeSelect = document.getElementById("profilePayType");
    const salaryInput = document.getElementById("profileSalary");

    const shiftValue = shiftSelect.value;
    const statusValue = statusSelect.value;
    const packingModel = packingModelSelect?.value || "";
    const payType = payTypeSelect?.value || "";
    
    // 📦 Определяем режим работы
    const workMode = typeof getSelectedWorkMode === 'function' ? getSelectedWorkMode() : 'manual';
    const isScanner = workMode === 'scanner';

    // ⚡ ВАЛИДАЦИЯ В ЗАВИСИМОСТИ ОТ РЕЖИМА
    const missingFields = [];
    
    // Общие обязательные поля для всех режимов
    if (!shiftValue) missingFields.push("Тип смены");
    if (!statusValue) missingFields.push("Статус сотрудника");
    
    if (isScanner) {
      // 📱 Режим СКАНЕР: нужно ПОДТВЕРЖДЁННОЕ закрепление на рабочем месте
      const hasAssignment = typeof hasConfirmedAssignment === 'function' && hasConfirmedAssignment();
      
      if (!hasAssignment) {
        // Проверяем есть ли хотя бы выбранное рабочее место
        const workplaceSelect = document.getElementById("scannerWorkplaceSelect");
        const workplaceId = workplaceSelect?.value || "";
        
        if (!workplaceId && (typeof selectedWorkplaceData === 'undefined' || !selectedWorkplaceData)) {
          missingFields.push("Рабочее место (отсканируйте QR или выберите из списка)");
        } else {
          // Рабочее место выбрано, но не подтверждено сервером
          missingFields.push("Подтверждение закрепления (дождитесь ответа сервера)");
        }
      }
    } else {
      // ✍️ Режим РУЧНОЙ ВВОД: нужны тип оплаты и модель упаковки
      if (!packingModel) missingFields.push("Модель упаковки");
      if (!payType) missingFields.push("Тип оплаты");
    }

    if (missingFields.length > 0) {
      const fieldsList = missingFields.join(", ");
      showTemporaryNotification(`❌ Заполните обязательные поля: ${fieldsList}`, "error");
      return;
    }

    // Сохраняем общие данные
    localStorage.setItem("profileShiftType", shiftValue);
    localStorage.setItem("profileStatus", statusValue);
    localStorage.setItem("profileWorkMode", workMode);
    
    // Сохраняем данные в зависимости от режима
    if (isScanner) {
      // 📱 Сохраняем рабочее место
      const workplaceSelect = document.getElementById("scannerWorkplaceSelect");
      const workplaceId = workplaceSelect?.value || 
                          (typeof selectedWorkplaceData !== 'undefined' && selectedWorkplaceData ? selectedWorkplaceData.workplace_id : "");
      
      localStorage.setItem("profileWorkplace", workplaceId);
      localStorage.removeItem("profilePackingModel");
      localStorage.removeItem("profilePayType");
    } else {
      // ✍️ Сохраняем данные ручного режима
      localStorage.setItem("profilePackingModel", packingModel);
      localStorage.setItem("profilePayType", payType);
      localStorage.removeItem("profileWorkplace");
    }

    // 🌙 Сохранение даты ночной смены
    const nightShiftDate = document.getElementById("nightShiftDate").value;
    if (shiftValue === "Ночь") {
      if (!nightShiftDate) {
        alert("❌ Для ночной смены необходимо указать дату смены!");
        return;
      }
      localStorage.setItem("profileNightShiftDate", nightShiftDate);
    } else {
      localStorage.removeItem("profileNightShiftDate");
    }

    // ⚡ ОПТИМИЗИРОВАННАЯ загрузка оклада (только для ручного режима)
    if (!isScanner && payType === "Оклад + сделка") {
      let salary = (salaryInput?.value || "").trim();
      try {
        const currentUser = localStorage.getItem("currentUser") || "";
        
        // ⚡ Пытаемся получить из кэша сначала
        const cachedSalary = getCachedSalary(currentUser, shiftValue);
        if (cachedSalary !== null) {
          salary = cachedSalary;
        } else {
          // Загружаем с сервера с fallback логикой
          salary = await fetchSalaryWithFallback(currentUser, shiftValue) || "";
        }
      } catch (err) {
        salary = "";
      }
      
      // Если сервер не вернул оклад, но пользователь ввёл его вручную — уважаем ручной ввод
      if ((!salary || salary.trim() === "") && salaryInput?.value?.trim()) {
        salary = salaryInput.value.trim();
      }

      if (salaryInput) salaryInput.value = salary;
      
      if (!salary || salary.trim() === "") {
        showTemporaryNotification("❌ Не удалось загрузить оклад с сервера!", "error");
        return;
      }
      
      // Кэшируем полученный оклад
      const currentUser = localStorage.getItem("currentUser") || "";
      cacheSalary(currentUser, shiftValue, salary);
      localStorage.setItem("profileSalary", salary);
      const salaryBlock = document.getElementById("salaryBlock");
      if (salaryBlock) salaryBlock.style.display = "block";
    } else if (!isScanner) {
      if (salaryInput) salaryInput.value = "";
      localStorage.removeItem("profileSalary");
      const salaryBlock = document.getElementById("salaryBlock");
      if (salaryBlock) salaryBlock.style.display = "none";
    }

    // Проверка заполненности профиля (только для обычных пользователей)
    if (currentUserRole === "user") {
      let isFilled = false;
      
      if (isScanner) {
        // 📱 Режим СКАНЕР: проверяем рабочее место
        const workplaceId = localStorage.getItem("profileWorkplace") || "";
        isFilled = shiftValue && statusValue && workplaceId;
      } else {
        // ✍️ Режим РУЧНОЙ ВВОД: проверяем все поля
        isFilled = shiftValue && statusValue && packingModel && payType;
        if (payType === "Оклад + сделка") {
          const currentSalary = salaryInput?.value || "";
          isFilled = isFilled && currentSalary.trim() !== "";
        }
      }
      const hint = document.getElementById("profileHint");
      const msg = document.getElementById("profileSaved");
      const tabApp = document.getElementById("tabApp");
      const tabMySalary = document.getElementById("tabMySalary");
      const tabRates = document.getElementById("tabRates");

      if (hint) hint.style.display = isFilled ? "none" : "block";
      
      // Показываем сообщение о сохранении только если профиль заполнен
      if (msg) {
        if (isFilled) {
          msg.style.display = "block";
          msg.textContent = "✅ Профиль сохранен! Доступ к вкладкам открыт.";
          // Автоскрытие уведомления через 3 секунды
          setTimeout(() => msg.style.display = "none", 3000);

          // Связи наставничества больше не сохраняются через профиль
          // Управление связями происходит через блок "Управление стажерами"
          
          // Скрываем предупреждение о несохраненных изменениях
          const unsavedMsg = document.getElementById("profileUnsaved");
          if (unsavedMsg) unsavedMsg.style.display = "none";
          
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "✅ Профиль сохранен";
            saveBtn.style.opacity = "0.6";
            saveBtn.style.cursor = "not-allowed";
            saveBtn.classList.remove("save-button-pulse");
          }
        } else {
          msg.style.display = "none";
          
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "💾 Сохранить";
            saveBtn.style.opacity = "1";
            saveBtn.style.cursor = "pointer";
          }
        }
      }
      
      // 📱 РЕЖИМ СКАНЕР: скрываем вкладки "Учет упаковки" и "Тариф и нормативы"
      if (isScanner) {
        if (tabApp) {
          tabApp.style.display = "none";  // Скрываем полностью
        }
        if (tabRates) {
          tabRates.style.display = "none";  // Скрываем полностью
        }
      } else {
        // ✍️ РЕЖИМ РУЧНОЙ ВВОД: показываем вкладки как обычно
        if (tabApp) {
          tabApp.style.display = "inline-block";
          tabApp.disabled = !isFilled;
          tabApp.innerHTML = isFilled ? "📋" : "🔒";
        }
        if (tabRates) {
          tabRates.style.display = "inline-block";
        }
      }

      // Скрываем вкладку "Моя зарплата", если сотрудник аутсорс
      if (tabMySalary) {
        tabMySalary.style.display = (statusValue === "Аутсорсинг") ? "none" : "inline-block";
      }
    }

    // ⚡ УСПЕШНОЕ завершение сохранения
    const successMsg = "✅ Профиль сохранен!";
    showTemporaryNotification(successMsg, "success");
    
    // Обновляем переменные для проверки профиля
    currentShift = shiftValue;
    currentStatus = statusValue;
    
    // НЕ восстанавливаем кнопку если профиль успешно заполнен
    return;
    
  } catch (error) {
    console.error("❌ Ошибка сохранения профиля:", error);
    showTemporaryNotification("❌ Ошибка сохранения профиля: " + error.message, "error");
    
    // Восстанавливаем кнопку только при ошибке
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Сохранить";
    }
  }
}

// === 👨‍🏫 ФУНКЦИИ НАСТАВНИЧЕСТВА И ПРОФИЛЯ (перенесены из index.html) ===

// Обработчик изменения статуса сотрудника
function handleStatusChange() {
  const status = document.getElementById("employeeStatus").value;
  const mentorBlock = document.getElementById("mentorBlock");
  const traineeBlock = document.getElementById("traineeBlock");
  
  // Скрываем все блоки
  mentorBlock.style.display = "none";
  traineeBlock.style.display = "none";
  
  if (status === "Штат") {
    mentorBlock.style.display = "block";
    loadCurrentTraineeInfo(); // Загружаем информацию о текущем стажере
  } else if (status === "Стажер") {
    traineeBlock.style.display = "block";
    loadCurrentMentorInfo(); // Загружаем информацию о текущем наставнике
  } else if (status === "Аутсорсинг") {
    // 🌙 Для аутсорсеров запускаем специальную настройку профиля
    // Только если это ручное изменение, а не автоматическое при входе
    if (currentStatus !== "Аутсорсинг") {
      setupOutsourcingProfile();
    }
  } else {
    // 🌙 Если выбран другой статус, очищаем настройки аутсорсера
    clearOutsourcingSettings();
  }
}

// Загрузка информации о текущем стажере для наставников (только для отображения)
async function loadCurrentTraineeInfo() {
  try {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    // Получаем данные пользователя
    const userData = await getUserDataFromServer(currentUser);
    
    const traineeDisplay = document.getElementById("profileTraineeDisplay");
    const traineeBonusDisplay = document.getElementById("profileTraineeBonusDisplay");
    
    if (!traineeDisplay || !traineeBonusDisplay) return;
    
    if (userData && userData.mentor) {
      // Если у наставника есть стажер, отображаем информацию
      traineeDisplay.textContent = userData.mentor;
      if (userData.bonusPercent) {
        traineeBonusDisplay.textContent = `(${userData.bonusPercent}% бонус)`;
      } else {
        traineeBonusDisplay.textContent = "";
      }
    } else {
      // Если стажера нет
      traineeDisplay.textContent = "Не назначен";
      traineeBonusDisplay.textContent = "";
    }
    
  } catch (error) {
    console.error("Ошибка загрузки информации о стажере:", error);
    const traineeDisplay = document.getElementById("profileTraineeDisplay");
    if (traineeDisplay) {
      traineeDisplay.textContent = "Ошибка загрузки";
    }
  }
}

// Загрузка информации о текущем наставнике для стажеров (только для отображения)
async function loadCurrentMentorInfo() {
  try {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    // Получаем данные пользователя
    const userData = await getUserDataFromServer(currentUser);
    
    const mentorDisplay = document.getElementById("profileMentorDisplay");
    
    if (!mentorDisplay) return;
    
    if (userData && userData.mentor) {
      // Если у стажера есть наставник, отображаем информацию
      mentorDisplay.textContent = userData.mentor;
    } else {
      // Если наставника нет
      mentorDisplay.textContent = "Не назначен";
    }
    
  } catch (error) {
    console.error("Ошибка загрузки информации о наставнике:", error);
    const mentorDisplay = document.getElementById("profileMentorDisplay");
    if (mentorDisplay) {
      mentorDisplay.textContent = "Ошибка загрузки";
    }
  }
}

// Кэш для данных пользователей
let userDataCache = null;
let userDataCacheTimestamp = 0;
const USER_DATA_CACHE_DURATION = 30 * 1000; // 30 секунд

// Автоматическое обновление данных профиля с сервера (оптимизированная версия)
async function updateProfileFromServer() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;
  
  try {
    // Получаем данные пользователя (с кэшированием)
    const userData = await getUserDataFromServer(currentUser);
    
    if (userData) {
      // Обновляем статус сотрудника
      const statusSelect = document.getElementById("employeeStatus");
      if (statusSelect && userData.status) {
        statusSelect.value = userData.status;
        
        // Вызываем обработчик изменения статуса для обновления блоков
        handleStatusChange();
        
        // 🌙 Проверяем является ли пользователь аутсорсером
        if (userData.status === "Аутсорсинг") {
          setupOutsourcingProfile();
        } else {
          clearOutsourcingSettings(); // Очищаем если больше не аутсорсер
        }
        
        // Быстрое обновление отображения связей без дополнительных запросов
        await updateProfileConnectionsDisplay(userData);
      }
      
      // ⚡ ПРЕДЗАГРУЗКА ОКЛАДОВ в фоне (не блокирует UI)
      if (userData.status !== "Аутсорсинг") {
        setTimeout(() => {
          preloadSalaries(currentUser);
        }, 500); // Небольшая задержка чтобы не блокировать основной интерфейс
      }
      
    } else {
      // Если пользователь не найден, очищаем все связи
      clearProfileConnections();
    }
  } catch (error) {
    console.error("Ошибка обновления профиля с сервера:", error);
  }
}

// Получение данных пользователя с кэшированием
async function getUserDataFromServer(currentUser) {
  // Проверяем кэш
  if (userDataCache && (Date.now() - userDataCacheTimestamp) < USER_DATA_CACHE_DURATION) {
    return userDataCache.find(emp => emp.name === currentUser);
  }
  
  // Загружаем свежие данные
  const response = await fetch(`${scriptURL}?type=employees`);
  const data = await response.json();
  
  if (data.employeesData) {
    // Обновляем кэш
    userDataCache = data.employeesData;
    userDataCacheTimestamp = Date.now();
    
    return data.employeesData.find(emp => emp.name === currentUser);
  }
  
  return null;
}

// Быстрое обновление отображения связей с новыми данными
async function updateProfileConnectionsDisplay(userData) {
  if (!userData) return;
  
  if (userData.status === "Штат") {
    updateTraineeDisplay(userData.mentor, userData.bonusPercent);
  } else if (userData.status === "Стажер") {
    updateMentorDisplay(userData.mentor);
  }
}

// Обновление отображения стажера
function updateTraineeDisplay(traineeName, bonusPercent) {
  const traineeDisplay = document.getElementById("profileTraineeDisplay");
  const traineeBonusDisplay = document.getElementById("profileTraineeBonusDisplay");
  
  if (!traineeDisplay || !traineeBonusDisplay) return;
  
  if (traineeName) {
    traineeDisplay.textContent = traineeName;
    if (bonusPercent) {
      traineeBonusDisplay.textContent = `(${bonusPercent}% бонус)`;
    } else {
      traineeBonusDisplay.textContent = "";
    }
  } else {
    traineeDisplay.textContent = "Не назначен";
    traineeBonusDisplay.textContent = "";
  }
}

// Обновление отображения наставника
function updateMentorDisplay(mentorName) {
  const mentorDisplay = document.getElementById("profileMentorDisplay");
  
  if (!mentorDisplay) return;
  
  if (mentorName) {
    mentorDisplay.textContent = mentorName;
  } else {
    mentorDisplay.textContent = "Не назначен";
  }
}

// Кэшированные списки наставников/стажеров
let traineesCache = null;
let mentorsCache = null;
let traineesCacheTimestamp = 0;
let mentorsCacheTimestamp = 0;
const LIST_CACHE_DURATION = 60 * 1000; // 1 минута

// 🌙 Функция загрузки сохраненного профиля
function loadSavedProfile() {
  const savedShift = localStorage.getItem("profileShiftType");
  const savedNightDate = localStorage.getItem("profileNightShiftDate");
  
  if (savedShift) {
    document.getElementById("shiftType").value = savedShift;
    
    if (savedShift === "Ночь") {
      document.getElementById("nightShiftDateBlock").style.display = "block";
      if (savedNightDate) {
        document.getElementById("nightShiftDate").value = savedNightDate;
      } else {
        // Если нет сохраненной даты, предлагаем вчерашний день
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        document.getElementById("nightShiftDate").value = yesterday.toISOString().split('T')[0];
      }
    }
  }
}

// Получение списка стажеров с кэшированием
async function getTraineesListCached() {
  if (traineesCache && (Date.now() - traineesCacheTimestamp) < LIST_CACHE_DURATION) {
    return traineesCache;
  }
  
  try {
    const response = await fetch(`${scriptURL}?type=getTrainees`);
    const data = await response.json();
    
    traineesCache = data.trainees || [];
    traineesCacheTimestamp = Date.now();
    
    return traineesCache;
  } catch (error) {
    console.error("Ошибка загрузки стажеров:", error);
    return [];
  }
}

// Получение списка наставников с кэшированием
async function getMentorsListCached() {
  if (mentorsCache && (Date.now() - mentorsCacheTimestamp) < LIST_CACHE_DURATION) {
    return mentorsCache;
  }
  
  try {
    const response = await fetch(`${scriptURL}?type=getMentors`);
    const data = await response.json();
    
    mentorsCache = data.mentors || [];
    mentorsCacheTimestamp = Date.now();
    
    return mentorsCache;
  } catch (error) {
    console.error("Ошибка загрузки наставников:", error);
    return [];
  }
}

// Очистка связей профиля
function clearProfileConnections() {
  // Очищаем отображение связей
  const traineeDisplay = document.getElementById("profileTraineeDisplay");
  const traineeBonusDisplay = document.getElementById("profileTraineeBonusDisplay");
  const mentorDisplay = document.getElementById("profileMentorDisplay");
  
  if (traineeDisplay) traineeDisplay.textContent = "Не назначен";
  if (traineeBonusDisplay) traineeBonusDisplay.textContent = "";
  if (mentorDisplay) mentorDisplay.textContent = "Не назначен";
}

