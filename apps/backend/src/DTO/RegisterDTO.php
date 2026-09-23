<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class RegisterDTO
{
    public function __construct(
        public string $email,
        public string $username,
        public string $password
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            email: trim((string)($data['email'] ?? '')),
            username: trim((string)($data['username'] ?? '')),
            password: (string)($data['password'] ?? '')
        );
    }
}
