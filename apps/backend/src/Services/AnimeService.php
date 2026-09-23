<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\NotFoundException;
use App\Services\Anixart\AnixartClient;
use App\Services\Anixart\Parsers\StreamResolver;

final class AnimeService
{
    private const string POSTER_BASE = 'https://s.anixmirai.com/posters/';
    private const string SCREENSHOT_BASE = 'https://s.anixmirai.com/screenshots/';

    public function __construct(
        private AnixartClient $client,
        private StreamResolver $streamResolver
    ) {}

    /**
     * Search anime catalog with pagination.
     *
     * @return array{
     *   data: array<array<string, mixed>>,
     *   meta: array{page: int, perPage: int, total: int}
     * }
     */
    public function search(string $query, int $page = 0): array
    {
        $trimmed = trim($query);
        if ($trimmed === '') {
            return $this->getPopular($page);
        }

        $res = $this->client->searchReleases($trimmed, $page);
        $normalized = array_map([$this, 'normalizeRelease'], $res['releases']);

        return [
            'data' => $normalized,
            'meta' => [
                'page' => $page,
                'perPage' => count($normalized),
                'total' => count($normalized),
            ],
        ];
    }

    /**
     * Get popular/trending anime feed.
     *
     * @return array{
     *   data: array<array<string, mixed>>,
     *   meta: array{page: int, perPage: int, total: int}
     * }
     */
    public function getPopular(int $page = 0): array
    {
        $res = $this->client->getFilterReleases([], $page);
        $normalized = array_map([$this, 'normalizeRelease'], $res['content']);

        return [
            'data' => $normalized,
            'meta' => [
                'page' => $page,
                'perPage' => count($normalized),
                'total' => $res['total_elements'] ?? count($normalized),
            ],
        ];
    }

    /**
     * Get single anime release with complete metadata.
     *
     * @return array<string, mixed>
     */
    public function getRelease(int $releaseId): array
    {
        $release = $this->client->getRelease($releaseId, true);
        if ($release === null) {
            throw new NotFoundException("Аниме с ID {$releaseId} не найдено");
        }

        $normalized = $this->normalizeRelease($release, true);
        $trailerYtId = $this->getTrailerYoutubeId($releaseId);
        $normalized['trailerYoutubeId'] = $trailerYtId;
        $normalized['trailerUrl'] = $trailerYtId !== null ? "https://www.youtube.com/watch?v={$trailerYtId}" : null;

        return $normalized;
    }

    /**
     * Strictly find YouTube trailer for anime release (excluding openings, endings, clips).
     */
    public function getTrailerYoutubeId(int $releaseId): ?string
    {
        try {
            $videoData = $this->client->getReleaseVideos($releaseId);
            if ($videoData === null) {
                return null;
            }

            $videos = [];
            if (!empty($videoData['blocks']) && is_array($videoData['blocks'])) {
                foreach ($videoData['blocks'] as $block) {
                    if (!empty($block['videos']) && is_array($block['videos'])) {
                        foreach ($block['videos'] as $v) {
                            $videos[] = $v;
                        }
                    }
                }
            }
            if (!empty($videoData['last_videos']) && is_array($videoData['last_videos'])) {
                foreach ($videoData['last_videos'] as $v) {
                    $videos[] = $v;
                }
            }

            foreach ($videos as $video) {
                $catId = (int)($video['category']['id'] ?? 0);
                $catName = mb_strtolower((string)($video['category']['name'] ?? ''));
                $title = mb_strtolower((string)($video['title'] ?? ''));

                // Must NOT be openings, endings, clips, etc.
                if (
                    str_contains($catName, 'опенинг') ||
                    str_contains($catName, 'эндинг') ||
                    str_contains($catName, 'клип') ||
                    str_contains($catName, 'opening') ||
                    str_contains($catName, 'ending') ||
                    str_contains($title, 'op') ||
                    str_contains($title, 'ed') ||
                    str_contains($title, 'опенинг') ||
                    str_contains($title, 'эндинг')
                ) {
                    continue;
                }

                // Strict category requirement: must be Trailers/Teasers
                $isTrailer = (
                    $catId === 1 ||
                    str_contains($catName, 'трейлер') ||
                    str_contains($catName, 'тизер') ||
                    str_contains($catName, 'trailer') ||
                    str_contains($catName, 'pv') ||
                    str_contains($title, 'трейлер') ||
                    str_contains($title, 'тизер') ||
                    str_contains($title, 'trailer') ||
                    str_contains($title, 'pv')
                );

                if (!$isTrailer) {
                    continue;
                }

                // Must be YouTube hosting / URL
                $hostingName = mb_strtolower((string)($video['hosting']['name'] ?? ''));
                $url = (string)($video['url'] ?? $video['player_url'] ?? '');
                $hostingId = (int)($video['hosting']['id'] ?? 0);

                $isYoutube = ($hostingId === 2) || str_contains($hostingName, 'youtube') || str_contains($url, 'youtu');
                if (!$isYoutube) {
                    continue;
                }

                $ytId = self::extractYoutubeId($url);
                if ($ytId !== null) {
                    return $ytId;
                }
            }
        } catch (\Throwable $e) {
            error_log("Failed to get trailer for anime {$releaseId}: " . $e->getMessage());
        }

        return null;
    }

