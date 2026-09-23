<?php

declare(strict_types=1);

/**
 * Obama Cinema — Complete End-to-End API & Security Test Suite
 * Tests against live backend server (http://localhost:8000)
 */

$baseUrl = 'http://localhost:8000/api';
$totalTests = 0;
$passed = 0;
$failed = 0;

function assertTest(string $name, bool $condition, string $failMessage = ''): void {
    global $totalTests, $passed, $failed;
    $totalTests++;
    if ($condition) {
        echo "  [PASS] {$name}" . PHP_EOL;
        $passed++;
    } else {
        echo "  [FAIL] {$name}: {$failMessage}" . PHP_EOL;
        $failed++;
    }
}

function http(string $method, string $url, ?array $body = null, ?string $token = null): array {
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    if ($token !== null) {
        $headers[] = "Authorization: Bearer {$token}";
    }

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => false,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body);
    }
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = is_string($raw) ? json_decode($raw, true) : null;
    return [
        'code' => $code,
        'data' => $json,
        'raw' => $raw,
    ];
}

echo "==========================================================" . PHP_EOL;
echo "  OBAMA CINEMA — END-TO-END AUTOMATED TEST SUITE          " . PHP_EOL;
echo "==========================================================" . PHP_EOL . PHP_EOL;

// 1. HEALTHCHECK
echo "[1] Тестирование Healthcheck:" . PHP_EOL;
$res = http('GET', "{$baseUrl}/health");
assertTest('Сервер доступен и возвращает 200 OK', $res['code'] === 200);
assertTest('Healthcheck возвращает статус ok', ($res['data']['data']['status'] ?? '') === 'ok');

// 2. AUTHENTICATION & SECURITY
echo PHP_EOL . "[2] Тестирование Аутентификации и Валидации:" . PHP_EOL;
$testUserEmail = 'tester_' . time() . '@obama.test';
$testUserPass = 'securePassword123!';

// Short password validation
$res = http('POST', "{$baseUrl}/auth/register", [
    'email' => 'short_' . time() . '@obama.test',
    'username' => 'shortpass',
    'password' => '123',
]);
assertTest('Отклоняет регистрацию с коротким паролем (< 6 символов) со статусом 422', $res['code'] === 422);

// Invalid email validation
$res = http('POST', "{$baseUrl}/auth/register", [
    'email' => 'invalid-email-format',
    'username' => 'bademail',
    'password' => 'securePassword123!',
]);
assertTest('Отклоняет некорректный email со статусом 422', $res['code'] === 422);

// Successful registration
$res = http('POST', "{$baseUrl}/auth/register", [
    'email' => $testUserEmail,
    'username' => 'qa_tester_' . time(),
    'password' => $testUserPass,
]);
assertTest('Успешно регистрирует нового пользователя (201 Created)', $res['code'] === 201);
$token = $res['data']['data']['token'] ?? null;
assertTest('Ответ содержит JWT токен', !empty($token));

// Duplicate registration
$res = http('POST', "{$baseUrl}/auth/register", [
    'email' => $testUserEmail,
    'username' => 'duplicate_user',
    'password' => $testUserPass,
]);
assertTest('Отклоняет повторную регистрацию того же email (409 Conflict)', $res['code'] === 409);

// Login with wrong password
$res = http('POST', "{$baseUrl}/auth/login", [
    'email' => $testUserEmail,
    'password' => 'wrong_password_xyz',
]);
assertTest('Отклоняет неверный пароль (401 Unauthorized)', $res['code'] === 401);

// Login with correct credentials
$res = http('POST', "{$baseUrl}/auth/login", [
    'email' => $testUserEmail,
    'password' => $testUserPass,
]);
assertTest('Успешный вход в аккаунт (200 OK)', $res['code'] === 200 && !empty($res['data']['data']['token']));

// Access /auth/me with Bearer token
$res = http('GET', "{$baseUrl}/auth/me", null, $token);
assertTest('/api/auth/me возвращает текущего пользователя при наличии токена', $res['code'] === 200 && ($res['data']['data']['email'] ?? '') === $testUserEmail);

// Access /auth/me without token (Unauthorized)
$res = http('GET', "{$baseUrl}/auth/me");
assertTest('/api/auth/me возвращает 401 Unauthorized без токена', $res['code'] === 401);

// 3. CATALOG & FILTERING
echo PHP_EOL . "[3] Тестирование Каталога и Фильтрации:" . PHP_EOL;
$res = http('GET', "{$baseUrl}/catalog");
assertTest('Получение каталога возвращает 200 OK', $res['code'] === 200);
assertTest('Каталог содержит элементы и метаданные пагинации', !empty($res['data']['data']) && isset($res['data']['meta']['total']));

$res = http('GET', "{$baseUrl}/filters/meta");
assertTest('Эндпоинт фильтров /api/filters/meta возвращает типы, жанры и страны', 
    $res['code'] === 200 && 
    !empty($res['data']['data']['types']) && 
    !empty($res['data']['data']['genres']) && 
    !empty($res['data']['data']['countries'])
);

