<?php

declare(strict_types=1);

namespace App\Config;

final class Env
{
    private static ?array $loadedEnv = null;

    public static function load(string $path = '/var/www/backend/../../.env'): void
    {
        if (self::$loadedEnv !== null) {
            return;
        }

        self::$loadedEnv = [];

        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines !== false) {
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#')) {
                        continue;
                    }

                    if (str_contains($line, '=')) {
                        [$key, $value] = explode('=', $line, 2);
                        $key = trim($key);
                        $value = trim($value);
                        $value = trim($value, "\"'");
                        self::$loadedEnv[$key] = $value;
                    }
                }
            }
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();
        
        $env = getenv($key);
        if ($env !== false) {
            return $env;
        }

        return self::$loadedEnv[$key] ?? $default;
    }

    public static function getInt(string $key, int $default = 0): int
    {
        $val = self::get($key);
        return $val !== null ? (int)$val : $default;
    }

    public static function getBool(string $key, bool $default = false): bool
    {
        $val = self::get($key);
        if ($val === null) {
            return $default;
        }
        return in_array(strtolower($val), ['true', '1', 'yes', 'on'], true);
    }
}
