<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\RateContentDTO;
use App\Entities\User;
use App\Exceptions\NotFoundException;
use App\Repositories\ContentRepository;
use App\Repositories\RatingRepository;
use App\Validators\Validator;

class RatingService
{
    public function __construct(
        private RatingRepository $ratingRepo,
        private ContentRepository $contentRepo
    ) {}

    public function rate(User $user, RateContentDTO $dto): array
    {
        Validator::validateRating($dto->rating);

        $content = $this->contentRepo->findBySlugOrId($dto->contentId);
        if (!$content) {
            throw new NotFoundException('Контент не найден');
        }

        $stats = $this->ratingRepo->upsert($user->id, $dto->contentId, $dto->rating);

        return [
            'userRating' => $dto->rating,
            'ratingCache' => $stats['ratingCache'],
            'votesCount' => $stats['votesCount'],
        ];
    }

    public function removeRate(User $user, int $contentId): array
    {
        $content = $this->contentRepo->findBySlugOrId($contentId);
        if (!$content) {
            throw new NotFoundException('Контент не найден');
        }

        $stats = $this->ratingRepo->delete($user->id, $contentId);

        return [
            'userRating' => null,
            'ratingCache' => $stats['ratingCache'],
            'votesCount' => $stats['votesCount'],
        ];
    }
}
