// ===== АНАЛИЗ СЕБЕСТОИМОСТИ =====

function initializeCostAnalysis() {
  // Устанавливаем даты по умолчанию
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  
  document.getElementById("costStartDate").value = weekAgo.toISOString().split('T')[0];
  document.getElementById("costEndDate").value = today.toISOString().split('T')[0];
}

async function calculateCostAnalysis() {
  const startDate = document.getElementById("costStartDate").value;
  const endDate = document.getElementById("costEndDate").value;
  const resultDiv = document.getElementById("costResults");
  
  if (!startDate || !endDate) {
    resultDiv.innerHTML = '<p style="color: red;">❌ Выберите период для анализа</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>🔄 Рассчитываем себестоимость...</p>';
  
  try {
    const response = await fetch(`${scriptURL}?type=costAnalysis&start=${startDate}&end=${endDate}`);
    const data = await response.json();
    
    if (data.status === "success") {
      displayCostResults(data);
    } else {
      resultDiv.innerHTML = `<p style="color: red;">❌ Ошибка: ${data.message}</p>`;
    }
  } catch (error) {
    console.error("Ошибка расчёта себестоимости:", error);
    resultDiv.innerHTML = '<p style="color: red;">❌ Ошибка при расчёте</p>';
  }
}

function displayCostResults(data) {
  const resultDiv = document.getElementById("costResults");
  
  let html = `
    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 16px; color: white; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">📊 Результаты анализа ФОТ</h3>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Период: ${data.period}</p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; text-align: center; box-shadow: 0 4px 20px rgba(240,147,251,0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">${data.totalAllQuantity.toLocaleString()}</div>
        <div style="font-size: 14px; opacity: 0.9;">📦 Общее количество (шт)</div>
      </div>
      
      <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 12px; color: white; text-align: center; box-shadow: 0 4px 20px rgba(250,112,154,0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">${data.totalAllCosts.toLocaleString()} ₽</div>
        <div style="font-size: 14px; opacity: 0.9;">💰 Общие расходы ФОТ</div>
      </div>
    </div>
  `;
  
  if (Object.keys(data.volumes).length === 0) {
    html += '<div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; text-align: center;">❌ Нет данных за выбранный период</div>';
  } else {
    html += `
      <div style="background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 16px;">
          <h4 style="margin: 0; font-size: 18px; font-weight: 600;">📈 Себестоимость ФОТ по объемам</h4>
        </div>
        <div class="table-scroll">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Объём</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Кол-во</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">ФОТ Себест. ₽/шт</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Общие затраты</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.keys(data.volumes).sort().forEach((volume, index) => {
      const vol = data.volumes[volume];
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
        <tr style="background: ${rowBg}; transition: background-color 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='${rowBg}'">
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${volume}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${vol.quantity.toLocaleString()}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #2563eb; font-size: 16px;">${vol.unitCost}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${vol.totalCost.toLocaleString()} ₽</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  resultDiv.innerHTML = html;
}

async function calculateCostAnalysisWithMaterials() {
  const startDate = document.getElementById("costStartDate").value;
  const endDate = document.getElementById("costEndDate").value;
  const resultDiv = document.getElementById("costResults");
  
  if (!startDate || !endDate) {
    resultDiv.innerHTML = '<p style="color: red;">❌ Выберите период для анализа</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>🔄 Рассчитываем себестоимость ФОТ + Материалы...</p>';
  
  try {
    const response = await fetch(`${scriptURL}?type=costAnalysisWithMaterials&start=${startDate}&end=${endDate}`);
    const data = await response.json();
    
    if (data.status === "success") {
      displayCostResultsWithMaterials(data);
    } else {
      resultDiv.innerHTML = `<p style="color: red;">❌ Ошибка: ${data.message}</p>`;
    }
  } catch (error) {
    console.error("Ошибка расчёта себестоимости с материалами:", error);
    resultDiv.innerHTML = '<p style="color: red;">❌ Ошибка при расчёте</p>';
  }
}

async function calculateCostAnalysisForSetsFotOnly() {
  const startDate = document.getElementById("costStartDate").value;
  const endDate = document.getElementById("costEndDate").value;
  const resultDiv = document.getElementById("costResults");
  
  if (!startDate || !endDate) {
    resultDiv.innerHTML = '<p style="color: red;">❌ Выберите период для анализа</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>🔄 Рассчитываем себестоимость наборов (только ФОТ)...</p>';
  
  try {
    const response = await fetch(`${scriptURL}?type=costAnalysisForSetsFotOnly&start=${startDate}&end=${endDate}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === "success") {
      displayCostResultsForSetsFotOnly(data);
    } else if (data.status === "fail" && data.message) {
      resultDiv.innerHTML = `
        <div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <h4 style="margin-top: 0;">❌ Ошибка расчёта ФОТ себестоимости наборов</h4>
          <p style="margin-bottom: 0;"><strong>Детали:</strong> ${data.message}</p>
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer;">🔍 Рекомендации по устранению</summary>
            <ul style="margin-top: 10px;">
              <li>Убедитесь что все необходимые листы данных существуют</li>
              <li>Проверьте права доступа к Google Sheets</li>
              <li>Попробуйте выбрать другой период</li>
              <li>Убедитесь что есть данные по операциям сборки наборов</li>
            </ul>
          </details>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<p style="color: red;">❌ Неизвестная ошибка: ${JSON.stringify(data)}</p>`;
    }
  } catch (error) {
    console.error("Ошибка расчёта ФОТ себестоимости наборов:", error);
    resultDiv.innerHTML = `
      <div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; margin: 10px 0;">
        <h4 style="margin-top: 0;">❌ Ошибка соединения</h4>
        <p><strong>Причина:</strong> ${error.message}</p>
        <p style="margin-bottom: 0;"><strong>Рекомендации:</strong></p>
        <ul>
          <li>Проверьте интернет-соединение</li>
          <li>Обновите страницу и попробуйте снова</li>
          <li>Проверьте правильность URL скрипта</li>
        </ul>
      </div>
    `;
  }
}

