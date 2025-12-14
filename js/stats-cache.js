// ⚡ КЭШ СТАТИСТИКИ - для мгновенной загрузки повторных запросов
const statsCache = new Map();
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 минут - статистика может изменяться

// Глобовый флаг состояния загрузки статистики
let isStatsLoading = false;

// ⚡ ФУНКЦИИ УПРАВЛЕНИЯ КЭШЕМ СТАТИСТИКИ

/**
 * Создание ключа кэша для статистики
 */
function createStatsCacheKey(user, date) {
  return `${user}|${date}`;
}

/**
 * Получение статистики из кэша
 */
function getStatsFromCache(user, date) {
  const cacheKey = createStatsCacheKey(user, date);
  
  // Проверяем оперативный кэш
  const cached = statsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_DURATION) {
    console.log(`⚡ Статистика из оперативного кэша: ${cacheKey}`);
    return cached.data;
  }
  
  // Проверяем localStorage
  try {
    const localCached = localStorage.getItem(`stats_${cacheKey}`);
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (Date.now() - parsed.timestamp < STATS_CACHE_DURATION) {
        console.log(`⚡ Статистика из localStorage: ${cacheKey}`);
        
        // Восстанавливаем в оперативный кэш для быстрого доступа
        statsCache.set(cacheKey, {
          data: parsed.data,
          timestamp: parsed.timestamp
        });
        
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn("Ошибка чтения кэша статистики из localStorage:", e);
  }
  
  return null;
}

/**
 * Сохранение статистики в кэш
 */
function saveStatsToCache(user, date, data) {
  const cacheKey = createStatsCacheKey(user, date);
  const cacheEntry = {
    data: data,
    timestamp: Date.now()
  };
  
  // Сохраняем в оперативный кэш
  statsCache.set(cacheKey, cacheEntry);
  
  // Сохраняем в localStorage для персистентности
  try {
    localStorage.setItem(`stats_${cacheKey}`, JSON.stringify(cacheEntry));
    console.log(`✅ Статистика сохранена в кэш: ${cacheKey}`);
  } catch (e) {
    console.warn("Ошибка сохранения кэша статистики в localStorage:", e);
  }
}

/**
 * Инвалидация кэша статистики для конкретного пользователя и даты
 */
function invalidateStatsCache(user, date) {
  const cacheKey = createStatsCacheKey(user, date);
  
  // Удаляем из оперативного кэша
  statsCache.delete(cacheKey);
  
  // Удаляем из localStorage
  try {
    localStorage.removeItem(`stats_${cacheKey}`);
    console.log(`🗑️ Кэш статистики инвалидирован: ${cacheKey}`);
  } catch (e) {
    console.warn("Ошибка удаления кэша статистики из localStorage:", e);
  }
}

/**
 * Очистка всего кэша статистики из localStorage (оптимизированная)
 */
