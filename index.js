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
  // Устанавливаем заголовок для JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  const dateStart = req.query.date_start || '2026-03-01';
  const dateEnd = req.query.date_end || '2026-11-10';
  
  console.log(`Запрос данных с ${dateStart} по ${dateEnd}`);
  
  const sid = await getSid();
  if (!sid) {
    return res.json({ error: 'auth_failed' });
  }
  
  // Получаем справочник групп и кампаний
  const batchMap = await getBatchMap(sid);
  console.log(`Загружено групп: ${Object.keys(batchMap).length}`);
  
  const data = await buildJSON(sid, dateStart, dateEnd, batchMap);
  res.json(data);
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
    console.log(`Найдено ${Object.keys(batchMap).length} групп в аккаунте`);
  } catch(e) {
    console.error("Ошибка получения списка групп:", e);
  }
  
  return batchMap;
}

// Функция для очистки текста от HTML-сущностей
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    // Добавьте другие сущности по мере необходимости
    .replace(/&[a-z]+;/g, ''); // На всякий случай удаляем неизвестные сущности
}

async function buildJSON(sid, startDateStr, endDateStr, batchMap) {
  const result = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0,10);
    const apiUrl = `https://lk-gnezdo.com/cgi-bin/admin/stat.cgi?json=1&mode=anons&sid=${sid}&date_start=${dateStr}&date_end=${dateStr}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.list && Array.isArray(data.list)) {
        for (const item of data.list) {
          const batchId = item.batch_id || '';
          const batchInfo = batchMap[batchId] || { batch_name: '', campaign_id: '', campaign_name: '' };
          
          result.push({
            date: dateStr,
            id: item.id || '',
            title: cleanText(item.title || ''),
            batch_id: batchId,
            batch_name: cleanText(batchInfo.batch_name),
            campaign_id: batchInfo.campaign_id || '',
            campaign_name: cleanText(batchInfo.campaign_name),
            views: item.views || '0',
            views_real: item.views_real || '0',
            clicks: item.clicks || '0',
            money: item.money || '0'
          });
        }
      }
    } catch(e) {
      console.error(`Ошибка за ${dateStr}:`, e);
    }
  }
  
  return result;
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
