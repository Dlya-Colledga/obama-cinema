<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\CatalogFilterDTO;
use App\Exceptions\NotFoundException;
use App\Providers\ProviderManager;
use App\Repositories\ContentRepository;

class CatalogService
{
    public function __construct(
        private ContentRepository $contentRepo,
        private ProviderManager $providerManager,
        private ?AnimeService $animeService = null
    ) {}

    public function getCatalog(CatalogFilterDTO $filter, ?int $currentUserId = null): array
    {
        return $this->contentRepo->findFiltered($filter, $currentUserId);
    }

    public function getFeatured(?int $currentUserId = null): array
    {
        return $this->contentRepo->findFeatured($currentUserId);
    }

    public function getContent(string|int $idOrSlug, ?int $currentUserId = null): array
    {
        $content = $this->contentRepo->findBySlugOrId($idOrSlug, $currentUserId);
        if ($content) {
            return $content;
        }

        // Check if identifier refers to an Anixart Anime (e.g. anime-1256 or numeric ID)
        $animeId = null;
        if (is_string($idOrSlug) && preg_match('/^anime-(\d+)$/', $idOrSlug, $m)) {
            $animeId = (int)$m[1];
        } elseif (is_numeric($idOrSlug) && (int)$idOrSlug > 0) {
            $animeId = (int)$idOrSlug;
        }

        if ($animeId !== null && $this->animeService !== null) {
            try {
                $anime = $this->animeService->getRelease($animeId);
                return [
                    'id' => $animeId,
                    'contentType' => [
                        'id' => 3,
                        'code' => 'anime',
                        'name' => 'Аниме',
                    ],
                    'title' => $anime['title'],
                    'originalTitle' => $anime['titleOriginal'],
                    'slug' => 'anime-' . $animeId,
                    'description' => $anime['description'],
                    'posterUrl' => $anime['posterUrl'] ?? '',
                    'bannerUrl' => $anime['screenshots'][0] ?? $anime['posterUrl'] ?? null,
                    'releaseYear' => $anime['year'] ?? 2024,
                    'ageRating' => !empty($anime['ageRating']) ? "{$anime['ageRating']}+" : '16+',
                    'durationMinutes' => $anime['duration'] ?? 24,
                    'ratingCache' => (float)$anime['rating'],
                    'votesCount' => (int)$anime['votesCount'],
                    'isFeatured' => false,
                    'genres' => array_map(fn($g, $i) => [
                        'id' => $i + 1,
                        'slug' => (string)$g,
                        'name' => (string)$g,
                    ], $anime['genres'], array_keys($anime['genres'])),
                    'countries' => [
                        ['id' => 1, 'code' => 'JP', 'name' => $anime['country'] ?: 'Япония'],
                    ],
                    'userRating' => null,
                    'userBookmark' => null,
                    'userProgress' => null,
                ];
            } catch (\Throwable $e) {
                // If not found in Anime API either, throw NotFoundException
            }
        }

        throw new NotFoundException('Контент не найден');
    }

    public function getSeasons(int $contentId): array
    {
        $seasons = $this->contentRepo->getSeasonsWithEpisodes($contentId);
        if (!empty($seasons)) {
            return $seasons;
        }

        // Try loading episodes from AnimeService
        if ($this->animeService !== null) {
            try {
                $episodesData = $this->animeService->getEpisodes($contentId);
                if (!empty($episodesData['episodes'])) {
                    return [
                        [
                            'id' => 1,
                            'contentId' => $contentId,
                            'seasonNumber' => 1,
                            'title' => 'Сезон 1',
                            'releaseYear' => null,
                            'episodes' => array_map(fn($ep) => [
                                'id' => (int)$ep['position'],
                                'seasonId' => 1,
                                'contentId' => $contentId,
                                'episodeNumber' => (int)$ep['position'],
                                'title' => (string)$ep['name'],
                                'durationMinutes' => null,
                            ], $episodesData['episodes']),
                        ],
                    ];
                }
            } catch (\Throwable) {
                // Ignore and return empty array
            }
        }

        return [];
    }

    public function getTaxonomies(): array
    {
        return $this->contentRepo->getTaxonomies();
    }

    public function getStreams(int $contentId, ?int $episodeId = null, ?int $dubberId = null, ?int $sourceId = null): array
    {
        // First check AnimeService direct streams if contentId corresponds to an anime
        if ($this->animeService !== null) {
            try {
                $position = $episodeId ?: 1;
                $animeStreams = $this->animeService->getEpisodeStreams($contentId, $position, $dubberId, $sourceId);
                if (!empty($animeStreams)) {
                    return $animeStreams;
                }
            } catch (\Throwable) {
                // Continue to providers
            }
        }

        return $this->providerManager->getAllStreams($contentId, $episodeId);
    }
}
