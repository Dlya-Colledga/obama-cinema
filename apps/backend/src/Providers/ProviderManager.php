<?php

declare(strict_types=1);

namespace App\Providers;

final class ProviderManager
{
    /** @var array<string, ContentProviderInterface> */
    private array $providers = [];

    public function registerProvider(ContentProviderInterface $provider): void
    {
        $this->providers[$provider->getIdentifier()] = $provider;
    }

    public function getProvider(string $identifier): ?ContentProviderInterface
    {
        return $this->providers[$identifier] ?? null;
    }

    /**
     * Aggregates stream sources from all active providers
     */
    public function getAllStreams(int $contentId, ?int $episodeId = null): array
    {
        $allStreams = [];

        foreach ($this->providers as $provider) {
            try {
                $streams = $provider->getStreams($contentId, $episodeId);
                foreach ($streams as $stream) {
                    $allStreams[] = $stream;
                }
            } catch (\Throwable $e) {
                // Log and gracefully continue to next provider
                error_log("Provider {$provider->getIdentifier()} failed: " . $e->getMessage());
            }
        }

        return $allStreams;
    }
}
