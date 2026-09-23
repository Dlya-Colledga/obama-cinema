<?php

declare(strict_types=1);

namespace App\Services\Anixart\Parsers;

final class StreamResolver
{
    /** @var array<ParserInterface> */
    private array $parsers;

    public function __construct()
    {
        $this->parsers = [
            new KodikParser(),
            new AnilibriaParser(),
            new SibnetParser(),
        ];
    }

    /**
     * Resolves an episode's player/embed URL into direct playable streams.
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
    public function resolve(string $url, string $sourceName = '', string $dubberName = 'Озвучка'): array
    {
        $url = trim($url);
        if ($url === '') {
            return [];
        }

        foreach ($this->parsers as $parser) {
            if ($parser->supports($url, $sourceName)) {
                try {
                    $qualityMap = $parser->parse($url);
                    if (!empty($qualityMap)) {
                        $streams = [];
                        $streamIndex = 1;

                        // Sort qualities descending: 1080, 720, 480, 360, unknown
                        uksort($qualityMap, function ($a, $b) {
                            $numA = is_numeric($a) ? (int)$a : 0;
                            $numB = is_numeric($b) ? (int)$b : 0;
                            return $numB <=> $numA;
                        });

                        foreach ($qualityMap as $quality => $urls) {
                            $displayQuality = is_numeric($quality) ? "{$quality}p" : 'auto';
                            foreach ($urls as $streamUrl) {
                                $isHls = str_contains($streamUrl, '.m3u8') || str_contains($streamUrl, 'manifest');
                                $streams[] = [
                                    'id' => crc32($streamUrl),
                                    'provider' => $sourceName ?: 'Anixart HLS',
                                    'providerCode' => 'anixart',
                                    'streamUrl' => $streamUrl,
                                    'playerType' => $isHls ? 'hls' : 'mp4',
                                    'quality' => $displayQuality,
                                    'translationTitle' => $dubberName,
                                ];
                                $streamIndex++;
                            }
                        }

                        if (!empty($streams)) {
                            return $streams;
                        }
                    }
                } catch (\Throwable $e) {
                    error_log("StreamResolver parser error for {$url}: " . $e->getMessage());
                }
            }
        }

        // Fallback to iframe player embed
        return [
            [
                'id' => crc32($url),
                'provider' => $sourceName ? "{$sourceName} (Embed)" : 'Anixart Player',
                'providerCode' => 'anixart',
                'streamUrl' => $url,
                'playerType' => 'iframe',
                'quality' => 'auto',
                'translationTitle' => $dubberName,
            ],
        ];
    }
}
