// ===== МАССОВОЕ ОБНОВЛЕНИЕ ПОКАЗАТЕЛЕЙ (из admin-панели) =====

function openUpdateAllModal() {
  const resultBox = document.getElementById("updateAllResult");
  const modal = document.getElementById("updateAllModal");
  if (!resultBox || !modal) return;

  // Очистка результата
  resultBox.textContent = "";
  modal.style.display = "flex";

  // Установка дат по умолчанию (последние 7 дней)
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startInput = document.getElementById("updateAllStart");
  const endInput = document.getElementById("updateAllEnd");
  if (startInput) startInput.value = weekAgo.toISOString().split("T")[0];
  if (endInput) endInput.value = today.toISOString().split("T")[0];
}

function closeUpdateAllModal() {
  const modal = document.getElementById("updateAllModal");
  if (modal) modal.style.display = "none";
}

// Функции управления чекбоксами выбора обновлений
function selectAllUpdates() {
  const seniorsSalary = document.getElementById("updateSeniorsSalary");
  const staffIndicators = document.getElementById("updateStaffIndicators");
  const outsourcingIndicators = document.getElementById("updateOutsourcingIndicators");
  
  if (seniorsSalary) seniorsSalary.checked = true;
  if (staffIndicators) staffIndicators.checked = true;
  if (outsourcingIndicators) outsourcingIndicators.checked = true;
}

function selectNoneUpdates() {
  const seniorsSalary = document.getElementById("updateSeniorsSalary");
  const staffIndicators = document.getElementById("updateStaffIndicators");
  const outsourcingIndicators = document.getElementById("updateOutsourcingIndicators");
  
  if (seniorsSalary) seniorsSalary.checked = false;
  if (staffIndicators) staffIndicators.checked = false;
  if (outsourcingIndicators) outsourcingIndicators.checked = false;
}

function selectOnlySeniors() {
  const seniorsSalary = document.getElementById("updateSeniorsSalary");
  const staffIndicators = document.getElementById("updateStaffIndicators");
  const outsourcingIndicators = document.getElementById("updateOutsourcingIndicators");
  
  if (seniorsSalary) seniorsSalary.checked = true;
  if (staffIndicators) staffIndicators.checked = false;
  if (outsourcingIndicators) outsourcingIndicators.checked = false;
}

// Новая функция выборочного обновления
async function submitSelectiveUpdate() {
  const btn = document.getElementById("submitUpdateAllBtn");
  const resultBox = document.getElementById("updateAllResult");
  if (!btn || !resultBox) return;

  // Блокировка кнопки и индикатор
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "⏳ Обновление...";
  resultBox.textContent = "";

  const start = document.getElementById("updateAllStart")?.value;
  const end = document.getElementById("updateAllEnd")?.value;

  if (!start || !end) {
    resultBox.textContent = "❗ Укажите обе даты!";
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  // Проверяем что выбрано для обновления
  const updateSeniors = !!document.getElementById("updateSeniorsSalary")?.checked;
  const updateStaff = !!document.getElementById("updateStaffIndicators")?.checked;
  const updateOutsourcing = !!document.getElementById("updateOutsourcingIndicators")?.checked;

  if (!updateSeniors && !updateStaff && !updateOutsourcing) {
    resultBox.textContent = "❗ Выберите хотя бы один компонент для обновления!";
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  try {
    let resultMessage = "🚀 Начинаю выборочное обновление...\n\n";
    resultBox.style.color = "";
    resultBox.textContent = resultMessage;
    
    // 1. Обновляем зарплату старших смен (если выбрано)
    if (updateSeniors) {
      resultBox.textContent = resultMessage + "🔄 Обновление зарплаты старших смен...";
      
      const seniorsResponse = await fetch(`${scriptURL}`, {
        method: 'POST',
        body: new URLSearchParams({
          type: 'processAllSeniorsForPeriod',
          start: start,
          end: end
        })
      });
      const seniorsData = await seniorsResponse.json();
      
      if (seniorsData.status === 'success') {
        resultMessage += `✅ Старшие смены: обработано ${seniorsData.processedCount || 0} записей\n`;
      } else {
        resultMessage += `⚠️ Старшие смены: ${seniorsData.message || 'ошибка'}\n`;
      }
    } else {
      resultMessage += "⏭️ Зарплаты старших смен: пропущено\n";
    }
    
    // 2. Обновляем показатели (если выбрано что-то из показателей)
    if (updateStaff || updateOutsourcing) {
      resultBox.textContent = resultMessage + "🔄 Обновление показателей...";
      
      // Определяем тип обновления на основе выбранных чекбоксов
      let updateType = "";
      if (updateStaff && updateOutsourcing) {
        updateType = "both"; // обновляем и штат и аутсорсинг
      } else if (updateStaff) {
        updateType = "staff"; // только штат
      } else if (updateOutsourcing) {
        updateType = "outsourcing"; // только аутсорсинг
      }
      
      const exportResponse = await fetch(
        `${scriptURL}?type=exportNow&date=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&components=${updateType}`
      );
      const exportResult = await exportResponse.text();
      
      if (exportResult.includes("✅")) {
        if (updateStaff && updateOutsourcing) {
          resultMessage += "✅ Показатели штата и аутсорсинга обновлены\n";
        } else if (updateStaff) {
          resultMessage += "✅ Показатели штатных сотрудников обновлены\n";
        } else if (updateOutsourcing) {
          resultMessage += "✅ Показатели аутсорсинга обновлены\n";
        }
      } else {
        resultMessage += `⚠️ Показатели: ${exportResult}\n`;
      }
    } else {
      resultMessage += "⏭️ Показатели: пропущено\n";
    }
    
    resultBox.style.color = '#059669';
    resultBox.textContent = resultMessage + "\n🎉 Выборочное обновление завершено!";
    
    setTimeout(closeUpdateAllModal, 5000);
    
  } catch (err) {
    console.error(err);
    resultBox.style.color = '#dc2626';
    resultBox.textContent = "❌ Ошибка при обновлении данных: " + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Старая функция для обратной совместимости
async function submitUpdateAll() {
  // Выбираем все компоненты и запускаем выборочное обновление
  selectAllUpdates();
  await submitSelectiveUpdate();
}

// Экспортируем функции в глобальную область для inline-обработчиков
window.openUpdateAllModal = openUpdateAllModal;
window.closeUpdateAllModal = closeUpdateAllModal;
window.selectAllUpdates = selectAllUpdates;
window.selectNoneUpdates = selectNoneUpdates;
window.selectOnlySeniors = selectOnlySeniors;
window.submitSelectiveUpdate = submitSelectiveUpdate;
window.submitUpdateAll = submitUpdateAll;