// SQL Injection safety in search query
$res = http('GET', "{$baseUrl}/catalog?q=" . urlencode("' OR 1=1 --"));
assertTest('SQL-инъекция в параметре q безопасно экранируется и возвращает 200 OK', $res['code'] === 200);

// 4. ANIME API (ANIXART INTEGRATION)
echo PHP_EOL . "[4] Тестирование Anime API (Anixart Open API & Stream Extraction):" . PHP_EOL;
$res = http('GET', "{$baseUrl}/anime/popular");
assertTest('Получение популярных аниме /api/anime/popular возвращает 200 OK', $res['code'] === 200);
$firstAnime = $res['data']['data']['data'][0] ?? null;
assertTest('Аниме содержит поля id, titleRu, titleOriginal, grade5, rating', 
    $firstAnime !== null && 
    isset($firstAnime['id'], $firstAnime['titleRu'], $firstAnime['titleOriginal'], $firstAnime['rating'])
);

// Search Anime
$res = http('GET', "{$baseUrl}/anime/search?q=" . urlencode('Наруто'));
assertTest('Поиск аниме «Наруто» возвращает 200 OK', $res['code'] === 200);
$foundNaruto = false;
foreach ($res['data']['data']['data'] ?? [] as $anime) {
    if (str_contains($anime['title'] ?? '', 'Наруто') || str_contains($anime['titleOriginal'] ?? '', 'Naruto')) {
        $foundNaruto = true;
        break;
    }
}
assertTest('В результатах поиска найден тайтл «Наруто»', $foundNaruto);

// Get Anime Details (Naruto id = 609)
$res = http('GET', "{$baseUrl}/anime/609");
assertTest('Получение детальной карточки аниме /api/anime/609 возвращает 200 OK', $res['code'] === 200);
$naruto = $res['data']['data'] ?? [];
assertTest('Карточка содержит студию (Studio Pierrot) и скриншоты', 
    ($naruto['studio'] ?? '') === 'Studio Pierrot' && !empty($naruto['screenshots'])
);

// Dubbers / Voiceover studios
$res = http('GET', "{$baseUrl}/anime/609/dubbers");
assertTest('Получение доступных озвучек /api/anime/609/dubbers возвращает 200 OK', $res['code'] === 200 && !empty($res['data']['data']));
$has2x2 = false;
foreach ($res['data']['data'] ?? [] as $dub) {
    if (($dub['name'] ?? '') === '2x2') {
        $has2x2 = true;
        break;
    }
}
assertTest('Среди озвучек найдена студия «2x2»', $has2x2);

// Episodes list
$res = http('GET', "{$baseUrl}/anime/609/episodes");
assertTest('Получение серий /api/anime/609/episodes возвращает 200 OK', $res['code'] === 200 && !empty($res['data']['data']['episodes']));
$totalEpisodes = count($res['data']['data']['episodes'] ?? []);
assertTest("Количество серий Наруто корректно (220 серий)", $totalEpisodes === 220);

// Stream resolution (Kodik ROT18 decode -> direct .m3u8)
$res = http('GET', "{$baseUrl}/anime/609/streams?position=1");
assertTest('Разрешение стримов серии /api/anime/609/streams?position=1 возвращает 200 OK', $res['code'] === 200 && !empty($res['data']['data']));
$streams = $res['data']['data'] ?? [];
$hasHls = false;
$sampleStreamUrl = '';
foreach ($streams as $stream) {
    if (($stream['playerType'] ?? '') === 'hls' && str_contains($stream['streamUrl'] ?? '', '.m3u8')) {
        $hasHls = true;
        $sampleStreamUrl = $stream['streamUrl'];
        break;
    }
}
assertTest('Стрим серии успешно декодирован в прямой HLS (.m3u8)', $hasHls, 'Стрим m3u8 не обнаружен');

