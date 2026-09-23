<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use App\DTO\CatalogFilterDTO;
use PDO;

class ContentRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function findFiltered(CatalogFilterDTO $filter, ?int $currentUserId = null): array
    {
        $where = ['1=1'];
        $params = [];

        if ($filter->type !== null) {
            $where[] = 'ct.code = :type';
            $params['type'] = $filter->type;
        }

        if ($filter->genre !== null) {
            $where[] = 'EXISTS (
                SELECT 1 FROM content_genres cg 
                JOIN genres g ON cg.genre_id = g.id 
                WHERE cg.content_id = c.id AND g.slug = :genre
            )';
            $params['genre'] = $filter->genre;
        }

        if ($filter->country !== null) {
            $where[] = 'EXISTS (
                SELECT 1 FROM content_countries cc 
                JOIN countries cnt ON cc.country_id = cnt.id 
                WHERE cc.content_id = c.id AND cnt.code = :country
            )';
            $params['country'] = $filter->country;
        }

        if ($filter->yearFrom !== null) {
            $where[] = 'c.release_year >= :year_from';
            $params['year_from'] = $filter->yearFrom;
        }

        if ($filter->yearTo !== null) {
            $where[] = 'c.release_year <= :year_to';
            $params['year_to'] = $filter->yearTo;
        }

        if ($filter->minRating !== null) {
            $where[] = 'c.rating_cache >= :min_rating';
            $params['min_rating'] = $filter->minRating;
        }

        if ($filter->query !== null && $filter->query !== '') {
            $where[] = '(
                c.title ILIKE :q_like OR 
                c.original_title ILIKE :q_like OR 
                c.search_vector @@ plainto_tsquery(\'russian\', :q_fts)
            )';
            $params['q_like'] = '%' . $filter->query . '%';
            $params['q_fts'] = $filter->query;
        }

        $whereClause = implode(' AND ', $where);

        // Count total
        $countSql = "
            SELECT COUNT(*) 
            FROM contents c 
            JOIN content_types ct ON c.content_type_id = ct.id 
            WHERE {$whereClause}
        ";
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Sort order
        $orderBy = match ($filter->sort) {
            'rating' => 'c.rating_cache DESC, c.votes_count DESC',
            'newest' => 'c.release_year DESC, c.created_at DESC',
            'popular' => 'c.votes_count DESC, c.rating_cache DESC',
            'title' => 'c.title ASC',
            default => 'c.rating_cache DESC',
        };

        $offset = ($filter->page - 1) * $filter->limit;

        $userRatingSelect = $currentUserId ? '(SELECT r.rating FROM ratings r WHERE r.content_id = c.id AND r.user_id = :curr_uid_1) AS user_rating' : 'NULL AS user_rating';
        $userBookmarkSelect = $currentUserId ? '(SELECT b.category FROM bookmarks b WHERE b.content_id = c.id AND b.user_id = :curr_uid_2) AS user_bookmark' : 'NULL AS user_bookmark';

        $dataSql = "
            SELECT 
                c.id, c.title, c.original_title, c.slug, c.description, c.poster_url, c.banner_url, c.trailer_url,
                c.release_year, c.age_rating, c.duration_minutes, c.rating_cache, c.votes_count, c.is_featured,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                {$userRatingSelect}, {$userBookmarkSelect},
                (
                    SELECT json_agg(json_build_object('id', g.id, 'slug', g.slug, 'name', g.name))
                    FROM content_genres cg
                    JOIN genres g ON cg.genre_id = g.id
                    WHERE cg.content_id = c.id
                ) AS genres,
                (
                    SELECT json_agg(json_build_object('id', cnt.id, 'code', cnt.code, 'name', cnt.name))
                    FROM content_countries cc
                    JOIN countries cnt ON cc.country_id = cnt.id
                    WHERE cc.content_id = c.id
                ) AS countries
            FROM contents c
            JOIN content_types ct ON c.content_type_id = ct.id
            WHERE {$whereClause}
            ORDER BY {$orderBy}
            LIMIT :limit OFFSET :offset
        ";

        if ($currentUserId) {
            $params['curr_uid_1'] = $currentUserId;
            $params['curr_uid_2'] = $currentUserId;
        }
        $params['limit'] = $filter->limit;
        $params['offset'] = $offset;

        $stmtData = $this->db->prepare($dataSql);
        foreach ($params as $k => $v) {
            $stmtData->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmtData->execute();
        $items = $stmtData->fetchAll();

        return [
            'items' => array_map([$this, 'formatContentItem'], $items),
            'meta' => [
                'page' => $filter->page,
                'perPage' => $filter->limit,
                'total' => $total,
                'totalPages' => (int)ceil($total / max(1, $filter->limit)),
            ],
        ];
    }

    public function findFeatured(?int $currentUserId = null): array
    {
        $userRatingSelect = $currentUserId ? '(SELECT r.rating FROM ratings r WHERE r.content_id = c.id AND r.user_id = :curr_uid_1) AS user_rating' : 'NULL AS user_rating';
        $userBookmarkSelect = $currentUserId ? '(SELECT b.category FROM bookmarks b WHERE b.content_id = c.id AND b.user_id = :curr_uid_2) AS user_bookmark' : 'NULL AS user_bookmark';

        $sql = "
            SELECT 
                c.id, c.title, c.original_title, c.slug, c.description, c.poster_url, c.banner_url, c.trailer_url,
                c.release_year, c.age_rating, c.duration_minutes, c.rating_cache, c.votes_count, c.is_featured,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                {$userRatingSelect}, {$userBookmarkSelect},
                (
                    SELECT json_agg(json_build_object('id', g.id, 'slug', g.slug, 'name', g.name))
                    FROM content_genres cg JOIN genres g ON cg.genre_id = g.id WHERE cg.content_id = c.id
                ) AS genres,
                (
                    SELECT json_agg(json_build_object('id', cnt.id, 'code', cnt.code, 'name', cnt.name))
                    FROM content_countries cc JOIN countries cnt ON cc.country_id = cnt.id WHERE cc.content_id = c.id
                ) AS countries
            FROM contents c
            JOIN content_types ct ON c.content_type_id = ct.id
            WHERE c.is_featured = true OR c.rating_cache >= 8.5
            ORDER BY c.is_featured DESC, c.rating_cache DESC
            LIMIT 15
        ";

        $stmt = $this->db->prepare($sql);
        if ($currentUserId) {
            $stmt->bindValue('curr_uid_1', $currentUserId, PDO::PARAM_INT);
            $stmt->bindValue('curr_uid_2', $currentUserId, PDO::PARAM_INT);
        }
        $stmt->execute();
        $items = $stmt->fetchAll();

        return array_map([$this, 'formatContentItem'], $items);
    }

    public function findBySlugOrId(string|int $identifier, ?int $currentUserId = null): ?array
    {
        $userRatingSelect = $currentUserId ? '(SELECT r.rating FROM ratings r WHERE r.content_id = c.id AND r.user_id = :curr_uid_1) AS user_rating' : 'NULL AS user_rating';
        $userBookmarkSelect = $currentUserId ? '(SELECT b.category FROM bookmarks b WHERE b.content_id = c.id AND b.user_id = :curr_uid_2) AS user_bookmark' : 'NULL AS user_bookmark';
        $userProgressSelect = $currentUserId ? '
            (
                SELECT json_build_object(
                    \'progressSeconds\', wp.progress_seconds,
                    \'durationSeconds\', wp.duration_seconds,
                    \'isCompleted\', wp.is_completed,
                    \'episodeId\', wp.episode_id,
                    \'lastWatchedAt\', wp.last_watched_at
                )
                FROM watch_progress wp
                WHERE wp.content_id = c.id AND wp.user_id = :curr_uid_3
                ORDER BY wp.last_watched_at DESC
                LIMIT 1
            ) AS user_progress
        ' : 'NULL AS user_progress';

        $isNumeric = is_numeric($identifier);
        $where = $isNumeric ? 'c.id = :id' : 'c.slug = :slug';

        $sql = "
            SELECT 
                c.id, c.title, c.original_title, c.slug, c.description, c.poster_url, c.banner_url, c.trailer_url,
                c.release_year, c.age_rating, c.duration_minutes, c.rating_cache, c.votes_count, c.is_featured,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                {$userRatingSelect}, {$userBookmarkSelect}, {$userProgressSelect},
                (
                    SELECT json_agg(json_build_object('id', g.id, 'slug', g.slug, 'name', g.name))
                    FROM content_genres cg JOIN genres g ON cg.genre_id = g.id WHERE cg.content_id = c.id
                ) AS genres,
                (
                    SELECT json_agg(json_build_object('id', cnt.id, 'code', cnt.code, 'name', cnt.name))
                    FROM content_countries cc JOIN countries cnt ON cc.country_id = cnt.id WHERE cc.content_id = c.id
                ) AS countries
            FROM contents c
            JOIN content_types ct ON c.content_type_id = ct.id
            WHERE {$where}
        ";

        $stmt = $this->db->prepare($sql);
        if ($isNumeric) {
            $stmt->bindValue('id', (int)$identifier, PDO::PARAM_INT);
        } else {
            $stmt->bindValue('slug', (string)$identifier, PDO::PARAM_STR);
        }

        if ($currentUserId) {
            $stmt->bindValue('curr_uid_1', $currentUserId, PDO::PARAM_INT);
            $stmt->bindValue('curr_uid_2', $currentUserId, PDO::PARAM_INT);
            $stmt->bindValue('curr_uid_3', $currentUserId, PDO::PARAM_INT);
        }

        $stmt->execute();
        $row = $stmt->fetch();

        return $row ? $this->formatContentItem($row) : null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('
            SELECT c.*, ct.code as type
            FROM contents c
            JOIN content_types ct ON c.content_type_id = ct.id
            WHERE c.id = :id
        ');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getEpisodeById(int $episodeId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM episodes WHERE id = :id');
        $stmt->execute(['id' => $episodeId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getSeasonsWithEpisodes(int $contentId): array
    {
        $stmtSeasons = $this->db->prepare('
            SELECT id, content_id, season_number, title, release_year
            FROM seasons
            WHERE content_id = :content_id
            ORDER BY season_number ASC
        ');
        $stmtSeasons->execute(['content_id' => $contentId]);
        $seasons = $stmtSeasons->fetchAll();

        if (empty($seasons)) {
            return [];
        }

        $stmtEpisodes = $this->db->prepare('
            SELECT id, season_id, content_id, episode_number, title, duration_minutes
            FROM episodes
            WHERE content_id = :content_id
            ORDER BY season_id ASC, episode_number ASC
        ');
        $stmtEpisodes->execute(['content_id' => $contentId]);
        $allEpisodes = $stmtEpisodes->fetchAll();

        $episodesBySeason = [];
        foreach ($allEpisodes as $ep) {
            $episodesBySeason[$ep['season_id']][] = [
                'id' => (int)$ep['id'],
                'seasonId' => (int)$ep['season_id'],
                'contentId' => (int)$ep['content_id'],
                'episodeNumber' => (int)$ep['episode_number'],
                'title' => $ep['title'],
                'durationMinutes' => $ep['duration_minutes'] ? (int)$ep['duration_minutes'] : null,
            ];
        }

        $result = [];
        foreach ($seasons as $s) {
            $sId = (int)$s['id'];
            $result[] = [
                'id' => $sId,
                'contentId' => (int)$s['content_id'],
                'seasonNumber' => (int)$s['season_number'],
                'title' => $s['title'],
                'releaseYear' => $s['release_year'] ? (int)$s['release_year'] : null,
                'episodes' => $episodesBySeason[$sId] ?? [],
            ];
        }

        return $result;
    }

    public function getStreamSources(int $contentId, ?int $episodeId = null): array
    {
        $where = 'ps.content_id = :content_id';
        $params = ['content_id' => $contentId];

        if ($episodeId !== null) {
            $where .= ' AND ps.episode_id = :episode_id';
            $params['episode_id'] = $episodeId;
        } else {
            $where .= ' AND ps.episode_id IS NULL';
        }

        $sql = "
            SELECT 
                ps.id, ps.stream_url, ps.player_type, ps.quality, ps.translation_title, ps.extra_data,
                p.id as provider_id, p.code as provider_code, p.name as provider_name
            FROM provider_sources ps
            JOIN providers p ON ps.provider_id = p.id
            WHERE {$where} AND p.is_active = true
            ORDER BY p.priority ASC, ps.quality DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map(fn($r) => [
            'id' => (int)$r['id'],
            'provider' => $r['provider_name'],
            'providerCode' => $r['provider_code'],
            'streamUrl' => $r['stream_url'],
            'playerType' => $r['player_type'],
            'quality' => $r['quality'],
            'translationTitle' => $r['translation_title'],
        ], $rows);
    }

    public function getTaxonomies(): array
    {
        $types = $this->db->query('SELECT id, code, name FROM content_types ORDER BY id ASC')->fetchAll();
        $genres = $this->db->query('SELECT id, slug, name FROM genres ORDER BY name ASC')->fetchAll();
        $countries = $this->db->query('SELECT id, code, name FROM countries ORDER BY name ASC')->fetchAll();

        return [
            'types' => array_map(fn($t) => ['id' => (int)$t['id'], 'code' => $t['code'], 'name' => $t['name']], $types),
            'genres' => array_map(fn($g) => ['id' => (int)$g['id'], 'slug' => $g['slug'], 'name' => $g['name']], $genres),
            'countries' => array_map(fn($c) => ['id' => (int)$c['id'], 'code' => $c['code'], 'name' => $c['name']], $countries),
        ];
    }

    private function formatContentItem(array $row): array
    {
        $genres = !empty($row['genres']) ? (is_array($row['genres']) ? $row['genres'] : json_decode($row['genres'], true)) : [];
        $countries = !empty($row['countries']) ? (is_array($row['countries']) ? $row['countries'] : json_decode($row['countries'], true)) : [];
        $progress = !empty($row['user_progress']) ? (is_array($row['user_progress']) ? $row['user_progress'] : json_decode($row['user_progress'], true)) : null;

        return [
            'id' => (int)$row['id'],
            'contentType' => [
                'id' => (int)$row['type_id'],
                'code' => $row['type_code'],
                'name' => $row['type_name'],
            ],
            'title' => $row['title'],
            'originalTitle' => $row['original_title'],
            'slug' => $row['slug'],
            'description' => $row['description'],
            'posterUrl' => $row['poster_url'],
            'bannerUrl' => $row['banner_url'],
            'releaseYear' => (int)$row['release_year'],
            'ageRating' => $row['age_rating'],
            'durationMinutes' => $row['duration_minutes'] ? (int)$row['duration_minutes'] : null,
            'ratingCache' => (float)$row['rating_cache'],
            'votesCount' => (int)$row['votes_count'],
            'isFeatured' => (bool)$row['is_featured'],
            'genres' => $genres ?? [],
            'countries' => $countries ?? [],
            'userRating' => $row['user_rating'] !== null ? (int)$row['user_rating'] : null,
            'userBookmark' => $row['user_bookmark'] ?? null,
            'userProgress' => $progress,
            'trailerUrl' => $row['trailer_url'] ?? null,
            'trailerYoutubeId' => !empty($row['trailer_url']) ? self::extractYoutubeId((string)$row['trailer_url']) : null,
        ];
    }

    public static function extractYoutubeId(string $url): ?string
    {
        if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/i', $url, $m)) {
            return $m[1];
        }
        return null;
    }
}
