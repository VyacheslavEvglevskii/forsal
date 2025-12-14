// ===== ТАБЛИЦА ТАРИФОВ И ВЫБОР ОБЪЁМОВ =====

// Обработка смены операции в форме ввода смены
async function handleOperationChange(operation) {
  const setField = document.getElementById("setNumberField");
  const volumeLabel = document.getElementById("volumeLabel");
  const volumeSelect = document.querySelector('[name="volume"]');
  const setSelect = document.querySelector('[name="setNumber"]');

  if (!setField || !volumeLabel || !volumeSelect || !setSelect) return;

  // Показать/скрыть поле "Артикул набора"
  if (operation === 'Сборка "Набора"') {
    setField.style.display = "block";
    setSelect.required = true;
    volumeLabel.style.display = "none";
    volumeSelect.required = false;
    volumeSelect.value = "";
  } else {
    setField.style.display = "none";
    setSelect.required = false;
    setSelect.value = "";
    volumeLabel.style.display = "block";
    volumeSelect.required = true;
  }

  // === 🔒 Маркировка продукции — объём не требуется ===
  if (operation === "Маркировка продукции ш/к") {
    volumeLabel.style.display = "none";
    volumeSelect.required = false;
    volumeSelect.value = "";
    return;
  }

  // === 📂 Подгрузка объёмов по операции (ускоренная) ===
  // Гарантируем наличие индекса (использует ensureOperationKeysIndex из dictionaries.js)
  await ensureOperationKeysIndex();
  volumeSelect.disabled = false;

  // Избегаем лишних перерисовок, если операция не менялась
  if (lastRenderedOperation !== operation) {
    const html = operationOptionsHtmlIndex[operation] || '<option value="">-- Выбери объём --</option>';
    volumeSelect.innerHTML = html;
    lastRenderedOperation = operation;
  }
}

