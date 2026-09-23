<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class UpdateProfileDTO
{
    public function __construct(
        public ?string $avatarUrl = null,
        public ?string $bio = null,
        public ?array $preferences = null
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            avatarUrl: isset($data['avatar_url']) ? trim((string)$data['avatar_url']) : null,
            bio: isset($data['bio']) ? trim((string)$data['bio']) : null,
            preferences: isset($data['preferences']) && is_array($data['preferences']) ? $data['preferences'] : null
        );
    }
}
