<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class BookmarkDTO
{
    public function __construct(
        public int $contentId,
        public string $category
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            contentId: (int)($data['content_id'] ?? 0),
            category: trim((string)($data['category'] ?? 'plan_to_watch'))
        );
    }
}