    public static function extractYoutubeId(string $url): ?string
    {
        if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/i', $url, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Get dubbing studios for anime.
     *
     * @return array<array<string, mixed>>
     */
    public function getDubbers(int $releaseId): array
    {
        $dubbers = $this->client->getDubbers($releaseId);
        return array_map(function (array $d): array {
            return [
                'id' => (int)($d['id'] ?? 0),
                'name' => (string)($d['name'] ?? 'Неизвестно'),
                'icon' => $d['icon'] ?? null,
                'workers' => $d['workers'] ?? null,
                'isSub' => (bool)($d['is_sub'] ?? false),
                'episodesCount' => (int)($d['episodes_count'] ?? 0),
                'viewCount' => (int)($d['view_count'] ?? 0),
            ];
        }, $dubbers);
    }

    /**
     * Get episode list, automatically resolving default dubber & source if omitted.
     *
     * @return array{
     *   selectedDubber: array<string, mixed>|null,
     *   selectedSource: array<string, mixed>|null,
     *   dubbers: array<array<string, mixed>>,
     *   sources: array<array<string, mixed>>,
     *   episodes: array<array<string, mixed>>
     * }
     */
    public function getEpisodes(int $releaseId, ?int $dubberId = null, ?int $sourceId = null): array
    {
        $dubbers = $this->getDubbers($releaseId);
        if (empty($dubbers)) {
            return [
                'selectedDubber' => null,
                'selectedSource' => null,
                'dubbers' => [],
                'sources' => [],
                'episodes' => [],
            ];
        }

        // Pick requested or first available dubber
        $selectedDubber = null;
        if ($dubberId !== null) {
            foreach ($dubbers as $d) {
                if ($d['id'] === $dubberId) {
                    $selectedDubber = $d;
                    break;
                }
            }
        }
        if ($selectedDubber === null) {
            $selectedDubber = $dubbers[0];
        }

        $activeDubberId = (int)$selectedDubber['id'];
        $rawSources = $this->client->getSources($releaseId, $activeDubberId);
        $sources = array_map(function (array $s): array {
            return [
                'id' => (int)($s['id'] ?? 0),
                'name' => (string)($s['name'] ?? 'Плеер'),
                'episodesCount' => (int)($s['episodes_count'] ?? 0),
                'quality' => (int)($s['quality'] ?? 0),
            ];
        }, $rawSources);

        // Pick requested or first available source
        $selectedSource = null;
        if ($sourceId !== null) {
            foreach ($sources as $s) {
                if ($s['id'] === $sourceId) {
                    $selectedSource = $s;
                    break;
                }
            }
        }
        if ($selectedSource === null && !empty($sources)) {
            $selectedSource = $sources[0];
        }

        $episodes = [];
        if ($selectedSource !== null) {
            $rawEpisodes = $this->client->getEpisodes($releaseId, $activeDubberId, (int)$selectedSource['id']);
            $episodes = array_map(function (array $ep): array {
                return [
                    'position' => (int)($ep['position'] ?? 1),
                    'name' => (string)($ep['name'] ?? 'Серия ' . ($ep['position'] ?? 1)),
                    'url' => (string)($ep['url'] ?? ''),
                    'iframe' => (bool)($ep['iframe'] ?? false),
                    'isFiller' => (bool)($ep['is_filler'] ?? false),
                ];
            }, $rawEpisodes);
        }

        return [
            'selectedDubber' => $selectedDubber,
            'selectedSource' => $selectedSource,
            'dubbers' => $dubbers,
            'sources' => $sources,
            'episodes' => $episodes,
        ];
    }

    /**
     * Resolves direct playable .m3u8 or MP4 streams for a specific episode position.
     *
     * @return array<array{
     *   id: int|string,
     *   provider: string,
     *   providerCode: string,
     *   streamUrl: string,
     *   playerType: 'hls'|'mp4'|'iframe',
     *   quality: string,
     *   translationTitle: string
     * }>
     */
    public function getEpisodeStreams(int $releaseId, int $position = 1, ?int $dubberId = null, ?int $sourceId = null): array
    {
        $episodesData = $this->getEpisodes($releaseId, $dubberId, $sourceId);
        $targetEpisode = null;

        foreach ($episodesData['episodes'] as $ep) {
            if ($ep['position'] === $position) {
                $targetEpisode = $ep;
                break;
            }
        }

        // If target position not found by exact position, try by index
        if ($targetEpisode === null && !empty($episodesData['episodes'])) {
            $targetEpisode = $episodesData['episodes'][$position - 1] ?? $episodesData['episodes'][0];
        }

        if ($targetEpisode === null || empty($targetEpisode['url'])) {
            return [];
        }

        $sourceName = $episodesData['selectedSource']['name'] ?? 'Anixart';
        $dubberName = $episodesData['selectedDubber']['name'] ?? 'Озвучка';

        return $this->streamResolver->resolve($targetEpisode['url'], $sourceName, $dubberName);
    }

    /**
     * Normalize release data to a clean, consistent schema.
     *
     * @param array<string, mixed> $r
     * @return array<string, mixed>
     */
    private function normalizeRelease(array $r, bool $extended = false): array
    {
        $id = (int)($r['id'] ?? 0);
        $titleRu = (string)($r['title_ru'] ?? $r['name_ru'] ?? '');
        $titleOriginal = (string)($r['title_original'] ?? $r['name_original'] ?? '');
        $title = $titleRu !== '' ? $titleRu : ($titleOriginal !== '' ? $titleOriginal : 'Аниме #' . $id);

        // Poster image resolution
        $posterUrl = $r['image'] ?? null;
        if ((!$posterUrl || !str_starts_with($posterUrl, 'http')) && !empty($r['poster'])) {
            $posterUrl = self::POSTER_BASE . $r['poster'] . '.jpg';
        }

        // Screenshots resolution
        $screenshots = [];
        if (!empty($r['screenshots']) && is_array($r['screenshots'])) {
            foreach ($r['screenshots'] as $shot) {
                if (is_string($shot)) {
                    $screenshots[] = str_starts_with($shot, 'http') ? $shot : self::SCREENSHOT_BASE . $shot . '.jpg';
                }
            }
        }

        // Genres
        $genres = [];
        if (!empty($r['genres']) && is_string($r['genres'])) {
            $genres = array_values(array_filter(array_map('trim', explode(',', $r['genres']))));
        }

        // Ratings (Anixart grade is 1-5, convert to 10-point scale for Obama Cinema)
        $rawGrade = (float)($r['grade'] ?? 0);
        $rating = $rawGrade > 0 ? round($rawGrade * 2, 1) : 8.0;

        $episodesReleased = (int)($r['episodes_released'] ?? 0);
        $episodesTotal = (int)($r['episodes_total'] ?? $episodesReleased);

        $statusName = 'Завершён';
        if (isset($r['status']['name'])) {
            $statusName = (string)$r['status']['name'];
        } elseif (($r['status_id'] ?? null) === 2 || ($episodesReleased < $episodesTotal && $episodesTotal > 0)) {
            $statusName = 'Онгоинг';
        }

        $data = [
            'id' => $id,
            'title' => $title,
            'titleRu' => $titleRu,
            'titleOriginal' => $titleOriginal,
            'slug' => 'anime-' . $id,
            'type' => 'anime',
            'description' => (string)($r['description'] ?? ''),
            'posterUrl' => $posterUrl,
            'year' => isset($r['year']) ? (int)$r['year'] : null,
            'country' => (string)($r['country'] ?? 'Япония'),
            'genres' => $genres,
            'rating' => $rating,
            'grade5' => $rawGrade,
            'votesCount' => (int)($r['rating'] ?? $r['vote_count'] ?? 0),
            'episodesTotal' => $episodesTotal,
            'episodesReleased' => $episodesReleased,
            'duration' => isset($r['duration']) ? (int)$r['duration'] : 24,
            'season' => isset($r['season']) ? (int)$r['season'] : 1,
            'studio' => (string)($r['studio'] ?? ''),
            'director' => (string)($r['director'] ?? ''),
            'author' => (string)($r['author'] ?? ''),
            'status' => $statusName,
            'isAnimeApi' => true,
        ];

        if ($extended) {
            $data['screenshots'] = $screenshots;
            $data['category'] = $r['category']['name'] ?? 'Сериал';
            $data['ageRating'] = (int)($r['age_rating'] ?? 16);
            $data['source'] = (string)($r['source'] ?? 'манга');
        }

        return $data;
    }
}