async function clearStatsFromLocalStorage() {
  try {
    const startTime = Date.now();
    const keys = Object.keys(localStorage);
    const statsKeys = keys.filter(key => key.startsWith('stats_'));
    
    console.log(`🗑️ Начинаем очистку ${statsKeys.length} записей кэша из localStorage...`);
    
    // Пакетная очистка для лучшей производительности
    let removedCount = 0;
    for (const key of statsKeys) {
      try {
        localStorage.removeItem(key);
        removedCount++;
      } catch (e) {
        console.warn(`⚠️ Не удалось удалить ключ ${key}:`, e);
      }
      
      // Даем браузеру "подышать" каждые 50 операций
      if (removedCount % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Очищено ${removedCount} записей кэша за ${duration}мс`);
    
  } catch (e) {
    console.warn("Ошибка очистки кэша статистики из localStorage:", e);
  }
}


/**
 * ⚡ Отображение кэшированной статистики
 */
function displayCachedStats(cachedData) {
  const container = document.getElementById("statsCards");
  const totalElem = document.getElementById("totalWage");
  const logElem = document.getElementById("statsLogs");
  const showBtn = document.getElementById("showStatsBtn");
  const closeBtn = document.getElementById("closeStatsBtn");
  
  // Быстро отображаем кэшированные данные
  if (cachedData.generatedHTML) {
    container.innerHTML = cachedData.generatedHTML.cardsHTML;
    totalElem.textContent = cachedData.generatedHTML.totalText + " ⚡ (из кэша)";
    
    // ⚡ ДИНАМИЧЕСКИ ОБНОВЛЯЕМ КНОПКИ согласно текущим настройкам
    updateButtonsInCachedStats(container);
    
    // 🔄 ДОПОЛНИТЕЛЬНОЕ обновление кнопок с небольшой задержкой для надежности
    setTimeout(() => {
      console.log("🔄 Дополнительное обновление кнопок в кэшированной статистике");
      updateButtonsInCachedStats(container);
    }, 100);
    
    // Показываем уведомление о быстрой загрузке
    showNotification("⚡ Данные загружены мгновенно из кэша!", "success");
  } else {
    // Fallback: если нет готового HTML, загружаем заново с сервера
    console.log("⚠️ Нет готового HTML в кэше, загружаем заново с сервера");
    container.innerHTML = `
      <div style="text-align: center; color: #f59e0b; padding: 20px;">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <div>Кэш неполный, загружаем с сервера...</div>
      </div>
    `;
    totalElem.textContent = "⚠️ Загрузка с сервера...";
    
    // Принудительно загружаем с сервера
    setTimeout(() => {
      // Очищаем кэш для этой записи и загружаем заново
      const date = document.getElementById("statsDate").value;
      if (date && currentUser) {
        invalidateStatsCache(currentUser, date);
        loadStats();
      }
    }, 100);
  }
  
  // Отображаем логи если есть
  if (cachedData.logs && cachedData.logs.length) {
    logElem.innerHTML = `
      <h4>🔍 Логи обработки (из кэша):</h4>
      <pre style="font-size:13px; background:#f3f4f6; padding:10px; border-radius:8px; overflow-x:auto;">${cachedData.logs.join('\n')}</pre>
    `;
  }
  
  // Обновляем состояние кнопок
  if (showBtn) {
    showBtn.disabled = false;
    showBtn.textContent = "📊 Показать статистику";
    showBtn.style.opacity = "1";
  }
  
  if (closeBtn) {
    closeBtn.disabled = false;
    closeBtn.style.display = "inline-block";
    closeBtn.style.opacity = "1";
    closeBtn.style.cursor = "pointer";
  }
}

/**
 * ⚡ Динамическое обновление кнопок в кэшированной статистике
 */
function updateButtonsInCachedStats(container) {
  const allowEditing = getAdminSetting('allow_record_editing', true);
  const allowDeletion = getAdminSetting('allow_record_deletion', true);
  
  console.log(`🔄 НАЧАЛО обновления кнопок в кэше: редактирование=${allowEditing}, удаление=${allowDeletion}`);
  console.log(`🔄 Текущие настройки администратора:`, currentAdminSettings);
  console.log(`🔄 Контейнер для обновления:`, container);
  
  // Находим все кнопки редактирования и удаления
  const editButtons = container.querySelectorAll('button[onclick*="openEditModal"]');
  const deleteButtons = container.querySelectorAll('button[onclick*="deleteRecord"]');
  
  console.log(`🔍 Найдено кнопок: редактирование=${editButtons.length}, удаление=${deleteButtons.length}`);
  
  // Управляем видимостью кнопок редактирования
  editButtons.forEach((button, index) => {
    const oldDisplay = button.style.display;
    if (allowEditing) {
      button.style.display = 'inline-block';
    } else {
      button.style.display = 'none';
    }
    console.log(`✏️ Кнопка редактирования ${index + 1}: ${oldDisplay} → ${button.style.display}`);
  });
  
  // Управляем видимостью кнопок удаления
  deleteButtons.forEach((button, index) => {
    const oldDisplay = button.style.display;
    if (allowDeletion) {
      button.style.display = 'inline-block';
    } else {
      button.style.display = 'none';
    }
    console.log(`🗑️ Кнопка удаления ${index + 1}: ${oldDisplay} → ${button.style.display}`);
  });
  
  // Если обе кнопки скрыты, скрываем весь контейнер кнопок
  const buttonContainers = container.querySelectorAll('div[style*="margin-top:10px"]');
  buttonContainers.forEach((buttonContainer, index) => {
    const visibleButtons = buttonContainer.querySelectorAll('button[style*="display: inline-block"], button:not([style*="display: none"])');
    const oldDisplay = buttonContainer.style.display;
    if (visibleButtons.length === 0) {
      buttonContainer.style.display = 'none';
    } else {
      buttonContainer.style.display = 'block';
    }
    console.log(`📦 Контейнер кнопок ${index + 1}: видимых кнопок=${visibleButtons.length}, ${oldDisplay} → ${buttonContainer.style.display}`);
  });
  
  console.log(`✅ Обновление кнопок завершено: редактирование=${editButtons.length}, удаление=${deleteButtons.length}`);
}

/**
 * ⚡ Регенерация статистики из кэшированных данных с учетом текущих настроек
 */
function regenerateStatsFromCache(cachedData, container, totalElem) {
  try {
    // Используем данные из кэша для регенерации HTML с текущими настройками
    const dayRecords = cachedData.dayRecords || [];
    const nightRecords = cachedData.nightRecords || [];
    const isOutsourcing = currentStatus === "Аутсорсинг";
    
    // Функция создания карточек смены с учетом текущих настроек
    // ⏱️ Константа для расчёта загрузки (10 часов = 600 минут)
    const SHIFT_NORM_MINUTES_CACHE = 600;
    
    const createShiftCardsFromCache = (records, shiftName, shiftIcon) => {
      if (!records.length) return "";
      
      let shiftWage = 0;
      let shiftEfficiency = 0;
      let shiftEfficiencyCount = 0;
      let shiftRepackaged = 0;
      let shiftStickered = 0;
      let shiftWorkMinutes = 0; // ⏱️ Общее время работы
      
      let shiftCardsHTML = `
        <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; border: 2px solid #64748b;">
          <h3 style="margin: 0 0 15px 0; text-align: center; color: #334155;">${shiftIcon} ${shiftName}</h3>
      `;
      
      records.forEach(rec => {
        const wage = rec.wage || 0;
        shiftWage += wage;
        const quantity = rec.quantity || 0;
        
        // ⏱️ Суммируем время работы
        shiftWorkMinutes += rec.durationMin || 0;
        
        if (rec.operationType === "Маркировка продукции ш/к") {
          shiftStickered += quantity;
        } else {
          shiftRepackaged += quantity;
        }

        const efficiency = rec.efficiency !== null && rec.efficiency !== undefined ? rec.efficiency : 0;
        shiftEfficiency += efficiency;
        shiftEfficiencyCount++;

        const recordIndex = (rec.rowIndex ?? rec.index ?? rec.row ?? rec.row_number ?? rec.rowNum);
        // Используем дату записи для проверки возможности редактирования
        const recordDate = rec.date || rec.timestamp || new Date();
        const canEdit = recordIndex !== undefined && isWithinEditPeriodGlobal(recordDate);
        
        // Проверяем ТЕКУЩИЕ настройки администратора
        const allowEditing = getAdminSetting('allow_record_editing', true);
        const allowDeletion = getAdminSetting('allow_record_deletion', true);
        
        let buttonsHTML = "";
        if (canEdit) {
          const editButton = allowEditing 
            ? `<button onclick="openEditModal(${recordIndex}, ${JSON.stringify(rec).replace(/"/g, '&quot;')})">✏️ Редактировать</button>`
            : "";
          const deleteButton = allowDeletion 
            ? `<button onclick="deleteRecord(${recordIndex})" class="danger" style="margin-left:10px;">🗑 Удалить</button>`
            : "";
          
          if (editButton || deleteButton) {
            buttonsHTML = `<div style="margin-top:10px;">${editButton}${deleteButton}</div>`;
          }
        }

        shiftCardsHTML += `
          <div class="stat-card" ${recordIndex !== undefined ? `data-record-index="${recordIndex}"` : ""}>
            <p><strong>🕒 Время:</strong> ${rec.startTime} – ${rec.endTime}</p>
            <p><strong>🔧 Операция:</strong> ${rec.operationType}</p>
            <p><strong>📦 Объём:</strong> ${rec.volume || "-"}</p>
            <p><strong>🧩 Набор:</strong> ${rec.setNumber || "-"}</p>
            ${rec.mentor ? `<p><strong>👨‍🏫 Наставник/Стажер:</strong> ${rec.mentor}</p>` : ""}
            <p><strong>🔢 Кол-во:</strong> ${rec.quantity}</p>
            <p><strong>⚙️ Эффективность:</strong> ${rec.efficiency ?? "-"}%</p>
            ${!isOutsourcing ? `<p><strong>⏱ Норма в час:</strong> ${rec.normPerHour ?? "-"}</p>` : ""}
            ${!isOutsourcing ? `<p><strong>💰 Тариф за шт:</strong> ${rec.ratePerUnit?.toFixed(2) ?? "-" } ₽</p>` : ""}
            ${!isOutsourcing && rec.bonusPercent ? `<p><strong>🎁 Бонус:</strong> ${rec.bonusIcon || "🎁"} ${rec.bonusPercent}</p>` : ""}
            ${!isOutsourcing ? `<p><strong>💸 Заработано:</strong> ${wage.toFixed(2)} ₽</p>` : ""}
            ${buttonsHTML}
          </div>
        `;
      });
      
      // Итоги по смене
      const avgEfficiency = shiftEfficiencyCount ? Math.round(shiftEfficiency / shiftEfficiencyCount) : "-";
      
      // ⏱️ Расчёт загрузки смены
      const workload = Math.round((shiftWorkMinutes / SHIFT_NORM_MINUTES_CACHE) * 100);
      const workloadIcon = workload >= 90 ? "🟢" : workload >= 80 ? "🟡" : "🔴";
      const workloadHours = Math.floor(shiftWorkMinutes / 60);
      const workloadMins = Math.round(shiftWorkMinutes % 60);
      
      if (isOutsourcing) {
        shiftCardsHTML += `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 8px; text-align: center; font-weight: bold;">
            📦 Переупак.: ${shiftRepackaged} шт | 
            🏷️ Маркир.: ${shiftStickered} шт | 
            ⚙️ Эффект.: ${avgEfficiency}% |
            ⏱️ Загрузка: ${workload}% ${workloadIcon}
          </div>
        </div>`;
      } else {
        shiftCardsHTML += `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 8px; text-align: center; font-weight: bold;">
            💵 Итого: ${shiftWage.toFixed(2)} ₽ | 
            📦 ${shiftRepackaged} шт | 
            🏷️ ${shiftStickered} шт | 
            ⚙️ ${avgEfficiency}% |
            ⏱️ ${workload}% ${workloadIcon} (${workloadHours}ч ${workloadMins}м)
          </div>
        </div>`;
      }
      
      return shiftCardsHTML;
    };
    
    // Регенерируем HTML с текущими настройками
    let regeneratedHTML = "";
    
    if (dayRecords.length > 0) {
      regeneratedHTML += createShiftCardsFromCache(dayRecords, "Дневная смена", "☀️");
    }
    
    if (nightRecords.length > 0) {
      regeneratedHTML += createShiftCardsFromCache(nightRecords, "Ночная смена", "🌙");
    }
    
    // Добавляем информацию о бонусе наставника если есть
    const mentorBonus = cachedData.totals ? cachedData.totals.totalMentorBonus || 0 : 0;
    const mentorBonusDetails = cachedData.mentorBonusDetails || { trainees: [], isTrainee: false, mentor: null };
    
    let mentorBonusInfoHTML = "";
    if (!isOutsourcing && mentorBonus > 0) {
      if (mentorBonusDetails.isTrainee && mentorBonusDetails.mentor) {
        mentorBonusInfoHTML = `
          <div class="stat-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; margin-bottom: 16px;">
            <p><strong>👨‍🏫 Ваш наставник:</strong> ${mentorBonusDetails.mentor}</p>
            <p><strong>🎁 Бонус наставника:</strong> ${mentorBonus.toFixed(2)} ₽</p>
            <p style="font-size: 13px; color: #0369a1; margin-top: 8px;">💡 Этот бонус получает ваш наставник за вашу работу</p>
          </div>
        `;
      } else if (mentorBonusDetails.trainees && mentorBonusDetails.trainees.length > 0) {
        const traineesText = mentorBonusDetails.trainees.join(', ');
        mentorBonusInfoHTML = `
          <div class="stat-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; margin-bottom: 16px;">
            <p><strong>👨‍🏫 Ваши стажеры:</strong> ${traineesText}</p>
            <p><strong>🎁 Бонус наставника:</strong> ${mentorBonus.toFixed(2)} ₽</p>
            <p style="font-size: 13px; color: #0369a1; margin-top: 8px;">💡 Вы получаете этот бонус за работу со стажерами</p>
          </div>
        `;
      }
    }
    
    container.innerHTML = mentorBonusInfoHTML + regeneratedHTML;
    totalElem.textContent = cachedData.generatedHTML?.totalText + " ⚡ (восстановлено из кэша)" || "✅ Данные восстановлены из кэша";
    
    console.log("✅ HTML регенерирован из кэша с учетом текущих настроек");
  } catch (error) {
    console.error("❌ Ошибка регенерации из кэша:", error);
    container.innerHTML = "❌ Ошибка восстановления данных из кэша";
    totalElem.textContent = "❌ Ошибка";
  }
}

