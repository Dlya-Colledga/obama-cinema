<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\DTO\BookmarkDTO;
use App\DTO\CatalogFilterDTO;
use App\DTO\CreateCommentDTO;
use App\DTO\LoginDTO;
use App\DTO\RateContentDTO;
use App\DTO\RegisterDTO;
use App\Exceptions\ValidationException;
use App\Validators\Validator;

$passed = 0;
$failed = 0;

function it(string $description, callable $fn): void {
    global $passed, $failed;
    try {
        $fn();
        echo "  [PASS] {$description}" . PHP_EOL;
        $passed++;
    } catch (\Throwable $e) {
        echo "  [FAIL] {$description}: " . $e->getMessage() . PHP_EOL;
        $failed++;
    }
}

echo "=== Запуск Unit-тестов Backend Obama Cinema ===" . PHP_EOL;

it('Успешно валидирует корректные данные регистрации', function () {
    $dto = RegisterDTO::fromArray([
        'email' => 'test@cinema.com',
        'username' => 'test_user',
        'password' => 'secret123',
    ]);
    Validator::validateRegister($dto);
});

it('Бросает ValidationException при некорректном email', function () {
    $dto = RegisterDTO::fromArray([
        'email' => 'invalid-email',
        'username' => 'test_user',
        'password' => 'secret123',
    ]);
    try {
        Validator::validateRegister($dto);
        throw new \Exception('Expected ValidationException was not thrown');
    } catch (ValidationException $e) {
        // Passed
    }
});

it('Бросает ValidationException при коротком пароле', function () {
    $dto = RegisterDTO::fromArray([
        'email' => 'valid@cinema.com',
        'username' => 'test_user',
        'password' => '123',
    ]);
    try {
        Validator::validateRegister($dto);
        throw new \Exception('Expected ValidationException was not thrown');
    } catch (ValidationException $e) {
        // Passed
    }
});

it('Проверяет допустимый диапазон оценок (1-10)', function () {
    Validator::validateRating(1);
    Validator::validateRating(10);
    Validator::validateRating(5);

    try {
        Validator::validateRating(0);
        throw new \Exception('Expected ValidationException for rating 0');
    } catch (ValidationException $e) {}

    try {
        Validator::validateRating(11);
        throw new \Exception('Expected ValidationException for rating 11');
    } catch (ValidationException $e) {}
});

it('Проверяет допустимые категории закладок', function () {
    Validator::validateBookmarkCategory('watching');
    Validator::validateBookmarkCategory('plan_to_watch');
    Validator::validateBookmarkCategory('completed');
    Validator::validateBookmarkCategory('dropped');
    Validator::validateBookmarkCategory('favorite');

    try {
        Validator::validateBookmarkCategory('invalid_category');
        throw new \Exception('Expected ValidationException for invalid category');
    } catch (ValidationException $e) {}
});

it('Санитизирует HTML в комментариях во избежание XSS', function () {
    $raw = '<script>alert("xss")</script><b>Фильм огонь!</b>';
    $sanitized = Validator::sanitizeText($raw);
    if (str_contains($sanitized, '<script>')) {
        throw new \Exception('Script tag was not sanitized');
    }
});

it('Корректно парсит фильтры каталога и выставляет пагинацию', function () {
    $filter = CatalogFilterDTO::fromQueryParams([
        'type' => 'movie',
        'genre' => 'sci-fi',
        'year_from' => '2010',
        'year_to' => '2024',
        'rating_from' => '7.5',
        'sort' => 'rating',
        'page' => '2',
        'limit' => '12',
    ]);

    if ($filter->type !== 'movie' || $filter->genre !== 'sci-fi' || $filter->page !== 2 || $filter->limit !== 12) {
        throw new \Exception('CatalogFilterDTO values mismatch');
    }
});

it('KodikParser поддерживает ссылки на kodik и kodikplayer', function () {
    $parser = new \App\Services\Anixart\Parsers\KodikParser();
    if (!$parser->supports('https://kodikplayer.com/seria/123/abc/720p', 'Kodik')) {
        throw new \Exception('KodikParser should support kodikplayer.com');
    }
    if (!$parser->supports('https://kodik.info/video/456/def', 'kodik')) {
        throw new \Exception('KodikParser should support kodik.info');
    }
    if ($parser->supports('https://youtube.com/watch?v=123', 'YouTube')) {
        throw new \Exception('KodikParser should not support youtube');
    }
});

it('AnilibriaParser поддерживает ссылки на anilibria и libria', function () {
    $parser = new \App\Services\Anixart\Parsers\AnilibriaParser();
    if (!$parser->supports('https://anixart.libria.fun/public/iframe.php?id=8789&ep=1', 'Libria')) {
        throw new \Exception('AnilibriaParser should support libria.fun');
    }
    if (!$parser->supports('https://aniliberty.top/releases/123', 'AniLibria')) {
        throw new \Exception('AnilibriaParser should support aniliberty.top');
    }
});

it('StreamResolver корректно формирует iframe fallback для неподдерживаемых плееров', function () {
    $resolver = new \App\Services\Anixart\Parsers\StreamResolver();
    $streams = $resolver->resolve('https://embed.external-player.com/watch/999', 'ExternalPlayer', 'AniDUB');
    if (empty($streams)) {
        throw new \Exception('Expected fallback stream to be returned');
    }
    $first = $streams[0];
    if ($first['playerType'] !== 'iframe' || $first['streamUrl'] !== 'https://embed.external-player.com/watch/999') {
        throw new \Exception('Invalid fallback stream structure');
    }
    if ($first['translationTitle'] !== 'AniDUB') {
        throw new \Exception('Invalid translation title');
    }
});

