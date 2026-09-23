<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\BookmarkDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\BookmarkService;

final class BookmarkController
{
    public function __construct(
        private BookmarkService $bookmarkService
    ) {}

    public function index(Request $request): void
    {
        $user = $request->requireUser();
        $category = !empty($request->query['category']) ? (string)$request->query['category'] : null;
        $page = max(1, (int)($request->query['page'] ?? 1));
        $limit = min(50, max(1, (int)($request->query['limit'] ?? 24)));

        $result = $this->bookmarkService->getBookmarks($user, $category, $page, $limit);

        Response::json($result['items'], 200, $result['meta']);
    }

    public function store(Request $request): void
    {
        $user = $request->requireUser();
        $dto = BookmarkDTO::fromArray($request->body);

        $result = $this->bookmarkService->setBookmark($user, $dto);

        Response::json($result, 200);
    }

    public function destroy(Request $request): void
    {
        $user = $request->requireUser();
        $contentId = (int)($request->params['contentId'] ?? 0);

        $this->bookmarkService->removeBookmark($user, $contentId);

        Response::json(['message' => 'Успешно удалено из закладок'], 200);
    }
}