/**
 * 🔮 Предиктивное кэширование соседних дат
 */
async function preloadAdjacentDates(user, dateStr) {
  try {
    console.log(`🔮 Предзагрузка соседних дат для ${user}, базовая дата: ${dateStr}`);
    
    const baseDate = new Date(dateStr);
    
    // Вчерашний день
    const yesterday = new Date(baseDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Завтрашний день
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Проверяем, нет ли уже в кэше
    const yesterdayCached = getStatsFromCache(user, yesterdayStr);
    const tomorrowCached = getStatsFromCache(user, tomorrowStr);
    
    const preloadPromises = [];
    
    if (!yesterdayCached) {
      console.log(`🔮 Предзагружаем вчера: ${yesterdayStr}`);
      preloadPromises.push(preloadStatsForDate(user, yesterdayStr));
    }
    
    if (!tomorrowCached) {
      console.log(`🔮 Предзагружаем завтра: ${tomorrowStr}`);
      preloadPromises.push(preloadStatsForDate(user, tomorrowStr));
    }
    
    if (preloadPromises.length > 0) {
      await Promise.all(preloadPromises);
      console.log(`✅ Предзагрузка завершена для ${preloadPromises.length} дат`);
    } else {
      console.log(`✅ Соседние даты уже в кэше`);
    }
    
  } catch (error) {
    console.warn("⚠️ Ошибка предиктивного кэширования:", error);
  }
}

/**
 * 🔮 Предзагрузка статистики для конкретной даты
 */
async function preloadStatsForDate(user, dateStr) {
  try {
    const requestUrl = `${scriptURL}?type=stats&date=${encodeURIComponent(dateStr)}&employee=${encodeURIComponent(user)}`;
    const res = await fetch(requestUrl);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (data.records && data.records.length > 0) {
      // Сохраняем в кэш (без генерации HTML для экономии ресурсов)
      saveStatsToCache(user, dateStr, {
        records: data.records,
        dayRecords: data.dayRecords,
        nightRecords: data.nightRecords,
        staffRecords: data.staffRecords,
        traineeRecords: data.traineeRecords,
        totals: data.totals,
        dayTotals: data.dayTotals,
        nightTotals: data.nightTotals,
        staffTotals: data.staffTotals,
        traineeTotals: data.traineeTotals,
        mentorBonusDetails: data.mentorBonusDetails,
        logs: data.logs
      });
      
      console.log(`✅ Предзагружена статистика для ${dateStr}: ${data.records.length} записей`);
    }
    
  } catch (error) {
    console.warn(`⚠️ Не удалось предзагрузить статистику для ${dateStr}:`, error.message);
  }
}

// ===== Удаление записи из статистики (перенесено из index.html) =====

async function deleteRecord(index) {
  // Проверяем настройки администратора
  const allowDeletion = getAdminSetting('allow_record_deletion', true);
  
  if (!allowDeletion) {
    showNotification("❌ Удаление записей отключено администратором", "error");
    return;
  }
  
  if (!confirm("Удалить эту запись?")) return;

  // Локально удаляем запись из интерфейса для мгновенного отклика
  const recordElement = document.querySelector(`[data-record-index="${index}"]`);
  if (recordElement) {
    recordElement.style.opacity = "0.5";
    recordElement.style.pointerEvents = "none";
  }

  // === БЛОКИРУЕМ КНОПКИ СТАТИСТИКИ ВО ВРЕМЯ УДАЛЕНИЯ ===
  const showStatsBtn = document.getElementById("showStatsBtn");
  const closeStatsBtn = document.getElementById("closeStatsBtn");
  
  // Сохраняем исходное состояние кнопок
  const originalShowState = {
    disabled: showStatsBtn?.disabled || false,
    text: showStatsBtn?.textContent || "",
    opacity: showStatsBtn?.style.opacity || "1"
  };
  
  const originalCloseState = {
    disabled: closeStatsBtn?.disabled || false,
    opacity: closeStatsBtn?.style.opacity || "1",
    cursor: closeStatsBtn?.style.cursor || "pointer"
  };

  // Блокируем кнопки
  if (showStatsBtn) {
    showStatsBtn.disabled = true;
    showStatsBtn.textContent = "⏳ Обновление...";
    showStatsBtn.style.opacity = "0.6";
  }
  
  if (closeStatsBtn) {
    closeStatsBtn.disabled = true;
    closeStatsBtn.style.opacity = "0.6";
    closeStatsBtn.style.cursor = "not-allowed";
  }

  try {
    const res = await fetch(`${scriptURL}?type=deleteRecord&index=${index}`);
    const data = await res.json();

    if (data.status === "success") {
      showTemporaryNotification("✅ Запись удалена", "success", 2000); // Быстрее скрывается
      
      // ⚡ ИНВАЛИДИРУЕМ КЭШ СТАТИСТИКИ для текущего пользователя и даты
      const today = new Date().toISOString().split('T')[0];
      invalidateStatsCache(currentUser, today);
      console.log(`🗑️ Кэш статистики инвалидирован после удаления записи`);
      
      // === МГНОВЕННОЕ УДАЛЕНИЕ ИЗ ИНТЕРФЕЙСА ===
      if (recordElement) {
        recordElement.remove(); // Удаляем элемент сразу
        
        // Проверяем, остались ли еще записи в статистике
        const statsCards = document.getElementById("statsCards");
        const remainingCards = statsCards?.querySelectorAll('.stat-card');
        if (statsCards && (!remainingCards || remainingCards.length === 0)) {
          // Если записей не осталось, очищаем итог и показываем сообщение
          const totalElem = document.getElementById("totalWage");
          if (totalElem) totalElem.textContent = "";
          statsCards.innerHTML = '<p style="text-align:center;">Нет данных за выбранную дату</p>';
        }
      }
      
      // Отмечаем что нужно обновить интерфейс после разблокировки
      window.needsInterfaceUpdate = true;
      
    } else {
      // В случае ошибки возвращаем запись в исходное состояние
      if (recordElement) {
        recordElement.style.opacity = "1";
        recordElement.style.pointerEvents = "auto";
      }
      const message = data.message || "Не удалось удалить запись";
      showTemporaryNotification(`❌ ${message}`, "error");
    }
  } catch (error) {
    console.error("❌ Ошибка при удалении записи:", error);
    showTemporaryNotification("❌ Ошибка при удалении записи. Попробуйте позже.", "error");
    
    // Возвращаем запись в исходное состояние
    if (recordElement) {
      recordElement.style.opacity = "1";
      recordElement.style.pointerEvents = "auto";
    }
  } finally {
    // Восстанавливаем кнопки в исходное состояние
    if (showStatsBtn) {
      showStatsBtn.disabled = originalShowState.disabled;
      showStatsBtn.textContent = originalShowState.text || "📊 Показать статистику";
      showStatsBtn.style.opacity = originalShowState.opacity;
    }
    
    if (closeStatsBtn) {
      closeStatsBtn.disabled = originalCloseState.disabled;
      closeStatsBtn.style.opacity = originalCloseState.opacity;
      closeStatsBtn.style.cursor = originalCloseState.cursor;
    }
  }
}

// ===== UI ФУНКЦИИ ДЛЯ СТАТИСТИКИ (перенесены из index.html) =====

function closeStats() {
  const cards = document.getElementById("statsCards");
  const total = document.getElementById("totalWage");
  const logs = document.getElementById("statsLogs");
  if (cards) cards.innerHTML = "";
  if (total) total.textContent = "";
  if (logs) logs.innerHTML = "";

  const closeBtn = document.getElementById("closeStatsBtn");
  if (closeBtn) closeBtn.style.display = "none";
}

// ⚡ ОПТИМИЗИРОВАННАЯ функция загрузки статистики
async function loadStats() {
  if (isStatsLoading) return;
  isStatsLoading = true;
  
  // ⚡ Настройки всегда доступны мгновенно (встроены в код)
  // Дополнительная синхронизация в фоне если нужно
  if (Object.keys(currentAdminSettings).length === 0) {
    console.log("⚠️ Критическая ошибка: настройки потеряны, восстанавливаем");
    currentAdminSettings = {
      "allow_record_editing": false,   // ✅ ИСПРАВЛЕНО: true → false
      "allow_record_deletion": false,  // ✅ ИСПРАВЛЕНО: true → false
      "auto_end_time_enabled": false,
      "force_deal_paytype": false
    };
  }

  const selectedOperation = document.getElementById("operationFilter").value;
  const date = document.getElementById("statsDate").value;

  // ⚡ ПРОВЕРЯЕМ КЭШ ПЕРЕД ЗАГРУЗКОЙ
  if (!selectedOperation && date && currentUser) { // Кэшируем только полную статистику без фильтров
    const cachedStats = getStatsFromCache(currentUser, date);
    if (cachedStats) {
      console.log("⚡ Используем кэшированную статистику - мгновенная загрузка!");
      displayCachedStats(cachedStats);
      isStatsLoading = false;
      return;
    }
  }

  const showBtn = document.getElementById("showStatsBtn");
  const closeBtn = document.getElementById("closeStatsBtn");
  
  // ⚡ Быстрая блокировка UI
  if (showBtn) {
    showBtn.disabled = true;
    showBtn.textContent = "⚡ Загрузка...";
    showBtn.style.opacity = "0.6";
  }
  
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.6";
    closeBtn.style.cursor = "not-allowed";
  }

  // ⚡ Мгновенная очистка старого контента
  const container = document.getElementById("statsCards");
  const totalElem = document.getElementById("totalWage");
  const logElem = document.getElementById("statsLogs");
  
  if (container) container.innerHTML = "⏳ Загрузка данных...";
  if (totalElem) totalElem.textContent = "";
  if (logElem) logElem.innerHTML = "";

  try {
    const selectedOperation2 = document.getElementById("operationFilter").value;
    const date2 = document.getElementById("statsDate").value;

    // ⚡ Быстрая валидация
    if (!currentUser) {
      console.error("❌ Пользователь не авторизован:", currentUser);
      showTemporaryNotification("❗Ошибка: пользователь не авторизован", "error");
      return;
    }

    if (!date2) {
      console.warn("⚠️ Дата не выбрана");
      showTemporaryNotification("❗Выберите дату для статистики", "warning");
      return;
    }
    

    // ⚡ Оптимизированный запрос к серверу с обработкой ошибок
    const requestUrl = `${scriptURL}?type=stats&date=${encodeURIComponent(date2)}&employee=${encodeURIComponent(currentUser)}`;
    
    const res = await fetch(requestUrl);
    
    if (!res.ok) {
      console.error("❌ HTTP ошибка:", res.status, res.statusText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const responseText = await res.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Ошибка парсинга JSON:", parseError);
      console.error("❌ Текст ответа:", responseText);
      throw new Error(`Ошибка парсинга ответа сервера: ${parseError.message}`);
    }
    
    
    // 🛡️ Проверка на ошибки сервера
    if (data.error) {
      console.error("❌ Ошибка сервера:", data.error);
      throw new Error(data.error);
    }

    // ⚡ Быстрая проверка данных
    if (!data.records || !data.records.length) {
      if (container) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">📭 Нет данных за выбранную дату</div>';
      }
      return;
    }

    // 🌙 РАЗДЕЛЕНИЕ ПО СМЕНАМ
    const dayRecords = (data.dayRecords || []).filter(r => 
      selectedOperation2 ? r.operationType === selectedOperation2 : true
    );
    const nightRecords = (data.nightRecords || []).filter(r => 
      selectedOperation2 ? r.operationType === selectedOperation2 : true
    );

    // 👥 РАЗДЕЛЕНИЕ ПО СТАТУСУ СОТРУДНИКОВ
    const staffRecords = (data.staffRecords || []).filter(r => 
      selectedOperation2 ? r.operationType === selectedOperation2 : true
    );
    const traineeRecords = (data.traineeRecords || []).filter(r => 
      selectedOperation2 ? r.operationType === selectedOperation2 : true
    );

    // Проверяем есть ли записи после фильтрации
    if (!dayRecords.length && !nightRecords.length && !staffRecords.length && !traineeRecords.length) {
      if (container) {
        container.innerHTML = selectedOperation2 
          ? '<p style="text-align:center;">Нет данных для выбранной операции</p>'
          : '<p style="text-align:center;">Нет данных за выбранную дату</p>';
      }
      if (totalElem) totalElem.textContent = "";
      return;
    }

    // 🌙 СОЗДАНИЕ РАЗДЕЛЬНЫХ БЛОКОВ ПО СМЕНАМ
    const isOutsourcing = currentStatus === "Аутсорсинг";
    let cardsHTML = "";

    // ⏱️ Константа для расчёта загрузки (10 часов = 600 минут)
    const SHIFT_NORM_MINUTES = 600;
    
    function createShiftCards(records, shiftName, shiftIcon) {
      if (!records.length) return "";
      
      let shiftWage = 0;
      let shiftEfficiency = 0;
      let shiftEfficiencyCount = 0;
      let shiftRepackaged = 0;
      let shiftStickered = 0;
      let shiftWorkMinutes = 0; // ⏱️ Общее время работы
      
      let shiftCardsHTML = `
        <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; border: 2px solid #64748b;">
          <h3 style="margin: 0 0 15px 0; text-align: center; color: #334155;">${shiftIcon} ${shiftName}</h3>
      `;
      
      records.forEach(rec => {
        const wage = rec.wage || 0;
        shiftWage += wage;
        const quantity = rec.quantity || 0;
        
        // ⏱️ Суммируем время работы
        shiftWorkMinutes += rec.durationMin || 0;
        
        // Разделяем по типам операций
        if (rec.operationType === "Маркировка продукции ш/к") {
          shiftStickered += quantity;
        } else {
          shiftRepackaged += quantity;
        }

        // Считаем эффективность
        const efficiency = rec.efficiency !== null && rec.efficiency !== undefined ? rec.efficiency : 0;
        shiftEfficiency += efficiency;
        shiftEfficiencyCount++;

        // Определяем индекс строки записи, учитывая возможные имена поля из сервера
        const recordIndex = (rec.rowIndex ?? rec.index ?? rec.row ?? rec.row_number ?? rec.rowNum);
        // Проверяем, можно ли редактировать (за последние 2 суток)
        const canEdit = recordIndex !== undefined && isWithinEditPeriodGlobal(date2);
        
        // Проверяем настройки администратора
        const allowEditing = getAdminSetting('allow_record_editing', true);
        const allowDeletion = getAdminSetting('allow_record_deletion', true);
        
        let buttonsHTML = "";
        if (canEdit) {
          const editButton = allowEditing 
            ? `<button onclick="openEditModal(${recordIndex}, ${JSON.stringify(rec).replace(/"/g, '&quot;')})">✏️ Редактировать</button>`
            : "";
          const deleteButton = allowDeletion 
            ? `<button onclick="deleteRecord(${recordIndex})" class="danger" style="margin-left:10px;">🗑 Удалить</button>`
            : "";
          
          if (editButton || deleteButton) {
            buttonsHTML = `<div style="margin-top:10px;">${editButton}${deleteButton}</div>`;
          }
        }

        shiftCardsHTML += `
          <div class="stat-card" ${recordIndex !== undefined ? `data-record-index="${recordIndex}"` : ""}>
            <p><strong>🕒 Время:</strong> ${rec.startTime} – ${rec.endTime}</p>
            <p><strong>🔧 Операция:</strong> ${rec.operationType}</p>
            <p><strong>📦 Объём:</strong> ${rec.volume || "-"}</p>
            <p><strong>🧩 Набор:</strong> ${rec.setNumber || "-"}</p>
            ${rec.mentor ? `<p><strong>👨‍🏫 Наставник/Стажер:</strong> ${rec.mentor}</p>` : ""}
            <p><strong>🔢 Кол-во:</strong> ${rec.quantity}</p>
            <p><strong>⚙️ Эффективность:</strong> ${rec.efficiency ?? "-"}%</p>
            ${!isOutsourcing ? `<p><strong>⏱ Норма в час:</strong> ${rec.normPerHour ?? "-"}</p>` : ""}
            ${!isOutsourcing ? `<p><strong>💰 Тариф за шт:</strong> ${rec.ratePerUnit?.toFixed(2) ?? "-"} ₽</p>` : ""}
            ${!isOutsourcing && rec.bonusPercent ? `<p><strong>🎁 Бонус:</strong> ${rec.bonusIcon || "🎁"} ${rec.bonusPercent}</p>` : ""}
            ${!isOutsourcing ? `<p><strong>💸 Заработано:</strong> ${wage.toFixed(2)} ₽</p>` : ""}
            ${buttonsHTML}
          </div>
        `;
      });
      
      // Итоги по смене
      const avgEfficiency = shiftEfficiencyCount ? Math.round(shiftEfficiency / shiftEfficiencyCount) : "-";
      
      // ⏱️ Расчёт загрузки смены
      const workload = Math.round((shiftWorkMinutes / SHIFT_NORM_MINUTES) * 100);
      const workloadIcon = workload >= 90 ? "🟢" : workload >= 80 ? "🟡" : "🔴";
      const workloadHours = Math.floor(shiftWorkMinutes / 60);
      const workloadMins = Math.round(shiftWorkMinutes % 60);
      
      if (isOutsourcing) {
        // Для аутсорсинга - без информации о заработке
        shiftCardsHTML += `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 8px; text-align: center; font-weight: bold;">
            📦 Переупак.: ${shiftRepackaged} шт | 
            🏷️ Маркир.: ${shiftStickered} шт | 
            ⚙️ Эффект.: ${avgEfficiency}% |
            ⏱️ Загрузка: ${workload}% ${workloadIcon}
          </div>
        </div>`;
      } else {
        // Для штатных - с информацией о заработке
        shiftCardsHTML += `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 8px; text-align: center; font-weight: bold;">
            💵 Итого: ${shiftWage.toFixed(2)} ₽ | 
            📦 ${shiftRepackaged} шт | 
            🏷️ ${shiftStickered} шт | 
            ⚙️ ${avgEfficiency}% |
            ⏱️ ${workload}% ${workloadIcon} (${workloadHours}ч ${workloadMins}м)
          </div>
        </div>`;
      }
      
      return shiftCardsHTML;
    }

    const cardFragments = [];
    
    if (dayRecords.length > 0) {
      cardFragments.push(createShiftCards(dayRecords, "Дневная смена", "☀️"));
    }
    
    if (nightRecords.length > 0) {
      cardFragments.push(createShiftCards(nightRecords, "Ночная смена", "🌙"));
    }
    
    cardsHTML = cardFragments.join('');

    // Получаем бонус наставника и детали из данных сервера
    const mentorBonus = data.totals ? data.totals.totalMentorBonus || 0 : 0;
    const mentorBonusDetails = data.mentorBonusDetails || { trainees: [], isTrainee: false, mentor: null };
    
    // Добавляем информационную карточку о бонусе наставника если применимо (только для штатных)
    let mentorBonusInfoHTML = "";
    
    if (!isOutsourcing && mentorBonus > 0) {
      if (mentorBonusDetails.isTrainee && mentorBonusDetails.mentor) {
        mentorBonusInfoHTML = `
          <div class="stat-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; margin-bottom: 16px;">
            <p><strong>👨‍🏫 Ваш наставник:</strong> ${mentorBonusDetails.mentor}</p>
            <p><strong>🎁 Бонус наставника:</strong> ${mentorBonus.toFixed(2)} ₽</p>
            <p style="font-size: 13px; color: #0369a1; margin-top: 8px;">💡 Этот бонус получает ваш наставник за вашу работу</p>
          </div>
        `;
      } else if (mentorBonusDetails.trainees && mentorBonusDetails.trainees.length > 0) {
        const traineesText = mentorBonusDetails.trainees.join(', ');
        mentorBonusInfoHTML = `
          <div class="stat-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; margin-bottom: 16px;">
            <p><strong>👨‍🏫 Ваши стажеры:</strong> ${traineesText}</p>
            <p><strong>🎁 Бонус наставника:</strong> ${mentorBonus.toFixed(2)} ₽</p>
            <p style="font-size: 13px; color: #0369a1; margin-top: 8px;">💡 Вы получаете этот бонус за работу со стажерами</p>
          </div>
        `;
      }
    }

    if (container) {
      container.innerHTML = mentorBonusInfoHTML + cardsHTML;
    }

    // Считаем общий итог
    if (totalElem && data.totals) {
      totalElem.textContent = data.totals.totalText || "";
    }

    // Сохраняем в кэш (вместе с сгенерированным HTML)
    if (date2 && currentUser) {
      saveStatsToCache(currentUser, date2, {
        ...data,
        generatedHTML: {
          cardsHTML: mentorBonusInfoHTML + cardsHTML,
          totalText: data.totals?.totalText || ""
        }
      });
    }

  } catch (error) {
    console.error("❌ Ошибка загрузки статистики:", error);
    if (container) {
      container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 8px 0;">Ошибка загрузки</h3>
        <p style="margin: 0;">Не удалось загрузить статистику</p>
      </div>
    `;
    }
  } finally {
    // ⚡ Сбрасываем флаги и блокировки
    isStatsLoading = false;
    
    const showBtn2 = document.getElementById("showStatsBtn");
    const closeBtn2 = document.getElementById("closeStatsBtn");
    
    if (showBtn2) {
      showBtn2.disabled = false;
      showBtn2.textContent = "📊 Показать статистику";
      showBtn2.style.opacity = "1";
    }
    
    if (closeBtn2) {
      closeBtn2.disabled = false;
      closeBtn2.style.display = "inline-block";
      closeBtn2.style.opacity = "1";
      closeBtn2.style.cursor = "pointer";
    }
  }
}

// Делаем ключевые функции глобальными, т.к. их вызывает index.html
window.closeStats = closeStats;
window.loadStats = loadStats;
window.isWithinEditPeriodGlobal = isWithinEditPeriodGlobal;
window.validateWorkDuration = validateWorkDuration;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СТАТИСТИКИ (перенесены из index.html) ===

// Проверка, можно ли редактировать запись (последние 2 суток)
function isWithinEditPeriodGlobal(date) {
  try {
    const recordDate = new Date(date);
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  } catch (error) {
    console.warn("Ошибка в isWithinEditPeriodGlobal:", error);
    return false;
  }
}

// Валидация разумности времени работы
function validateWorkDuration(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return { valid: true };
  
  try {
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Учитываем переход через полночь
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Добавляем сутки
    }
    
    const durationMinutes = endMinutes - startMinutes;
    const durationHours = durationMinutes / 60;
    
    // Проверки разумности
    if (durationMinutes < 1) {
      return { 
        valid: false, 
        message: "⚠️ Слишком короткое время работы (менее 1 минуты)" 
      };
    }
    
    if (durationHours > 8) {
      return { 
        valid: false, 
        message: `⚠️ Слишком долгое время работы (${durationHours.toFixed(1)} часов). Были перерывы?`,
        requireConfirmation: true
      };
    }
    
    if (durationHours > 4) {
      return { 
        valid: true, 
        warning: `⚠️ Длительная работа (${durationHours.toFixed(1)} часов)`,
        requireConfirmation: true
      };
    }
    
    return { valid: true, duration: durationHours };
    
  } catch (error) {
    return { valid: false, message: "❌ Ошибка в формате времени" };
  }
}


