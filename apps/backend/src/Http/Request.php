<?php

declare(strict_types=1);

namespace App\Http;

use App\Entities\User;
use App\Exceptions\AuthenticationException;

final class Request
{
    private static ?self $current = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public ?User $user = null,
        public array $params = []
    ) {}

    public static function capture(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        $query = $_GET;

        // Parse JSON body if present
        $body = [];
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains(strtolower($contentType), 'application/json')) {
            $rawInput = file_get_contents('php://input');
            if ($rawInput !== false && trim($rawInput) !== '') {
                $decoded = json_decode($rawInput, true);
                if (is_array($decoded)) {
                    $body = $decoded;
                }
            }
        } elseif (!empty($_POST)) {
            $body = $_POST;
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$headerName] = (string)$value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string)$_SERVER['CONTENT_TYPE'];
        }
        if (isset($_SERVER['AUTHORIZATION'])) {
            $headers['authorization'] = (string)$_SERVER['AUTHORIZATION'];
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers['authorization'] = (string)$_SERVER['HTTP_AUTHORIZATION'];
        }

        self::$current = new self($method, $path, $query, $body, $headers);
        return self::$current;
    }

    public static function current(): self
    {
        return self::$current ?? self::capture();
    }

    public function getHeader(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function getBearerToken(): ?string
    {
        $auth = $this->getHeader('authorization');
        if ($auth && preg_match('/Bearer\s+(\S+)/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public function getIp(): ?string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    }

    public function getUserAgent(): ?string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? null;
    }

    public function requireUser(): User
    {
        if ($this->user === null) {
            throw new AuthenticationException('Необходима авторизация');
        }
        return $this->user;
    }
}
