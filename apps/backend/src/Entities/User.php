<?php

declare(strict_types=1);

namespace App\Entities;

final readonly class User
{
    public function __construct(
        public int $id,
        public string $email,
        public string $username,
        public string $passwordHash,
        public string $role,
        public string $createdAt,
        public string $updatedAt,
        public ?Profile $profile = null
    ) {}

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isModerator(): bool
    {
        return in_array($this->role, ['moderator', 'admin'], true);
    }

    public function toArray(bool $includePrivate = false): array
    {
        $data = [
            'id' => $this->id,
            'email' => $this->email,
            'username' => $this->username,
            'role' => $this->role,
            'createdAt' => $this->createdAt,
            'profile' => $this->profile?->toArray(),
        ];

        if ($includePrivate) {
            $data['updatedAt'] = $this->updatedAt;
        }

        return $data;
    }
}
