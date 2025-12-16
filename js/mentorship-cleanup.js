// ===== ОЧИСТКА ВСЕХ СВЯЗЕЙ НАСТАВНИЧЕСТВА =====

async function cleanupAllMentorshipPairs(execute = false) {
  const container = document.getElementById("cleanupResults");
  const previewBtn = document.getElementById("previewCleanupBtn");
  const executeBtn = document.getElementById("executeCleanupBtn");
  
  if (!container) {
    console.error("❌ Контейнер cleanupResults не найден");
    return;
  }
  
  if (execute && !confirm("❓ Вы УВЕРЕНЫ, что хотите удалить ВСЕ связи наставничества?\n\n⚠️ Эта операция необратима!\n\nВсе наставники перестанут получать бонусы.")) {
    return;
  }
  
  try {
    const btn = execute ? executeBtn : previewBtn;
    if (btn) {
      btn.disabled = true;
      btn.textContent = execute ? "⏳ Очистка..." : "⏳ Анализ...";
    }
    
    container.style.display = "block";
    container.innerHTML = execute ? 
      '<p style="color: #000000;">🧹 Выполняется очистка всех связей...</p>' :
      '<p style="color: #000000;">🔍 Анализируются связи для очистки...</p>';
    
    if (execute) {
      // Выполняем реальную очистку через сервер
      const response = await fetch(`${scriptURL}?type=cleanupAllMentorships`);
      const data = await response.json();
      
      if (data.success) {
        container.innerHTML = `
          <div style="color: #059669; background: #d1fae5; padding: 12px; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0;">✅ Очистка выполнена</h4>
            <p style="margin: 0;">Удалено связей: ${data.clearedCount}</p>
          </div>
        `;
        
        // Обновляем список связей если он открыт
        const pairsSection = document.getElementById("traineeSection-pairs");
        if (pairsSection && pairsSection.style.display !== "none") {
          setTimeout(() => loadMentorshipPairs(), 1000);
        }
      } else {
        container.innerHTML = `
          <div style="color: #dc2626; background: #fee2e2; padding: 12px; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0;">❌ Ошибка очистки</h4>
            <p style="margin: 0;">${data.error}</p>
          </div>
        `;
      }
    } else {
      // Предварительный просмотр - получаем текущие связи
      const response = await fetch(`${scriptURL}?type=employees`);
      const data = await response.json();
      
      let pairsCount = 0;
      if (data.employeesData) {
        // Подсчитываем количество связей (упрощенно)
        data.employeesData.forEach(emp => {
          if (emp.mentor && emp.mentor.trim()) {
            pairsCount++;
          }
        });
      }
      
      container.innerHTML = `
        <div style="color: #3b82f6; background: #dbeafe; padding: 12px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0;">🔍 Предварительный просмотр</h4>
          <p style="margin: 0;">Найдено связей для очистки: ${pairsCount}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.8;">
            ${pairsCount > 0 ? 'Будут удалены ВСЕ связи наставничества.' : 'Связи для очистки не найдены.'}
          </p>
        </div>
      `;
    }
    
  } catch (error) {
    console.error("❌ Ошибка очистки:", error);
    
    let userMessage = "Ошибка сети при очистке связей";
    if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch")) {
      userMessage = "Нет связи с сервером. Проверьте интернет-подключение.";
    } else if (error.message?.includes("HTTP")) {
      userMessage = error.message;
    }
    
    container.innerHTML = `<p style="color: #dc2626;">❌ ${userMessage}</p>`;
  } finally {
    const btn = execute ? executeBtn : previewBtn;
    if (btn) {
      btn.disabled = false;
      btn.textContent = execute ? "🧹 Выполнить очистку" : "🔍 Предварительный просмотр";
    }
  }
}


