// ===== ФУНКЦИИ УПРАВЛЕНИЯ ИНТЕРФЕЙСОМ =====

/**
 * Полное обновление интерфейса после успешной отправки
 */
async function performFullInterfaceRefresh() {
  try {
    // 1. Сброс формы к начальному состоянию (без блокировки)
    resetFormToInitialState();
    
    // 2. Минимальное обновление данных (только записи за сегодня)
    loadTodayRecords(); // Запускаем асинхронно, не ждем
    
    // 3. Очистка всех предупреждений и черновиков
    hideAllWarnings();
    clearDraft();
    
    // 4. Разблокировка кнопки отправки
    enableSubmitButton();
    
    // 5. Показываем уведомление об успешном обновлении
    showTemporaryNotification("✅ Данные успешно отправлены!", "success");
    
  } catch (error) {
    console.error("❌ Ошибка при обновлении интерфейса:", error);
    enableSubmitButton();
    showTemporaryNotification("⚠️ Данные отправлены, но возникла ошибка при обновлении интерфейса", "warning");
  }
}

/**
 * Сброс формы к начальному состоянию
 */
function resetFormToInitialState() {
  const form = document.getElementById("dataForm");
  
  // Очищаем форму
  form.reset();
  
  // Восстанавливаем основные поля
  document.querySelector('[name="employeeName"]').value = currentUser;
  
  // Сбрасываем операцию и связанные поля
  handleOperationChange("");
  
  // Обновляем расчет тарифов
  updateRateDisplay();
  
  // Очищаем сообщения о результатах
  const result = document.getElementById("result");
  if (result) {
    result.style.display = "none";
    result.className = "";
    result.textContent = "";
  }
}

/**
 * Включение кнопки отправки
 */
function enableSubmitButton() {
  const form = document.getElementById("dataForm");
  const submitBtn = document.querySelector('#dataForm button[type="submit"]');
  
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
    submitBtn.style.opacity = "1";
    submitBtn.style.cursor = "pointer";
    submitBtn.classList.remove("loading");
  }
  
  if (form) {
    form.classList.remove("form-disabled");
  }
}

/**
 * Скрытие всех предупреждений
 */
function hideAllWarnings() {
  const warningsContainer = document.getElementById("duplicateWarnings");
  if (warningsContainer) {
    warningsContainer.style.display = "none";
    warningsContainer.innerHTML = "";
  }
  
  // Сброс данных о предупреждениях
  duplicateWarnings = { exact: [], similar: [], suspicious: [] };
}

/**
 * Очистка черновика
 */
function clearDraft() {
  localStorage.removeItem("formDraft");
}

// ===== ДИАГНОСТИЧЕСКИЕ ФУНКЦИИ =====

/**
 * 🔧 Диагностика состояния вкладки дубликатов
 * Вызывается из консоли: diagnoseDuplicatesTab()
 */
function diagnoseDuplicatesTab() {
  const tab = document.getElementById("tabDuplicates");
  
  console.log("🔧 ДИАГНОСТИКА ВКЛАДКИ ДУБЛИКАТОВ:");
  console.log("📊 Роль пользователя:", currentUserRole);
  console.log("👤 Текущий пользователь:", currentUser);
  
  if (!tab) {
    console.log("❌ Элемент tabDuplicates не найден в DOM!");
    return;
  }
  
  console.log("🎯 Состояние кнопки tabDuplicates:");
  console.log("  • style.display:", tab.style.display);
  console.log("  • style.visibility:", tab.style.visibility);
  console.log("  • disabled:", tab.disabled);
  console.log("  • CSS классы:", tab.className);
  console.log("  • offsetWidth:", tab.offsetWidth);
  console.log("  • offsetHeight:", tab.offsetHeight);
  
  // Проверяем CSS правила
  const computedStyle = window.getComputedStyle(tab);
  console.log("  • computed display:", computedStyle.display);
  console.log("  • computed visibility:", computedStyle.visibility);
  
  // Принудительное восстановление для админов
  if (currentUserRole === "admin") {
    console.log("🔧 Принудительное восстановление для администратора...");
    tab.classList.remove("admin-hidden");
    tab.classList.add("admin-visible");
    tab.style.display = "";
    tab.style.visibility = "";
    tab.disabled = false;
    console.log("✅ Восстановление выполнено!");
  }
}

/**
 * Обновление базовых данных (для быстрого обновления интерфейса)
 */
async function updateBasicData() {
  if (typeof loadTodayRecords === 'function') {
    try {
      // Обновляем список записей за сегодня
      await loadTodayRecords();
    } catch (error) {
      console.error("❌ Ошибка обновления базовых данных:", error);
    }
  }
}

/**
 * СУПЕР-БЫСТРОЕ обновление после операций редактирования/удаления
 * Минимальные сетевые запросы, только самое необходимое
 */
async function fastUpdateAfterChange() {
  try {
    // === 1. БЫСТРОЕ ОБНОВЛЕНИЕ ЗАПИСЕЙ ЗА СЕГОДНЯ (неблокирующее) ===
    loadTodayRecords().catch(error => {
      console.warn("⚠️ Фоновое обновление записей не удалось:", error);
    });
    
    // === 2. ОТЛОЖЕННОЕ ОБНОВЛЕНИЕ СТАТИСТИКИ (если открыта) ===
    const statsContainer = document.getElementById("statsContainer");
    
    if (statsContainer && statsContainer.style.display !== "none") {
      // Ждем, чтобы кнопки разблокировались, затем обновляем статистику
      setTimeout(() => {
        // Проверяем что статистика всё ещё открыта и не загружается
        if (statsContainer.style.display !== "none" && !isStatsLoading) {
          loadStats().catch(error => {
            console.warn("⚠️ Отложенное обновление статистики не удалось:", error);
          });
        }
      }, 800); // Увеличиваем задержку для надежности
    }
  } catch (error) {
    console.error("❌ Ошибка быстрого обновления:", error);
    // Не показываем уведомление пользователю - работаем в фоне
  }
}


// === ЗАГРУЗКА ЗАПИСЕЙ ЗА СЕГОДНЯ (перенесено из index.html) ===
async function loadTodayRecords() {
  try {
    // === ОПТИМИЗАЦИЯ: быстрый запрос с минимальными данными ===
    const res = await fetch(`${scriptURL}?type=records`, {
      method: 'GET',
      cache: 'no-cache' // Исключаем кэширование для актуальности данных
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    todayRecords = data.records || [];
    
  } catch (error) {
    console.error("❌ Ошибка загрузки записей за сегодня:", error);
    todayRecords = [];
    
    // Показываем уведомление только при критической ошибке
    if (error.name !== 'AbortError') {
      showTemporaryNotification("⚠️ Не удалось обновить записи", "warning", 2000);
    }
  }
}


