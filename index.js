// ИСПРАВЛЕННЫЙ КОД ДЛЯ RENDER
const express = require('express');
const app = express();

// --- ВАШИ ДАННЫЕ ДЛЯ ВХОДА В GNEZDO (ЗАМЕНИТЕ НА СВОИ!) ---
const CONFIG = {
  LOGIN: "web@reklamy.ru",
  PASSWORD: "12jk6MRNFiyRIzroFl"
};
// ----------------------------------------------------------

// Разрешаем доступ со всех доменов (для JetStat)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', async (req, res) => {
  // Устанавливаем заголовок, чтобы браузер и JetStat поняли, что это CSV
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  
  const dateStart = req.query.date_start || '2026-03-01';
  const dateEnd = req.query.date_end || '2026-03-10';
  
  console.log(`Запрос данных с ${dateStart} по ${dateEnd}`);
  
  const sid = await getSid();
  if (!sid) {
    return res.send('error,auth_failed');
  }
  
  const csv = await buildCSV(sid, dateStart, dateEnd);
  // Добавляем BOM для корректной работы кириллицы
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

async function buildCSV(sid, startDateStr, endDateStr) {
  const rows = [['date', 'id', 'title', 'url', 'views', 'views_real', 'clicks', 'money', 'batch_id']];
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
          rows.push([
            dateStr, item.id || '', item.title || '', item.url || '',
            item.views || '0', item.views_real || '0',
            item.clicks || '0', item.money || '0', item.batch_id || ''
          ]);
        }
      }
    } catch(e) {
      console.error(`Ошибка за ${dateStr}:`, e);
    }
  }
  return rows.map(row => row.join(',')).join('\n');
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
