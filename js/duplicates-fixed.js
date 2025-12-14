// ===== ФУНКЦИИ ДЕДУПЛИКАЦИИ (ОТДЕЛЬНАЯ ВКЛАДКА, НОВАЯ ВЕРСИЯ) =====
console.log("✅ duplicates-fixed.js загружен");

/**
 * 🔍 Анализ дубликатов без удаления (для отдельной вкладки)
 */
async function analyzeDuplicatesInTab() {
  const loader = document.getElementById("duplicatesLoader");
  const resultsDiv = document.getElementById("duplicatesAnalysisResults");

  // Скрываем другие результаты
  hideAllResults();

  // Показываем загрузку
  loader.style.display = "block";

  try {
    console.log("🔍 Отправляем запрос на анализ дубликатов...");

    // Получаем параметры периода
    const periodParams = getDuplicatesPeriodParams();
    const urlParams = new URLSearchParams({ type: "analyzeDuplicates", ...periodParams });

    console.log("📅 Параметры периода:", periodParams);

    const response = await fetch(scriptURL + "?" + urlParams.toString(), {
      method: "GET"
    });

    if (!response.ok) throw new Error("Ошибка сети");

    const result = await response.json();
    console.log("📊 Ответ от сервера:", result);

    // Обновляем статистику
    updateDuplicatesStats(result.analyzed || 0, result.total || 0, 0, 0);

    // Отображаем результаты
    if (result.total > 0) {
      var detailsHtml = "";
      if (Array.isArray(result.details)) {
        detailsHtml = result.details
          .map(function (detail) {
            return "• " + detail;
          })
          .join("<br>");
      }

      resultsDiv.innerHTML =
        '<h4>🔍 Результаты анализа дубликатов</h4>' +
        '<div style="margin-bottom: 16px;">' +
          '<strong>📊 Статистика:</strong><br>' +
          '• Проанализировано записей: ' + (result.analyzed || 0) + '<br>' +
          '• Найдено дубликатов: ' + (result.total || 0) +
        '</div>' +
        '<div style="margin-bottom: 16px;">' +
          '<strong>📋 Детали:</strong><br>' +
          detailsHtml +
        '</div>' +
        '<div style="background: #fff3cd; padding: 12px; border-radius: 8px; border: 1px solid #ffeaa7;">' +
          '<strong>⚠️ Найдены дубликаты!</strong><br>' +
          'Для их удаления нажмите кнопку "🗑️ Удалить дубликаты"' +
        '</div>';
    } else {
      resultsDiv.innerHTML =
        '<div style="text-align: center; color: #059669;">' +
          '<h4>✅ Дубликаты не найдены</h4>' +
          '<p>Проанализировано записей: ' + (result.analyzed || 0) + '</p>' +
          '<p>Все данные уникальны!</p>' +
        '</div>';
    }

    resultsDiv.style.display = "block";

  } catch (error) {
    console.error("Ошибка анализа дубликатов:", error);
    resultsDiv.innerHTML =
      '<div style="color: #dc2626; text-align: center;">' +
        '<h4>❌ Ошибка анализа</h4>' +
        '<p>' + error.message + '</p>' +
      '</div>';
    resultsDiv.style.display = "block";
  } finally {
    loader.style.display = "none";
  }
}

/**
 * 🗑️ Удаление дубликатов (для отдельной вкладки)
 */
async function runDeduplicateInTab() {
  // Запрашиваем подтверждение
  if (!confirm("⚠️ ВНИМАНИЕ!\n\nВы собираетесь удалить дубликаты из основной таблицы.\nДубликаты будут перемещены в карантин.\n\nПродолжить?")) {
    return;
  }

  const loader = document.getElementById("duplicatesLoader");
  const resultsDiv = document.getElementById("deduplicationResults");

  // Скрываем другие результаты
  hideAllResults();

  // Показываем загрузку
  loader.style.display = "block";

  try {
    // Получаем параметры периода
    const periodParams = getDuplicatesPeriodParams();
    const urlParams = new URLSearchParams({ type: "runSafeDeduplicate", ...periodParams });

    const response = await fetch(scriptURL + "?" + urlParams.toString(), {
      method: "GET"
    });

    if (!response.ok) throw new Error("Ошибка сети");

    const result = await response.json();

    // Отображаем результаты
    if (result.success) {
      // Обновляем статистику
      updateDuplicatesStats(result.analyzed, result.found, result.deleted, result.quarantined);

      var extraDetails = "";
      if (result.message) {
        extraDetails =
          '<div style="margin-bottom: 16px;"><strong>📝 Детали:</strong><br>' +
          result.message +
          '</div>';
      }

      resultsDiv.innerHTML =
        '<h4>✅ Дедупликация завершена</h4>' +
        '<div style="margin-bottom: 16px;">' +
          '<strong>📊 Статистика:</strong><br>' +
          '• Проанализировано записей: ' + (result.analyzed || 0) + '<br>' +
          '• Найдено дубликатов: ' + (result.found || 0) + '<br>' +
          '• Удалено записей: ' + (result.deleted || 0) + '<br>' +
          '• Помещено в карантин: ' + (result.quarantined || 0) +
        '</div>' +
        extraDetails +
        '<div style="background: #d1fae5; padding: 12px; border-radius: 8px; border: 1px solid #a7f3d0;">' +
          '<strong>🎉 Операция выполнена успешно!</strong><br>' +
          'Дубликаты удалены из основной таблицы и сохранены в карантине для проверки.' +
        '</div>';
    } else {
      resultsDiv.innerHTML =
        '<div style="color: #dc2626; text-align: center;">' +
          '<h4>❌ Ошибка дедупликации</h4>' +
          '<p>' + (result.message || "Неизвестная ошибка") + '</p>' +
        '</div>';
    }

    resultsDiv.style.display = "block";

  } catch (error) {
    console.error("Ошибка дедупликации:", error);
    resultsDiv.innerHTML =
      '<div style="color: #dc2626; text-align: center;">' +
        '<h4>❌ Ошибка дедупликации</h4>' +
        '<p>' + error.message + '</p>' +
      '</div>';
    resultsDiv.style.display = "block";
  } finally {
    loader.style.display = "none";
  }
}

