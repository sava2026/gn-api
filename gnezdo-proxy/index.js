// Этот код полностью заменяет ваш предыдущий файл

// --- ВАШИ ДАННЫЕ ДЛЯ ВХОДА В GNEZDO (ЗАМЕНИТЕ НА СВОИ!) ---
// Лучше хранить их как переменные окружения, а не здесь
const CONFIG = {
  LOGIN: "web@reklamy.ru",
  PASSWORD: "12jk6MRNFiyRIzroFl"
};
// ----------------------------------------------------------

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (getSid, getBatchMap, cleanText, buildJSON) ---
// Они остаются без изменений, я их не дублирую для краткости.
// Скопируйте их сюда из вашего исходного файла.
// ...

// --- ГЛАВНЫЙ ОБРАБОТЧИК ДЛЯ YANDEX CLOUD FUNCTIONS ---
exports.handler = async function (event, context) {
    // 1. Устанавливаем заголовки для ответа
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    };

    // 2. Получаем параметры из запроса
    const dateStart = event.queryStringParameters?.date_start || '2026-08-01';
    const dateEnd = event.queryStringParameters?.date_end || '2026-08-31';

    console.log(`Запрос данных с ${dateStart} по ${dateEnd}`);

    try {
        // 3. Выполняем основную логику (ваши функции)
        const sid = await getSid();
        if (!sid) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'auth_failed' }) };
        }

        const batchMap = await getBatchMap(sid);
        console.log(`Загружено групп: ${Object.keys(batchMap).length}`);

        const data = await buildJSON(sid, dateStart, dateEnd, batchMap);

        // 4. Возвращаем успешный ответ
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error("Ошибка выполнения функции:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'internal_server_error' })
        };
    }
};