// Загрузка и отображение таблицы тарифов
async function loadRatesTable() {
  const loader = document.getElementById("ratesLoader");
  const container = document.getElementById("ratesTable");
  const opFilter = document.getElementById("filterOperation");
  const keyFilter = document.getElementById("filterKey");
  const searchInput = document.getElementById("ratesSearch");
  const counter = document.getElementById("ratesCounter");

  if (!loader || !container || !opFilter || !keyFilter || !searchInput || !counter) return;

  // Показываем индикатор загрузки
  loader.style.display = "block";
  container.innerHTML = "";

  try {
    // Используем кэш для тарифов
    if (isCacheValid(dataCache.rates)) {
      allRates = dataCache.rates.data;
    } else {
      const res = await fetch(`${scriptURL}?type=rates`);
      const data = await res.json();
      allRates = data.rates || [];
      
      dataCache.rates = {
        data: allRates,
        timestamp: Date.now()
      };
    }

    // Фильтруем лишние ставки
    const filteredRates = allRates.filter(r =>
      r.operation !== "Ставка_Аутсорсинг" && r.operation !== "Ставка_штат"
    );

    // Предварительно строим индекс операции -> список ключей (для быстрого наполнения объёмов)
    // Учитываем уникальность ключей
    operationKeysIndex = filteredRates.reduce((acc, rate) => {
      const op = rate.operation;
      const key = rate.key;
      if (!op || !key) return acc;
      if (!acc[op]) acc[op] = new Set();
      acc[op].add(String(key));
      return acc;
    }, {});
    // Преобразуем множества в отсортированные массивы строк
    Object.keys(operationKeysIndex).forEach(op => {
      const sorted = sortVolumeKeysNaturally(Array.from(operationKeysIndex[op]));
      operationKeysIndex[op] = sorted;
      // Заготавливаем HTML-строку опций (для мгновенной подстановки)
      operationOptionsHtmlIndex[op] = ['<option value="">-- Выбери объём --</option>']
        .concat(sorted.map(k => `<option value="${k}">${k}</option>`))
        .join('');
    });

    // Сохраняем в localStorage на будущее (с TTL = CACHE_DURATION)
    try {
      localStorage.setItem('volumeOptionsCache', JSON.stringify({
        timestamp: Date.now(),
        htmlIndex: operationOptionsHtmlIndex,
        keysIndex: operationKeysIndex
      }));
    } catch (e) { /* ignore */ }

    // Заполняем фильтры
    populateFilters(filteredRates, opFilter, keyFilter);

    // Состояние сортировки
    let sortColumn = null;
    let sortDirection = "asc";

    // Функция рендеринга с поиском, фильтрацией и сортировкой
    function renderFilteredRates() {
      const searchText = searchInput.value.toLowerCase().trim();
      const selectedOp = opFilter.value;
      const selectedKey = keyFilter.value;

      let filtered = filteredRates.filter(r => {
        const matchesSearch = !searchText || r.operation.toLowerCase().includes(searchText);
        const matchesOp = !selectedOp || r.operation === selectedOp;
        const matchesKey = !selectedKey || r.key === selectedKey;
        return matchesSearch && matchesOp && matchesKey;
      });

      // Применяем сортировку
      if (sortColumn !== null) {
        filtered.sort((a, b) => {
          let aVal = getColumnValue(a, sortColumn);
          let bVal = getColumnValue(b, sortColumn);
          
          // Числовая сортировка для тарифов и норм
          if (sortColumn >= 2) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          }
          
          let result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortDirection === "desc" ? -result : result;
        });
      }

      // Обновляем счетчик
      updateCounter(filtered.length, filteredRates.length);

      if (!filtered.length) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h3 style="margin: 0 0 8px 0; color: #374151;">Ничего не найдено</h3>
            <p style="margin: 0;">Попробуйте изменить критерии поиска</p>
          </div>
        `;
        return;
      }

      // Генерируем таблицу
      let html = `
      <div class="table-scroll">
        <table style="width:100%; border-collapse:collapse; min-width:700px;">
        <thead>
            <tr>
              ${generateTableHeaders()}
          </tr>
        </thead>
        <tbody>
    `;

      filtered.forEach(r => {
        html += `
        <tr>
          <td>${r.operation}</td>
          <td>${r.key}</td>
          <td>${r.normPerHour}</td>
            <td><strong>${r.ratePerUnit.toFixed(2)} ₽</strong></td>
            <td><strong>${r.rateFBS.toFixed(2)} ₽</strong></td>
            <td><strong>${r.rateDeal.toFixed(2)} ₽</strong></td>
            <td><strong>${r.rateFBSDeal.toFixed(2)} ₽</strong></td>
        </tr>
      `;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;

      // Добавляем обработчики сортировки
      addSortHandlers();
    }

    // Вспомогательные функции
    function populateFilters(rates, opFilter, keyFilter) {
      // Очистка фильтров
      opFilter.innerHTML = '<option value="">-- Все операции --</option>';
      keyFilter.innerHTML = '<option value="">-- Все объёмы / артикулы --</option>';

      const operations = [...new Set(rates.map(r => r.operation))].sort();
      const keys = [...new Set(rates.map(r => r.key))].sort();

      operations.forEach(op => {
        const opt = document.createElement("option");
        opt.value = op;
        opt.textContent = op;
        opFilter.appendChild(opt);
      });

      keys.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        keyFilter.appendChild(opt);
      });
    }

    function generateTableHeaders() {
      const headers = [
        '🏷️ Операция',
        '📦 Объём / Артикул', 
        '⏱️ Норма в час',
        '💰 Тариф/шт<br><small>(сдельная)</small>',
        '🚚 Тариф FBS/шт<br><small>(сдельная)</small>',
        '📊 Тариф/шт<br><small>(оклад+сдел)</small>',
        '🚚📊 Тариф FBS/шт<br><small>(оклад+сдел)</small>'
      ];

      return headers.map((header, index) => {
        const sortClass = getSortClass(index);
        return `<th class="sortable ${sortClass}" onclick="handleSort(${index})">${header}</th>`;
      }).join('');
    }

    function getSortClass(columnIndex) {
      if (sortColumn === columnIndex) {
        return sortDirection === "asc" ? "sorted-asc" : "sorted-desc";
      }
      return "";
    }

    function getColumnValue(row, columnIndex) {
      switch(columnIndex) {
        case 0: return row.operation;
        case 1: return row.key;
        case 2: return row.normPerHour;
        case 3: return row.ratePerUnit;
        case 4: return row.rateFBS;
        case 5: return row.rateDeal;
        case 6: return row.rateFBSDeal;
        default: return "";
      }
    }

    function updateCounter(shown, total) {
      if (shown === total) {
        counter.textContent = `Показано: ${total} тарифов`;
      } else {
        counter.textContent = `Показано: ${shown} из ${total} тарифов`;
      }
    }

    function addSortHandlers() {
      // Глобальная функция для сортировки
      window.handleSort = function(columnIndex) {
        if (sortColumn === columnIndex) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortColumn = columnIndex;
          sortDirection = "asc";
        }
        renderFilteredRates();
      };
    }

    // Обработчики событий
    opFilter.onchange = renderFilteredRates;
    keyFilter.onchange = renderFilteredRates;

    // Живой поиск с дебаунсом
    let searchTimeout;
    searchInput.oninput = function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderFilteredRates, 300);
    };

    // Улучшенные стили для фокуса поиска
    searchInput.onfocus = function() {
      this.style.borderColor = "#3b82f6";
      this.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
    };

    searchInput.onblur = function() {
      this.style.borderColor = "#e5e7eb";
      this.style.boxShadow = "none";
    };

    // Первичное отображение
    renderFilteredRates();

  } catch (error) {
    console.error("❌ Ошибка загрузки тарифов:", error);
    container.innerHTML = "<p style='color:#b91c1c; text-align:center; padding:20px;'>❌ Ошибка загрузки тарифов</p>";
  } finally {
    loader.style.display = "none";
  }
}


