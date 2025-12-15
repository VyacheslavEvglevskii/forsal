// Глобальные переменные и базовая инициализация приложения

const scriptURL = "https://script.google.com/macros/s/AKfycbzGsFgqGRWzetxFApostUYVl9BcM0YP7Crq0qIQ9fU6NKcu7MVwEHNuGyRh6uyWIqg/exec";

let todayRecords = [];
let currentUser = "";
let currentShift = "";
let currentStatus = "";
let allRates = [];
let allVolumes = [];
let currentUserRole = "user";

// Быстрый индекс: операция -> массив доступных ключей объёмов
let operationKeysIndex = {};
let operationOptionsHtmlIndex = {};
let lastRenderedOperation = "";

// Попытка восстановить кэш готовых опций из localStorage
try {
  const cached = JSON.parse(localStorage.getItem("volumeOptionsCache") || "null");
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    operationOptionsHtmlIndex = cached.htmlIndex || {};
    operationKeysIndex = cached.keysIndex || {};
  }
} catch (e) {
  // игнорируем ошибки парсинга кэша
}

let duplicateWarnings = {
  exact: [],
  similar: [],
  suspicious: [],
};

let formChangeTimeout = null;

window.addEventListener("DOMContentLoaded", async () => {
  // Принудительно показываем только форму входа
  document.getElementById("loginContainer").style.display = "block";
  document.getElementById("tabContainer").style.display = "none";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("profileContainer").style.display = "none";
  document.getElementById("ratesContainer").style.display = "none";
  document.getElementById("adminContainer").style.display = "none";
  document.getElementById("mySalaryContainer").style.display = "none";
  document.getElementById("costAnalysisContainer").style.display = "none";
  document.getElementById("traineeManagementContainer").style.display = "none";
  document.getElementById("duplicatesContainer").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";

  // Обработка Enter в полях входа
  const loginField = document.getElementById("login");
  const passwordField = document.getElementById("password");

  if (loginField) {
    loginField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (passwordField) {
          passwordField.focus();
        }
      }
    });
  }

  if (passwordField) {
    passwordField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const loginBtn = document.getElementById("loginBtn");
        if (loginBtn && !loginBtn.disabled) {
          handleLogin();
        }
      }
    });
  }

  // Предзагрузка моделей упаковки из кэша для мгновенного отображения
  preloadPackingModels();

  // Настройки уже инициализированы синхронно, обновляем UI немедленно
  updateTimeFieldsUI();

  await loadEditFormDictionaries();
  await loadPackingModels();

  const savedUser = localStorage.getItem("currentUser");
  const savedRole = localStorage.getItem("currentUserRole");

  // Сброс автоматического входа
  if (savedUser || savedRole) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentUserRole");
  }

  // Принудительный сброс глобальных переменных
  currentUser = "";
  currentUserRole = "user";

  // Очистка CSS классов навигации при инициализации
  const allTabButtons = [
    "tabProfile",
    "tabApp",
    "tabStats",
    "tabRates",
    "tabMySalary",
    "tabCostAnalysis",
    "tabTraineeManagement",
    "tabDuplicates",
    "tabAdmin",
  ];
  allTabButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.remove("admin-hidden", "admin-visible");
      btn.style.display = "";
      btn.style.visibility = "";
      btn.style.width = "";
      btn.style.padding = "";
      btn.style.margin = "";
    }
  });

  if (!currentUser) {
    const loginInput = document.getElementById("login");
    if (loginInput) loginInput.focus();
    document.getElementById("loginContainer").style.display = "block";
    document.getElementById("tabContainer").style.display = "none";
    document.getElementById("profileContainer").style.display = "none";
    document.getElementById("bottomNav").style.display = "none";
    return;
  }
});

// Проверка подключения к интернету
window.addEventListener("offline", () => {
  alert("📡 Нет подключения к интернету");
});

window.addEventListener("online", () => {
  alert("✅ Соединение восстановлено");
});

// Регистрация service worker (кроме file:)
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {})
      .catch((err) => console.error("❌ Ошибка регистрации SW:", err));
  });
}

// Фокус на логин при загрузке DOM
window.addEventListener("DOMContentLoaded", () => {
  const loginInput = document.getElementById("login");
  if (loginInput) loginInput.focus();
});

// Очистка сообщения об ошибке логина при вводе
["login", "password"].forEach((id) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("input", () => {
      const error = document.getElementById("loginError");
      if (error) error.textContent = "";
    });
  }
});

// Вход по нажатию Enter в поле пароля
const passwordInput = document.getElementById("password");
if (passwordInput) {
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  });
}

// Горячая клавиша для принудительного обновления кэша (Ctrl+Shift+R)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "R") {
    e.preventDefault();
    clearCache();

    // Показываем уведомление пользователю
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #059669; color: white; padding: 12px 20px; border-radius: 8px;
      font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = "🔄 Кэш очищен! Данные будут перезагружены.";

    document.body.appendChild(notification);

    // Принудительно перезагружаем модели упаковки и оклад
    setTimeout(() => {
      isLoadingPackingModels = false; // Сбрасываем флаг перед принудительной загрузкой
      loadPackingModels();
      preloadCurrentUserSalary();
    }, 500);

    // Убираем уведомление через 3 секунды
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});


