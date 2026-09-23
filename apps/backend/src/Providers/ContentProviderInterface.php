<?php

declare(strict_types=1);

namespace App\Providers;

interface ContentProviderInterface
{
    public function getIdentifier(): string;
    public function getName(): string;
    public function supports(string $contentType): bool;

    /**
     * Returns an array of stream sources:
     * [
     *   [
     *     'id' => 1,
     *     'provider' => 'Provider Name',
     *     'playerType' => 'mp4' | 'hls' | 'iframe',
     *     'streamUrl' => '...',
     *     'quality' => '1080p',
     *     'translationTitle' => 'Дубляж'
     *   ],
     *   ...
     * ]
     */
    public function getStreams(int $contentId, ?int $episodeId = null): array;
}
