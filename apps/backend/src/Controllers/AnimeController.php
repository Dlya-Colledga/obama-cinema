<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\AnimeService;

final class AnimeController
{
    public function __construct(
        private AnimeService $animeService
    ) {}

    public function search(Request $request): void
    {
        $q = (string)($request->query['q'] ?? '');
        $page = max(0, (int)($request->query['page'] ?? 0));

        $result = $this->animeService->search($q, $page);
        Response::json($result, 200);
    }

    public function popular(Request $request): void
    {
        $page = max(0, (int)($request->query['page'] ?? 0));

        $result = $this->animeService->getPopular($page);
        Response::json($result, 200);
    }

    public function show(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $result = $this->animeService->getRelease($id);

        Response::json($result, 200);
    }

    public function dubbers(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $result = $this->animeService->getDubbers($id);

        Response::json($result, 200);
    }

    public function episodes(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $dubberId = !empty($request->query['dubber_id']) ? (int)$request->query['dubber_id'] : null;
        $sourceId = !empty($request->query['source_id']) ? (int)$request->query['source_id'] : null;

        $result = $this->animeService->getEpisodes($id, $dubberId, $sourceId);
        Response::json($result, 200);
    }

    public function streams(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $position = max(1, (int)($request->query['position'] ?? 1));
        $dubberId = !empty($request->query['dubber_id']) ? (int)$request->query['dubber_id'] : null;
        $sourceId = !empty($request->query['source_id']) ? (int)$request->query['source_id'] : null;

        $result = $this->animeService->getEpisodeStreams($id, $position, $dubberId, $sourceId);
        Response::json($result, 200);
    }
}