async function calculateCostAnalysisForSets() {
  const startDate = document.getElementById("costStartDate").value;
  const endDate = document.getElementById("costEndDate").value;
  const resultDiv = document.getElementById("costResults");
  
  if (!startDate || !endDate) {
    resultDiv.innerHTML = '<p style="color: red;">❌ Выберите период для анализа</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>🔄 Рассчитываем себестоимость наборов (ФОТ + Материалы)...</p>';
  
  try {
    const response = await fetch(`${scriptURL}?type=costAnalysisForSets&start=${startDate}&end=${endDate}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === "success") {
      displayCostResultsForSets(data);
    } else if (data.status === "fail" && data.message) {
      resultDiv.innerHTML = `
        <div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <h4 style="margin-top: 0;">❌ Ошибка расчёта себестоимости наборов</h4>
          <p style="margin-bottom: 0;"><strong>Детали:</strong> ${data.message}</p>
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer;">🔍 Рекомендации по устранению</summary>
            <ul style="margin-top: 10px;">
              <li>Проверьте наличие справочника "Справочник_расчетов_стоимости_упаковки_наборов"</li>
              <li>Убедитесь что все необходимые листы данных существуют</li>
              <li>Проверьте права доступа к Google Sheets</li>
              <li>Попробуйте выбрать другой период</li>
            </ul>
          </details>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<p style="color: red;">❌ Неизвестная ошибка: ${JSON.stringify(data)}</p>`;
    }
  } catch (error) {
    console.error("Ошибка расчёта себестоимости наборов:", error);
    resultDiv.innerHTML = `
      <div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; margin: 10px 0;">
        <h4 style="margin-top: 0;">❌ Ошибка соединения</h4>
        <p><strong>Причина:</strong> ${error.message}</p>
        <p style="margin-bottom: 0;"><strong>Рекомендации:</strong></p>
        <ul>
          <li>Проверьте интернет-соединение</li>
          <li>Обновите страницу и попробуйте снова</li>
          <li>Проверьте правильность URL скрипта</li>
        </ul>
      </div>
    `;
  }
}

function displayCostResultsWithMaterials(data) {
  const resultDiv = document.getElementById("costResults");
  
  let html = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 16px; color: white; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">📊 Результаты анализа ФОТ + Материалы</h3>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Период: ${data.period}</p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 20px; border-radius: 12px; color: white; text-align: center; box-shadow: 0 4px 20px rgba(255,154,158,0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">${data.totalAllQuantity.toLocaleString()}</div>
        <div style="font-size: 14px; opacity: 0.9;">📦 Общее количество (шт)</div>
      </div>
      
      <div style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); padding: 20px; border-radius: 12px; color: white; text-align: center; box-shadow: 0 4px 20px rgba(48,207,208,0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">${data.totalAllCosts.toLocaleString()} ₽</div>
        <div style="font-size: 14px; opacity: 0.9;">💰 Общие расходы (ФОТ + Материалы)</div>
      </div>
    </div>
  `;
  
  if (Object.keys(data.volumes).length === 0) {
    html += '<div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; text-align: center;">❌ Нет данных за выбранный период</div>';
  } else {
    html += `
      <div style="background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px;">
          <h4 style="margin: 0; font-size: 18px; font-weight: 600;">📈 Себестоимость ФОТ + Материалы по объёмам</h4>
        </div>
        <div class="table-scroll">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Объём</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Кол-во</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Полная себест. ₽/шт</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Общие затраты</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.keys(data.volumes).sort().forEach((volume, index) => {
      const vol = data.volumes[volume];
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
        <tr style="background: ${rowBg}; transition: background-color 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='${rowBg}'">
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${volume}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${vol.quantity.toLocaleString()}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #2563eb; font-size: 16px;">${vol.unitCost}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${vol.totalCost.toLocaleString()} ₽</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  resultDiv.innerHTML = html;
}

function displayCostResultsForSetsFotOnly(data) {
  const resultDiv = document.getElementById("costResults");
  
  let html = `
    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 16px; color: white; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">📊 Себестоимость наборов (только ФОТ)</h3>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Период: ${data.period}</p>
    </div>
  `;
  
  if (!data.sets || Object.keys(data.sets).length === 0) {
    html += '<div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; text-align: center;">❌ Нет данных по наборам за выбранный период</div>';
  } else {
    html += `
      <div style="background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 16px;">
          <h4 style="margin: 0; font-size: 18px; font-weight: 600;">📦 Себестоимость наборов по артикулам (ФОТ)</h4>
        </div>
        <div class="table-scroll">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Артикул набора</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Кол-во</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">ФОТ Себест. ₽/набор</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Общие затраты</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.keys(data.sets).sort().forEach((setNumber, index) => {
      const set = data.sets[setNumber];
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
        <tr style="background: ${rowBg}; transition: background-color 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='${rowBg}'">
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${setNumber}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${set.quantity.toLocaleString()}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #2563eb; font-size: 16px;">${set.unitCost}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${set.totalCost.toLocaleString()} ₽</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  resultDiv.innerHTML = html;
}

function displayCostResultsForSets(data) {
  const resultDiv = document.getElementById("costResults");
  
  let html = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 16px; color: white; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(15,23,42,0.4);">
      <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">📊 Себестоимость наборов (ФОТ + Материалы)</h3>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Период: ${data.period}</p>
    </div>
  `;
  
  if (!data.sets || Object.keys(data.sets).length === 0) {
    html += '<div style="background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; text-align: center;">❌ Нет данных по наборам за выбранный период</div>';
  } else {
    html += `
      <div style="background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.2); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 16px;">
          <h4 style="margin: 0; font-size: 18px; font-weight: 600;">📦 Себестоимость наборов по артикулам (ФОТ + Материалы)</h4>
        </div>
        <div class="table-scroll">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Артикул набора</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Кол-во</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Полная себест. ₽/набор</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Общие затраты</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    Object.keys(data.sets).sort().forEach((setNumber, index) => {
      const set = data.sets[setNumber];
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
        <tr style="background: ${rowBg}; transition: background-color 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='${rowBg}'">
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${setNumber}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${set.quantity.toLocaleString()}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #2563eb; font-size: 16px;">${set.unitCost}</td>
          <td style="padding: 12px 16px; text-align: right; color: #475569;">${set.totalCost.toLocaleString()} ₽</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  resultDiv.innerHTML = html;
}

// ===== ВЫГРУЗКА ОТЧЁТА НА СЕРВЕР =====

async function saveReportToServer() {
  const startDate = document.getElementById("costStartDate").value;
  const endDate = document.getElementById("costEndDate").value;

  if (!startDate || !endDate) {
    alert("❌ Выберите период для сохранения отчета");
    return;
  }

  // Показываем индикатор загрузки в кнопке
  const button = document.querySelector('button[onclick="saveReportToServer()"]');
  if (button) {
    button.disabled = true;
    button.innerHTML = "🔄 Сохраняем...";
  }

  try {
    const response = await fetch(
      `${scriptURL}?type=saveReport&reportType=fot&start=${startDate}&end=${endDate}`
    );
    const data = await response.json();

    if (data.status === "success") {
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ Ошибка: ${data.message}`);
    }
  } catch (error) {
    console.error("Ошибка сохранения отчета:", error);
    alert("❌ Ошибка при сохранении отчета на сервер");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = "💾 Выгрузить отчет себестоимости на сервер";
    }
  }
}

// ===== ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ =====
// Эти функции вызываются из index.html (onclick) и auth-and-tabs.js
window.initializeCostAnalysis = initializeCostAnalysis;
window.calculateCostAnalysis = calculateCostAnalysis;
window.calculateCostAnalysisWithMaterials = calculateCostAnalysisWithMaterials;
window.calculateCostAnalysisForSetsFotOnly = calculateCostAnalysisForSetsFotOnly;
window.calculateCostAnalysisForSets = calculateCostAnalysisForSets;
window.saveReportToServer = saveReportToServer;
