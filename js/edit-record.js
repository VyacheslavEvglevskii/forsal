// ===== МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ЗАПИСИ =====

function openEditModal(index, record) {
  // Проверяем настройки администратора
  const allowEditing = getAdminSetting('allow_record_editing', true);
  
  if (!allowEditing) {
    showNotification("❌ Редактирование записей отключено администратором", "error");
    return;
  }
  
  const form = document.getElementById("editForm");

  form.rowIndex.value = index;
  form.employeeName.value = currentUser;
  form.orderNumber.value = record.orderNumber || "";
  
  // 🌙 ИСПРАВЛЕНИЕ: Используем тип смены из записи, а не из профиля
  document.getElementById("editShiftType").value = record.shiftType || currentShift;
  form.employeeStatus.value = currentStatus;

  form.quantity.value = record.quantity;
  form.startTime.value = record.startTime;
  form.endTime.value = record.endTime;

  document.getElementById("editOperation").value = record.operationType || "";
  document.getElementById("editVolumeSelect").value = record.volume || "";
  document.getElementById("editSetNumberSelect").value = record.setNumber || "";

  // 🌙 Обработка даты ночной смены для редактирования
  const nightShiftDateInput = document.getElementById("editNightShiftDate");
  
  // Заполняем дату ночной смены если она есть в записи
  if (nightShiftDateInput && record.shiftDate) {
    nightShiftDateInput.value = record.shiftDate;
  }
  
  // Инициализируем отображение блока ночной смены
  toggleEditNightShiftBlock();

  // триггерим отображение поля объёма/набора
  document.getElementById("editOperation").dispatchEvent(new Event("change"));

  document.getElementById("editModal").style.display = "block";
}

async function loadEditFormDictionaries() {
  try {
    // Используем кэшированные функции для быстрой загрузки
    const [operations, volumes, sets] = await Promise.all([
      loadOperationsFast(),
      loadVolumesFast(),
      loadSetsFast()
    ]);

    // Операции
    const opSelect = document.getElementById("editOperation");
    opSelect.innerHTML = '<option value="">-- Выбери операцию --</option>';
    operations.forEach(op => {
      const opt = document.createElement("option");
      opt.value = op;
      opt.textContent = op;
      opSelect.appendChild(opt);
    });

    // Объёмы
    const volSelect = document.getElementById("editVolumeSelect");
    volSelect.innerHTML = '<option value="">-- Выбери объём --</option>';
    volumes.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      volSelect.appendChild(opt);
    });

    // Артикулы наборов
    const setSelect = document.getElementById("editSetNumberSelect");
    setSelect.innerHTML = '<option value="">-- Выбери артикул --</option>';
    sets.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      setSelect.appendChild(opt);
    });

    // Переключение объёма/набора
    opSelect.addEventListener("change", () => {
      const isSet = opSelect.value.includes("Сборка");
      document.getElementById("editVolumeLabel").style.display = isSet ? "none" : "block";
      volSelect.required = !isSet;
      document.getElementById("editSetNumberField").style.display = isSet ? "block" : "none";
    });
    
  } catch (error) {
    console.error("Ошибка загрузки словарей для редактирования:", error);
  }
}

async function submitEditForm() {
  const form = document.getElementById("editForm");
  const submitBtn = form.querySelector('button[type="button"], .submit-btn');
  
  // Предотвращаем повторную отправку
  if (submitBtn && submitBtn.disabled) {
    return;
  }
  
  const formData = new FormData(form);
  const params = new URLSearchParams();

  formData.forEach((value, key) => {
    params.append(key, value);
  });

  // Устанавливаем флаг редактирования
  params.set("type", "editRecord");

  // 👇 Пересчёт длительности (важно!)
  const start = formData.get("startTime");
  const end = formData.get("endTime");
  if (start && end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 1440;
    // Дробь дня для Google Sheets (375 мин / 1440 → покажет "6:15:00")
    const duration = minutes / 1440;
    params.set("duration", duration);
  }

  // Блокируем кнопку и показываем состояние загрузки
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Сохранение...";
    submitBtn.style.opacity = "0.6";
  }

  // === БЛОКИРУЕМ КНОПКИ СТАТИСТИКИ ВО ВРЕМЯ РЕДАКТИРОВАНИЯ ===
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

  // Блокируем кнопки статистики
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
    const res = await fetch(scriptURL, {
      method: "POST",
      body: params,
    });

    const data = await res.json();
    
    if (data.status === "success") {
      showTemporaryNotification("✅ Запись обновлена!", "success", 2000); // Быстрее скрывается
      closeEditModal();
      
      // ⚡ ИНВАЛИДИРУЕМ КЭШ СТАТИСТИКИ для текущего пользователя и даты
      const today = new Date().toISOString().split('T')[0];
      invalidateStatsCache(currentUser, today);
      console.log(`🗑️ Кэш статистики инвалидирован после редактирования записи`);
      
      // Отмечаем что нужно обновить интерфейс после разблокировки
      window.needsInterfaceUpdate = true;
      
    } else {
      showTemporaryNotification(data.message || "❌ Ошибка обновления", "error");
    }
    
  } catch (err) {
    console.error("❌ Ошибка редактирования:", err);
    showTemporaryNotification("❌ Ошибка соединения: " + err.message, "error");
  } finally {
    // Разблокируем кнопку редактирования
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Сохранить";
      submitBtn.style.opacity = "1";
    }
    
    // === РАЗБЛОКИРУЕМ КНОПКИ СТАТИСТИКИ С НЕБОЛЬШОЙ ЗАДЕРЖКОЙ ===
    setTimeout(() => {
      if (showStatsBtn) {
        showStatsBtn.disabled = originalShowState.disabled;
        showStatsBtn.textContent = originalShowState.text;
        showStatsBtn.style.opacity = originalShowState.opacity;
      }
      
      if (closeStatsBtn) {
        closeStatsBtn.disabled = originalCloseState.disabled;
        closeStatsBtn.style.opacity = originalCloseState.opacity;
        closeStatsBtn.style.cursor = originalCloseState.cursor;
      }
      
      // === ЗАПУСКАЕМ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ПОСЛЕ РАЗБЛОКИРОВКИ ===
      if (window.needsInterfaceUpdate) {
        window.needsInterfaceUpdate = false;
        fastUpdateAfterChange();
      }
    }, 500); // Даем время фоновым операциям
  }
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

// 🌙 Функция для показа/скрытия блока даты ночной смены в редактировании
function toggleEditNightShiftBlock() {
  const shiftType = document.getElementById("editShiftType").value;
  const nightShiftBlock = document.getElementById("editNightShiftDateBlock");
  const nightShiftInput = document.getElementById("editNightShiftDate");
  
  if (shiftType === "Ночь") {
    nightShiftBlock.style.display = "block";
    // Если поле пустое, предлагаем вчерашний день
    if (!nightShiftInput.value) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      nightShiftInput.value = yesterday.toISOString().split('T')[0];
    }
  } else {
    nightShiftBlock.style.display = "none";
    nightShiftInput.value = "";
  }
}


