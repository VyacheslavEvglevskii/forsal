// === ОСНОВНАЯ ФОРМА УЧЁТА СМЕНЫ ===

// Расчёт тарифа и эффективности
async function updateRateDisplay() {
  // 🌙 Проверяем статус пользователя - для аутсорсеров не показываем тарифы
  const employeeStatus = document.getElementById("employeeStatus")?.value;
  if (employeeStatus === "Аутсорсинг") {
    // Скрываем блоки для аутсорсеров
    const block = document.getElementById("rateInfo");
    const calcBlock = document.getElementById("calcBlock");
    if (block) block.style.display = "none";
    if (calcBlock) calcBlock.style.display = "none";
    return; // Выходим из функции
  }

  const operationType = document.querySelector('[name="operationType"]').value;
  const volume = document.querySelector('[name="volume"]').value;
  const setNumber = document.querySelector('[name="setNumber"]').value;
  const quantity = Number(document.querySelector('[name="quantity"]').value) || 0;

  const startTime = document.querySelector('[name="startTime"]').value;
  const endTime = document.querySelector('[name="endTime"]').value;

  const key = (operationType.includes("Сборка")) ? setNumber : volume;

  // Найти нужный тариф
  const matched = allRates.find(r => r.operation === operationType && r.key === key);

  const block = document.getElementById("rateInfo");
  const norm = document.getElementById("normDisplay");
  const rate = document.getElementById("rateDisplay");

  const calcBlock = document.getElementById("calcBlock");
  const wageDisplay = document.getElementById("wageDisplay");
  const efficiencyDisplay = document.getElementById("efficiencyDisplay");

  if (matched) {
    norm.textContent = matched.normPerHour;

    // --- Выбор тарифа с учётом типа оплаты и FBS ---
    const packingModel = (document.getElementById("profilePackingModel")?.value || "").toLowerCase();
    // 🎯 Тип оплаты из настроек администратора (не из localStorage!)
    const employeeStatus = document.getElementById("employeeStatus")?.value || "";
    const payType = typeof getPayTypeFromAdminSettings === 'function' 
      ? getPayTypeFromAdminSettings(employeeStatus) 
      : "Сделка";
    let ratePerUnit = 0;

    if (payType === "Оклад + сделка") {
      // Оклад+сделка: отдельные тарифы
      if (packingModel.includes("fbs") && matched.rateFBSDeal !== undefined) {
        ratePerUnit = Number(matched.rateFBSDeal);
      } else if (matched.rateDeal !== undefined) {
        ratePerUnit = Number(matched.rateDeal);
      }
    } else {
      // Обычная сделка
      if (packingModel.includes("fbs") && matched.rateFBS !== undefined) {
        ratePerUnit = Number(matched.rateFBS);
      } else if (matched.ratePerUnit !== undefined) {
        ratePerUnit = Number(matched.ratePerUnit);
      }
    }

    rate.textContent = ratePerUnit ? ratePerUnit.toFixed(2) + " ₽" : "-";

    const totalPay = quantity * ratePerUnit;

    let durationMin = 0;
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      durationMin = (eh * 60 + em) - (sh * 60 + sm);
      if (durationMin < 0) durationMin += 1440;
    }

    let efficiency = "-";
    if (durationMin > 0 && matched.normPerHour > 0) {
      const expected = (matched.normPerHour / 60) * durationMin;
      efficiency = ((quantity / expected) * 100).toFixed(0) + " %";
    }

    wageDisplay.textContent = totalPay.toFixed(2) + " ₽";
    efficiencyDisplay.textContent = efficiency;

    // Бонус наставника теперь фиксированный (1750₽ за смену) и рассчитывается автоматически

    block.style.display = "block";
    calcBlock.style.display = "block";
  } else {
    norm.textContent = "-";
    rate.textContent = "-";
    block.style.display = "none";
    calcBlock.style.display = "none";
  }
}

// Слушатели для пересчёта тарифа
document.querySelector('[name="operationType"]').addEventListener("change", () => updateRateDisplay());
document.querySelector('[name="volume"]').addEventListener("change", () => updateRateDisplay());
document.querySelector('[name="setNumber"]').addEventListener("change", () => updateRateDisplay());
document.querySelector('[name="quantity"]').addEventListener("input", () => updateRateDisplay());
document.querySelector('[name="startTime"]').addEventListener("change", () => updateRateDisplay());
document.querySelector('[name="endTime"]').addEventListener("change", () => updateRateDisplay());

