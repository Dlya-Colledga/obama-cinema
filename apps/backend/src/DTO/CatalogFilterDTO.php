<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class CatalogFilterDTO
{
    public function __construct(
        public ?string $type = null,
        public ?string $genre = null,
        public ?string $country = null,
        public ?int $yearFrom = null,
        public ?int $yearTo = null,
        public ?float $minRating = null,
        public string $sort = 'rating', // 'rating', 'newest', 'popular', 'title'
        public ?string $query = null,
        public int $page = 1,
        public int $limit = 24
    ) {}

    public static function fromQueryParams(array $params): self
    {
        $page = max(1, (int)($params['page'] ?? 1));
        $limit = min(60, max(1, (int)($params['limit'] ?? 24)));

        return new self(
            type: !empty($params['type']) ? trim((string)$params['type']) : null,
            genre: !empty($params['genre']) ? trim((string)$params['genre']) : null,
            country: !empty($params['country']) ? trim((string)$params['country']) : null,
            yearFrom: !empty($params['year_from']) ? (int)$params['year_from'] : null,
            yearTo: !empty($params['year_to']) ? (int)$params['year_to'] : null,
            minRating: isset($params['rating_from']) && is_numeric($params['rating_from']) ? (float)$params['rating_from'] : null,
            sort: in_array($params['sort'] ?? '', ['rating', 'newest', 'popular', 'title'], true) ? (string)$params['sort'] : 'rating',
            query: !empty($params['q']) ? trim((string)$params['q']) : null,
            page: $page,
            limit: $limit
        );
    }
}
