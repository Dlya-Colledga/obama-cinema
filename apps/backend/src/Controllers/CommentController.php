<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\CreateCommentDTO;
use App\DTO\UpdateCommentDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\CommentService;

final class CommentController
{
    public function __construct(
        private CommentService $commentService
    ) {}

    public function index(Request $request): void
    {
        $contentId = (int)($request->params['contentId'] ?? 0);
        $page = max(1, (int)($request->query['page'] ?? 1));
        $limit = min(50, max(1, (int)($request->query['limit'] ?? 20)));

        $result = $this->commentService->getComments($contentId, $page, $limit);

        Response::json($result['items'], 200, $result['meta']);
    }

    public function store(Request $request): void
    {
        $user = $request->requireUser();
        $contentId = (int)($request->params['contentId'] ?? 0);

        $dto = CreateCommentDTO::fromArray($contentId, $request->body);
        $comment = $this->commentService->createComment($user, $dto);

        Response::json($comment, 201);
    }

    public function update(Request $request): void
    {
        $user = $request->requireUser();
        $commentId = (int)($request->params['id'] ?? 0);

        $dto = UpdateCommentDTO::fromArray($commentId, $request->body);
        $comment = $this->commentService->updateComment($user, $dto);

        Response::json($comment, 200);
    }

    public function destroy(Request $request): void
    {
        $user = $request->requireUser();
        $commentId = (int)($request->params['id'] ?? 0);

        $this->commentService->deleteComment($user, $commentId);

        Response::json(['message' => 'Комментарий успешно удалён'], 200);
    }
}
