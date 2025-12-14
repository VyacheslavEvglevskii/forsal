// ===== МОДАЛЬНОЕ ПОДТВЕРЖДЕНИЕ ОТПРАВКИ ФОРМЫ УЧЁТА =====

// ✅ Глобальная переменная для хранения данных формы при подтверждении
let pendingFormSubmission = null;

// ✅ Функция показа модального окна подтверждения
function showConfirmModal(formData, form, submitBtn, result, isOutsourcing) {
  const modal = document.getElementById("confirmModal");
  const summary = document.getElementById("confirmSummary");
  
  // Формируем краткую сводку данных
  const quantity = formData.get("quantity");
  const orderNumber = formData.get("orderNumber");
  const operationType = formData.get("operationType");
  const volume = formData.get("volume");
  const setNumber = formData.get("setNumber");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  
  let summaryHTML = `
    <div><span class="label">Количество:</span> <span class="value">${quantity || '-'}</span></div>
    <div><span class="label">Номер заказа:</span> <span class="value">${orderNumber || '-'}</span></div>
    <div><span class="label">Операция:</span> <span class="value">${operationType || '-'}</span></div>
  `;
  
  if (operationType && operationType.includes("Набор")) {
    summaryHTML += `<div><span class="label">Артикул набора:</span> <span class="value">${setNumber || '-'}</span></div>`;
  } else {
    summaryHTML += `<div><span class="label">Объём:</span> <span class="value">${volume || '-'}</span></div>`;
  }
  
  summaryHTML += `
    <div><span class="label">Время:</span> <span class="value">${startTime || '-'} - ${endTime || '-'}</span></div>
  `;
  
  summary.innerHTML = summaryHTML;
  
  // Сохраняем данные для последующей отправки
  pendingFormSubmission = {
    formData: formData,
    form: form,
    submitBtn: submitBtn,
    result: result,
    isOutsourcing: isOutsourcing
  };
  
  // Показываем модальное окно
  modal.style.display = "block";
  
  // Добавляем обработчик закрытия по клику вне окна
  modal.onclick = function(event) {
    if (event.target === modal) {
      closeConfirmModal();
    }
  };
  
  // Добавляем обработчик для закрытия по клавише Escape
  const escapeHandler = function(event) {
    if (event.key === "Escape") {
      closeConfirmModal();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

// ✅ Функция закрытия модального окна
function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  modal.style.display = "none";
  
  // Разблокируем кнопку отправки, если отменили
  if (pendingFormSubmission) {
    const { submitBtn } = pendingFormSubmission;
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
    pendingFormSubmission = null;
  }
}

// ✅ Функция подтверждения отправки
async function confirmSubmit() {
  if (!pendingFormSubmission) return;
  
  const { formData, form, submitBtn, result, isOutsourcing } = pendingFormSubmission;
  
  // Закрываем модальное окно
  const modal = document.getElementById("confirmModal");
  modal.style.display = "none";
  
  // Очищаем сохраненные данные
  pendingFormSubmission = null;
  
  // Выполняем отправку
  submitBtn.textContent = "⏳ Подготовка...";
  await new Promise(resolve => setTimeout(resolve, 800)); // 800ms пауза
  
  try {
    if (isOutsourcing) {
      await handleOutsourcingSubmitOptimizedConfirmed(formData, form, submitBtn, result);
    } else {
      await handleRegularSubmitOptimizedConfirmed(formData, form, submitBtn, result);
    }
  } catch (error) {
    console.error("❌ Ошибка при отправке формы:", error);
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
    showTemporaryNotification("❌ Ошибка отправки: " + error.message, "error");
  }
}

// 🚀 Отправка для аутсорсеров (после подтверждения)
async function handleOutsourcingSubmitOptimizedConfirmed(formData, form, submitBtn, result) {
  submitBtn.textContent = "📤 Отправка...";
  result.style.display = "none";

  // Добавляем только необходимые данные
  formData.append("packingModel", document.getElementById("profilePackingModel").value);
  formData.append("shiftType", currentShift);
  formData.append("employeeStatus", currentStatus);
  formData.append("payType", "Сделка"); // Фиксированное для аутсорсеров
  
  // ⏰ АВТОМАТИЧЕСКОЕ ВРЕМЯ ОКОНЧАНИЯ (если включено в настройках)
  const autoEndTimeEnabled = getAdminSetting('auto_end_time_enabled', false);
  if (autoEndTimeEnabled) {
    const currentTime = new Date();
    const timeString = currentTime.toTimeString().slice(0, 5);
    formData.set("endTime", timeString);
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
    await handleSuccessResponseOptimized(form, submitBtn, result, "✅ Данные отправлены!");
  } else if (resultData.status === "duplicate") {
    showTemporaryNotification(resultData.message, "warning");
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  } else {
    result.textContent = resultData.message;
    result.style.display = "block";
    result.className = "error-message";
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  }
}

// 🚀 Отправка для штатных сотрудников (после подтверждения)
async function handleRegularSubmitOptimizedConfirmed(formData, form, submitBtn, result) {
  submitBtn.textContent = "📤 Отправка...";
  result.style.display = "none";

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
    const timeString = currentTime.toTimeString().slice(0, 5);
    formData.set("endTime", timeString);
  }

  // 🌙 Добавляем дату ночной смены если это ночная смена
  if (currentShift === "Ночь") {
    const nightShiftDate = localStorage.getItem("profileNightShiftDate");
    if (nightShiftDate) {
      formData.append("nightShiftDate", nightShiftDate);
    }
  }

  // ⚡ ОПТИМИЗАЦИЯ: отправляем FormData напрямую
  const response = await fetch(scriptURL, {
    method: "POST",
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const resultData = await response.json();
  
  if (resultData.status === "success") {
    await handleSuccessResponseOptimized(form, submitBtn, result, "✅ Данные сохранены!");
  } else if (resultData.status === "duplicate") {
    showTemporaryNotification(resultData.message, "warning");
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  } else {
    result.textContent = resultData.message;
    result.style.display = "block";
    result.className = "error-message";
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Сохранить";
  }
}


