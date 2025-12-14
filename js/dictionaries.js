// ===== СПРАВОЧНИКИ И КЭШ ДАННЫХ =====

// Кэш для ускорения загрузки данных
let dataCache = {
  operations: { data: null, timestamp: 0 },
  volumes: { data: null, timestamp: 0 },
  sets: { data: null, timestamp: 0 },
  setSizes: { data: null, timestamp: 0 }, // ✅ ДОБАВЛЕНО: кэш для размеров наборов
  rates: { data: null, timestamp: 0 },
  packingModels: { data: null, timestamp: 0 },
  salaries: {}, // Кэш окладов по сотрудникам: { employee: { salary: value, timestamp: timestamp } }
  adminSettings: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Утилиты для естественной числовой сортировки значений объёма
function extractNumericValue(value) {
  const str = String(value ?? '').replace(/\s+/g, '');
  const match = str.match(/\d+(?:[.,]\d+)?/);
  if (!match) return NaN;
  return parseFloat(match[0].replace(',', '.'));
}

function sortVolumeKeysNaturally(keys) {
  return keys.sort((a, b) => {
    const na = extractNumericValue(a);
    const nb = extractNumericValue(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), 'ru', { numeric: true, sensitivity: 'base' });
  });
}

// Общий форматтер даты (используется в разных модулях, напр. my-salary.js)
function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

// Делаем функции доступными глобально для других модулей
window.extractNumericValue = extractNumericValue;
window.sortVolumeKeysNaturally = sortVolumeKeysNaturally;
window.formatDate = formatDate;

// Флаги состояния загрузки для предотвращения дублирования
let isLoadingPackingModels = false;

// Функция проверки актуальности кэша
function isCacheValid(cacheEntry) {
  return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
}

// Быстрая загрузка операций с кэшированием
async function loadOperationsFast() {
  if (isCacheValid(dataCache.operations)) {
    return dataCache.operations.data;
  }
  
  const res = await fetch(`${scriptURL}?type=operations`);
  const data = await res.json();
  
  dataCache.operations = {
    data: data.operations,
    timestamp: Date.now()
  };
  
  return data.operations;
}

// Быстрая загрузка объемов с кэшированием
async function loadVolumesFast() {
  if (isCacheValid(dataCache.volumes)) {
    return dataCache.volumes.data;
  }
  
  const res = await fetch(`${scriptURL}?type=volumes`);
  const data = await res.json();
  
  dataCache.volumes = {
    data: data.volumes,
    timestamp: Date.now()
  };
  
  return data.volumes;
}

// Быстрая загрузка наборов с кэшированием
async function loadSetsFast() {
  if (isCacheValid(dataCache.sets)) {
    return dataCache.sets.data;
  }
  
  const res = await fetch(`${scriptURL}?type=sets`);
  const data = await res.json();
  
  dataCache.sets = {
    data: data.sets,
    timestamp: Date.now()
  };
  
  return data.sets;
}

// ✅ Быстрая загрузка размеров наборов с кэшированием
async function loadSetSizesFast() {
  if (isCacheValid(dataCache.setSizes)) {
    return dataCache.setSizes.data;
  }
  
  const res = await fetch(`${scriptURL}?type=setSizes`);
  const data = await res.json();
  
  dataCache.setSizes = {
    data: data.setSizes,
    timestamp: Date.now()
  };
  
  return data.setSizes;
}

// ===== UI-ФУНКЦИИ ЗАГРУЗКИ СПРАВОЧНИКОВ ДЛЯ ОСНОВНОЙ ФОРМЫ =====

// Загрузка доступных объёмов (общий список, без привязки к операции)
async function loadVolumes() {
  try {
    const volumes = await loadVolumesFast();
    // allVolumes объявлена в index.html как глобальная переменная
    if (Array.isArray(volumes)) {
      window.allVolumes = volumes.map(v => ["", v]); // совместимость со старой логикой
    }

    const select = document.querySelector('[name="volume"]');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выбери объём --</option>';
    volumes.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("Ошибка загрузки объемов:", error);
  }
}

// Загрузка операций и привязка обработчика смены операции
async function loadOperations() {
  try {
    const operations = await loadOperationsFast();
    const select = document.querySelector('[name="operationType"]');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выбери операцию --</option>';
    operations.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });

    // Обработчик смены операции (использует handleOperationChange из rates-table.js)
    select.addEventListener("change", async () => {
      if (typeof handleOperationChange === "function") {
        await handleOperationChange(select.value);
      }
    });
  } catch (error) {
    console.error("Ошибка загрузки операций:", error);
  }
}

