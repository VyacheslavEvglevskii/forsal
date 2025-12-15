// === 📊 ОТЧЁТЫ И АНАЛИТИКА (бонус наставника, упаковщики, смены) ===

// Отчёт показателей за период (с подтверждением)
async function runCustomReport() {
  const start = document.getElementById("unifiedStart").value;
  const end = document.getElementById("unifiedEnd").value;

  if (!start || !end) {
    alert("⚠️ Укажите начало и конец периода");
    return;
  }
  
  // ✅ Подтверждение перед формированием
  const confirmed = confirm(`📊 Сформировать отчёт показателей за период:\n\n${start} — ${end}?\n\nОтчёт будет записан в лист "Недельный_отчет" в Google Sheets.`);
  
  if (!confirmed) return;

  // 🔄 Показываем анимацию загрузки
  showReportLoadingModal();

  try {
    const res = await fetch(`${scriptURL}?type=weeklyReport&start=${start}&end=${end}`);
    const text = await res.text();
    
    hideReportLoadingModal();
    
    // Пробуем распарсить как JSON
    try {
      const json = JSON.parse(text);
      if (json.error) {
        alert("❌ " + json.error);
      } else {
        alert(json.message || "✅ Отчёт успешно сформирован");
      }
    } catch (parseErr) {
      // Если не JSON — показываем как есть
      alert(text || "✅ Отчёт успешно сформирован");
    }
  } catch (err) {
    hideReportLoadingModal();
    alert("❌ Ошибка при формировании отчёта: " + err.message);
  }
}

// 🔄 Модальное окно загрузки отчёта
function showReportLoadingModal() {
  // Удаляем если уже существует
  const existing = document.getElementById("reportLoadingModal");
  if (existing) existing.remove();
  
  const modal = document.createElement("div");
  modal.id = "reportLoadingModal";
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: linear-gradient(135deg, #1e293b, #334155);
        border-radius: 16px;
        padding: 40px 60px;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="
          width: 60px;
          height: 60px;
          border: 4px solid rgba(59, 130, 246, 0.3);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: reportSpin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <div style="
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        ">📊 Формирование отчёта</div>
        <div style="
          font-size: 14px;
          color: #94a3b8;
        " id="reportLoadingText">Подготовка данных...</div>
      </div>
    </div>
    <style>
      @keyframes reportSpin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(modal);
  
  // Анимация текста
  const texts = [
    "Подготовка данных...",
    "Анализ показателей...",
    "Расчёт затрат...",
    "Формирование рекомендаций...",
    "Запись в таблицу..."
  ];
  let textIndex = 0;
  window.reportLoadingInterval = setInterval(() => {
    textIndex = (textIndex + 1) % texts.length;
    const textEl = document.getElementById("reportLoadingText");
    if (textEl) textEl.textContent = texts[textIndex];
  }, 2000);
}

function hideReportLoadingModal() {
  if (window.reportLoadingInterval) {
    clearInterval(window.reportLoadingInterval);
    window.reportLoadingInterval = null;
  }
  const modal = document.getElementById("reportLoadingModal");
  if (modal) modal.remove();
}

// Анализ штатных упаковщиков
async function analyzePackers() {
  const start = document.getElementById("unifiedStart").value;
  const end = document.getElementById("unifiedEnd").value;
  const container = document.getElementById("reportContainer");

  // ⚡ Быстрая валидация
  if (!start || !end) {
    container.innerHTML = "<div style='color:#ef4444; text-align:center; padding:20px;'>⚠️ Укажите период для анализа</div>";
    return;
  }

  // ⚡ Мгновенный индикатор загрузки
  container.innerHTML = "<div style='text-align:center; padding:20px;'>⚡ Загрузка отчёта по упаковщикам...</div>";

  try {
    // ⚡ Показываем прогресс
    const loadingDiv = container.querySelector('div');
    let dots = 0;
    const loadingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      if (loadingDiv) {
        loadingDiv.textContent = `⚡ Загрузка отчёта по упаковщикам${'.'.repeat(dots)}`;
      }
    }, 500);

    const res = await fetch(`${scriptURL}?type=packerAnalytics&start=${start}&end=${end}`);
    clearInterval(loadingInterval);
    
    const json = await res.json();

    if (!json.ok) {
      container.innerHTML = "<div style='color:#ef4444; text-align:center; padding:20px;'>❌ Ошибка при загрузке данных</div>";
      return;
    }

    const { list, best, totalNormsMet, totalNormsTotal, totalNormsPercent } = json;

    // ⚡ ОПТИМИЗИРОВАННОЕ построение строк таблицы
    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      let style = "";
      
      // Определяем стиль строки
      if (row.name === best.name) style = "background:#fef9c3;";          // 🟨 лучший по количеству
      else if (row.name === best.bestEffName) style = "background:#d1fae5;";   // 🟩 лучший по эффективности
      else if (row.name === best.worstEffName) style = "background:#fee2e2;"; // 🟥 худший по эффективности

      // Расчет нормативов
      const met = Number(row.normsMet);
      const total = Number(row.normsTotal);
      const percent = total > 0 ? Math.round((met / total) * 100) : 0;
      let normIcon = "—";
      if (total > 0) {
        normIcon = percent >= 85 ? "✅" : "⚠️";
      }

      rows.push(`
        <tr style="${style}">
          <td>${row.name}</td>
          <td>${row.qty}</td>
          <td>${row.efficiency}%</td>
          <td>${row.wage.toLocaleString("ru-RU")} ₽</td>
          <td>${row.shiftsWorked || 0}</td>
          <td>${met}/${total} (${percent}%) ${normIcon}</td>
        </tr>
      `);
    }
    
    const rowsHTML = rows.join("");

    const table = `
      <h3>📊 Анализ упаковщиков</h3>
      <button class="danger" onclick="clearReports()" style="margin-bottom: 12px;">❌ Закрыть отчёт</button>
      <div class="table-scroll">
      <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%;">
        <thead style="background:#f3f4f6;">
          <tr>
            <th>Упаковщик</th>
            <th>Количество</th>
            <th>Эффективность</th>
            <th>Зарплата</th>
            <th>Смены</th>
            <th>Нормы</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
      <br/>
      <p>
        🥇 <strong>Лучший по количеству:</strong> ${best.name} — ${best.qty} шт.<br/>
        💯 <strong>Лучший по эффективности:</strong> ${best.bestEffName} — ${best.bestEffValue}%<br/>
        🔻 <strong>Худший по эффективности:</strong> ${best.worstEffName} — ${best.worstEffValue}%
      </p>
      <div style="margin-top:16px; padding:10px; background:#f3f4f6; border-radius:8px; font-weight:500;">
        📊 <b>Итого по выполнению норм за смену:</b>
        <br>
        ${totalNormsMet}/${totalNormsTotal} (${totalNormsPercent}%)
        <br><br>
        📅 <b>Статистика по сменам:</b>
        <br>
        • Всего смен отработано: ${list.reduce((sum, emp) => sum + (emp.shiftsWorked || 0), 0)}<br>
        • Среднее смен на сотрудника: ${list.length > 0 ? Math.round(list.reduce((sum, emp) => sum + (emp.shiftsWorked || 0), 0) / list.length * 10) / 10 : 0}
      </div>
    `;

    container.innerHTML = table;

  } catch (err) {
    container.innerHTML = `<p style='color:red;'>Ошибка: ${err.message}</p>`;
  }
}

