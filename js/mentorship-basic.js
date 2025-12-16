// ===== БАЗОВОЕ УПРАВЛЕНИЕ СВЯЗЯМИ НАСТАВНИК ↔ СТАЖЕР =====

// Показ контейнера управления стажерами (вызывается через switchTab / кнопки)
function showTraineeManagement() {
  document.getElementById("adminContainer").style.display = "none";
  document.getElementById("mySalaryContainer").style.display = "none";
  document.getElementById("ratesContainer").style.display = "none";
  document.getElementById("costAnalysisContainer").style.display = "none";
  document.getElementById("duplicatesContainer").style.display = "none";
  document.getElementById("loginContainer").style.display = "none";
  
  // Показываем контейнер управления стажерами
  document.getElementById("traineeManagementContainer").style.display = "block";
  
  // Предзагружаем списки наставников и стажеров и текущие связи
  setTimeout(() => {
    loadMentorsAndTrainees();
    loadMentorshipPairs();
  }, 500);
}

function hideTraineeManagement() {
  document.getElementById("traineeManagementContainer").style.display = "none";
  
  // Возвращаемся к админ-панели в зависимости от роли
  if (currentUser && (currentUserRole === "master" || currentUserRole === "admin")) {
    switchTab("admin");
  } else {
    switchTab("profile");
  }
}

