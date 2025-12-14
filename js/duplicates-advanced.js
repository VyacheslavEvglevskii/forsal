// ===== ФУНКЦИИ УЛУЧШЕННОЙ ЗАЩИТЫ ОТ ДУБЛИКАТОВ =====

/**
 * Анализирует все типы потенциальных дубликатов
 */
function analyzeAllDuplicates(payload) {
  duplicateWarnings = { exact: [], similar: [], suspicious: [] };
  
  todayRecords.forEach((rec, index) => {
    // 1. Точные дубликаты (существующая логика)
    if (isExactDuplicate(rec, payload)) {
      duplicateWarnings.exact.push({ record: rec, index, reason: "Полное совпадение" });
    }
    
    // 2. Похожие записи (новая логика)
    else if (isSimilarRecord(rec, payload)) {
      const similarities = findSimilarities(rec, payload);
      duplicateWarnings.similar.push({ 
        record: rec, 
        index, 
        reason: `Похоже на: ${similarities.join(", ")}`,
        similarities 
      });
    }
    
    // 3. Подозрительные записи
    else if (isSuspiciousRecord(rec, payload)) {
      const suspicions = findSuspicions(rec, payload);
      duplicateWarnings.suspicious.push({ 
        record: rec, 
        index, 
        reason: `Подозрительно: ${suspicions.join(", ")}`,
        suspicions 
      });
    }
  });
}

/**
 * Проверка точного дубликата (существующая логика)
 */
function isExactDuplicate(rec, payload) {
  const isSame =
    rec.employeeName === payload.employeeName &&
    rec.quantity === payload.quantity &&
    rec.startTime === payload.startTime &&
    rec.endTime === payload.endTime &&
    rec.operationType === payload.operationType &&
    rec.orderNumber === payload.orderNumber &&
    rec.setNumber === payload.setNumber;

  if (!isSame) return false;
  if (payload.operationType !== 'Сборка "Набора"') {
    return rec.volume === payload.volume;
  }
  return true;
}

/**
 * Проверка похожей записи
 */
function isSimilarRecord(rec, payload) {
  if (rec.employeeName !== payload.employeeName) return false;
  
  let similarities = 0;
  
  // Проверяем количество (±10%)
  if (payload.quantity && rec.quantity) {
    const diff = Math.abs(Number(payload.quantity) - Number(rec.quantity));
    const threshold = Number(rec.quantity) * 0.1;
    if (diff <= threshold) similarities++;
  }
  
  // Проверяем время (±15 минут)
  if (isTimeClose(rec.startTime, payload.startTime, 15) || 
      isTimeClose(rec.endTime, payload.endTime, 15)) {
    similarities++;
  }
  
  // Проверяем операцию
  if (rec.operationType === payload.operationType) similarities++;
  
  // Проверяем объём/артикул
  if (rec.volume === payload.volume || rec.setNumber === payload.setNumber) {
    similarities++;
  }
  
  // Если 3+ совпадения из 4 - это похожая запись
  return similarities >= 3;
}

/**
 * Проверка подозрительной записи
 */
function isSuspiciousRecord(rec, payload) {
  if (rec.employeeName !== payload.employeeName) return false;
  
  // Пересекающееся время работы
  if (isTimeOverlapping(rec, payload)) return true;
  
  // Очень короткий интервал между записями
  if (isTimeGapTooShort(rec, payload)) return true;
  
  // Одинаковое время, но разные операции
  if (rec.startTime === payload.startTime && rec.endTime === payload.endTime && 
      rec.operationType !== payload.operationType) return true;
      
  // Необычно высокая производительность
  if (isUnusuallyHighQuantity(payload)) return true;
  
  return false;
}

/**
 * Находит конкретные сходства между записями
 */
function findSimilarities(rec, payload) {
  const similarities = [];
  
  if (Math.abs(Number(payload.quantity) - Number(rec.quantity)) <= Number(rec.quantity) * 0.1) {
    similarities.push("количество");
  }
  
  if (isTimeClose(rec.startTime, payload.startTime, 15)) {
    similarities.push("время начала");
  }
  
  if (isTimeClose(rec.endTime, payload.endTime, 15)) {
    similarities.push("время окончания");
  }
  
  if (rec.operationType === payload.operationType) {
    similarities.push("операция");
  }
  
  if (rec.volume === payload.volume) {
    similarities.push("объём");
  }
  
  if (rec.setNumber === payload.setNumber) {
    similarities.push("артикул");
  }
  
  return similarities;
}