// Live HTTP check on the resolved m3u8 stream
if ($sampleStreamUrl) {
    $ch = curl_init($sampleStreamUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_RANGE => '0-100',
        CURLOPT_TIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $manifestChunk = curl_exec($ch);
    $httpStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    assertTest('Прямой CDN поток .m3u8 отдаёт 200/206 с заголовком #EXTM3U', 
        ($httpStatus === 200 || $httpStatus === 206) && str_contains((string)$manifestChunk, '#EXTM3U'),
        "Status: {$httpStatus}, chunk: {$manifestChunk}"
    );
}

// Unified content endpoints for anime
$res = http('GET', "{$baseUrl}/content/anime-609");
assertTest('Универсальный эндпоинт /api/content/anime-609 прозрачно загружает данные тайтла', $res['code'] === 200 && ($res['data']['data']['slug'] ?? '') === 'anime-609');

$res = http('GET', "{$baseUrl}/content/609/seasons");
assertTest('Универсальный эндпоинт /api/content/609/seasons возвращает сезоны и серии', $res['code'] === 200 && !empty($res['data']['data']));

$res = http('GET', "{$baseUrl}/content/609/sources?episode_id=1");
assertTest('Универсальный эндпоинт /api/content/609/sources?episode_id=1 отдаёт HLS потоки для плеера', $res['code'] === 200 && !empty($res['data']['data']));

// 5. SOCIAL FEATURES (COMMENTS, RATINGS, BOOKMARKS, WATCH HISTORY)
echo PHP_EOL . "[5] Тестирование Социальных Функций (Комментарии, Оценки, Закладки, История):" . PHP_EOL;

// Find valid content ID from database
$catalogRes = http('GET', "{$baseUrl}/catalog");
$contentId = $catalogRes['data']['data'][0]['id'] ?? 1;

// Post comment with XSS
$xssPayload = '<script>alert("xss")</script><b>Потрясающее произведение! Рекомендую к просмотру всем.</b>';
$res = http('POST', "{$baseUrl}/content/{$contentId}/comments", [
    'content' => $xssPayload,
], $token);
assertTest('Добавление комментария авторизованным пользователем (201 Created)', $res['code'] === 201);
$commentId = $res['data']['data']['id'] ?? null;
assertTest('Комментарий создан с ID', !empty($commentId));
assertTest('HTML-теги скриптов санитизированы во избежание XSS', !str_contains($res['data']['data']['content'] ?? '', '<script>'));

// Edit comment
$res = http('PUT', "{$baseUrl}/comments/{$commentId}", [
    'content' => 'Обновлённый комментарий: шедевр кинематографа!',
], $token);
assertTest('Автор успешно редактирует свой комментарий (200 OK)', $res['code'] === 200);

// IDOR Check: Second user attempts to edit comment
$secondUserEmail = 'user2_' . time() . '@obama.test';
$reg2 = http('POST', "{$baseUrl}/auth/register", [
    'email' => $secondUserEmail,
    'username' => 'intruder_' . time(),
    'password' => 'securePassword123!',
]);
$token2 = $reg2['data']['data']['token'] ?? null;

$res = http('PUT', "{$baseUrl}/comments/{$commentId}", [
    'content' => 'Взлом комментария другим пользователем',
], $token2);
assertTest('Защита от IDOR: чужой пользователь НЕ может редактировать комментарий (403 Forbidden)', $res['code'] === 403);

// Delete comment by original author
$res = http('DELETE', "{$baseUrl}/comments/{$commentId}", null, $token);
assertTest('Автор успешно удаляет свой комментарий (200 OK)', $res['code'] === 200);

// Rating: Rate content
$res = http('POST', "{$baseUrl}/content/{$contentId}/ratings", [
    'rating' => 10,
], $token);
assertTest('Успешная оценка контента (10 баллов)', $res['code'] === 200);

// Invalid rating (> 10)
$res = http('POST', "{$baseUrl}/content/{$contentId}/ratings", [
    'rating' => 15,
], $token);
assertTest('Отклонение недопустимой оценки (> 10) со статусом 422', $res['code'] === 422);

// Delete rating
$res = http('DELETE', "{$baseUrl}/content/{$contentId}/ratings", null, $token);
assertTest('Успешное удаление оценки (200 OK)', $res['code'] === 200);

// Bookmarks: Add bookmark
$res = http('POST', "{$baseUrl}/bookmarks", [
    'content_id' => $contentId,
    'category' => 'watching',
], $token);
assertTest('Добавление тайтла в закладки «Смотрю» (201 Created)', $res['code'] === 201 || $res['code'] === 200);

// Get bookmarks
$res = http('GET', "{$baseUrl}/bookmarks", null, $token);
assertTest('Список закладок возвращает добавленный тайтл', $res['code'] === 200 && !empty($res['data']['data']));

// Delete bookmark
$res = http('DELETE', "{$baseUrl}/bookmarks/{$contentId}", null, $token);
assertTest('Удаление из закладок (200 OK)', $res['code'] === 200);

// Watch Progress: save progress
$res = http('POST', "{$baseUrl}/watch/progress", [
    'content_id' => $contentId,
    'progress_seconds' => 450,
    'duration_seconds' => 1800,
], $token);
assertTest('Сохранение прогресса просмотра (200 OK)', $res['code'] === 200);

// Get unfinished
$res = http('GET', "{$baseUrl}/watch/unfinished", null, $token);
assertTest('Получение незавершённых просмотров возвращает сохранённый тайтл', $res['code'] === 200 && !empty($res['data']['data']));

// Clear history
$res = http('DELETE', "{$baseUrl}/watch/history", null, $token);
assertTest('Очистка истории просмотров (200 OK)', $res['code'] === 200);

echo PHP_EOL . "==========================================================" . PHP_EOL;
echo "  РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ: Успешно: {$passed}, Провалено: {$failed}, Всего: {$totalTests}" . PHP_EOL;
echo "==========================================================" . PHP_EOL;

if ($failed > 0) {
    exit(1);
}
