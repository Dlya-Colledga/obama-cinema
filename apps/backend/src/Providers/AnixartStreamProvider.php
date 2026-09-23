<?php

declare(strict_types=1);

namespace App\Providers;

use App\Repositories\ContentRepository;
use App\Services\AnimeService;

final class AnixartStreamProvider implements ContentProviderInterface
{
    public function __construct(
        private ContentRepository $contentRepo,
        private AnimeService $animeService
    ) {}

    public function getIdentifier(): string
    {
        return 'anixart';
    }

    public function getName(): string
    {
        return 'Anixart Streams (HLS)';
    }

    public function supports(string $contentType): bool
    {
        return $contentType === 'anime';
    }

    public function getStreams(int $contentId, ?int $episodeId = null): array
    {
        // Try to match release from content title or external reference
        $content = $this->contentRepo->findById($contentId);
        if (!$content || $content['type'] !== 'anime') {
            return [];
        }

        // Search anime release on Anixart using the title
        $searchQuery = (string)($content['title'] ?? '');
        if ($searchQuery === '') {
            return [];
        }

        try {
            $searchResults = $this->animeService->search($searchQuery, 0);
            if (empty($searchResults['data'])) {
                return [];
            }

            $firstRelease = $searchResults['data'][0];
            $releaseId = (int)$firstRelease['id'];

            // Determine episode position (default 1)
            $position = 1;
            if ($episodeId !== null) {
                $episode = $this->contentRepo->getEpisodeById($episodeId);
                if ($episode && !empty($episode['episode_number'])) {
                    $position = (int)$episode['episode_number'];
                }
            }

            return $this->animeService->getEpisodeStreams($releaseId, $position);
        } catch (\Throwable $e) {
            error_log("AnixartStreamProvider failed for content {$contentId}: " . $e->getMessage());
            return [];
        }
    }
}
