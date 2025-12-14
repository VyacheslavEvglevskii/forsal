// ===== ФОРМА ДОБАВЛЕНИЯ СМЕНЫ СТАРШЕГО =====

// Показать форму добавления старшего смены
async function showSeniorShiftForm() {
  clearReports(); // Очищаем предыдущие отчеты
  
  const container = document.getElementById("reportContainer");
  
  container.innerHTML = `
    <div class="senior-shift-form">
      <h3>👥 Добавить смену</h3>
      
      <div>
        <!-- Старший смены -->
        <div class="form-row">
          <div>
            <label for="seniorSelect">👨‍💼 Старший смены:</label>
            <select id="seniorSelect" required>
              <option value="">⌛ Загрузка списка...</option>
            </select>
          </div>
        </div>
        
        <!-- Помощник -->
        <div class="form-row">
          <div>
            <label for="helperSelect">👤 Помощник (необязательно):</label>
            <select id="helperSelect">
              <option value="">⌛ Загрузка списка...</option>
            </select>
          </div>
        </div>
        
        <!-- Тип смены -->
        <div class="form-row">
          <div>
            <label>🌅🌙 Тип смены:</label>
            <div class="shift-buttons">
              <button type="button" class="shift-button active" onclick="selectMobileShift('День', this)">
                🌅 День
              </button>
              <button type="button" class="shift-button" onclick="selectMobileShift('Ночь', this)">
                🌙 Ночь
              </button>
            </div>
            <input type="hidden" id="selectedShiftType" value="День">
          </div>
        </div>
        
        <!-- Дата -->
        <div class="form-row">
          <div>
            <label for="customDate">📅 Дата (необязательно):</label>
            <input type="date" id="customDate">
          </div>
        </div>
        
        <div class="info-text">
          💡 Дата определится автоматически по типу смены
        </div>
        
        <!-- Кнопки -->
        <div class="button-group">
          <button onclick="addSeniorShiftRecord()" id="addSeniorRecordBtn" 
                  style="background: #22c55e; color: white; border: none; cursor: pointer; touch-action: manipulation;">
            ➕ Добавить
          </button>
          <button onclick="clearReports()" 
                  style="background: #6b7280; color: white; border: none; cursor: pointer; touch-action: manipulation;">
            ❌ Отменить
          </button>
        </div>
        
        <!-- Результат -->
        <div id="seniorShiftResult"></div>
      </div>
    </div>
  `;
  
  // Загружаем список старших смен
  await loadSeniorsListForForm();
  
  // Инициализируем кнопки смены
  initMobileShiftButtons();
}

// Загрузка списка старших смен для формы из справочника
async function loadSeniorsListForForm() {
  try {
    const res = await fetch(`${scriptURL}?type=getSeniorsAndHelpers`);
    const data = await res.json();

    const seniorSelect = document.getElementById("seniorSelect");
    const helperSelect = document.getElementById("helperSelect");

    if (data.error) {
      console.error("Ошибка API:", data.error);
      seniorSelect.innerHTML = `<option value="">❌ ${data.error}</option>`;
      helperSelect.innerHTML = `<option value="">-- Без помощника --</option>`;
      return;
    }

    const seniors = data.seniors || [];
    const helpers = data.helpers || [];
    const pairs = data.pairs || [];

    if (seniors.length === 0) {
      seniorSelect.innerHTML = `<option value="">❌ Нет данных в справочнике</option>`;
      helperSelect.innerHTML = `<option value="">-- Без помощника --</option>`;
      return;
    }

    // Заполняем список старших смен
    seniorSelect.innerHTML = `<option value="">-- Выберите старшего смены --</option>`;
    seniors.forEach(senior => {
      const opt = document.createElement("option");
      opt.value = senior;
      opt.textContent = senior;
      seniorSelect.appendChild(opt);
    });

    // Заполняем список помощников (уникальный список помощников + опция без помощника)
    helperSelect.innerHTML = `<option value="">-- Без помощника --</option>`;
    helpers.forEach(helper => {
      const opt = document.createElement("option");
      opt.value = helper;
      opt.textContent = helper;
      helperSelect.appendChild(opt);
    });

    // Сохраняем данные о парах для автоматического выбора
    window.seniorHelperPairs = pairs;

    // Добавляем обработчик для автоматического выбора помощника
    seniorSelect.addEventListener('change', function() {
      const selectedSenior = this.value;
      if (selectedSenior && window.seniorHelperPairs) {
        const pair = window.seniorHelperPairs.find(p => p.senior === selectedSenior);
        if (pair && pair.helper) {
          helperSelect.value = pair.helper;
          console.log(`🤖 Автоматически выбран помощник: ${pair.helper} для ${selectedSenior}`);
        } else {
          helperSelect.value = "";
        }
      }
    });

    console.log(`✅ Загружено: ${seniors.length} старших, ${helpers.length} помощников, ${pairs.length} пар`);
  } catch (err) {
    const seniorSelect = document.getElementById("seniorSelect");
    const helperSelect = document.getElementById("helperSelect");
    seniorSelect.innerHTML = `<option value="">❌ Ошибка загрузки справочника</option>`;
    helperSelect.innerHTML = `<option value="">-- Без помощника --</option>`;
    console.error("Ошибка при загрузке справочника старших смен:", err);
  }
}

