<?php

declare(strict_types=1);

namespace App\Services\Anixart\Parsers;

final class KodikParser implements ParserInterface
{
    private const string USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    public function supports(string $url, string $sourceName = ''): bool
    {
        if (stripos($sourceName, 'kodik') !== false) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST) ?? '';
        return str_contains($host, 'kodik') || str_contains($host, 'kodikplayer');
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
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $html = curl_exec($ch);
        $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $url;
        curl_close($ch);

        if (!is_string($html) || $html === '') {
            return [];
        }

        preg_match("/\w+\.hash\s*=\s*'([^']*)'/i", $html, $hashMatch);
        preg_match("/\w+\.id\s*=\s*'([^']*)'/i", $html, $idMatch);
        preg_match("/\w+\.type\s*=\s*'([^']*)'/i", $html, $typeMatch);
        preg_match("/var\s+urlParams\s*=\s*'(.*?)';/s", $html, $paramsMatch);

        $hash = $hashMatch[1] ?? null;
        $id = $idMatch[1] ?? null;
        $type = $typeMatch[1] ?? null;

        if (!$hash || !$id || !$type) {
            return [];
        }

        $params = !empty($paramsMatch[1]) ? json_decode($paramsMatch[1], true) : [];
        if (!is_array($params)) {
            $params = [];
        }

        $params['hash'] = $hash;
        $params['id'] = $id;
        $params['type'] = $type;

        $host = parse_url($effectiveUrl, PHP_URL_HOST) ?: 'kodikplayer.com';
        $scheme = parse_url($effectiveUrl, PHP_URL_SCHEME) ?: 'https';
        $ftorUrl = "{$scheme}://{$host}/ftor?" . http_build_query($params);

        $ch = curl_init($ftorUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => self::USER_AGENT,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_REFERER => '',
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if (!is_string($response) || $response === '') {
            return [];
        }

        $data = json_decode($response, true);
        if (!is_array($data) || empty($data['links']) || !is_array($data['links'])) {
            return [];
        }

        $result = [];
        foreach ($data['links'] as $quality => $sources) {
            if (!is_array($sources)) {
                continue;
            }

            foreach ($sources as $source) {
                if (!is_array($source) || empty($source['src']) || !is_string($source['src'])) {
                    continue;
                }

                $decoded = trim($source['src']);
                if ($decoded === '') {
                    continue;
                }

                // If not standard URL prefix, decode Caesar rot18 cipher + base64
                if (!str_starts_with($decoded, 'http') && !str_starts_with($decoded, '//') && !str_starts_with($decoded, '/')) {
                    $base64 = preg_replace_callback('/[a-zA-Z]/', function (array $m): string {
                        $char = $m[0];
                        $offset = ctype_upper($char) ? 65 : 97;
                        return chr((ord($char) - $offset + 18) % 26 + $offset);
                    }, $decoded);

                    if ($base64 !== null) {
                        $decoded = (string)base64_decode($base64);
                    }
                }

                if (str_starts_with($decoded, '//')) {
                    $decoded = 'https:' . $decoded;
                }

                if ($decoded !== '' && filter_var($decoded, FILTER_VALIDATE_URL)) {
                    $result[(string)$quality][] = $decoded;
                }
            }
        }

        return $result;
    }
}
