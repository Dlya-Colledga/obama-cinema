<?php

declare(strict_types=1);

namespace App\Services\Anixart\Parsers;

interface ParserInterface
{
    /**
     * Checks if this parser supports the given link/source.
     */
    public function supports(string $url, string $sourceName = ''): bool;

    /**
     * Extracts direct video stream links mapped by quality ('1080', '720', '480', '360', 'unknown').
     * Each quality contains an array of stream URLs (e.g. m3u8 or mp4).
     *
     * @return array<string, array<string>>
     */
    public function parse(string $url): array;
}