// Очистка отчётов
function clearReports() {
  const container = document.getElementById("reportContainer");
  container.innerHTML = "";
  if (typeof isShiftStatsLoaded !== "undefined") {
    isShiftStatsLoaded = false;
  }
}

// Универсальный helper для кнопок с индикатором загрузки
async function withLoading(buttonId, asyncCallback) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.classList.add("button-loading");
  btn.disabled = true;

  try {
    await asyncCallback();
  } catch (err) {
    console.error("Ошибка:", err);
    throw err;
  } finally {
    btn.classList.remove("button-loading");
    btn.disabled = false;
  }
}

// Фоновая предзагрузка справочников и статистики для админ-панели
async function loadAllDictionariesInBackground() {
  try {
    await Promise.all([
      loadVolumes(),
      loadOperations(),
      loadSetNumbers(),
      loadTodayRecords(),
      loadOperationFilter(),
      loadRatesTable()
      // loadPackingModels() убран - загружается отдельно при входе
    ]);

    document.getElementById("operationFilter").addEventListener("change", loadStats);
  } catch (err) {
    console.warn("⚠️ Ошибка фоновой загрузки:", err.message);
  }
}

// Загрузка сводки по смене для старших смен (использует собственные поля дат)
async function loadShiftStatsForLeader() {
  const start = document.getElementById("shiftLeaderStart")?.value;
  const end = document.getElementById("shiftLeaderEnd")?.value;
  const container = document.getElementById("shiftLeaderReportContainer");

  if (!container) {
    console.warn("shiftLeaderReportContainer не найден в DOM");
    return;
  }

  if (!start || !end) {
    container.innerHTML = "<p style='color:red;'>⚠️ Укажите обе даты</p>";
    return;
  }

  // 🔄 Показываем модальное окно загрузки
  showReportLoadingModal();
  container.innerHTML = "";

  try {
    const res = await fetch(`${scriptURL}?type=shiftStats&start=${start}&end=${end}`);
    const data = await res.json();

    hideReportLoadingModal();

    if (!data || !data.data || !Array.isArray(data.data) || !data.data.length) {
      container.innerHTML = "<p style='text-align:center;'>Нет данных по выбранному периоду</p>";
      return;
    }

    container.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "❌ Закрыть отчёт";
    closeBtn.className = "danger";
    closeBtn.style.marginBottom = "12px";
    closeBtn.onclick = () => (container.innerHTML = "");
    container.appendChild(closeBtn);

    // Используем ту же логику, что и при основной сводке по смене
    data.data.forEach((shiftBlock) => {
      // ⏱️ Загрузка смены
      const shiftWorkload = shiftBlock.total?.workload ?? 0;
      const shiftWorkloadIcon = shiftBlock.total?.workloadIcon ?? "—";
      
      // Итоги по смене с разделением на готовую продукцию и маркировку
      const totalRepack = shiftBlock.total?.totalQtyRepack ?? 0;
      const totalSticker = shiftBlock.total?.totalQtySticker ?? 0;
      const avgRepackPerPerson = shiftBlock.total?.avgRepackPerPerson ?? 0;
      const employeesCount = shiftBlock.total?.employeesCount ?? 0;
      
      const shiftTitle = document.createElement("div");
      shiftTitle.innerHTML = `
        🕐 <strong>Смена:</strong> ${shiftBlock.shift}
        <br>📦 <strong>Готовая продукция:</strong> ${totalRepack} шт. <span style="color:#6b7280;">(ср. ${avgRepackPerPerson} шт/чел)</span>
        <br>🏷️ <strong>Маркировка:</strong> ${totalSticker} шт.
        <br>📊 <strong>Всего операций:</strong> ${shiftBlock.total?.totalQty ?? 0} шт. (${employeesCount} чел.)
        <br>⚙️ <strong>Средняя эффективность:</strong> ${shiftBlock.total?.overall ?? 0}%
        <br>⏱️ <strong>Средняя загрузка:</strong> ${shiftWorkload}% ${shiftWorkloadIcon}
        <br>👨‍🔧 <strong>Штат:</strong> ${shiftBlock.staff?.totalQtyRepack ?? 0}/${shiftBlock.staff?.totalQtySticker ?? 0} (${shiftBlock.staff?.employees?.length ?? 0} чел.)
        <br>👨‍🎓 <strong>Стажеры:</strong> ${shiftBlock.trainee?.totalQtyRepack ?? 0}/${shiftBlock.trainee?.totalQtySticker ?? 0} (${shiftBlock.trainee?.employees?.length ?? 0} чел.)
        <br>📄 <strong>Аутсорсинг:</strong> ${shiftBlock.outsource?.totalQtyRepack ?? 0}/${shiftBlock.outsource?.totalQtySticker ?? 0} (${shiftBlock.outsource?.employees?.length ?? 0} чел.)
      `;
      shiftTitle.style.marginTop = "16px";
      container.appendChild(shiftTitle);

      // Создаем таблицу для детализации
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "8px";

      // Заголовок таблицы
      const headerRow = table.insertRow();
      ["Сотрудник", "📦/🏷️", "Эффективность", "⏱️ Загрузка"].forEach((text) => {
        const th = document.createElement("th");
        th.textContent = text;
        th.style.border = "1px solid #ccc";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f5f5f5";
        headerRow.appendChild(th);
      });

      // Данные по сотрудникам
      ["staff", "trainee", "outsource"].forEach((type) => {
        const typeData = shiftBlock[type];
        if (typeData && typeData.employees && typeData.employees.length > 0) {
          typeData.employees.forEach((emp) => {
            const row = table.insertRow();

            const nameCell = row.insertCell();
            nameCell.textContent = emp.name;
            nameCell.style.border = "1px solid #ccc";
            nameCell.style.padding = "8px";

            // Формат: готовая продукция / маркировка
            const qtyCell = row.insertCell();
            const qtyDisplay = emp.quantityDisplay || `${emp.quantityRepack || 0} / ${emp.quantitySticker || 0}`;
            qtyCell.textContent = qtyDisplay;
            qtyCell.style.border = "1px solid #ccc";
            qtyCell.style.padding = "8px";
            qtyCell.style.textAlign = "center";

            const effCell = row.insertCell();
            effCell.textContent = (emp.avgEfficiency ?? emp.efficiency) ? `${emp.avgEfficiency ?? emp.efficiency}%` : "-";
            effCell.style.border = "1px solid #ccc";
            effCell.style.padding = "8px";
            effCell.style.textAlign = "center";
            
            // ⏱️ Загрузка сотрудника
            const workloadCell = row.insertCell();
            const empWorkload = emp.workload ?? 0;
            const empWorkloadIcon = emp.workloadIcon ?? "—";
            workloadCell.textContent = `${empWorkload}% ${empWorkloadIcon}`;
            workloadCell.style.border = "1px solid #ccc";
            workloadCell.style.padding = "8px";
            workloadCell.style.textAlign = "center";
          });
        }
      });

      container.appendChild(table);
    });
  } catch (error) {
    hideReportLoadingModal();
    console.error("Ошибка загрузки отчёта для старших смен:", error);
    container.innerHTML =
      "<p style='color:red;'>❌ Ошибка при загрузке отчёта. Попробуйте позже.</p>";
  }
}

