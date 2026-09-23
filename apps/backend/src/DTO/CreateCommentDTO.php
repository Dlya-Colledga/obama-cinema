<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class CreateCommentDTO
{
    public function __construct(
        public int $contentId,
        public string $text,
        public ?int $parentId = null
    ) {}

    public static function fromArray(int $contentId, array $data): self
    {
        return new self(
            contentId: $contentId,
            text: trim((string)($data['text'] ?? $data['content'] ?? '')),
            parentId: !empty($data['parent_id']) ? (int)$data['parent_id'] : null
        );
    }
}
