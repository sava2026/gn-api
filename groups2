const express = require('express');
const app = express();

// --- ВАШИ ДАННЫЕ ДЛЯ ВХОДА В GNEZDO (ЗАМЕНИТЕ НА СВОИ!) ---
const CONFIG = {
  LOGIN: "web@reklamy.ru",
  PASSWORD: "12jk6MRNFiyRIzroFl"
};
// ----------------------------------------------------------

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  
  const dateStart = req.query.date_start || '2026-03-01';
  const dateEnd = req.query.date_end || '2026-03-10';
  
  console.log(`Запрос данных с ${dateStart} по ${dateEnd}`);
  
  const sid = await getSid();
  if (!sid) {
    return res.send('error;auth_failed');
  }
  
  const batchMap = await getBatchMap(sid);
  console.log(`Загружено групп: ${Object.keys(batchMap).length}`);
  
  const csv = await buildCSV(sid, dateStart, dateEnd, batchMap);
  res.send('\uFEFF' + csv);
});

async function getSid() {
  const url = `https://lk-gnezdo.com/cgi-bin/admin/auth.cgi?json=1&login=${CONFIG.LOGIN}&password=${CONFIG.PASSWORD}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("SID получен");
    return data.sid || null;
  } catch(e) {
    console.error("Ошибка авторизации:", e);
    return null;
  }
}

// Функция для получения списка кампаний и групп
async function getBatchMap(sid) {
  const url = `https://lk-gnezdo.com/cgi-bin/admin/anons.cgi?json=1&sid=${sid}&mode=batchlist`;
  const batchMap = {};
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.list && Array.isArray(data.list)) {
      for (const item of data.list) {
        batchMap[item.batch_id] = {
          batch_name: item.batch_name || '',
          campaign_id: item.campaign_id || '',
          campaign_name: item.campaign_name || ''
        };
      }
    }
  } catch(e) {
    console.error("Ошибка получения списка групп:", e);
  }
  return batchMap;
}

// *** НОВАЯ ФУНКЦИЯ: Очистка текста от HTML-сущностей и спецсимволов ***
function cleanText(text) {
  if (!text) return '';
  let cleaned = String(text);
  
  // 1. Заменяем HTML-сущности на нормальные символы
  const htmlEntities = {
    '&laquo;': '«',
    '&raquo;': '»',
    '&amp;': '&',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
  };
  
  for (const [entity, symbol] of Object.entries(htmlEntities)) {
    cleaned = cleaned.replace(new RegExp(entity, 'g'), symbol);
  }
  
  // 2. Удаляем все оставшиеся HTML-теги (на всякий случай)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // 3. Удаляем все оставшиеся символы & (которые могут быть в конце сущностей)
  //    Но не трогаем те, что стали частью текста (например, "AT&T")
  //    Удаляем только одиночные &, которые не являются частью слова
  cleaned = cleaned.replace(/&(?![a-zA-Z])/g, '');
  
  // 4. Удаляем лишние пробелы
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Функция для правильного экранирования CSV полей (улучшенная)
function escapeCSV(field) {
  if (field === undefined || field === null) return '';
  
  // Сначала очищаем текст от HTML-сущностей
  const cleaned = cleanText(field);
  
  // Если поле содержит разделитель (;), кавычку (") или перевод строки (\n)
  if (cleaned.includes(';') || cleaned.includes('"') || cleaned.includes('\n')) {
    return '"' + cleaned.replace(/"/g, '""') + '"';
  }
  return cleaned;
}

async function buildCSV(sid, startDateStr, endDateStr, batchMap) {
  const headers = [
    'date', 'id', 'title', 'batch_id', 'batch_name', 
    'campaign_id', 'campaign_name', 'views', 'views_real', 'clicks', 'money'
  ];
  
  const rows = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0,10);
    const apiUrl = `https://lk-gnezdo.com/cgi-bin/admin/stat.cgi?json=1&mode=anons&sid=${sid}&date_start=${dateStr}&date_end=${dateStr}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.list && data.list.length > 0) {
        for (const item of data.list) {
          const batchId = item.batch_id || '';
          const batchInfo = batchMap[batchId] || { batch_name: '', campaign_id: '', campaign_name: '' };
          
          // Очищаем title и другие текстовые поля через cleanText + escapeCSV
          const title = escapeCSV(item.title || '');
          const batchName = escapeCSV(batchInfo.batch_name);
          const campaignName = escapeCSV(batchInfo.campaign_name);
          
          rows.push([
            dateStr,
            item.id || '',
            title,
            batchId,
            batchName,
            batchInfo.campaign_id || '',
            campaignName,
            item.views || '0',
            item.views_real || '0',
            item.clicks || '0',
            item.money || '0'
          ]);
        }
      }
    } catch(e) {
      console.error(`Ошибка за ${dateStr}:`, e);
    }
  }
  
  const csvLines = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ];
  
  return csvLines.join('\n');
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