// Обработка отправки формы с защитой от дублей и модальным подтверждением
document.getElementById("dataForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const form = e.target;
  const result = document.getElementById("result");
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // 🛡️ УСИЛЕННАЯ ЗАЩИТА ОТ ДУБЛИКАТОВ
  if (submitBtn.disabled) {
    return;
  }

  // 🛡️ Проверяем не было ли недавней отправки (защита от случайных двойных кликов)
  const lastSubmitTime = window.lastFormSubmitTime || 0;
  const timeSinceLastSubmit = Date.now() - lastSubmitTime;
  
  if (timeSinceLastSubmit < 2000) { // 2 секунды защита
    showTemporaryNotification("⚠️ Подождите немного перед повторной отправкой", "warning");
    return;
  }

  // 🛡️ Сразу блокируем кнопку и запоминаем время
  submitBtn.disabled = true;
  window.lastFormSubmitTime = Date.now();
  
  // 🚀 Определяем тип отправки
  const isOutsourcing = currentStatus === "Аутсорсинг";
  
  // ✅ Подготавливаем FormData для показа в модальном окне
  const formData = new FormData(form);
  
  // ✅ ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ
  showConfirmModal(formData, form, submitBtn, result, isOutsourcing);
});

// 🚀 НОВАЯ: Оптимизированная отправка для аутсорсеров
async function handleOutsourcingSubmitOptimized(form, submitBtn, result) {
  submitBtn.textContent = "📤 Отправка...";
  result.style.display = "none";

  // Быстрое формирование данных
  const formData = new FormData(form);
  
  // Добавляем только необходимые данные
  formData.append("packingModel", document.getElementById("profilePackingModel").value);
  formData.append("shiftType", currentShift);
  formData.append("employeeStatus", currentStatus);
  formData.append("payType", "Сделка"); // Фиксированное для аутсорсеров
  
  // ⏰ АВТОМАТИЧЕСКОЕ ВРЕМЯ ОКОНЧАНИЯ (если включено в настройках)
  const autoEndTimeEnabled = getAdminSetting('auto_end_time_enabled', false);
  if (autoEndTimeEnabled) {
    const currentTime = new Date();
    const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM формат
    formData.set("endTime", timeString);
    console.log(`⏰ Автоматически установлено время окончания: ${timeString}`);
    
    // Валидируем разумность времени работы
    const startTime = formData.get("startTime");
    const validation = validateWorkDuration(startTime, timeString);
    
    if (!validation.valid) {
      if (validation.requireConfirmation) {
        if (!confirm(validation.message + "\n\nПродолжить отправку?")) {
          throw new Error("Отправка отменена пользователем");
        }
      } else {
        throw new Error(validation.message);
      }
    } else if (validation.warning && validation.requireConfirmation) {
      if (!confirm(validation.warning + "\n\nПродолжить отправку?")) {
        throw new Error("Отправка отменена пользователем");
      }
    }
    
    // Показываем пользователю что время было автоматически установлено
    const durationText = validation.duration ? ` (${validation.duration.toFixed(1)} ч)` : "";
    showNotification(`⏰ Время окончания установлено автоматически: ${timeString}${durationText}`, "info");
  }

  // 🌙 Дата ночной смены если нужно
  if (currentShift === "Ночь") {
    const nightShiftDate = localStorage.getItem("profileNightShiftDate");
    if (nightShiftDate) {
      formData.append("nightShiftDate", nightShiftDate);
    }
  }

  // Быстрая отправка
  const response = await fetch(scriptURL, {
    method: "POST",
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const resultData = await response.json();
  
  if (resultData.status === "success") {
    // ⚡ БЫСТРАЯ обработка успеха
    await handleSuccessResponseOptimized(form, submitBtn, result, "✅ Данные отправлены!");
  } else {
    // Показываем ошибку
    result.textContent = resultData.message;
    result.style.display = "block";
    result.className = "error-message";
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  }
}

// 🚀 НОВАЯ: Оптимизированная отправка для штатных
async function handleRegularSubmitOptimized(form, submitBtn, result) {
  submitBtn.textContent = "📤 Отправка...";
  result.style.display = "none";

  // Быстрое формирование данных
  const formData = new FormData(form);

  // Добавляем модель упаковки из профиля
  const packingModel = document.getElementById("profilePackingModel").value;
  formData.append("packingModel", packingModel);

  // Быстрый пересчёт продолжительности
  const start = formData.get("startTime");
  const end = formData.get("endTime");
  if (start && end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 1440;
    // Дробь дня для Google Sheets (375 мин / 1440 → покажет "6:15:00")
    const duration = minutes / 1440;
    formData.set("duration", duration);
  }

  // Добавляем данные профиля
  formData.append("shiftType", currentShift);
  formData.append("employeeStatus", currentStatus);
  
  // 🎯 ТИП ОПЛАТЫ: всегда из настроек администратора (не из localStorage!)
  const payType = getPayTypeFromAdminSettings(currentStatus);
  formData.append("payType", payType);
  formData.append("salary", localStorage.getItem("profileSalary") || "");
  
  // ⏰ АВТОМАТИЧЕСКОЕ ВРЕМЯ ОКОНЧАНИЯ (если включено в настройках)
  const autoEndTimeEnabled = getAdminSetting('auto_end_time_enabled', false);
  if (autoEndTimeEnabled) {
    const currentTime = new Date();
    const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM формат
    formData.set("endTime", timeString);
    console.log(`⏰ Автоматически установлено время окончания: ${timeString}`);
    
    // Валидируем разумность времени работы
    const startTime = formData.get("startTime");
    const validation = validateWorkDuration(startTime, timeString);
    
    if (!validation.valid) {
      if (validation.requireConfirmation) {
        if (!confirm(validation.message + "\n\nПродолжить отправку?")) {
          throw new Error("Отправка отменена пользователем");
        }
      } else {
        throw new Error(validation.message);
      }
    } else if (validation.warning && validation.requireConfirmation) {
      if (!confirm(validation.warning + "\n\nПродолжить отправку?")) {
        throw new Error("Отправка отменена пользователем");
      }
    }
    
    // Показываем пользователю что время было автоматически установлено
    const durationText = validation.duration ? ` (${validation.duration.toFixed(1)} ч)` : "";
    showNotification(`⏰ Время окончания установлено автоматически: ${timeString}${durationText}`, "info");
  }

  // 🌙 Добавляем дату ночной смены если это ночная смена
  if (currentShift === "Ночь") {
    const nightShiftDate = localStorage.getItem("profileNightShiftDate");
    if (nightShiftDate) {
      formData.append("nightShiftDate", nightShiftDate);
    }
  }

  // ⚡ ОПТИМИЗАЦИЯ: отправляем FormData напрямую (без URLSearchParams)
  const response = await fetch(scriptURL, {
    method: "POST",
    body: formData // Используем FormData напрямую - быстрее чем URLSearchParams
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const resultData = await response.json();
  
  if (resultData.status === "success") {
    // ⚡ БЫСТРАЯ обработка успеха
    await handleSuccessResponseOptimized(form, submitBtn, result, "✅ Данные сохранены!");
  } else {
    // Показываем ошибку
    result.textContent = resultData.message;
    result.style.display = "block";
    result.className = "error-message";
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  }
}

// ⚡ НОВАЯ: Быстрая обработка успешного ответа
async function handleSuccessResponseOptimized(form, submitBtn, result, message) {
  // 1. ⚡ МГНОВЕННАЯ разблокировка UI
  submitBtn.disabled = false;
  submitBtn.textContent = "💾 Сохранить";
  
  // 2. ⚡ БЫСТРОЕ уведомление пользователя
  showTemporaryNotification(message, "success");
  
  // 3. ⚡ ИНВАЛИДИРУЕМ КЭШ СТАТИСТИКИ для текущего пользователя и даты
  const today = new Date().toISOString().split('T')[0];
  invalidateStatsCache(currentUser, today);
  console.log(`🗑️ Кэш статистики инвалидирован после добавления записи`);
  
  // 4. ⚡ БЫСТРЫЙ сброс формы (сохраняем важные поля)
  quickFormReset(form);
  
  // 5. ⚡ АСИНХРОННОЕ обновление данных (НЕ блокирует UI)
  setTimeout(() => {
    refreshDataInBackground();
  }, 100);
  
}

// ⚡ Быстрый сброс формы с сохранением важных полей
function quickFormReset(form) {
  // Сохраняем важные поля
  const employeeName = form.querySelector('[name="employeeName"]').value;
  
  // Быстрый сброс
  form.reset();
  
  // Восстанавливаем важные поля
  form.querySelector('[name="employeeName"]').value = employeeName;
  
  // Очищаем расчетные блоки
  const rateInfo = document.getElementById("rateInfo");
  const calcBlock = document.getElementById("calcBlock");
  if (rateInfo) rateInfo.style.display = "none";
  if (calcBlock) calcBlock.style.display = "none";
  
}

// ⚡ Асинхронное обновление данных в фоне
function refreshDataInBackground() {
  try {
    // Обновляем записи за сегодня (не ждем завершения)
    loadTodayRecords();
    
    // Очищаем предупреждения и черновики
    hideAllWarnings();
    clearDraft();
    
  } catch (error) {
    console.warn("⚠️ Ошибка фонового обновления:", error);
    // Не показываем пользователю - это не критично
  }
}

