<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\WatchProgressDTO;
use App\Entities\User;
use App\Exceptions\NotFoundException;
use App\Repositories\ContentRepository;
use App\Repositories\WatchRepository;

class WatchService
{
    public function __construct(
        private WatchRepository $watchRepo,
        private ContentRepository $contentRepo
    ) {}

    public function saveProgress(User $user, WatchProgressDTO $dto): array
    {
        $content = $this->contentRepo->findBySlugOrId($dto->contentId);
        if (!$content) {
            throw new NotFoundException('Контент не найден');
        }

        $this->watchRepo->upsertProgress(
            $user->id,
            $dto->contentId,
            $dto->episodeId,
            $dto->progressSeconds,
            $dto->durationSeconds,
            $dto->isCompleted
        );

        return [
            'contentId' => $dto->contentId,
            'episodeId' => $dto->episodeId,
            'progressSeconds' => $dto->progressSeconds,
            'durationSeconds' => $dto->durationSeconds,
            'isCompleted' => $dto->isCompleted,
        ];
    }

    public function getProgress(User $user, int $contentId, ?int $episodeId = null): ?array
    {
        return $this->watchRepo->getProgress($user->id, $contentId, $episodeId);
    }

    public function getRecentUnfinished(User $user, int $limit = 10): array
    {
        return $this->watchRepo->getRecentUnfinished($user->id, $limit);
    }

    public function getHistory(User $user, int $page = 1, int $limit = 24): array
    {
        return $this->watchRepo->getHistory($user->id, $page, $limit);
    }

    public function clearHistory(User $user, ?int $historyId = null): void
    {
        $this->watchRepo->clearHistory($user->id, $historyId);
    }
}