it('AnimeService корректно нормализует метаданные релиза с 10-балльной оценкой', function () {
    $client = new \App\Services\Anixart\AnixartClient();
    $resolver = new \App\Services\Anixart\Parsers\StreamResolver();
    $service = new \App\Services\AnimeService($client, $resolver);

    $raw = [
        'id' => 16648,
        'title_ru' => 'Магическая битва',
        'title_original' => 'Jujutsu Kaisen',
        'year' => '2020',
        'genres' => 'экшен, сёнен, фэнтези',
        'grade' => 4.75,
        'poster' => 'poster_hash_123',
        'episodes_total' => 24,
        'episodes_released' => 24,
        'studio' => 'MAPPA',
    ];

    // Reflect to invoke private normalizeRelease
    $method = new \ReflectionMethod($service, 'normalizeRelease');
    $normalized = $method->invoke($service, $raw, true);

    if ($normalized['title'] !== 'Магическая битва') {
        throw new \Exception('Incorrect normalized title: ' . $normalized['title']);
    }
    if ($normalized['titleOriginal'] !== 'Jujutsu Kaisen') {
        throw new \Exception('Incorrect titleOriginal: ' . $normalized['titleOriginal']);
    }
    if ($normalized['rating'] !== 9.5) { // 4.75 * 2 = 9.5
        throw new \Exception('Incorrect converted rating (expected 9.5, got ' . $normalized['rating'] . ')');
    }
    if ($normalized['posterUrl'] !== 'https://s.anixmirai.com/posters/poster_hash_123.jpg') {
        throw new \Exception('Incorrect poster URL');
    }
    if (count($normalized['genres']) !== 3 || $normalized['genres'][0] !== 'экшен') {
        throw new \Exception('Incorrect genres parsing');
    }
});

it('AnimeService & ContentRepository корректно извлекают ID видео с YouTube', function () {
    $samples = [
        'https://www.youtube.com/watch?v=qpFcQ1Bek08' => 'qpFcQ1Bek08',
        'https://youtu.be/qpFcQ1Bek08' => 'qpFcQ1Bek08',
        'http://youtube.com/embed/qpFcQ1Bek08' => 'qpFcQ1Bek08',
        'https://youtu.be/TLmRzMmyYok?si=12345' => 'TLmRzMmyYok',
        'https://www.youtube.com/watch?v=b9EkMc79ZSU&t=30s' => 'b9EkMc79ZSU',
    ];

    foreach ($samples as $url => $expectedId) {
        $extractedAnime = \App\Services\AnimeService::extractYoutubeId($url);
        $extractedRepo = \App\Repositories\ContentRepository::extractYoutubeId($url);

        if ($extractedAnime !== $expectedId) {
            throw new \Exception("AnimeService failed extracting {$url}, expected {$expectedId}, got " . var_export($extractedAnime, true));
        }
        if ($extractedRepo !== $expectedId) {
            throw new \Exception("ContentRepository failed extracting {$url}, expected {$expectedId}, got " . var_export($extractedRepo, true));
        }
    }

    if (\App\Services\AnimeService::extractYoutubeId('https://vk.com/video12345') !== null) {
        throw new \Exception('Should not extract ID from non-YouTube URL');
    }
});

it('AnimeService строго фильтрует опенинги, эндинги и оставляет только трейлеры с YouTube', function () {
    $fakeClient = new class extends \App\Services\Anixart\AnixartClient {
        public function getReleaseVideos(int $releaseId): ?array {
            return [
                'code' => 0,
                'last_videos' => [
                    [
                        'category' => ['id' => 3, 'name' => 'Опенинги'],
                        'hosting' => ['id' => 2, 'name' => 'YouTube'],
                        'title' => 'Opening 1',
                        'url' => 'https://youtu.be/OP111111111',
                    ],
                    [
                        'category' => ['id' => 4, 'name' => 'Эндинги'],
                        'hosting' => ['id' => 2, 'name' => 'YouTube'],
                        'title' => 'Ending 1',
                        'url' => 'https://youtu.be/ED222222222',
                    ],
                    [
                        'category' => ['id' => 1, 'name' => 'Трейлеры'],
                        'hosting' => ['id' => 3, 'name' => 'ВКонтакте'],
                        'title' => 'Трейлер в ВК',
                        'url' => 'https://vk.com/video-12345_67890',
                    ],
                    [
                        'category' => ['id' => 1, 'name' => 'Трейлеры'],
                        'hosting' => ['id' => 2, 'name' => 'YouTube'],
                        'title' => 'Главный трейлер',
                        'url' => 'https://youtu.be/TLmRzMmyYok',
                    ],
                ]
            ];
        }
    };

    $service = new \App\Services\AnimeService($fakeClient, new \App\Services\Anixart\Parsers\StreamResolver());
    $trailerId = $service->getTrailerYoutubeId(12345);

    if ($trailerId !== 'TLmRzMmyYok') {
        throw new \Exception('Expected trailer ID TLmRzMmyYok, got ' . var_export($trailerId, true));
    }
});

echo PHP_EOL . "Результаты: Успешно: {$passed}, Провалено: {$failed}" . PHP_EOL;

if ($failed > 0) {
    exit(1);
}
