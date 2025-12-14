// ===== УВЕДОМЛЕНИЯ (ГЛОБАЛЬНЫЕ) =====

/**
 * Базовая функция уведомления.
 * Сейчас реализована через showTemporaryNotification, чтобы поведение везде совпадало.
 */
function showNotification(message, type = "info") {
  showTemporaryNotification(message, type, 3000);
}

// Короткие уведомления с управляемой длительностью (используются в разных частях)
function showTemporaryNotification(message, type = "info", duration = 3000) {
  // Создаем или находим контейнер для уведомлений
  var container = document.getElementById("notificationContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "notificationContainer";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "10000";
    container.style.maxWidth = "400px";
    document.body.appendChild(container);
  }

  // Создаем уведомление
  var notification = document.createElement("div");
  notification.className = "notification notification-" + type;
  notification.style.padding = "12px 16px";
  notification.style.marginBottom = "8px";
  notification.style.borderRadius = "8px";
  notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  notification.style.fontSize = "14px";
  notification.style.cursor = "pointer";
  notification.style.animation = "slideInRight 0.3s ease-out";

  // Стили по типу
  switch (type) {
    case "success":
      notification.style.background = "#d1fae5";
      notification.style.color = "#065f46";
      notification.style.border = "1px solid #a7f3d0";
      break;
    case "warning":
      notification.style.background = "#fef3c7";
      notification.style.color = "#92400e";
      notification.style.border = "1px solid #fcd34d";
      break;
    case "error":
      notification.style.background = "#fef2f2";
      notification.style.color = "#991b1b";
      notification.style.border = "1px solid #fca5a5";
      break;
    default:
      notification.style.background = "#eff6ff";
      notification.style.color = "#1e40af";
      notification.style.border = "1px solid #93c5fd";
  }

  notification.textContent = message;

  // Добавляем обработчик клика для закрытия
  notification.addEventListener("click", function () {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  });

  container.appendChild(notification);

  // Автоматическое удаление
  setTimeout(function () {
    if (notification.parentNode) {
      notification.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(function () {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, duration);
}