// Загрузка и отображение текущих связей наставничества
async function loadMentorshipPairs() {
  const btn = document.getElementById("refreshPairsBtn");
  const container = document.getElementById("mentorshipPairsList");
  
  if (!container) {
    console.error("❌ Контейнер mentorshipPairsList не найден");
    return;
  }
  
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Загрузка...";
    }
    
    // Получаем данные из справочника пользователей
    const response = await fetch(`${scriptURL}?type=employees`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      container.innerHTML = `<p style="color: #dc2626;">❌ Ошибка сервера: ${data.error}</p>`;
      return;
    }
    
    if (!data.employeesData) {
      container.innerHTML = '<p style="color: #dc2626;">❌ Нет данных о сотрудниках. Проверьте справочник пользователей.</p>';
      return;
    }
    
    // Фильтруем только пользователей со связями наставничества
    const mentorTraineePairs = new Map();
    
    data.employeesData.forEach(employee => {
      if (employee.mentor && employee.mentor.trim()) {
        const mentor = employee.mentor.trim();
        const trainee = employee.name.trim();
        const status = employee.status || "";
        
        // Создаем пару наставник -> стажер
        if (status === "Стажер") {
          const pairKey = `${mentor} → ${trainee}`;
          mentorTraineePairs.set(pairKey, {
            mentor: mentor,
            trainee: trainee,
            status: status,
            bonusPercent: employee.bonusPercent || 0 // Процент из колонки G
          });
        }
      }
    });
    
    if (mentorTraineePairs.size === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #000000;">
          <div style="font-size: 48px; margin-bottom: 16px;">👨‍🎓</div>
          <h3 style="margin: 0 0 8px 0;">Связи наставничества не найдены</h3>
          <p style="margin: 0;">Создайте первую связь во вкладке "Создать связь"</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    mentorTraineePairs.forEach((pair) => {
      html += `
        <div class="mentor-pair-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; color: #000000;">👨‍💼 ${pair.mentor} → 👨‍🎓 ${pair.trainee}</div>
              <div style="font-size: 14px; color: #000000; margin-top: 4px;">
                Статус: ${pair.status}
              </div>
            </div>
            <button onclick="deleteMentorshipPair('${pair.mentor}', '${pair.trainee}')" 
                    style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🗑️ Удалить
            </button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error("Ошибка загрузки связей:", error);
    container.innerHTML = '<p style="color: #dc2626;">❌ Ошибка загрузки связей</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = "🔄 Обновить список";
  }
}

// Загрузка данных для создания связи
async function loadMentorsAndTrainees() {
  const mentorSelect = document.getElementById('mentorSelect');
  const traineeSelect = document.getElementById('traineeSelect');
  
  // Показываем индикаторы загрузки
  if (mentorSelect) mentorSelect.innerHTML = '<option value="">⏳ Загрузка наставников...</option>';
  if (traineeSelect) traineeSelect.innerHTML = '<option value="">⏳ Загрузка стажеров...</option>';
  
  try {
    // Загружаем наставников и стажеров параллельно
    const [mentorsResponse, traineesResponse] = await Promise.all([
      fetch(`${scriptURL}?type=getMentors`),
      fetch(`${scriptURL}?type=getTrainees`)
    ]);
    
    // Проверяем HTTP статусы
    if (!mentorsResponse.ok) {
      throw new Error(`Ошибка загрузки наставников: HTTP ${mentorsResponse.status}`);
    }
    if (!traineesResponse.ok) {
      throw new Error(`Ошибка загрузки стажеров: HTTP ${traineesResponse.status}`);
    }
    
    const mentorsData = await mentorsResponse.json();
    const traineesData = await traineesResponse.json();
    
    // Проверяем на ошибки сервера
    if (mentorsData.error) {
      console.warn("⚠️ Ошибка сервера при загрузке наставников:", mentorsData.error);
    }
    if (traineesData.error) {
      console.warn("⚠️ Ошибка сервера при загрузке стажеров:", traineesData.error);
    }
    
    const mentors = mentorsData.mentors || [];
    const trainees = traineesData.trainees || [];
    
    // Обновляем селекты
    updateSelect('mentorSelect', mentors, mentors.length > 0 ? '-- Выберите наставника --' : '-- Нет доступных наставников --');
    updateSelect('traineeSelect', trainees, trainees.length > 0 ? '-- Выберите стажера --' : '-- Нет доступных стажеров --');
    
    console.log(`✅ Загружено: ${mentors.length} наставников, ${trainees.length} стажеров`);
    
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error);
    
    // Показываем ошибку в селектах
    if (mentorSelect) mentorSelect.innerHTML = '<option value="">❌ Ошибка загрузки</option>';
    if (traineeSelect) traineeSelect.innerHTML = '<option value="">❌ Ошибка загрузки</option>';
    
    // Определяем тип ошибки для пользователя
    let userMessage = "Ошибка загрузки данных";
    if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
      userMessage = "Нет связи с сервером. Проверьте интернет-подключение.";
    } else if (error.message.includes("HTTP")) {
      userMessage = error.message;
    }
    
    if (typeof showNotification === "function") {
      showNotification(`❌ ${userMessage}`, "error");
    } else {
      alert(`❌ ${userMessage}`);
    }
  }
}

// ПРОСТАЯ ФУНКЦИЯ СОЗДАНИЯ СВЯЗИ
async function createMentorshipPair() {
  const mentorSelect = document.getElementById("mentorSelect");
  const traineeSelect = document.getElementById("traineeSelect");
  const createBtn = document.getElementById("createPairBtn");
  
  const mentor = mentorSelect?.value;
  const trainee = traineeSelect?.value;
  
  // Валидация
  if (!mentor || !trainee) {
    showMentorshipNotification("⚠️ Выберите наставника и стажера", "warning");
    return;
  }
  
  if (mentor === trainee) {
    showMentorshipNotification("⚠️ Наставник и стажер не могут быть одним человеком", "warning");
    return;
  }
  
  // Блокируем кнопку
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.textContent = "⏳ Создание связи...";
  }
  
  try {
    const formData = new FormData();
    formData.append('currentUser', mentor);
    formData.append('partner', trainee);
    formData.append('status', 'Штат');
    formData.append('bonusPercent', '0'); // Фиксированный бонус 1750₽ за смену
    
    const response = await fetch(`${scriptURL}?type=savePair`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showMentorshipNotification(`✅ Связь создана: ${mentor} → ${trainee}\n💰 Бонус наставника: 1750₽ за смену`, "success");
      
      // Сбрасываем селекты
      if (mentorSelect) mentorSelect.value = "";
      if (traineeSelect) traineeSelect.value = "";
      
      // Обновляем список связей и выпадающие списки
      await loadMentorshipPairs();
      await loadMentorsAndTrainees();
      
      // Автоматически обновляем профили затронутых пользователей
      await updateAffectedProfiles(mentor, trainee);
      
    } else {
      showMentorshipNotification(`❌ Ошибка: ${data.message || "Неизвестная ошибка"}`, "error");
    }
    
  } catch (error) {
    console.error("❌ Ошибка создания связи:", error);
    
    let userMessage = "Ошибка сети";
    if (error.message.includes("Failed to fetch")) {
      userMessage = "Нет связи с сервером. Проверьте интернет-подключение.";
    } else if (error.message.includes("HTTP")) {
      userMessage = error.message;
    }
    
    showMentorshipNotification(`❌ ${userMessage}`, "error");
  } finally {
    // Разблокируем кнопку
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.textContent = "✅ Создать связь";
    }
  }
}

// Вспомогательная функция для уведомлений
function showMentorshipNotification(message, type = "info") {
  if (typeof showNotification === "function") {
    showNotification(message, type);
  } else {
    alert(message);
  }
}

// Обновление селекта (общая вспомогательная функция)
function updateSelect(selectId, dataArray, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  // Сохраняем текущее значение
  const currentValue = select.value;
  
  // Очищаем селект
  select.innerHTML = '';
  
  // Добавляем placeholder
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);
  
  // Добавляем данные
  dataArray.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
  
  // Восстанавливаем значение, если оно все еще существует в новом списке
  if (currentValue && dataArray.includes(currentValue)) {
    select.value = currentValue;
  }
}

// Обновление профилей затронутых пользователей
async function updateAffectedProfiles(mentor, trainee) {
  const currentUser = localStorage.getItem("currentUser");
  
  // Если текущий пользователь - один из затронутых, обновляем его профиль
  if (currentUser === mentor || currentUser === trainee) {
    await updateProfileFromServer();
  }
}

// Удаление связи наставник ↔ стажер
async function deleteMentorshipPair(mentor, trainee) {
  if (!confirm(`❓ Удалить связь между ${mentor} и ${trainee}?\n\nНаставник перестанет получать бонус за этого стажера.`)) {
    return;
  }
  
  // Находим и блокируем кнопку удаления
  const deleteButtons = document.querySelectorAll(`button[onclick*="deleteMentorshipPair"]`);
  deleteButtons.forEach(btn => {
    btn.disabled = true;
    btn.textContent = "⏳";
  });
  
  try {
    const formData = new FormData();
    formData.append('currentUser', mentor);
    formData.append('partner', ''); // Пустая строка для удаления связи
    formData.append('status', 'Штат');
    
    const response = await fetch(`${scriptURL}?type=savePair`, {
      method: 'POST', 
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showMentorshipNotification(`✅ Связь удалена: ${mentor} → ${trainee}`, "success");
      
      // Обновляем список связей и выпадающие списки
      await loadMentorshipPairs();
      await loadMentorsAndTrainees();
      
      // Автоматически обновляем профили затронутых пользователей
      await updateAffectedProfiles(mentor, trainee);
      
    } else {
      showMentorshipNotification(`❌ Ошибка удаления: ${data.message || "Неизвестная ошибка"}`, "error");
      
      // Разблокируем кнопки при ошибке
      deleteButtons.forEach(btn => {
        btn.disabled = false;
        btn.textContent = "🗑️ Удалить";
      });
    }
    
  } catch (error) {
    console.error("❌ Ошибка удаления связи:", error);
    
    let userMessage = "Ошибка сети при удалении связи";
    if (error.message.includes("Failed to fetch")) {
      userMessage = "Нет связи с сервером. Проверьте интернет-подключение.";
    } else if (error.message.includes("HTTP")) {
      userMessage = error.message;
    }
    
    showMentorshipNotification(`❌ ${userMessage}`, "error");
    
    // Разблокируем кнопки при ошибке
    deleteButtons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = "🗑️ Удалить";
    });
  }
}

// Показ результата операции в UI
function showResult(container, message, type) {
  container.style.display = "block";
  container.textContent = message;
  
  if (type === "success") {
    container.style.background = "#d1fae5";
    container.style.color = "#065f46";
    container.style.borderColor = "#10b981";
  } else if (type === "error") {
    container.style.background = "#fee2e2";
    container.style.color = "#991b1b";
    container.style.borderColor = "#ef4444";
  }
  
  container.style.border = "1px solid";
  
  // Автоматически скрываем через 5 секунд для успешных операций
  if (type === "success") {
    setTimeout(() => {
      container.style.display = "none";
    }, 5000);
  }
}

