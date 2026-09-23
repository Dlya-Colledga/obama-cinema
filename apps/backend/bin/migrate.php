<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Database\Connection;

Env::load(__DIR__ . '/../../../.env');

echo "=== Запуск миграций базы данных Obama Cinema ===" . PHP_EOL;

try {
    $db = Connection::get();

    // Ensure migrations tracking table exists
    $db->exec('
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            migration TEXT NOT NULL UNIQUE,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    ');

    $migrationDir = is_dir('/var/www/database/migrations') 
        ? '/var/www/database/migrations' 
        : __DIR__ . '/../../../database/migrations';

    if (!is_dir($migrationDir)) {
        throw new RuntimeException("Директория миграций не найдена: {$migrationDir}");
    }

    $files = glob($migrationDir . '/*.sql');
    sort($files);

    $executedCount = 0;
    foreach ($files as $file) {
        $filename = basename($file);

        $checkStmt = $db->prepare('SELECT COUNT(*) FROM schema_migrations WHERE migration = :name');
        $checkStmt->execute(['name' => $filename]);
        if ((int)$checkStmt->fetchColumn() > 0) {
            echo "  [✓] Пропуск (уже применена): {$filename}" . PHP_EOL;
            continue;
        }

        echo "  [>] Применение: {$filename}... ";
        $sql = file_get_contents($file);
        if ($sql === false) {
            throw new RuntimeException("Не удалось прочитать файл: {$file}");
        }

        $db->beginTransaction();
        try {
            $db->exec($sql);
            $recordStmt = $db->prepare('INSERT INTO schema_migrations (migration) VALUES (:name)');
            $recordStmt->execute(['name' => $filename]);
            $db->commit();
            echo "Успешно!" . PHP_EOL;
            $executedCount++;
        } catch (\Throwable $e) {
            $db->rollBack();
            echo "ОШИБКА!" . PHP_EOL;
            throw $e;
        }
    }

    echo "=== Миграции успешно завершены (новых: {$executedCount}) ===" . PHP_EOL;
} catch (\Throwable $e) {
    echo PHP_EOL . "КРИТИЧЕСКАЯ ОШИБКА МИГРАЦИИ: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
