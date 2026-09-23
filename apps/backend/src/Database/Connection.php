<?php

declare(strict_types=1);

namespace App\Database;

use App\Config\Env;
use PDO;
use RuntimeException;

final class Connection
{
    private static ?PDO $instance = null;

    public static function get(): PDO
    {
        if (self::$instance === null) {
            $host = Env::get('POSTGRES_HOST', 'postgres');
            $port = Env::getInt('POSTGRES_PORT', 5432);
            $db   = Env::get('POSTGRES_DB', 'cinema_db');
            $user = Env::get('POSTGRES_USER', 'cinema_user');
            $pass = Env::get('POSTGRES_PASSWORD', 'cinema_password');

            $dsn = "pgsql:host={$host};port={$port};dbname={$db};options='--client_encoding=UTF8'";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (\PDOException $e) {
                throw new RuntimeException("Database connection failed: " . $e->getMessage(), (int)$e->getCode(), $e);
            }
        }

        return self::$instance;
    }

    public static function set(PDO $pdo): void
    {
        self::$instance = $pdo;
    }
}
