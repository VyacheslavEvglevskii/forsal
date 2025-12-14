// ===== ВЫГРУЗКА ЗАРПЛАТЫ (МОДАЛЬНОЕ ОКНО) =====

function openSalaryExportModal() {
  // Очистка
  document.getElementById("salaryExportResult").textContent = "";
  document.getElementById("salaryExportModal").style.display = "flex";
  // Установка дат по умолчанию (сегодня)
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("salaryExportStart").value = today;
  document.getElementById("salaryExportEnd").value = today;
  // Загрузка сотрудников и старших смен
  loadSalaryExportEmployees();
  loadSalaryExportSeniors();
}

function closeSalaryExportModal() {
  document.getElementById("salaryExportModal").style.display = "none";
}

// Функция для переключения видимости селекторов
function toggleEmployeeExportSelector() {
  const type = document.querySelector('input[name="exportType"]:checked').value;
  const packersSelector = document.getElementById("packersExportSelector");
  const seniorsSelector = document.getElementById("seniorsExportSelector");
  
  if (type === 'seniors') {
    packersSelector.style.display = 'none';
    seniorsSelector.style.display = 'block';
  } else {
    packersSelector.style.display = 'block';
    seniorsSelector.style.display = 'none';
  }
}

async function loadSalaryExportEmployees() {
  try {
    const res = await fetch(`${scriptURL}?type=employees`);
    const data = await res.json();

    if (data.error) {
      document.getElementById("salaryExportResult").textContent = data.error;
      return;
    }

    const names = (data.employees || []).filter(name => name && name.trim()).sort();
    const select = document.getElementById("salaryExportEmployee");

    select.innerHTML = `<option value="">-- Все --</option>`;
    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (err) {
    document.getElementById("salaryExportResult").textContent = "Ошибка загрузки сотрудников!";
    console.error("Ошибка при загрузке сотрудников:", err);
  }
}

// Загрузка списка старших смен для селекта экспорта зарплаты
async function loadSalaryExportSeniors() {
  try {
    const res = await fetch(`${scriptURL}?type=getSeniorsAndHelpers`);
    const data = await res.json();

    const select = document.getElementById("salaryExportSenior");

    if (data.error) {
      select.innerHTML = `<option value="">❌ ${data.error}</option>`;
      return;
    }

    const seniors = (data.seniors || []).filter(senior => senior && senior.trim());

    select.innerHTML = `<option value="">-- Все --</option>`;
    seniors.forEach(senior => {
      const opt = document.createElement("option");
      opt.value = senior;
      opt.textContent = senior;
      select.appendChild(opt);
    });
    
  } catch (err) {
    document.getElementById("salaryExportResult").textContent = "Ошибка загрузки справочника старших смен!";
    console.error("Ошибка при загрузке справочника старших смен:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📧 ОТПРАВКА ЗАРПЛАТЫ НА EMAIL
// ═══════════════════════════════════════════════════════════════════════════

async function sendSalaryReportToEmail() {
  // Запрашиваем email
  const email = prompt('📧 Введите email для отправки отчёта по зарплате:');
  
  if (!email) return;
  
  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('❌ Некорректный формат email');
    return;
  }
  
  const start = document.getElementById("salaryExportStart").value;
  const end = document.getElementById("salaryExportEnd").value;
  const exportType = document.querySelector('input[name="exportType"]:checked').value;
  
  if (!start || !end) {
    alert('⚠️ Укажите период');
    return;
  }
  
  let employee = '';
  if (exportType === 'seniors') {
    employee = document.getElementById("salaryExportSenior").value;
  } else {
    employee = document.getElementById("salaryExportEmployee").value;
  }
  
  const resultBox = document.getElementById("salaryExportResult");
  const sendBtn = document.getElementById("sendSalaryEmailBtn");
  
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "⏳ Отправка...";
  }
  resultBox.textContent = "📧 Отправка отчёта...";
  resultBox.style.color = '#2563eb';
  
  try {
    const params = new URLSearchParams({
      type: 'sendSalaryReport',
      email: email,
      start: start,
      end: end,
      exportType: exportType
    });
    
    if (employee) {
      params.append('employee', employee);
    }
    
    const response = await fetch(`${scriptURL}?${params.toString()}`);
    const data = await response.json();
    
    if (data.ok) {
      resultBox.style.color = '#059669';
      resultBox.textContent = `✅ ${data.message}`;
    } else {
      resultBox.style.color = '#dc2626';
      resultBox.textContent = `❌ ${data.message || 'Ошибка отправки'}`;
    }
  } catch (error) {
    console.error("Ошибка отправки отчёта:", error);
    resultBox.style.color = '#dc2626';
    resultBox.textContent = `❌ Ошибка: ${error.message}`;
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "📧 На почту";
    }
  }
}

async function submitSalaryExport() {
  const btn = document.getElementById("submitSalaryExportBtn");
  const resultBox = document.getElementById("salaryExportResult");

  // Блокировка кнопки и индикатор
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "⏳ Отправка...";
  resultBox.textContent = "";

  const start = document.getElementById("salaryExportStart").value;
  const end = document.getElementById("salaryExportEnd").value;
  const exportType = document.querySelector('input[name="exportType"]:checked').value;

  if (!start || !end) {
    resultBox.textContent = "❗ Укажите обе даты!";
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  let scriptUrl = scriptURL;
  let fetchOptions = {};

  if (exportType === 'seniors') {
    // Для старших смен используем GET-запрос к exportSeniorsForAccounting
    const senior = document.getElementById("salaryExportSenior").value;
    const params = new URLSearchParams({
      type: "exportSeniorsForAccounting",
      start,
      end
    });
    if (senior) {
      params.append("seniors", senior);
    }
    scriptUrl = `${scriptURL}?${params.toString()}`;
  } else { 
    // Для упаковщиков используем GET-запрос к exportForAccounting
    const employee = document.getElementById("salaryExportEmployee").value;
    const params = new URLSearchParams({
      type: "exportForAccounting",
      start,
      end
    });
    if (employee) {
      params.append("employees", employee);
    }
    scriptUrl = `${scriptURL}?${params.toString()}`;
  }
  
  try {
    const res = await fetch(scriptUrl);
    const text = await res.text();
    
    resultBox.style.color = text.includes("✅") ? '#059669' : '#dc2626';
    resultBox.textContent = text;
    
    if (text.includes("✅")) {
      setTimeout(closeSalaryExportModal, 3000);
    }
  } catch (err) {
    console.error(err);
    resultBox.style.color = '#dc2626';
    resultBox.textContent = "❌ Ошибка при отправке запроса";
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}