/**
 * Находит подозрительные моменты
 */
function findSuspicions(rec, payload) {
  const suspicions = [];
  
  if (isTimeOverlapping(rec, payload)) {
    suspicions.push("пересекающееся время");
  }
  
  if (isTimeGapTooShort(rec, payload)) {
    suspicions.push("слишком короткий перерыв");
  }
  
  if (rec.startTime === payload.startTime && rec.endTime === payload.endTime) {
    suspicions.push("одинаковое время");
  }
  
  if (isUnusuallyHighQuantity(payload)) {
    suspicions.push("необычно высокая производительность");
  }
  
  return suspicions;
}

/**
 * Проверяет, близко ли время (в минутах)
 */
function isTimeClose(time1, time2, minutesThreshold) {
  if (!time1 || !time2) return false;
  
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  
  return Math.abs(minutes1 - minutes2) <= minutesThreshold;
}

/**
 * Проверяет пересечение времени работы
 */
function isTimeOverlapping(rec, payload) {
  if (!rec.startTime || !rec.endTime || !payload.startTime || !payload.endTime) return false;
  
  const recStart = timeToMinutes(rec.startTime);
  const recEnd = timeToMinutes(rec.endTime);
  const payloadStart = timeToMinutes(payload.startTime);
  const payloadEnd = timeToMinutes(payload.endTime);
  
  // Проверяем пересечение интервалов
  return (payloadStart < recEnd) && (payloadEnd > recStart);
}

/**
 * Проверяет, слишком ли короткий промежуток между записями
 */
function isTimeGapTooShort(rec, payload) {
  if (!rec.endTime || !payload.startTime) return false;
  
  const recEnd = timeToMinutes(rec.endTime);
  const payloadStart = timeToMinutes(payload.startTime);
  
  // Если между окончанием одной записи и началом другой меньше 5 минут
  const gap = Math.abs(payloadStart - recEnd);
  return gap < 5 && gap > 0;
}

/**
 * Проверяет необычно высокую производительность
 */
function isUnusuallyHighQuantity(payload) {
  if (!payload.quantity || !payload.startTime || !payload.endTime) return false;
  
  const duration = timeToMinutes(payload.endTime) - timeToMinutes(payload.startTime);
  if (duration <= 0) return false;
  
  const rate = Number(payload.quantity) / (duration / 60); // штук в час
  
  // Находим норму для этой операции
  const matchingRate = allRates.find(r => 
    r.operation === payload.operationType && 
    (r.key === payload.volume || r.key === payload.setNumber)
  );
  
  if (matchingRate && matchingRate.normPerHour > 0) {
    // Если производительность превышает норму в 2+ раза
    return rate > matchingRate.normPerHour * 2;
  }
  
  return false;
}

/**
 * Конвертирует время в минуты
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Показывает предупреждения о дубликатах
 */
function showDuplicateWarnings() {
  const container = document.getElementById("duplicateWarnings") || createWarningsContainer();
  
  let html = "";
  
  // Точные дубликаты (критично)
  if (duplicateWarnings.exact.length > 0) {
    html += `
      <div class="warning-section critical">
        <h4>🚫 Точные дубликаты (${duplicateWarnings.exact.length})</h4>
        ${duplicateWarnings.exact.map(w => 
          `<div class="warning-item critical">
            <strong>Запись #${w.index + 1}:</strong> ${w.reason}<br>
            <small>${formatRecordSummary(w.record)}</small>
          </div>`
        ).join('')}
      </div>
    `;
  }
  
  // Похожие записи (предупреждение)
  if (duplicateWarnings.similar.length > 0) {
    html += `
      <div class="warning-section warning">
        <h4>⚠️ Похожие записи (${duplicateWarnings.similar.length})</h4>
        ${duplicateWarnings.similar.map(w => 
          `<div class="warning-item warning">
            <strong>Запись #${w.index + 1}:</strong> ${w.reason}<br>
            <small>${formatRecordSummary(w.record)}</small>
          </div>`
        ).join('')}
      </div>
    `;
  }
  
  // Подозрительные записи (уведомление)
  if (duplicateWarnings.suspicious.length > 0) {
    html += `
      <div class="warning-section info">
        <h4>🔍 Подозрительные записи (${duplicateWarnings.suspicious.length})</h4>
        ${duplicateWarnings.suspicious.map(w => 
          `<div class="warning-item info">
            <strong>Запись #${w.index + 1}:</strong> ${w.reason}<br>
            <small>${formatRecordSummary(w.record)}</small>
          </div>`
        ).join('')}
      </div>
    `;
  }
  
  if (html) {
    container.innerHTML = html;
    container.style.display = "block";
  } else {
    container.style.display = "none";
  }
}

