<?php

declare(strict_types=1);

namespace App\Providers;

use App\Repositories\ContentRepository;

final class DemoStreamProvider implements ContentProviderInterface
{
    public function __construct(
        private ContentRepository $contentRepo
    ) {}

    public function getIdentifier(): string
    {
        return 'demo_stream';
    }

    public function getName(): string
    {
        return 'Obama Direct Stream (HLS/MP4)';
    }

    public function supports(string $contentType): bool
    {
        return true; // Supports all types
    }

    public function getStreams(int $contentId, ?int $episodeId = null): array
    {
        $dbSources = $this->contentRepo->getStreamSources($contentId, $episodeId);
        if (!empty($dbSources)) {
            return $dbSources;
        }

        // Reliable fallback open stream sources if none configured yet
        return [
            [
                'id' => 1000 + $contentId,
                'provider' => $this->getName(),
                'providerCode' => $this->getIdentifier(),
                'streamUrl' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                'playerType' => 'mp4',
                'quality' => '1080p',
                'translationTitle' => 'Дубляж (Red Head Sound)',
            ],
            [
                'id' => 2000 + $contentId,
                'provider' => $this->getName(),
                'providerCode' => $this->getIdentifier(),
                'streamUrl' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                'playerType' => 'mp4',
                'quality' => '720p',
                'translationTitle' => 'Оригинал (Субтитры)',
            ],
        ];
    }
}