// Загрузка артикулов наборов
async function loadSetNumbers() {
  try {
    const sets = await loadSetsFast();
    const select = document.querySelector('[name="setNumber"]');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выбери артикул --</option>';
    sets.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("Ошибка загрузки артикулов:", error);
  }
}

// Фильтр операций в блоке статистики
async function loadOperationFilter() {
  try {
    const operations = await loadOperationsFast();
    const filter = document.getElementById("operationFilter");
    if (!filter) return;

    filter.innerHTML = '<option value="">-- Все операции --</option>';
    operations.forEach((op) => {
      const option = document.createElement("option");
      option.value = op;
      option.textContent = op;
      filter.appendChild(option);
    });
  } catch (error) {
    console.error("Ошибка загрузки операций:", error);
  }
}

// Делаем функции доступными глобально (их вызывают auth-and-tabs.js, bonus-and-reports.js и index.html)
window.loadVolumes = loadVolumes;
window.loadOperations = loadOperations;
window.loadSetNumbers = loadSetNumbers;
window.loadOperationFilter = loadOperationFilter;

// Глобальная функция очистки кэша (используется горячей клавишей Ctrl+Shift+R)
function clearCache() {
  try {
    // Очищаем внутренний кэш справочников
    if (typeof dataCache === "object") {
      Object.keys(dataCache).forEach(key => {
        if (key === "salaries") {
          dataCache[key] = {};
        } else {
          dataCache[key] = { data: null, timestamp: 0 };
        }
      });
    }

    // Очищаем связанные записи в localStorage
    try {
      localStorage.removeItem("packingModelsCache");
      localStorage.removeItem("salariesCache");
      localStorage.removeItem("volumeOptionsCache");
    } catch (e) {
      console.warn("Ошибка при очистке localStorage кэша справочников:", e);
    }

    // Очищаем кэш статистики, если доступен
    if (typeof statsCache !== "undefined" && statsCache && typeof statsCache.clear === "function") {
      statsCache.clear();
    }
    if (typeof clearStatsFromLocalStorage === "function") {
      clearStatsFromLocalStorage().catch(e => console.warn("Ошибка очистки статистики из localStorage:", e));
    }

    // Очищаем кэш настроек администратора
    if (typeof adminSettingsCache !== "undefined") {
      adminSettingsCache = null;
    }
    if (typeof adminSettingsCacheTime !== "undefined") {
      adminSettingsCacheTime = 0;
    }
    try {
      localStorage.removeItem("adminSettingsCache");
    } catch (e) {
      console.warn("Ошибка очистки кэша настроек администратора:", e);
    }

    // Сбрасываем флаг загрузки моделей упаковки
    if (typeof isLoadingPackingModels !== "undefined") {
      isLoadingPackingModels = false;
    }
  } catch (e) {
    console.warn("Ошибка при очистке общего кэша:", e);
  }
}

window.clearCache = clearCache;

// Обеспечивает готовность индекса операция -> ключи объёмов
async function ensureOperationKeysIndex() {
  if (operationKeysIndex && Object.keys(operationKeysIndex).length > 0) return;
  operationOptionsHtmlIndex = {};

  let rates = [];
  try {
    if (isCacheValid(dataCache.rates)) {
      rates = dataCache.rates.data;
    } else {
      const res = await fetch(`${scriptURL}?type=rates`);
      const data = await res.json();
      rates = data.rates || [];
      dataCache.rates = { data: rates, timestamp: Date.now() };
    }
  } catch (e) {
    console.error("Ошибка загрузки тарифов для индекса объёмов:", e);
    rates = [];
  }

  const filtered = rates.filter(r => r.operation !== "Ставка_Аутсорсинг" && r.operation !== "Ставка_штат");
  operationKeysIndex = filtered.reduce((acc, rate) => {
    const op = rate.operation;
    const key = rate.key;
    if (!op || !key) return acc;
    if (!acc[op]) acc[op] = new Set();
    acc[op].add(String(key));
    return acc;
  }, {});
  Object.keys(operationKeysIndex).forEach(op => {
    const sorted = sortVolumeKeysNaturally(Array.from(operationKeysIndex[op]));
    operationKeysIndex[op] = sorted;
    operationOptionsHtmlIndex[op] = ['<option value="">-- Выбери объём --</option>']
      .concat(sorted.map(k => `<option value="${k}">${k}</option>`))
      .join('');
  });
}

