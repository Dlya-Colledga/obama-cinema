<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class UpdateCommentDTO
{
    public function __construct(
        public int $commentId,
        public string $text
    ) {}

    public static function fromArray(int $commentId, array $data): self
    {
        return new self(
            commentId: $commentId,
            text: trim((string)($data['text'] ?? ''))
        );
    }
}
