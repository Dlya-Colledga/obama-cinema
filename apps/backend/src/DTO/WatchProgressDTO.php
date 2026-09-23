<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class WatchProgressDTO
{
    public function __construct(
        public int $contentId,
        public ?int $episodeId,
        public int $progressSeconds,
        public int $durationSeconds,
        public bool $isCompleted = false
    ) {}

    public static function fromArray(array $data): self
    {
        $duration = (int)($data['duration_seconds'] ?? 0);
        $progress = (int)($data['progress_seconds'] ?? 0);
        $isCompleted = !empty($data['is_completed']) || ($duration > 0 && ($progress / $duration) >= 0.90);

        return new self(
            contentId: (int)($data['content_id'] ?? 0),
            episodeId: !empty($data['episode_id']) ? (int)$data['episode_id'] : null,
            progressSeconds: $progress,
            durationSeconds: $duration,
            isCompleted: $isCompleted
        );
    }
}
