<?php

declare(strict_types=1);

namespace App\Services\Anixart;

final class AnixartClient
{
    private const string PRIMARY_BASE_URL = 'https://api.anixsekai.com';
    private const string FALLBACK_BASE_URL = 'https://api-s.anixsekai.com';
    private const string USER_AGENT = 'AnixartApp/10.0-26090418 (Android 14; SDK 34; x86_64; OnePlus NE2210; ru)';
    private const int TIMEOUT_SECONDS = 12;

    private string $activeBaseUrl;

    public function __construct(?string $baseUrl = null)
    {
        $this->activeBaseUrl = $baseUrl ?? self::PRIMARY_BASE_URL;
    }

    /**
     * Search anime releases by query text.
     *
     * @return array{releases: array<array<string, mixed>>, related?: array<string, mixed>|null}
     */
    public function searchReleases(string $query, int $page = 0): array
    {
        $data = $this->post("/search/releases/{$page}", ['query' => $query], ['API-Version: v2']);
        if (!is_array($data)) {
            return ['releases' => []];
        }

        return [
            'releases' => is_array($data['releases'] ?? null) ? $data['releases'] : (is_array($data['content'] ?? null) ? $data['content'] : []),
            'related' => is_array($data['related'] ?? null) ? $data['related'] : null,
        ];
    }

    /**
     * Get releases by filter or popular catalog feed.
     *
     * @param array<string, mixed> $filter
     * @return array{content: array<array<string, mixed>>, total_pages?: int, total_elements?: int}
     */
    public function getFilterReleases(array $filter = [], int $page = 0): array
    {
        $data = $this->post("/filter/{$page}?extended_mode=true", (object)$filter);
        if (!is_array($data)) {
            return ['content' => []];
        }

        return [
            'content' => is_array($data['content'] ?? null) ? $data['content'] : [],
            'total_pages' => (int)($data['total_pages'] ?? 1),
            'total_elements' => (int)($data['total_elements'] ?? count($data['content'] ?? [])),
        ];
    }

    /**
     * Get detailed release by ID.
     *
     * @return array<string, mixed>|null
     */
    public function getRelease(int $releaseId, bool $extended = true): ?array
    {
        $ext = $extended ? 'true' : 'false';
        $data = $this->get("/release/{$releaseId}?extended_mode={$ext}");
        if (!is_array($data) || empty($data['release']) || !is_array($data['release'])) {
            return null;
        }

        return $data['release'];
    }

    /**
     * Get available dubbers / voiceover studios for release.
     *
     * @return array<array<string, mixed>>
     */
    public function getDubbers(int $releaseId): array
    {
        $data = $this->get("/episode/{$releaseId}");
        if (!is_array($data) || empty($data['types']) || !is_array($data['types'])) {
            return [];
        }

        return $data['types'];
    }

    /**
     * Get sources (e.g. Kodik, Libria) for release and dubber.
     *
     * @return array<array<string, mixed>>
     */
    public function getSources(int $releaseId, int $dubberId): array
    {
        $data = $this->get("/episode/{$releaseId}/{$dubberId}");
        if (!is_array($data) || empty($data['sources']) || !is_array($data['sources'])) {
            return [];
        }

        return $data['sources'];
    }

    /**
     * Get episode list for release, dubber, and source.
     *
     * @return array<array<string, mixed>>
     */
    public function getEpisodes(int $releaseId, int $dubberId, int $sourceId, ?int $sort = null): array
    {
        $query = $sort !== null ? "?sort={$sort}" : '';
        $data = $this->get("/episode/{$releaseId}/{$dubberId}/{$sourceId}{$query}");
        if (!is_array($data) || empty($data['episodes']) || !is_array($data['episodes'])) {
            return [];
        }

        return $data['episodes'];
    }

    /**
     * Low-level GET request with failover.
     */
    private function get(string $path, array $extraHeaders = []): ?array
    {
        return $this->request('GET', $path, null, $extraHeaders);
    }

    /**
     * Low-level POST request with failover.
     */
    private function post(string $path, mixed $body = null, array $extraHeaders = []): ?array
    {
        return $this->request('POST', $path, $body, $extraHeaders);
    }

    private function request(string $method, string $path, mixed $body = null, array $extraHeaders = []): ?array
    {
        $urlsToTry = [$this->activeBaseUrl];
        if ($this->activeBaseUrl === self::PRIMARY_BASE_URL) {
            $urlsToTry[] = self::FALLBACK_BASE_URL;
        } else {
            $urlsToTry[] = self::PRIMARY_BASE_URL;
        }

        foreach ($urlsToTry as $baseUrl) {
            $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
            $headers = array_merge([
                'User-Agent: ' . self::USER_AGENT,
                'Accept: application/json',
            ], $extraHeaders);

            $ch = curl_init($url);
            $opts = [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_TIMEOUT => self::TIMEOUT_SECONDS,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_SSL_VERIFYPEER => false,
            ];

            if ($method === 'POST' && $body !== null) {
                $headers[] = 'Content-Type: application/json';
                $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
            }

            $opts[CURLOPT_HTTPHEADER] = $headers;
            curl_setopt_array($ch, $opts);

            $rawResponse = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($rawResponse !== false && $httpCode >= 200 && $httpCode < 300) {
                $this->activeBaseUrl = $baseUrl; // Remember working base URL
                $decoded = json_decode((string)$rawResponse, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            } else {
                error_log("Anixart request to {$url} failed with code {$httpCode}: {$error}");
            }
        }

        return null;
    }
}
