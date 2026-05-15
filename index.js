// Подключаем библиотеку express для создания веб-сервера
const express = require('express');
const app = express(); 

// --- ВАШИ ДАННЫЕ ДЛЯ ВХОДА В GNEZDO ---
const CONFIG = {
  LOGIN: "web@reklamy.ru",
  PASSWORD: "12jk6MRNFiyRIzroFl"
};
// --------------------------------------

// Разрешаем доступ со всех доменов (для JetStat)
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

async function buildCSV(sid, startDateStr, endDateStr) {
  // Убрали url и batch_id, оставили 7 столбцов
  const rows = [['date', 'id', 'title', 'views', 'views_real', 'clicks', 'money']];
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
          // Экранируем title: заменяем внутренние запятые на точку с запятой
          // и удаляем все кавычки, чтобы не ломать CSV
          let title = item.title || '';
          title = title.replace(/,/g, ';');  // запятые внутри title → ;
          title = title.replace(/"/g, '');    // удаляем кавычки
          
          rows.push([
            dateStr,
            item.id || '',
            title,
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
  // Разделитель теперь ; (точка с запятой)
  return rows.map(row => row.join(';')).join('\n');
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
