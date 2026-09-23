<?php

declare(strict_types=1);

namespace App\Services\Anixart\Parsers;

final class AnilibriaParser implements ParserInterface
{
    private const string BASE_DOMAIN = 'aniliberty.top';
    private const string USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    public function supports(string $url, string $sourceName = ''): bool
    {
        if (stripos($sourceName, 'libria') !== false) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST) ?? '';
        return str_contains($host, 'libria') || str_contains($host, 'anilibria') || str_contains($host, 'aniliberty');
    }

    /**
     * @return array<string, array<string>>
     */
    public function parse(string $url): array
    {
        $parts = parse_url($url);
        parse_str($parts['query'] ?? '', $query);

        $id = $query['id'] ?? null;
        $ep = isset($query['ep']) ? (int)$query['ep'] : 1;

        if (!$id && preg_match('#/releases/(\d+)#', $url, $m)) {
            $id = $m[1];
        }

        if (!$id) {
            return [];
        }

        $apiUrl = 'https://' . self::BASE_DOMAIN . '/api/v1/anime/releases/' . $id;

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => self::USER_AGENT,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if (!is_string($response) || $response === '') {
            return [];
        }

        $data = json_decode($response, true);
        if (!is_array($data) || empty($data['episodes']) || !is_array($data['episodes'])) {
            return [];
        }

        $result = [];
        foreach ($data['episodes'] as $episode) {
            if (!is_array($episode)) {
                continue;
            }

            $ordinal = (int)($episode['ordinal'] ?? 0);
            if ($ordinal !== $ep) {
                continue;
            }

            foreach (['1080', '720', '480'] as $quality) {
                $hls = $episode['hls_' . $quality] ?? null;
                if (is_string($hls) && trim($hls) !== '') {
                    $result[$quality][] = trim($hls);
                }
            }
            break;
        }

        return $result;
    }
}
