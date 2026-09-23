<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class LoginDTO
{
    public function __construct(
        public string $login, // email or username
        public string $password
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            login: trim((string)($data['login'] ?? $data['email'] ?? $data['username'] ?? '')),
            password: (string)($data['password'] ?? '')
        );
    }
}