// Загрузка моделей упаковки с кэшированием
async function loadPackingModels() {
  const select = document.getElementById("profilePackingModel");
  if (!select) return;
  
  // 🛡️ Защита от одновременной загрузки
  if (isLoadingPackingModels) {
    return;
  }
  
  // Проверяем кэш
  if (isCacheValid(dataCache.packingModels)) {
    populatePackingModelsSelect(dataCache.packingModels.data);
    return;
  }
  
  // Устанавливаем флаг загрузки
  isLoadingPackingModels = true;
  
  // Показываем индикатор загрузки только если select пустой
  if (select.options.length <= 1) {
    select.innerHTML = '<option value="">⏳ Загрузка...</option>';
  }
  
  try {
    const res = await fetch(`${scriptURL}?type=packingModels`);
    const data = await res.json();
    const models = data.models || [];
    
    // Сохраняем в кэш
    dataCache.packingModels = {
      data: models,
      timestamp: Date.now()
    };
    
    // Сохраняем в localStorage для долгосрочного кэша
    try {
      localStorage.setItem('packingModelsCache', JSON.stringify({
        data: models,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn("Не удалось сохранить модели упаковки в localStorage");
    }
    
    populatePackingModelsSelect(models);
    
  } catch (err) {
    console.error("Ошибка загрузки моделей упаковки:", err);
    // Пытаемся загрузить из localStorage как fallback
    const fallbackData = tryLoadPackingModelsFromStorage();
    if (fallbackData) {
      populatePackingModelsSelect(fallbackData);
    } else {
      // Показываем ошибку только если select был пустой
      if (select.options.length <= 1) {
        select.innerHTML = '<option value="">❌ Ошибка загрузки</option>';
      }
    }
  } finally {
    // Сбрасываем флаг загрузки
    isLoadingPackingModels = false;
  }
}

// Вспомогательная функция для заполнения select'а моделями
function populatePackingModelsSelect(models) {
  const select = document.getElementById("profilePackingModel");
  if (!select) return;
  
  // 💾 Сохраняем текущее выбранное значение
  const currentValue = select.value;
  
  // Проверяем, изменились ли данные (избегаем ненужных обновлений)
  const currentOptions = Array.from(select.options).slice(1).map(opt => opt.value);
  const newModels = models || [];
  const hasChanges = JSON.stringify(currentOptions.sort()) !== JSON.stringify(newModels.sort());
  
  // Если данные не изменились и select уже заполнен, не обновляем
  if (!hasChanges && select.options.length > 1) {
    return;
  }
  
  // Очищаем и заполняем заново
  select.innerHTML = '<option value="">-- Выберите --</option>';
  newModels.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model;
    opt.textContent = model;
    select.appendChild(opt);
  });
  
  // 🔄 Восстанавливаем выбранное значение, если оно существует в новом списке
  if (currentValue && newModels.includes(currentValue)) {
    select.value = currentValue;
  } else if (currentValue && !newModels.includes(currentValue)) {
    console.warn(`⚠️ Ранее выбранная модель "${currentValue}" больше не доступна`);
  }
}

// Функция загрузки моделей упаковки из localStorage как fallback
function tryLoadPackingModelsFromStorage() {
  try {
    const cached = localStorage.getItem('packingModelsCache');
    if (cached) {
      const data = JSON.parse(cached);
      // Проверяем что данные не старше 24 часов
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа
      if (Date.now() - data.timestamp < maxAge) {
        return data.data;
      }
    }
  } catch (e) {
    console.warn("Ошибка при загрузке из localStorage:", e);
  }
  return null;
}

// Предзагрузка моделей упаковки при инициализации страницы
function preloadPackingModels() {
  // 🛡️ Защита от повторных вызовов
  if (isLoadingPackingModels) {
    return;
  }
  
  // Сначала пытаемся загрузить из localStorage
  const cachedData = tryLoadPackingModelsFromStorage();
  if (cachedData) {
    dataCache.packingModels = {
      data: cachedData,
      timestamp: Date.now() - 1000 // Ставим чуть старше, чтобы обновилось в фоне
    };
    
    // Заполняем select если он уже есть
    setTimeout(() => {
      const select = document.getElementById("profilePackingModel");
      if (select && select.options.length <= 1) { // Если еще не заполнен
        populatePackingModelsSelect(cachedData);
      }
    }, 100);
  }
  
  // Обновляем в фоне для свежести данных (с задержкой)
  setTimeout(() => {
    if (!isCacheValid(dataCache.packingModels) && !isLoadingPackingModels) {
      loadPackingModels().catch(err => {
        console.warn("Фоновое обновление моделей упаковки не удалось:", err);
      });
    }
  }, 2000); // Увеличиваем задержку для избежания конфликтов
}