// Добавление записи старшего смены
async function addSeniorShiftRecord() {
  const btn = document.getElementById("addSeniorRecordBtn");
  const resultBox = document.getElementById("seniorShiftResult");
  
  // Получаем данные из формы
  const seniorName = document.getElementById("seniorSelect").value.trim();
  const helperName = document.getElementById("helperSelect").value.trim();
  const shiftType = getSelectedShiftType(); // Используем новую функцию для мобильной версии
  const customDate = document.getElementById("customDate").value;
  
  // Валидация
  if (!seniorName) {
    resultBox.style.color = '#dc2626';
    resultBox.textContent = "❌ Выберите старшего смены";
    return;
  }
  
  if (helperName && seniorName === helperName) {
    resultBox.style.color = '#dc2626';
    resultBox.textContent = "❌ Старший смены и помощник должны быть разными людьми";
    return;
  }
  
  // Блокировка кнопки
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "⏳ Добавление...";
  resultBox.textContent = "";
  
  try {
    // Создаем запрос для добавления старшего смены через специальный endpoint
    const params = new URLSearchParams({
      type: 'addSeniorShift',
      seniorName: seniorName,
      helperName: helperName || '',
      shiftType: shiftType
    });
    
    if (customDate) {
      params.append('shiftDate', customDate);
    }
    
    const response = await fetch(`${scriptURL}?${params}`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      resultBox.style.color = '#22c55e';
      resultBox.textContent = result.message;
      
      // Очищаем форму при успехе
      document.getElementById("customDate").value = '';
      document.getElementById("seniorSelect").selectedIndex = 0;
      document.getElementById("helperSelect").selectedIndex = 0;
      
      // Устанавливаем тип смены на "День" (используем скрытое поле)
      const selectedShiftType = document.getElementById("selectedShiftType");
      if (selectedShiftType) {
        selectedShiftType.value = "День";
      }
      
      // Также обновляем визуальное состояние кнопок типа смены
      const dayButton = document.querySelector('button[onclick*="selectShiftType(\'День\')"]');
      const nightButton = document.querySelector('button[onclick*="selectShiftType(\'Ночь\')"]');
      if (dayButton && nightButton) {
        dayButton.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        dayButton.style.color = 'white';
        nightButton.style.background = '#f3f4f6';
        nightButton.style.color = '#374151';
      }
      
      console.log('✅ Записи успешно добавлены:', result.data);
    } else {
      resultBox.style.color = '#dc2626';
      resultBox.textContent = result.message || '❌ Ошибка при добавлении записей';
    }
    
  } catch (err) {
    resultBox.style.color = '#dc2626';
    resultBox.textContent = `❌ Ошибка: ${err.message}`;
    console.error("Ошибка при добавлении записей смены:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Функция для выбора типа смены (простая мобильная версия)
function selectMobileShift(shiftType, clickedButton) {
  // Убираем active класс у всех кнопок
  const allButtons = document.querySelectorAll('.shift-button');
  allButtons.forEach(btn => btn.classList.remove('active'));
  
  // Добавляем active класс к нажатой кнопке
  clickedButton.classList.add('active');
  
  // Сохраняем выбранный тип смены
  const hiddenInput = document.getElementById('selectedShiftType');
  if (hiddenInput) {
    hiddenInput.value = shiftType;
  }
  
  // Тактильная обратная связь для мобильных устройств
  if ('vibrate' in navigator) {
    navigator.vibrate(50); // Легкая вибрация 50ms
  }
  
  console.log('Выбран тип смены:', shiftType);
}

// Функция для получения выбранного типа смены
function getSelectedShiftType() {
  const hiddenInput = document.getElementById('selectedShiftType');
  return hiddenInput ? hiddenInput.value : 'День';
}

// Инициализация кнопок смены после загрузки формы
function initMobileShiftButtons() {
  const dayButton = document.querySelector('.shift-button:first-child');
  const hiddenInput = document.getElementById('selectedShiftType');
  
  if (dayButton && hiddenInput) {
    // Убеждаемся что кнопка "День" активна по умолчанию
    dayButton.classList.add('active');
    hiddenInput.value = 'День';
    console.log('Форма старшего смены инициализирована: День выбран по умолчанию');
  }
}

// Делаем ключевые функции глобальными, так как они вызываются из index.html (onclick) и auth-and-tabs.js
window.showSeniorShiftForm = showSeniorShiftForm;
window.loadSeniorsListForForm = loadSeniorsListForForm;
window.addSeniorShiftRecord = addSeniorShiftRecord;
window.selectMobileShift = selectMobileShift;
window.getSelectedShiftType = getSelectedShiftType;
window.initMobileShiftButtons = initMobileShiftButtons;