// ===== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ВКЛАДКИ ДУБЛИКАТОВ =====

/**
 * Получение параметров периода для отправки на сервер
 */
function getDuplicatesPeriodParams() {
  const startDate = document.getElementById("duplicatesStartDate").value;
  const endDate = document.getElementById("duplicatesEndDate").value;

  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  return params;
}

/**
 * Загрузка статистики дубликатов при открытии вкладки
 */
async function loadDuplicatesStats() {
  const statsDiv = document.getElementById("duplicatesStats");
  statsDiv.style.display = "block";

  // Устанавливаем начальные значения
  updateDuplicatesStats(0, 0, 0, 0);
}

/**
 * Обновление статистики в интерфейсе
 */
function updateDuplicatesStats(total, found, removed, quarantine) {
  document.getElementById("totalRecords").textContent = total;
  document.getElementById("duplicatesFound").textContent = found;
  document.getElementById("duplicatesRemoved").textContent = removed;
  document.getElementById("quarantineCount").textContent = quarantine;

  document.getElementById("duplicatesStats").style.display = "block";
}

/**
 * Скрытие всех результатов
 */
function hideAllResults() {
  const resultDivs = [
    "duplicatesAnalysisResults",
    "deduplicationResults",
    "quarantineResults",
    "logResults"
  ];

  resultDivs.forEach(function (id) {
    const div = document.getElementById(id);
    if (div) div.style.display = "none";
  });
}

/**
 * 📦 Просмотр карантина
 */
async function viewQuarantine() {
  const loader = document.getElementById("duplicatesLoader");
  const resultsDiv = document.getElementById("quarantineResults");

  hideAllResults();
  loader.style.display = "block";

  try {
    // Пока показываем заглушку
    resultsDiv.innerHTML =
      '<h4>📦 Карантин дубликатов</h4>' +
      '<div style="text-align: center; color: #6b7280; padding: 20px;">' +
        '<p>Функция просмотра карантина будет реализована в следующих версиях.</p>' +
        '<p>Карантинные записи сохраняются в листе "Справочник_Карантин"</p>' +
      '</div>';

    resultsDiv.style.display = "block";

  } catch (error) {
    console.error("Ошибка загрузки карантина:", error);
    resultsDiv.innerHTML =
      '<div style="color: #dc2626; text-align: center;">' +
        '<h4>❌ Ошибка загрузки</h4>' +
        '<p>' + error.message + '</p>' +
      '</div>';
    resultsDiv.style.display = "block";
  } finally {
    loader.style.display = "none";
  }
}

/**
 * 📋 Просмотр журнала дедупликации
 */
async function viewDeduplicationLog() {
  const loader = document.getElementById("duplicatesLoader");
  const resultsDiv = document.getElementById("logResults");

  hideAllResults();
  loader.style.display = "block";

  try {
    // Пока показываем заглушку
    resultsDiv.innerHTML =
      '<h4>📋 Журнал дедупликации</h4>' +
      '<div style="text-align: center; color: #6b7280; padding: 20px;">' +
        '<p>Функция просмотра журнала будет реализована в следующих версиях.</p>' +
        '<p>Журнал операций сохраняется в листе "Журнал_дедупликации"</p>' +
      '</div>';

    resultsDiv.style.display = "block";

  } catch (error) {
    console.error("Ошибка загрузки журнала:", error);
    resultsDiv.innerHTML =
      '<div style="color: #dc2626; text-align: center;">' +
        '<h4>❌ Ошибка загрузки</h4>' +
        '<p>' + error.message + '</p>' +
      '</div>';
    resultsDiv.style.display = "block";
  } finally {
    loader.style.display = "none";
  }
}


