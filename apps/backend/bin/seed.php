<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Database\Connection;

Env::load(__DIR__ . '/../../../.env');

echo "=== Запуск сидеров демонстрационных данных Obama Cinema ===" . PHP_EOL;

try {
    $db = Connection::get();

    $seederDir = is_dir('/var/www/database/seeders') 
        ? '/var/www/database/seeders' 
        : __DIR__ . '/../../../database/seeders';

    if (!is_dir($seederDir)) {
        throw new RuntimeException("Директория сидеров не найдена: {$seederDir}");
    }

    $files = glob($seederDir . '/*.sql');
    sort($files);

    foreach ($files as $file) {
        $filename = basename($file);
        echo "  [>] Выполнение сидера: {$filename}... ";

        $sql = file_get_contents($file);
        if ($sql === false) {
            throw new RuntimeException("Не удалось прочитать файл: {$file}");
        }

        $db->beginTransaction();
        try {
            $db->exec($sql);
            $db->commit();
            echo "Успешно!" . PHP_EOL;
        } catch (\Throwable $e) {
            $db->rollBack();
            echo "ОШИБКА!" . PHP_EOL;
            throw $e;
        }
    }

    echo "=== Сидеры успешно завершены ===" . PHP_EOL;
} catch (\Throwable $e) {
    echo PHP_EOL . "КРИТИЧЕСКАЯ ОШИБКА СИДЕРА: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
