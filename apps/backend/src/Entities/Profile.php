<?php

declare(strict_types=1);

namespace App\Entities;

final readonly class Profile
{
    public function __construct(
        public int $userId,
        public ?string $avatarUrl,
        public ?string $bio,
        public array $preferences,
        public string $updatedAt
    ) {}

    public function toArray(): array
    {
        return [
            'avatarUrl' => $this->avatarUrl,
            'bio' => $this->bio,
            'preferences' => $this->preferences,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
