// ============================
// 🔍 ФУНКЦИИ АНАЛИЗА НОРМАТИВОВ
// ============================

// Глобальные переменные
let currentNormativesData = [];
let currentEditingNorm = null;

// Показать блок анализа нормативов с авторизацией
function loadNormativesAnalysis() {
  // Всегда запрашиваем пароль (без сохранения)
  promptNormativesAuth();
}

// Запрос пароля для доступа к анализу нормативов
function promptNormativesAuth() {
  const password = prompt('🔐 Введите пароль для доступа к анализу нормативов:');
  if (password === 'Forsal2025') {
    showNormativesAnalysis();
  } else if (password !== null) {
    alert('❌ Неверный пароль');
  }
}

// Показать блок анализа нормативов (после авторизации)
function showNormativesAnalysis() {
  const container = document.getElementById("normativesAnalysisContainer");
  
  // Скрываем другие отчеты
  document.getElementById("reportContainer").innerHTML = "";
  document.getElementById("shiftStatsOutput").innerHTML = "";
  document.getElementById("packerAnalysis").innerHTML = "";
  
  // Показываем контейнер
  container.style.display = "block";
  
  // Устанавливаем период по умолчанию (последние 7 дней)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);
  
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];
  
  // Устанавливаем для мобильной версии
  document.getElementById("normativesStartDate").value = startDateString;
  document.getElementById("normativesEndDate").value = endDateString;
  
  // Устанавливаем для десктопной версии
  document.getElementById("normativesStartDateDesktop").value = startDateString;
  document.getElementById("normativesEndDateDesktop").value = endDateString;
  
  // Сброс результатов
  document.getElementById("normativesSummary").style.display = "none";
  document.getElementById("normativesResults").innerHTML = "";
  
  // ✅ Скрываем кнопку отправки на почту при открытии
  showEmailButtons(false);
}

// Скрыть блок анализа нормативов
function hideNormativesAnalysis() {
  document.getElementById("normativesAnalysisContainer").style.display = "none";
  // Скрываем кнопку отправки на почту
  showEmailButtons(false);
}

// Запустить анализ нормативов
async function runNormativesAnalysis() {
  // Определяем, какую версию интерфейса использовать
  const isMobile = window.innerWidth <= 768;
  
  const startDate = isMobile ? 
    document.getElementById("normativesStartDate").value :
    document.getElementById("normativesStartDateDesktop").value;
  const endDate = isMobile ? 
    document.getElementById("normativesEndDate").value :
    document.getElementById("normativesEndDateDesktop").value;
  const filter = isMobile ? 
    document.getElementById("normativesFilter").value :
    document.getElementById("normativesFilterDesktop").value;
  const search = isMobile ? 
    document.getElementById("normativesSearch").value.toLowerCase() :
    document.getElementById("normativesSearchDesktop").value.toLowerCase();
  
  if (!startDate || !endDate) {
    alert("⚠️ Укажите период анализа");
    return;
  }
  
  const btn = isMobile ? 
    document.getElementById("runNormativesBtn") :
    document.getElementById("runNormativesBtnDesktop");
  const loader = document.getElementById("normativesLoader");
  const resultsContainer = document.getElementById("normativesResults");
  const summaryContainer = document.getElementById("normativesSummary");
  
  // Показываем загрузку
  btn.disabled = true;
  btn.textContent = isMobile ? "⏳ Анализируем..." : "⏳ Анализируем...";
  loader.style.display = "block";
  resultsContainer.innerHTML = "";
  summaryContainer.style.display = "none";
  
  // Скрываем кнопку отправки пока нет результатов
  showEmailButtons(false);
  
  try {
    const response = await fetch(`${scriptURL}?type=normativesAnalysis&startDate=${startDate}&endDate=${endDate}&filter=${filter}`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.message || "Ошибка анализа");
    }
    
    currentNormativesData = data.results;
    
    // Применяем поиск если есть
    let filteredResults = currentNormativesData;
    if (search) {
      filteredResults = currentNormativesData.filter(item => 
        item.operation.toLowerCase().includes(search) || 
        item.key.toLowerCase().includes(search)
      );
    }
    
    // Показываем статистику
    showNormativesSummary(data.summary, filteredResults.length);
    
    // Показываем результаты
    displayNormativesResults(filteredResults);
    
    // ✅ Показываем кнопку отправки на почту после загрузки
    showEmailButtons(filteredResults.length > 0);
    
  } catch (error) {
    console.error("Ошибка анализа нормативов:", error);
    resultsContainer.innerHTML = `<div style="text-align:center; color:red; padding:20px;">❌ Ошибка: ${error.message}</div>`;
  } finally {
    // Скрываем загрузку
    btn.disabled = false;
    btn.textContent = isMobile ? "📊 Анализ" : "📊 Запустить анализ";
    loader.style.display = "none";
  }
}

