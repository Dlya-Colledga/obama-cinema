<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\BookmarkDTO;
use App\Entities\User;
use App\Exceptions\NotFoundException;
use App\Repositories\BookmarkRepository;
use App\Repositories\ContentRepository;
use App\Validators\Validator;

class BookmarkService
{
    public function __construct(
        private BookmarkRepository $bookmarkRepo,
        private ContentRepository $contentRepo
    ) {}

    public function getBookmarks(User $user, ?string $category = null, int $page = 1, int $limit = 24): array
    {
        if ($category !== null) {
            Validator::validateBookmarkCategory($category);
        }

        return $this->bookmarkRepo->getUserBookmarks($user->id, $category, $page, $limit);
    }

    public function setBookmark(User $user, BookmarkDTO $dto): array
    {
        Validator::validateBookmarkCategory($dto->category);

        $content = $this->contentRepo->findBySlugOrId($dto->contentId);
        if (!$content) {
            throw new NotFoundException('Контент не найден');
        }

        $this->bookmarkRepo->setCategory($user->id, $dto->contentId, $dto->category);

        return [
            'contentId' => $dto->contentId,
            'category' => $dto->category,
        ];
    }

    public function removeBookmark(User $user, int $contentId): void
    {
        $this->bookmarkRepo->remove($user->id, $contentId);
    }
}
