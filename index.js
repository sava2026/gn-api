// Подключаем библиотеку express для создания веб-сервера
const express = require('express');
const app = express(); 

// --- ВАШИ ДАННЫЕ ДЛЯ ВХОДА В GNEZDO ---
const CONFIG = {
  LOGIN: "web@reklamy.ru",
  PASSWORD: "12jk6MRNFiyRIzroFl"
};
// --------------------------------------

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
  
  const csv = await buildCSV(sid, dateStart, dateEnd);
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

// Функция для правильного экранирования CSV полей
function escapeCSV(field) {
  if (field === undefined || field === null) return '';
  
  const str = String(field);
  // Если поле содержит разделитель (;), кавычку (") или перевод строки (\n)
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    // Заменяем кавычки на двойные кавычки (стандарт CSV)
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function buildCSV(sid, startDateStr, endDateStr) {
  // Фиксированные заголовки
  const headers = ['date', 'id', 'title', 'views', 'views_real', 'clicks', 'money'];
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
          // Явно берем значение, даже если оно 0
          const views = item.views !== undefined && item.views !== null ? String(item.views) : '0';
          
          rows.push([
            dateStr,
            item.id || '',
            escapeCSV(item.title || ''),
            views,
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