// Показать статистику
function showNormativesSummary(summary, filteredCount) {
  const container = document.getElementById("normativesSummary");
  
  document.getElementById("totalNormatives").textContent = filteredCount || summary.totalOperations;
  document.getElementById("problematicNormatives").textContent = summary.problematicOperations;
  document.getElementById("overstatedNormatives").textContent = summary.overstatedCount;
  document.getElementById("understatedNormatives").textContent = summary.understatedCount;
  
  container.style.display = "block";
}

// ═══════════════════════════════════════════════════════════════════════════
// 📧 ОТПРАВКА ОТЧЁТА НА EMAIL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показывает/скрывает кнопки отправки на email
 */
function showEmailButtons(show) {
  const mobileBtn = document.getElementById("sendNormativesEmailBtn");
  const desktopBtn = document.getElementById("sendNormativesEmailBtnDesktop");
  
  if (mobileBtn) mobileBtn.style.display = show ? "block" : "none";
  if (desktopBtn) desktopBtn.style.display = show ? "inline-block" : "none";
}

/**
 * Отправляет результаты анализа на указанный email
 */
async function sendNormativesReportToEmail() {
  // Запрашиваем email
  const email = prompt('📧 Введите email для отправки отчёта:');
  
  if (!email) return;
  
  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('❌ Некорректный формат email');
    return;
  }
  
  // Получаем параметры периода
  const isMobile = window.innerWidth <= 768;
  const startDate = isMobile ? 
    document.getElementById("normativesStartDate").value :
    document.getElementById("normativesStartDateDesktop").value;
  const endDate = isMobile ? 
    document.getElementById("normativesEndDate").value :
    document.getElementById("normativesEndDateDesktop").value;
  const filter = isMobile ? 
    document.getElementById("normativesFilter").value :
    document.getElementById("normativesFilterDesktop").value;
  
  if (!startDate || !endDate) {
    alert('⚠️ Сначала выберите период и запустите анализ');
    return;
  }
  
  // Находим кнопку для индикации загрузки
  const sendBtn = document.getElementById("sendNormativesEmailBtn") || 
                  document.getElementById("sendNormativesEmailBtnDesktop");
  
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "⏳ Отправка...";
  }
  
  try {
    const response = await fetch(
      `${scriptURL}?type=sendNormativesReport&email=${encodeURIComponent(email)}&startDate=${startDate}&endDate=${endDate}&filter=${filter}`
    );
    const data = await response.json();
    
    if (data.ok) {
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ ${data.message || 'Ошибка отправки'}`);
    }
  } catch (error) {
    console.error("Ошибка отправки отчёта:", error);
    alert(`❌ Ошибка: ${error.message}`);
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "📧 Отправить на почту";
    }
  }
}

// Отобразить результаты анализа
function displayNormativesResults(results) {
  const container = document.getElementById("normativesResults");
  
  if (!results || results.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#6b7280;">
      <div style="font-size:48px; margin-bottom:16px;">🔍</div>
      <div>Нет результатов по заданным критериям</div>
    </div>`;
    return;
  }
  
  let html = `
    <div style="overflow-x: auto;">
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:2px solid #e5e7eb;">
            <th style="padding:12px 8px; text-align:left; font-weight:600;">Операция</th>
            <th style="padding:12px 8px; text-align:left; font-weight:600;">Объем/Ключ</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Текущая норма</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Ср. эффективность</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Ср. скорость</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Статус</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Операций</th>
            <th style="padding:12px 8px; text-align:center; font-weight:600;">Действия</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  results.forEach((item, index) => {
    const statusColor = item.status === "overstated" ? "#fee2e2" : 
                       item.status === "understated" ? "#dcfce7" : "#f9fafb";
    const textColor = item.status === "overstated" ? "#dc2626" : 
                     item.status === "understated" ? "#16a34a" : "#6b7280";
    
    html += `
      <tr style="border-bottom:1px solid #e5e7eb; background:${statusColor};">
        <td style="padding:12px 8px; font-weight:500;">${item.operation}</td>
        <td style="padding:12px 8px;">${item.key}</td>
        <td style="padding:12px 8px; text-align:center; font-weight:600;">${item.normPerHour} шт/ч</td>
        <td style="padding:12px 8px; text-align:center; color:${textColor}; font-weight:600;">${item.avgEfficiency}%</td>
        <td style="padding:12px 8px; text-align:center;">${item.avgSpeed} шт/ч</td>
        <td style="padding:12px 8px; text-align:center; font-weight:600; color:${textColor};">${item.statusText}</td>
        <td style="padding:12px 8px; text-align:center;">${item.totalOperations}</td>
        <td style="padding:12px 8px; text-align:center;">
          <button class="edit-norm-btn" data-index="${index}" data-rate-key="${item.rateKey}"
                  style="background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">
            ✏️ Изменить
          </button>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    
    <div style="margin-top:16px; padding:12px; background:#f0f9ff; border-radius:8px; font-size:12px; color:#1e40af;">
      <strong>💡 Пояснения:</strong><br>
      🔴 <strong>Завышенная норма</strong> - средняя эффективность < 80%<br>
      🟢 <strong>Заниженная норма</strong> - средняя эффективность > 100%<br>
      ⚪ <strong>Норма в порядке</strong> - эффективность в диапазоне 80-100%
    </div>
  `;
  
  // Создаем контейнер с обеими версиями
  const fullHtml = `
    <!-- Десктопная таблица -->
    <div class="normatives-desktop-table">
      ${html}
    </div>
    
    <!-- Мобильные карточки -->
    <div class="normatives-mobile-cards" style="display: none;">
      ${createMobileCards(results)}
    </div>
  `;
  
  container.innerHTML = fullHtml;
  
  // Добавляем обработчики для кнопок редактирования (десктоп)
  const desktopTable = container.querySelector('.normatives-desktop-table');
  if (desktopTable) {
    desktopTable.addEventListener('click', function(e) {
      if (e.target.classList.contains('edit-norm-btn')) {
        const index = parseInt(e.target.dataset.index);
        const rateKey = e.target.dataset.rateKey;
  
        openEditNormModal(rateKey, index);
      }
    });
  }
  
  // Добавляем обработчики для кнопок редактирования (мобильные)
  const mobileCards = container.querySelector('.normatives-mobile-cards');
  if (mobileCards) {
    mobileCards.addEventListener('click', function(e) {
      if (e.target.classList.contains('normative-card-action')) {
        const index = parseInt(e.target.dataset.index);
        const rateKey = e.target.dataset.rateKey;
  
        openEditNormModal(rateKey, index);
      }
    });
  }
}

// Создание мобильных карточек
function createMobileCards(results) {
  return results.map((item, index) => {
    const statusClass = item.status;
    const statusIcon = item.status === 'overstated' ? '🔴' : 
                      item.status === 'understated' ? '🟢' : '⚪';
    
    const efficiencyColor = item.avgEfficiency < 70 ? '#ef4444' : 
                           item.avgEfficiency > 120 ? '#10b981' : '#6b7280';
    
    return `
      <div class="normative-card ${statusClass}">
        <div class="normative-card-header">
          <div class="normative-card-title">
            ${item.operation}<br>
            <small style="color: #6b7280; font-weight: normal;">${item.key}</small>
          </div>
          <div class="normative-card-status">${statusIcon}</div>
        </div>
        
        <div class="normative-card-details">
          <div class="normative-detail">
            <div class="normative-detail-value">${item.normPerHour}</div>
            <div class="normative-detail-label">Норма шт/ч</div>
          </div>
          <div class="normative-detail">
            <div class="normative-detail-value" style="color: ${efficiencyColor};">${item.avgEfficiency}%</div>
            <div class="normative-detail-label">Эффективность</div>
          </div>
          <div class="normative-detail">
            <div class="normative-detail-value">${item.avgSpeed}</div>
            <div class="normative-detail-label">Средняя скорость</div>
          </div>
          <div class="normative-detail">
            <div class="normative-detail-value">${item.totalOperations}</div>
            <div class="normative-detail-label">Операций</div>
          </div>
        </div>
        
        <button class="normative-card-action" data-index="${index}" data-rate-key="${item.rateKey}">
          ✏️ Изменить норму
        </button>
      </div>
    `;
  }).join('');
}

// Открыть модальное окно редактирования нормы
function openEditNormModal(rateKey, index) {
  const item = currentNormativesData[index];
  if (!item) {
    alert("Ошибка: данные операции не найдены");
    return;
  }
  
  currentEditingNorm = item;
  
  // Заполняем данные
  document.getElementById("editNormOperation").textContent = item.operation;
  document.getElementById("editNormKey").textContent = item.key;
  document.getElementById("editNormCurrent").textContent = item.normPerHour;
  document.getElementById("editNormEfficiency").textContent = item.avgEfficiency;
  document.getElementById("editNormSpeed").textContent = item.avgSpeed;
  document.getElementById("editNormRecommended").value = item.recommendedNorm;
  document.getElementById("editNormNew").value = item.recommendedNorm;
  
  // Рекомендация
  let recommendation = "";
  if (item.status === "overstated") {
    recommendation = `🔴 Норма завышена! Сотрудники показывают эффективность ${item.avgEfficiency}%, что значительно ниже целевых 100%. Рекомендуется снизить норму до ${item.recommendedNorm} шт/час на основе реальной средней скорости ${item.avgSpeed} шт/час.`;
  } else if (item.status === "understated") {
    recommendation = `🟢 Норма занижена! Сотрудники легко превышают норму с эффективностью ${item.avgEfficiency}%. Рекомендуется повысить норму до ${item.recommendedNorm} шт/час для более точного планирования.`;
  } else {
    recommendation = `⚪ Норма соответствует реальной производительности. Средняя эффективность ${item.avgEfficiency}% находится в оптимальном диапазоне 80-100%.`;
  }
  
  document.getElementById("editNormRecommendation").textContent = recommendation;
  
  // Очищаем результат
  document.getElementById("editNormResult").innerHTML = "";
  
  // Показываем модальное окно
  const modal = document.getElementById("editNormModal");
  if (modal) {
    modal.style.display = "flex";
  } else {
    console.error("Модальное окно не найдено!");
    alert("Ошибка: модальное окно не найдено в DOM");
  }
}

// Закрыть модальное окно редактирования
function closeEditNormModal() {
  document.getElementById("editNormModal").style.display = "none";
  currentEditingNorm = null;
}

// Сохранить изменение нормы
async function saveNormChange() {
  if (!currentEditingNorm) return;
  
  const newNorm = parseFloat(document.getElementById("editNormNew").value);
  const reason = "Корректировка через анализ нормативов";
  const resultDiv = document.getElementById("editNormResult");
  const btn = document.getElementById("saveNormBtn");
  
  // Валидация
  if (!newNorm || newNorm <= 0) {
    resultDiv.innerHTML = '<div style="color:red;">⚠️ Введите корректную норму (больше 0)</div>';
    return;
  }
  
  // Блокируем кнопку
  btn.disabled = true;
  btn.textContent = "⏳ Сохраняем...";
  resultDiv.innerHTML = '<div style="color:#2563eb;">💾 Сохранение изменений...</div>';
  
  try {
    const response = await fetch(`${scriptURL}?type=updateRate&operation=${encodeURIComponent(currentEditingNorm.operation)}&key=${encodeURIComponent(currentEditingNorm.key)}&newNorm=${newNorm}&reason=${encodeURIComponent(reason)}`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.message || "Ошибка сохранения");
    }
    
    resultDiv.innerHTML = '<div style="color:green;">✅ Норма успешно обновлена!</div>';
    
    // Обновляем данные в таблице
    currentEditingNorm.normPerHour = newNorm;
    
    // Через 2 секунды закрываем модальное окно и обновляем таблицу
    setTimeout(() => {
      closeEditNormModal();
      runNormativesAnalysis(); // Перезагружаем данные
    }, 2000);
    
  } catch (error) {
    console.error("Ошибка сохранения нормы:", error);
    resultDiv.innerHTML = `<div style="color:red;">❌ Ошибка: ${error.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Сохранить изменения";
  }
}

// Поиск по операциям (с задержкой)
let searchTimeout;

// Добавляем обработчик событий после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById("normativesSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (currentNormativesData.length > 0) {
          const search = this.value.toLowerCase();
          const filteredResults = currentNormativesData.filter(item => 
            item.operation.toLowerCase().includes(search) || 
            item.key.toLowerCase().includes(search)
          );
          displayNormativesResults(filteredResults);
          
          // Обновляем счетчик
          const summary = {
            totalOperations: currentNormativesData.length,
            problematicOperations: currentNormativesData.filter(r => r.status !== "normal").length,
            overstatedCount: currentNormativesData.filter(r => r.status === "overstated").length,
            understatedCount: currentNormativesData.filter(r => r.status === "understated").length
          };
          showNormativesSummary(summary, filteredResults.length);
        }
      }, 300);
    });
  }
});


