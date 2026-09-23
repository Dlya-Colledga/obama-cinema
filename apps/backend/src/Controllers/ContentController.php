<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\CatalogService;

final class ContentController
{
    public function __construct(
        private CatalogService $catalogService
    ) {}

    public function show(Request $request): void
    {
        $identifier = $request->params['identifier'] ?? '';
        $userId = $request->user?->id;

        $content = $this->catalogService->getContent($identifier, $userId);

        Response::json($content, 200);
    }

    public function seasons(Request $request): void
    {
        $contentId = (int)($request->params['id'] ?? 0);
        $seasons = $this->catalogService->getSeasons($contentId);

        Response::json($seasons, 200);
    }

    public function sources(Request $request): void
    {
        $contentId = (int)($request->params['id'] ?? 0);
        $episodeId = !empty($request->query['episode_id']) ? (int)$request->query['episode_id'] : null;
        $dubberId = !empty($request->query['dubber_id']) ? (int)$request->query['dubber_id'] : null;
        $sourceId = !empty($request->query['source_id']) ? (int)$request->query['source_id'] : null;

        $sources = $this->catalogService->getStreams($contentId, $episodeId, $dubberId, $sourceId);

        Response::json($sources, 200);
    }
}