/**
 * Создает контейнер для предупреждений
 */
function createWarningsContainer() {
  const existing = document.getElementById("duplicateWarnings");
  if (existing) return existing;
  
  const container = document.createElement("div");
  container.id = "duplicateWarnings";
  container.className = "duplicate-warnings";
  
  // Вставляем перед формой
  const form = document.getElementById("dataForm");
  form.parentNode.insertBefore(container, form);
  
  return container;
}

/**
 * Форматирует краткую информацию о записи
 */
function formatRecordSummary(record) {
  return `${record.operationType} • ${record.quantity}шт • ${record.startTime}-${record.endTime} • ${record.volume || record.setNumber || 'N/A'}`;
}

/**
 * Сохранение черновика формы
 */
function saveDraft() {
  const formData = new FormData(document.getElementById("dataForm"));
  const draft = {};
  formData.forEach((value, key) => {
    draft[key] = value;
  });
  
  draft.timestamp = Date.now();
  localStorage.setItem("formDraft", JSON.stringify(draft));
}

/**
 * Восстановление черновика формы
 */
function restoreDraft() {
  const draftStr = localStorage.getItem("formDraft");
  if (!draftStr) return false;
  
  try {
    const draft = JSON.parse(draftStr);
    
    // Проверяем, не слишком ли старый черновик (больше 1 часа)
    if (Date.now() - draft.timestamp > 60 * 60 * 1000) {
      localStorage.removeItem("formDraft");
      return false;
    }
    
    // Восстанавливаем поля
    Object.entries(draft).forEach(([key, value]) => {
      if (key !== 'timestamp') {
        const field = document.querySelector(`[name="${key}"]`);
        if (field) field.value = value;
      }
    });
    
    return true;
  } catch (error) {
    localStorage.removeItem("formDraft");
    return false;
  }
}

/**
 * Валидация формы в реальном времени
 */
function setupRealTimeValidation() {
  const form = document.getElementById("dataForm");
  const fields = ['quantity', 'startTime', 'endTime', 'operationType', 'volume', 'setNumber', 'orderNumber'];
  
  fields.forEach(fieldName => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.addEventListener('input', debounce(validateFormRealTime, 500));
      field.addEventListener('change', validateFormRealTime);
    }
  });
}

/**
 * Валидация формы в реальном времени
 */
function validateFormRealTime() {
  const form = document.getElementById("dataForm");
  if (!form) return;
  
  const formData = new FormData(form);
  
  const payload = {
    employeeName: currentUser,
    quantity: formData.get("quantity")?.trim(),
    startTime: formData.get("startTime")?.trim(),
    endTime: formData.get("endTime")?.trim(),
    volume: formData.get("volume")?.trim(),
    operationType: formData.get("operationType")?.trim(),
    orderNumber: formData.get("orderNumber")?.trim(),
    setNumber: formData.get("setNumber")?.trim(),
    shiftType: currentShift,
    employeeStatus: currentStatus
  };
  
  // Проверяем только если заполнены ключевые поля
  if (payload.employeeName && payload.quantity && payload.startTime && 
      payload.endTime && payload.operationType) {
    
    // 🚫 ОТКЛЮЧЕНО: analyzeAllDuplicates(payload);
    // 🚫 ОТКЛЮЧЕНО: showDuplicateWarnings();
    saveDraft(); // Сохраняем черновик
  }
}

/**
 * Дебаунс функция
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


