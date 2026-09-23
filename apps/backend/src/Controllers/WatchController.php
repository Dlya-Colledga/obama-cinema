<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\WatchProgressDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\WatchService;

final class WatchController
{
    public function __construct(
        private WatchService $watchService
    ) {}

    public function progress(Request $request): void
    {
        $user = $request->requireUser();
        $dto = WatchProgressDTO::fromArray($request->body);

        $result = $this->watchService->saveProgress($user, $dto);

        Response::json($result, 200);
    }

    public function getProgress(Request $request): void
    {
        $user = $request->requireUser();
        $contentId = (int)($request->params['contentId'] ?? 0);
        $episodeId = !empty($request->query['episode_id']) ? (int)$request->query['episode_id'] : null;

        $progress = $this->watchService->getProgress($user, $contentId, $episodeId);

        Response::json($progress, 200);
    }

    public function unfinished(Request $request): void
    {
        $user = $request->requireUser();
        $limit = min(20, max(1, (int)($request->query['limit'] ?? 10)));

        $items = $this->watchService->getRecentUnfinished($user, $limit);

        Response::json($items, 200);
    }

    public function history(Request $request): void
    {
        $user = $request->requireUser();
        $page = max(1, (int)($request->query['page'] ?? 1));
        $limit = min(50, max(1, (int)($request->query['limit'] ?? 24)));

        $result = $this->watchService->getHistory($user, $page, $limit);

        Response::json($result['items'], 200, $result['meta']);
    }

    public function clear(Request $request): void
    {
        $user = $request->requireUser();
        $historyId = !empty($request->query['id']) ? (int)$request->query['id'] : null;

        $this->watchService->clearHistory($user, $historyId);

        Response::json(['message' => 'История просмотров обновлена'], 200);
    }
}