// Проверка структуры справочника пользователей (админ-инструмент)
async function checkUserStructure() {
  const btn = document.getElementById("checkStructureBtn");
  const container = document.getElementById("reportContainer");
  if (!container) return;

  if (btn) {
    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = "⏳ Проверка...";
  }

  try {
    const res = await fetch(`${scriptURL}?type=checkUserStructure`);
    const data = await res.json();

    if (data.error) {
      container.innerHTML = `<div style="color: red; padding: 16px; background: #fef2f2; border-radius: 8px;">
        <h3>❌ Ошибка</h3>
        <p>${data.error}</p>
      </div>`;
      return;
    }

    const structure = data.structure;
    let html = `
      <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; margin-top: 16px;">
        <h3>🔍 Структура справочника пользователей</h3>
        <p><strong>Всего строк:</strong> ${structure.totalRows}</p>
        <p><strong>Количество колонок:</strong> ${structure.columnCount}</p>
        
        <h4>📋 Заголовки:</h4>
        <div style="background: white; padding: 8px; border-radius: 4px; margin: 8px 0;">
          ${structure.headers
            .map(
              (header, index) =>
                `<span style="display: inline-block; margin-right: 16px;"><strong>${index}:</strong> ${
                  header || "(пусто)"
                }</span>`
            )
            .join("")}
        </div>
        
        <h4>📊 Примеры данных (первые 3 строки):</h4>
        ${structure.sampleData
          .map(
            (row, index) => `
          <div style="background: white; padding: 8px; border-radius: 4px; margin: 8px 0; font-family: monospace;">
            <strong>Строка ${index + 1}:</strong> ${row
              .map(
                (cell, cellIndex) =>
                  `<span style="margin-right: 16px;"><strong>${cellIndex}:</strong> ${
                    cell || "(пусто)"
                  }</span>`
              )
              .join("")}
          </div>
        `
          )
          .join("")}
        
        <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 4px;">
          <h4>💡 Подсказка:</h4>
          <p>Оклад должен находиться в колонке с индексом <strong>4</strong> (5-я колонка).</p>
          <p>Имя пользователя должно находиться в колонке с индексом <strong>0</strong> (1-я колонка).</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error("❌ Ошибка проверки структуры:", error);
    container.innerHTML = `<div style="color: red; padding: 16px; background: #fef2f2; border-radius: 8px;">
      <h3>❌ Ошибка</h3>
      <p>Не удалось проверить структуру справочника: ${error.message}</p>
    </div>`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// Делаем функции глобальными, т.к. их вызывают auth-and-tabs.js и index.html
window.loadAllDictionariesInBackground = loadAllDictionariesInBackground;
window.loadShiftStatsForLeader = loadShiftStatsForLeader;
window.checkUserStructure = checkUserStructure;

// Сводка по смене
async function loadShiftStats() {
  const start = document.getElementById("unifiedStart").value;
  const end = document.getElementById("unifiedEnd").value;
  
  // Определяем контейнер в зависимости от роли пользователя
  let container;
  if (currentUserRole === "shift_leader") {
    container = document.getElementById("shiftLeaderReportContainer");
  } else {
    container = document.getElementById("reportContainer");
  }

  if (!start || !end) {
    container.innerHTML = "<p style='color:red;'>⚠️ Укажите обе даты</p>";
    return;
  }

  // 🔄 Показываем модальное окно загрузки
  showReportLoadingModal();
  container.innerHTML = "";

  try {
    const res = await fetch(`${scriptURL}?type=shiftStats&start=${start}&end=${end}`);
    const data = await res.json();

    hideReportLoadingModal();

    if (!data || !data.data || !Array.isArray(data.data) || !data.data.length) {
      container.innerHTML = "<p style='text-align:center;'>Нет данных по выбранному периоду</p>";
      return;
    }

    container.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "❌ Закрыть отчёт";
    closeBtn.className = "danger";
    closeBtn.style.marginBottom = "12px";
    closeBtn.onclick = () => (container.innerHTML = "");
    container.appendChild(closeBtn);

    data.data.forEach(shiftBlock => {
      // ⏱️ Загрузка смены
      const shiftWorkload = shiftBlock.total?.workload ?? 0;
      const shiftWorkloadIcon = shiftBlock.total?.workloadIcon ?? "—";
      
      const avgRepackPerPerson = shiftBlock.total?.avgRepackPerPerson ?? 0;
      const employeesCount = shiftBlock.total?.employeesCount ?? 0;
      
      const shiftTitle = document.createElement("div");
      shiftTitle.innerHTML = `
    🕐 <strong>Смена:</strong> ${shiftBlock.shift}
    <br>📦 <strong>Переупаковано за смену:</strong> ${shiftBlock.total?.totalQty ?? 0} шт. <span style="color:#6b7280;">(ср. ${avgRepackPerPerson} шт/чел, ${employeesCount} чел.)</span>
    <br>⚙️ <strong>Средняя эффективность:</strong> ${shiftBlock.total?.overall ?? 0}%
    <br>⏱️ <strong>Средняя загрузка:</strong> ${shiftWorkload}% ${shiftWorkloadIcon}
    <br>👨‍🔧 <strong>Штат:</strong> ${shiftBlock.staff?.totalQty ?? 0} шт. (${shiftBlock.staff?.employees?.length ?? 0} чел.)
    <br>👨‍🎓 <strong>Стажеры:</strong> ${shiftBlock.trainee?.totalQty ?? 0} шт. (${shiftBlock.trainee?.employees?.length ?? 0} чел.)
    <br>📄 <strong>Аутсорсинг:</strong> ${shiftBlock.outsource?.totalQty ?? 0} шт. (${shiftBlock.outsource?.employees?.length ?? 0} чел.)
  `;
      shiftTitle.style.marginTop = "16px";
      container.appendChild(shiftTitle);

      // === ВАЖНО: создаём table ===
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "10px";

      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr style="background:#f3f4f6;">
          <th style="padding:6px; border:1px solid #ccc;">Сотрудник</th>
          <th style="padding:6px; border:1px solid #ccc;">📦/🏷️</th>
          <th style="padding:6px; border:1px solid #ccc;">Эффективность</th>
          <th style="padding:6px; border:1px solid #ccc;">⏱️ Загрузка</th>
          <th style="padding:6px; border:1px solid #ccc;">Нормы</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      const staff = shiftBlock?.staff?.employees || [];
      const outsource = shiftBlock?.outsource?.employees || [];
      const trainee = shiftBlock?.trainee?.employees || [];

      if (staff.length) {
        const staffTitleRow = document.createElement("tr");
        const staffAvgWorkload = shiftBlock.staff?.avgWorkload ?? 0;
        const staffAvgWorkloadIcon = shiftBlock.staff?.avgWorkloadIcon ?? "—";
        staffTitleRow.innerHTML = `
          <td colspan="5" style="padding:6px; font-weight:bold; color:#1f2937;">
            👨‍🔧 Штат (${staff.length} чел., эфф: ${shiftBlock.staff.averageEfficiency}%, загр: ${staffAvgWorkload}% ${staffAvgWorkloadIcon})
          </td>
        `;
        tbody.appendChild(staffTitleRow);

        staff.forEach(emp => {
          const tr = document.createElement("tr");
          
          // Расчет данных о нормах
          const normsMet = emp.opsMet || 0;
          const normsTotal = emp.opsTotal || 0;
          const normsPercent = normsTotal > 0 ? Math.round((normsMet / normsTotal) * 100) : 0;
          
          // Определение иконки для норм
          let normIcon = "—";
          if (normsTotal === 0) normIcon = "—";
          else if (normsPercent >= 90) normIcon = "✅";
          else if (normsPercent >= 60) normIcon = "⚠️";
          else if (normsPercent > 0) normIcon = "❌";
          
          // ⏱️ Загрузка сотрудника
          const empWorkload = emp.workload ?? 0;
          const empWorkloadIcon = emp.workloadIcon ?? "—";
          
          // Используем quantityDisplay если есть, иначе формируем из quantityRepack/quantitySticker
          const qtyDisplay = emp.quantityDisplay || `${emp.quantityRepack || 0} / ${emp.quantitySticker || 0}`;
          tr.innerHTML = `
            <td style="padding:6px; border:1px solid #ccc;">${emp.name}</td>
            <td style="padding:6px; border:1px solid #ccc;">${qtyDisplay}</td>
            <td style="padding:6px; border:1px solid #ccc;">${emp.efficiency}%</td>
            <td style="padding:6px; border:1px solid #ccc;">${empWorkload}% ${empWorkloadIcon}</td>
            <td style="padding:6px; border:1px solid #ccc;">${normsMet}/${normsTotal} (${normsPercent}%) ${normIcon}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      if (trainee.length) {
        const traineeTitleRow = document.createElement("tr");
        const traineeAvgWorkload = shiftBlock.trainee?.avgWorkload ?? 0;
        const traineeAvgWorkloadIcon = shiftBlock.trainee?.avgWorkloadIcon ?? "—";
        traineeTitleRow.innerHTML = `
          <td colspan="5" style="padding:6px; font-weight:bold; color:#059669;">
            👨‍🎓 Стажеры (${trainee.length} чел., эфф: ${shiftBlock.trainee.averageEfficiency}%, загр: ${traineeAvgWorkload}% ${traineeAvgWorkloadIcon})
          </td>
        `;
        tbody.appendChild(traineeTitleRow);

        trainee.forEach(emp => {
          const tr = document.createElement("tr");
          
          // Расчет данных о нормах
          const normsMet = emp.opsMet || 0;
          const normsTotal = emp.opsTotal || 0;
          const normsPercent = normsTotal > 0 ? Math.round((normsMet / normsTotal) * 100) : 0;
          
          // Определение иконки для норм
          let normIcon = "—";
          if (normsTotal === 0) normIcon = "—";
          else if (normsPercent >= 90) normIcon = "✅";
          else if (normsPercent >= 60) normIcon = "⚠️";
          else if (normsPercent > 0) normIcon = "❌";
          
          // ⏱️ Загрузка сотрудника
          const empWorkload = emp.workload ?? 0;
          const empWorkloadIcon = emp.workloadIcon ?? "—";
          
          // Используем quantityDisplay если есть, иначе формируем из quantityRepack/quantitySticker
          const qtyDisplay = emp.quantityDisplay || `${emp.quantityRepack || 0} / ${emp.quantitySticker || 0}`;
          tr.innerHTML = `
            <td style="padding:6px; border:1px solid #ccc;">${emp.name}</td>
            <td style="padding:6px; border:1px solid #ccc;">${qtyDisplay}</td>
            <td style="padding:6px; border:1px solid #ccc;">${emp.efficiency}%</td>
            <td style="padding:6px; border:1px solid #ccc;">${empWorkload}% ${empWorkloadIcon}</td>
            <td style="padding:6px; border:1px solid #ccc;">${normsMet}/${normsTotal} (${normsPercent}%) ${normIcon}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      if (outsource.length) {
        const outTitleRow = document.createElement("tr");
        const outAvgWorkload = shiftBlock.outsource?.avgWorkload ?? 0;
        const outAvgWorkloadIcon = shiftBlock.outsource?.avgWorkloadIcon ?? "—";
        outTitleRow.innerHTML = `
          <td colspan="5" style="padding:6px; font-weight:bold; color:#6b21a8;">
            📄 Аутсорсинг (${outsource.length} чел., эфф: ${shiftBlock.outsource.averageEfficiency}%, загр: ${outAvgWorkload}% ${outAvgWorkloadIcon})
          </td>
        `;
        tbody.appendChild(outTitleRow);

        outsource.forEach(emp => {
          const tr = document.createElement("tr");
          
          // Расчет данных о нормах
          const normsMet = emp.opsMet || 0;
          const normsTotal = emp.opsTotal || 0;
          const normsPercent = normsTotal > 0 ? Math.round((normsMet / normsTotal) * 100) : 0;
          
          // Определение иконки для норм
          let normIcon = "—";
          if (normsTotal === 0) normIcon = "—";
          else if (normsPercent >= 90) normIcon = "✅";
          else if (normsPercent >= 60) normIcon = "⚠️";
          else if (normsPercent > 0) normIcon = "❌";
          
          // ⏱️ Загрузка сотрудника
          const empWorkload = emp.workload ?? 0;
          const empWorkloadIcon = emp.workloadIcon ?? "—";
          
          // Используем quantityDisplay если есть, иначе формируем из quantityRepack/quantitySticker
          const qtyDisplay = emp.quantityDisplay || `${emp.quantityRepack || 0} / ${emp.quantitySticker || 0}`;
          tr.innerHTML = `
            <td style="padding:6px; border:1px solid #ccc;">${emp.name}</td>
            <td style="padding:6px; border:1px solid #ccc;">${qtyDisplay}</td>
            <td style="padding:6px; border:1px solid #ccc;">${emp.efficiency}%</td>
            <td style="padding:6px; border:1px solid #ccc;">${empWorkload}% ${empWorkloadIcon}</td>
            <td style="padding:6px; border:1px solid #ccc;">${normsMet}/${normsTotal} (${normsPercent}%) ${normIcon}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      
      // 📊 ИТОГОВАЯ СТРОКА ПО СМЕНЕ
      const total = shiftBlock.total || {};
      const totalRepack = total.totalQtyRepack || 0;
      const totalSticker = total.totalQtySticker || 0;
      const totalDisplay = total.totalQtyDisplay || `${totalRepack} / ${totalSticker}`;
      const totalWorkload = total.workload ?? 0;
      const totalWorkloadIcon = total.workloadIcon ?? "—";
      
      const totalRow = document.createElement("tr");
      totalRow.style.background = "#e5e7eb";
      totalRow.style.fontWeight = "bold";
      totalRow.innerHTML = `
        <td style="padding:6px; border:1px solid #ccc;">📊 ИТОГО за смену</td>
        <td style="padding:6px; border:1px solid #ccc;">${totalDisplay}</td>
        <td style="padding:6px; border:1px solid #ccc;">${total.overall || 0}%</td>
        <td style="padding:6px; border:1px solid #ccc;">${totalWorkload}% ${totalWorkloadIcon}</td>
        <td style="padding:6px; border:1px solid #ccc;">${total.totalOpsMet || 0}/${total.totalOps || 0}</td>
      `;
      tbody.appendChild(totalRow);

      table.appendChild(tbody);
      container.appendChild(table);
    });

    if (typeof isShiftStatsLoaded !== "undefined") {
      isShiftStatsLoaded = true;
    }

  } catch (err) {
    hideReportLoadingModal();
    container.innerHTML = `<p style='color:red;'>Ошибка: ${err.message}</p>`;
  }
}

// Анализ старших смен
async function loadSeniorsReport() {
  clearReports(); // Очищаем предыдущие отчеты
  
  const start = document.getElementById("unifiedStart").value;
  const end = document.getElementById("unifiedEnd").value;
  const container = document.getElementById("reportContainer");

  if (!start || !end) {
    container.innerHTML = "<p style='color:red;'>⚠️ Укажите обе даты</p>";
    return;
  }

  container.innerHTML = "<p>⌛ Загрузка отчёта по старшим сменам...</p>";

  try {
    const res = await fetch(`${scriptURL}?type=seniorsReport&start=${start}&end=${end}`);

    if (!res.ok) {
      container.innerHTML = `<p style='color:red;'>❌ Ошибка HTTP: ${res.status} ${res.statusText}</p>`;
      return;
    }
    
    const data = await res.json();

    if (!data) {
      container.innerHTML = "<p style='color:red;'>❌ Сервер не вернул данные</p>";
      return;
    }

    if (data.status !== 'success') {
      container.innerHTML = `<p style='color:red;'>❌ Ошибка сервера: ${data.message || 'Неизвестная ошибка'}</p>`;
      return;
    }

    if (!data.data || !Array.isArray(data.data)) {
      container.innerHTML = "<p style='color:red;'>❌ Неверный формат данных от сервера</p>";
      return;
    }

    if (!data.data.length) {
      container.innerHTML = "<p style='text-align:center;'>📭 Нет данных по старшим сменам за выбранный период</p>";
      return;
    }

    container.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "❌ Закрыть отчёт";
    closeBtn.className = "danger";
    closeBtn.style.marginBottom = "12px";
    closeBtn.onclick = () => (container.innerHTML = "");
    container.appendChild(closeBtn);

    // Создаем заголовок отчета
    const reportTitle = document.createElement("div");
    reportTitle.innerHTML = `
      <h3 style="margin-top: 0; color: #8b5cf6;">👨‍💼 Анализ старших смен</h3>
      <p style="color: #000000; margin-bottom: 16px;">Период: ${start} — ${end}</p>
    `;
    container.appendChild(reportTitle);

    // Создаем таблицу
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "10px";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="background:#f3f4f6;">
        <th style="padding:8px; border:1px solid #d1d5db; text-align:left;">Дата</th>
        <th style="padding:8px; border:1px solid #d1d5db; text-align:left;">Смена</th>
        <th style="padding:8px; border:1px solid #d1d5db; text-align:left;">Старший смены</th>
        <th style="padding:8px; border:1px solid #d1d5db; text-align:center;">Эффективность</th>
        <th style="padding:8px; border:1px solid #d1d5db; text-align:center;">Выполнение нормы</th>
        <th style="padding:8px; border:1px solid #d1d5db; text-align:right;">Зарплата</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // Группируем данные по сменам
    const shiftsData = {};
    data.data.forEach(item => {
      const shiftKey = item.shift;
      if (!shiftsData[shiftKey]) {
        shiftsData[shiftKey] = [];
      }
      shiftsData[shiftKey].push(item);
    });

    // Сортируем смены
    const sortedShifts = Object.keys(shiftsData).sort();

    sortedShifts.forEach(shift => {
      const shiftItems = shiftsData[shift];
      
      // Заголовок смены
      const shiftHeader = document.createElement("tr");
      shiftHeader.innerHTML = `
        <td colspan="6" style="padding:8px; font-weight:bold; color:#8b5cf6; background:#f8f7ff; border:1px solid #d1d5db;">
          🕐 ${shift}
        </td>
      `;
      tbody.appendChild(shiftHeader);

      // Сортируем записи по дате
      shiftItems.sort((a, b) => new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-')));

      shiftItems.forEach(item => {
        const tr = document.createElement("tr");
        
        // Определяем цвет строки в зависимости от эффективности
        let rowStyle = "";
        if (item.efficiency >= 100) {
          rowStyle = "background:#ecfdf5;"; // Зеленый для высокой эффективности
        } else if (item.efficiency >= 90) {
          rowStyle = "background:#fef3c7;"; // Желтый для средней эффективности
        } else {
          rowStyle = "background:#fef2f2;"; // Красный для низкой эффективности
        }

        tr.innerHTML = `
          <td style="padding:8px; border:1px solid #d1d5db; ${rowStyle}">${item.date}</td>
          <td style="padding:8px; border:1px solid #d1d5db; ${rowStyle}">${item.shift}</td>
          <td style="padding:8px; border:1px solid #d1d5db; ${rowStyle}">${item.name}</td>
          <td style="padding:8px; border:1px solid #d1d5db; text-align:center; ${rowStyle}">
            <span style="font-weight:bold; color:${item.efficiency >= 100 ? '#059669' : item.efficiency >= 90 ? '#d97706' : '#dc2626'}">
              ${item.efficiency}%
            </span>
          </td>
          <td style="padding:8px; border:1px solid #d1d5db; text-align:center; ${rowStyle}">
            <span style="font-weight:bold; color:${item.norm >= 90 ? '#059669' : '#dc2626'}">
              ${item.norm}%
            </span>
          </td>
          <td style="padding:8px; border:1px solid #d1d5db; text-align:right; ${rowStyle}">
            <strong>${item.salary.toLocaleString('ru-RU')} ₽</strong>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });

    table.appendChild(tbody);

    // Оборачиваем таблицу в scrollDiv
    const scrollDiv = document.createElement("div");
    scrollDiv.className = "table-scroll";
    scrollDiv.appendChild(table);
    container.appendChild(scrollDiv);

    // Добавляем сводку
    const totalSalary = data.data.reduce((sum, item) => sum + (item.salary || 0), 0);
    const avgEfficiency = data.data.reduce((sum, item) => sum + (item.efficiency || 0), 0) / data.data.length;
    const avgNorm = data.data.reduce((sum, item) => sum + (item.norm || 0), 0) / data.data.length;

    const summary = document.createElement("div");
    summary.style.marginTop = "16px";
    summary.style.padding = "16px";
    summary.style.background = "#f8f7ff";
    summary.style.borderRadius = "8px";
    summary.style.fontWeight = "500";
    summary.innerHTML = `
      📊 <b>Сводка по периоду:</b><br>
      👨‍💼 <strong>Всего смен:</strong> ${data.data.length} |
      💰 <strong>Общая зарплата:</strong> ${totalSalary.toLocaleString('ru-RU')} ₽ |
      📈 <strong>Средняя эффективность:</strong> ${Math.round(avgEfficiency)}% |
      ✅ <strong>Среднее выполнение нормы:</strong> ${Math.round(avgNorm)}%
    `;
    container.appendChild(summary);

  } catch (err) {
    container.innerHTML = `<p style='color:red;'>Ошибка загрузки: ${err.message}</p>`;
  }
}

