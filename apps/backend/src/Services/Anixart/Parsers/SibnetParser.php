<?php

declare(strict_types=1);

namespace App\Services\Anixart\Parsers;

final class SibnetParser implements ParserInterface
{
    private const string USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    public function supports(string $url, string $sourceName = ''): bool
    {
        if (stripos($sourceName, 'sibnet') !== false) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST) ?? '';
        return str_contains($host, 'sibnet.ru');
    }

    /**
     * @return array<string, array<string>>
     */
    public function parse(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => self::USER_AGENT,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $html = curl_exec($ch);
        $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $url;
        curl_close($ch);

        if (!is_string($html) || $html === '') {
            return [];
        }

        if (!preg_match('/\bsrc\s*:\s*(?:"([^"]+)"|\'([^\']+)\')/', $html, $m)) {
            return [];
        }

        $src = $m[1] ?: $m[2];
        if (!$src) {
            return [];
        }

        if (str_starts_with($src, '/')) {
            $parsed = parse_url($effectiveUrl);
            $base = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? 'video.sibnet.ru');
            $src = $base . $src;
        }

        // Get final redirected video url
        $ch = curl_init($src);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_NOBODY => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => self::USER_AGENT,
            CURLOPT_REFERER => $effectiveUrl,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        curl_exec($ch);
        $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $src;
        curl_close($ch);

        return [
            'unknown' => [$finalUrl],
        ];
    }
}
