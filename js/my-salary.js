// ===== БЛОК "МОЯ ЗАРПЛАТА" =====

let isMySalaryLoading = false;

async function loadMySalary() {
  if (isMySalaryLoading) return;
  isMySalaryLoading = true;

  const showBtn = document.getElementById("mySalaryBtn");
  const closeBtn = document.getElementById("closeMySalaryBtn");
  const container = document.getElementById("mySalaryOutput");
  const totalQtyBlock = document.getElementById("totalQty");
  
  // Блокируем обе кнопки во время загрузки
  if (showBtn) {
    showBtn.disabled = true;
    showBtn.textContent = "⏳ Загружаем результаты...";
    showBtn.style.opacity = "0.6";
  }
  
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.6";
    closeBtn.style.cursor = "not-allowed";
  }

  // Очищаем старые данные сразу
  container.innerHTML = "";
  totalQtyBlock.innerHTML = "";

  try {
    const employee = localStorage.getItem("currentUser") || "";
    const start = document.getElementById("salaryStart").value;
    const end = document.getElementById("salaryEnd").value;

    if (!employee || !start || !end) {
      container.innerHTML = "<p style='text-align:center; color:#f59e0b;'>⚠️ Укажите все поля: период и сотрудник</p>";
      return;
    }

    const res = await fetch(`${scriptURL}?type=mySalary&employee=${encodeURIComponent(employee)}&start=${start}&end=${end}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();

    // Проверяем наличие ошибки с сервера
    if (data.error) {
      container.innerHTML = `<p style='text-align:center; color:#dc2626;'>${data.error}</p>`;
      return;
    }

    if (!data.records || data.records.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:#6b7280;'>📭 Нет данных за выбранный период</p>";
      return;
    }

    // 📦 Группировка по дате и смене
    const grouped = {};

    data.records.forEach(r => {
      const date = formatDate(r.date);
      const shift = r.shift || "День"; // Fallback для старых записей
      const key = `${date}-${shift}`;
      
      if (!grouped[key]) {
        grouped[key] = { 
          date: date,
          shift: shift,
          qty: 0, 
          wage: 0,
          mentorBonus: 0,
          effs: [],
          repackaged: 0,
          stickered: 0,
          operations: []
        };
      }
    
      grouped[key].qty += r.quantity || 0;
      grouped[key].wage += r.wage || 0;
      grouped[key].mentorBonus += r.mentorBonus || 0;
    
      if (r.efficiency !== undefined && r.efficiency !== null) {
        grouped[key].effs.push(r.efficiency);
      }

      // Разделяем по типам операций
      if (r.operation === "Маркировка продукции ш/к") {
        grouped[key].stickered += r.quantity || 0;
      } else {
        grouped[key].repackaged += r.quantity || 0;
      }
      
      // Сохраняем детали операций
      grouped[key].operations.push({
        operation: r.operation,
        quantity: r.quantity,
        efficiency: r.efficiency,
        wage: r.wage,
        mentorBonus: r.mentorBonus,
        bonusPercent: r.bonusPercent,
        normStatus: r.normStatus
      });
    });

    let html = `
      <table style="width:100%; border-collapse: collapse; font-size:14px; min-width: 800px;">
        <thead style="background:#f3f4f6;">
          <tr>
            <th style="padding:8px; border:1px solid #ccc;">📅 Дата</th>
            <th style="padding:8px; border:1px solid #ccc;">🌅 Смена</th>
            <th style="padding:8px; border:1px solid #ccc;">📦 Переупак.</th>
            <th style="padding:8px; border:1px solid #ccc;">🏷️ Маркир.</th>
            <th style="padding:8px; border:1px solid #ccc;">⚙️ Эффект.</th>
            <th style="padding:8px; border:1px solid #ccc;">💰 Основная</th>
            <th style="padding:8px; border:1px solid #ccc;">👨‍🏫 Бонус наставника</th>
            <th style="padding:8px; border:1px solid #ccc;">💵 Итого</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Сортируем по дате и смене
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      const [dateA, shiftA] = a.split('-');
      const [dateB, shiftB] = b.split('-');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      // День идет перед Ночью
      if (shiftA === 'День' && shiftB === 'Ночь') return -1;
      if (shiftA === 'Ночь' && shiftB === 'День') return 1;
      return 0;
    });

    sortedEntries.forEach(([key, stats]) => {
      const avgEff = stats.effs.length
        ? Math.round(stats.effs.reduce((a, b) => a + b, 0) / stats.effs.length)
        : "-";
      
      // Рассчитываем основную зарплату (общая - бонус наставника)
      const basicWage = stats.wage - stats.mentorBonus;
      
      // Иконка и цвет для смены
      const shiftIcon = stats.shift === 'День' ? '☀️' : '🌙';
      const shiftBg = stats.shift === 'День' ? '#fef3c7' : '#ddd6fe';
      
      html += `
        <tr>
          <td style="padding:6px; border:1px solid #ccc;">${stats.date}</td>
          <td style="padding:6px; border:1px solid #ccc; background:${shiftBg}; font-weight:bold;">${shiftIcon} ${stats.shift}</td>
          <td style="padding:6px; border:1px solid #ccc;">${stats.repackaged}</td>
          <td style="padding:6px; border:1px solid #ccc;">${stats.stickered}</td>
          <td style="padding:6px; border:1px solid #ccc;">${avgEff}%</td>
          <td style="padding:6px; border:1px solid #ccc;">${basicWage.toFixed(2)} ₽</td>
          <td style="padding:6px; border:1px solid #ccc; ${stats.mentorBonus > 0 ? 'background:#f0f9ff; font-weight:bold;' : ''}">${stats.mentorBonus.toFixed(2)} ₽</td>
          <td style="padding:6px; border:1px solid #ccc; font-weight:bold;">${stats.wage.toFixed(2)} ₽</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  
    // === ИТОГОВЫЕ ПОКАЗАТЕЛИ С РАЗДЕЛЕНИЕМ ПО СМЕНАМ ===
    const totals = data.totals || {};
    const dayTotals = data.dayTotals || {};
    const nightTotals = data.nightTotals || {};
    
    const totalBasicWage = (totals.totalWage || 0) - (totals.totalMentorBonus || 0);
    const dayBasicWage = (dayTotals.totalWage || 0) - (dayTotals.totalMentorBonus || 0);
    const nightBasicWage = (nightTotals.totalWage || 0) - (nightTotals.totalMentorBonus || 0);
    
    // Создаем блоки только если есть данные для соответствующей смены
    let shiftsHTML = '';
    
    if (dayTotals.totalQuantity > 0) {
      shiftsHTML += `
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde047 20%); padding:12px; border-radius:8px; border:1px solid #eab308; margin-bottom: 8px;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 8px; color: #000000;">☀️ Дневные смены</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; text-align: center; font-size: 12px; color: #000000;">
            <div><strong>💰 Основная:</strong><br>${dayBasicWage.toFixed(2)} ₽</div>
            <div><strong>👨‍🏫 Бонус наставника:</strong><br>${(dayTotals.totalMentorBonus || 0).toFixed(2)} ₽</div>
            <div><strong>💵 Итого:</strong><br>${(dayTotals.totalWage || 0).toFixed(2)} ₽</div>
            <div><strong>📦 Переупак.:</strong><br>${dayTotals.totalRepackaged || 0} шт</div>
            <div><strong>🏷️ Маркир.:</strong><br>${dayTotals.totalStickered || 0} шт</div>
            <div><strong>⚙️ Эффект.:</strong><br>${dayTotals.avgEfficiency || 0}%</div>
            <div><strong>📊 Нормы:</strong><br>${dayTotals.normsCompleted || 0}/${dayTotals.totalNorms || 0} (${dayTotals.normPercentage || 0}%)</div>
          </div>
        </div>
      `;
    }
    
    if (nightTotals.totalQuantity > 0) {
      shiftsHTML += `
        <div style="background: linear-gradient(135deg, #ddd6fe 0%, #c084fc 20%); padding:12px; border-radius:8px; border:1px solid #8b5cf6; margin-bottom: 8px;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 8px; color: #000000;">🌙 Ночные смены</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; text-align: center; font-size: 12px; color: #000000;">
            <div><strong>💰 Основная:</strong><br>${nightBasicWage.toFixed(2)} ₽</div>
            <div><strong>👨‍🏫 Бонус наставника:</strong><br>${(nightTotals.totalMentorBonus || 0).toFixed(2)} ₽</div>
            <div><strong>💵 Итого:</strong><br>${(nightTotals.totalWage || 0).toFixed(2)} ₽</div>
            <div><strong>📦 Переупак.:</strong><br>${nightTotals.totalRepackaged || 0} шт</div>
            <div><strong>🏷️ Маркир.:</strong><br>${nightTotals.totalStickered || 0} шт</div>
            <div><strong>⚙️ Эффект.:</strong><br>${nightTotals.avgEfficiency || 0}%</div>
            <div><strong>📊 Нормы:</strong><br>${nightTotals.normsCompleted || 0}/${nightTotals.totalNorms || 0} (${nightTotals.normPercentage || 0}%)</div>
          </div>
        </div>
      `;
    }
    
    totalQtyBlock.innerHTML = `
      ${shiftsHTML}
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding:16px; border-radius:12px; border:2px solid #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); color: #000000 !important;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 16px;">💵 Итого</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; text-align: center; font-size: 13px; line-height: 1.4;">
          <div><strong>💰 Основная:</strong><br>${totalBasicWage.toFixed(2)} ₽</div>
          <div><strong>👨‍🏫 Бонус наставника:</strong><br>${(totals.totalMentorBonus || 0).toFixed(2)} ₽</div>
          <div><strong>💵 Итого:</strong><br>${(totals.totalWage || 0).toFixed(2)} ₽</div>
          <div><strong>📦 Переупак.:</strong><br>${totals.totalRepackaged || 0} шт</div>
          <div><strong>🏷️ Маркир.:</strong><br>${totals.totalStickered || 0} шт</div>
          <div><strong>⚙️ Эффект.:</strong><br>${totals.avgEfficiency || 0}%</div>
          <div><strong>📊 Нормы:</strong><br>${totals.normsCompleted || 0}/${totals.totalNorms || 0} (${totals.normPercentage || 0}%)</div>
        </div>
      </div>
    `;

    // Показываем кнопку закрытия
    if (closeBtn) closeBtn.style.display = "inline-block";

  } catch (err) {
    console.error("Ошибка загрузки зарплаты:", err);
    
    // Показываем пользователю понятное сообщение об ошибке
    let userMessage = "❌ Ошибка загрузки данных";
    if (err.message.includes("fetch")) {
      userMessage = "🌐 Проблемы с подключением к серверу";
    } else if (err.message.includes("JSON")) {
      userMessage = "📄 Ошибка обработки данных с сервера";
    } else if (err.message.includes("HTTP 403")) {
      userMessage = "🔒 Недостаточно прав доступа";
    } else if (err.message.includes("HTTP 500")) {
      userMessage = "⚙️ Ошибка сервера, попробуйте позже";
    }
    
    container.innerHTML = `<p style="text-align:center; color:#dc2626;">${userMessage}</p>`;
    totalQtyBlock.innerHTML = "";
  
  } finally {
    isMySalaryLoading = false;
    
    // Разблокируем кнопку "Показать мои результаты"
    if (showBtn) {
      showBtn.disabled = false;
      showBtn.textContent = "📊 Показать мои результаты";
      showBtn.style.opacity = "1";
    }
    
    // Разблокируем кнопку "Закрыть мои результаты"
    if (closeBtn) {
      closeBtn.disabled = false;
      closeBtn.style.opacity = "1";
      closeBtn.style.cursor = "pointer";
    }
  }
}

function closeMySalary() {
  document.getElementById("mySalaryOutput").innerHTML = "";
  document.getElementById("totalQty").innerHTML = "";

  const closeBtn = document.getElementById("closeMySalaryBtn");
  if (closeBtn) closeBtn.style.display = "none";
}


