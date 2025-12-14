// ===== АНАЛИТИКА НАСТАВНИЧЕСТВА ЗА ПЕРИОД =====

async function loadTraineeAnalytics() {
  const startDate = document.getElementById("analyticsStartDate").value;
  const endDate = document.getElementById("analyticsEndDate").value;
  const container = document.getElementById("traineeAnalyticsResults");
  const btn = document.getElementById("loadAnalyticsBtn");
  
  if (!startDate || !endDate) {
    container.innerHTML = '<p style="color: #dc2626;">❗ Выберите период для анализа</p>';
    return;
  }
  
  try {
    btn.disabled = true;
    btn.textContent = "⏳ Загрузка...";
    
    const response = await fetch(`${scriptURL}?type=mentorshipAnalytics&startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    if (data.error) {
      container.innerHTML = `<p style="color: #dc2626;">❌ ${data.error}</p>`;
      return;
    }
    
    if (!data.analytics || data.analytics.length === 0) {
      container.innerHTML = '<p style="color: #000000;">📊 Нет данных за выбранный период</p>';
      return;
    }
    
    let html = '<div style="display: grid; gap: 16px;">';
    
    data.analytics.forEach(pair => {
      html += `
        <div class="analytics-card">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div style="font-weight: 600; color: #374151;">
              👨‍💼 ${pair.mentor} → 👨‍🎓 ${pair.trainee}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; color: #000000;">Рабочих дней: ${pair.workingDays}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            <div style="text-align: center; padding: 8px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-size: 18px; font-weight: 600; color: #3b82f6;">${pair.totalQuantity}</div>
              <div style="font-size: 12px; color: #000000;">Общее количество</div>
            </div>
            <div style="text-align: center; padding: 8px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-size: 18px; font-weight: 600; color: #10b981;">${pair.totalOperations}</div>
              <div style="font-size: 12px; color: #000000;">Операций</div>
            </div>
            <div style="text-align: center; padding: 8px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-size: 18px; font-weight: 600; color: #f59e0b;">${pair.avgQuantityPerDay}</div>
              <div style="font-size: 12px; color: #000000;">В день (среднее)</div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
  } catch (error) {
    console.error("Ошибка загрузки аналитики:", error);
    container.innerHTML = '<p style="color: #dc2626;">❌ Ошибка загрузки аналитики</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = "📊 Загрузить аналитику";
  }
}


