<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\CreateCommentDTO;
use App\DTO\UpdateCommentDTO;
use App\Entities\User;
use App\Exceptions\AuthorizationException;
use App\Exceptions\NotFoundException;
use App\Repositories\CommentRepository;
use App\Repositories\ContentRepository;
use App\Validators\Validator;

class CommentService
{
    public function __construct(
        private CommentRepository $commentRepo,
        private ContentRepository $contentRepo
    ) {}

    public function getComments(int $contentId, int $page = 1, int $limit = 20): array
    {
        return $this->commentRepo->findByContent($contentId, $page, $limit);
    }

    public function createComment(User $user, CreateCommentDTO $dto): array
    {
        Validator::validateComment($dto->text);

        $content = $this->contentRepo->findBySlugOrId($dto->contentId);
        if (!$content) {
            throw new NotFoundException('Контент не найден');
        }

        $sanitized = Validator::sanitizeText($dto->text);

        return $this->commentRepo->create($user->id, $dto->contentId, $sanitized, $dto->parentId);
    }

    public function updateComment(User $user, UpdateCommentDTO $dto): array
    {
        Validator::validateComment($dto->text);

        $comment = $this->commentRepo->findById($dto->commentId);
        if (!$comment) {
            throw new NotFoundException('Комментарий не найден');
        }

        if ($comment['user']['id'] !== $user->id) {
            throw new AuthorizationException('Вы не можете редактировать чужой комментарий');
        }

        $sanitized = Validator::sanitizeText($dto->text);

        return $this->commentRepo->update($dto->commentId, $sanitized);
    }

    public function deleteComment(User $user, int $commentId): void
    {
        $comment = $this->commentRepo->findById($commentId);
        if (!$comment) {
            throw new NotFoundException('Комментарий не найден');
        }

        if ($comment['user']['id'] !== $user->id && !$user->isModerator()) {
            throw new AuthorizationException('У вас нет прав для удаления этого комментария');
        }

        $this->commentRepo->delete($commentId);
    }
}
