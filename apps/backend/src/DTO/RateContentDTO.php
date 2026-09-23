<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class RateContentDTO
{
    public function __construct(
        public int $contentId,
        public int $rating
    ) {}

    public static function fromArray(int $contentId, array $data): self
    {
        return new self(
            contentId: $contentId,
            rating: (int)($data['rating'] ?? 0)
        );
    }
}
