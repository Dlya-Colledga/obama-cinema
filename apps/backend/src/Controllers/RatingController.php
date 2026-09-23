<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\RateContentDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\RatingService;

final class RatingController
{
    public function __construct(
        private RatingService $ratingService
    ) {}

    public function store(Request $request): void
    {
        $user = $request->requireUser();
        $contentId = (int)($request->params['contentId'] ?? $request->body['content_id'] ?? 0);

        $dto = RateContentDTO::fromArray($contentId, $request->body);
        $result = $this->ratingService->rate($user, $dto);

        Response::json($result, 200);
    }

    public function destroy(Request $request): void
    {
        $user = $request->requireUser();
        $contentId = (int)($request->params['contentId'] ?? 0);

        $result = $this->ratingService->removeRate($user, $contentId);

        Response::json($result, 200);
    }
}
