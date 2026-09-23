<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use PDO;

class BookmarkRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function getUserBookmarks(int $userId, ?string $category = null, int $page = 1, int $limit = 24): array
    {
        $where = ['b.user_id = :uid'];
        $params = ['uid' => $userId];

        if ($category !== null) {
            $where[] = 'b.category = :category';
            $params['category'] = $category;
        }

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM bookmarks b WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT 
                b.id as bookmark_id, b.category, b.created_at as bookmarked_at,
                c.id, c.title, c.original_title, c.slug, c.description, c.poster_url, c.banner_url,
                c.release_year, c.age_rating, c.duration_minutes, c.rating_cache, c.votes_count, c.is_featured,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                (SELECT r.rating FROM ratings r WHERE r.content_id = c.id AND r.user_id = :uid_rating) AS user_rating,
                (
                    SELECT json_agg(json_build_object('id', g.id, 'slug', g.slug, 'name', g.name))
                    FROM content_genres cg JOIN genres g ON cg.genre_id = g.id WHERE cg.content_id = c.id
                ) AS genres,
                (
                    SELECT json_agg(json_build_object('id', cnt.id, 'code', cnt.code, 'name', cnt.name))
                    FROM content_countries cc JOIN countries cnt ON cc.country_id = cnt.id WHERE cc.content_id = c.id
                ) AS countries
            FROM bookmarks b
            JOIN contents c ON b.content_id = c.id
            JOIN content_types ct ON c.content_type_id = ct.id
            WHERE {$whereClause}
            ORDER BY b.created_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue('uid_rating', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        return [
            'items' => array_map(function($r) {
                $genres = !empty($r['genres']) ? (is_array($r['genres']) ? $r['genres'] : json_decode($r['genres'], true)) : [];
                $countries = !empty($r['countries']) ? (is_array($r['countries']) ? $r['countries'] : json_decode($r['countries'], true)) : [];

                return [
                    'id' => (int)$r['bookmark_id'],
                    'category' => $r['category'],
                    'createdAt' => (string)$r['bookmarked_at'],
                    'content' => [
                        'id' => (int)$r['id'],
                        'contentType' => [
                            'id' => (int)$r['type_id'],
                            'code' => $r['type_code'],
                            'name' => $r['type_name'],
                        ],
                        'title' => $r['title'],
                        'originalTitle' => $r['original_title'],
                        'slug' => $r['slug'],
                        'description' => $r['description'],
                        'posterUrl' => $r['poster_url'],
                        'bannerUrl' => $r['banner_url'],
                        'releaseYear' => (int)$r['release_year'],
                        'ageRating' => $r['age_rating'],
                        'durationMinutes' => $r['duration_minutes'] ? (int)$r['duration_minutes'] : null,
                        'ratingCache' => (float)$r['rating_cache'],
                        'votesCount' => (int)$r['votes_count'],
                        'isFeatured' => (bool)$r['is_featured'],
                        'genres' => $genres ?? [],
                        'countries' => $countries ?? [],
                        'userRating' => $r['user_rating'] !== null ? (int)$r['user_rating'] : null,
                        'userBookmark' => $r['category'],
                    ]
                ];
            }, $rows),
            'meta' => [
                'page' => $page,
                'perPage' => $limit,
                'total' => $total,
                'totalPages' => (int)ceil($total / max(1, $limit)),
            ],
        ];
    }

    public function setCategory(int $userId, int $contentId, string $category): void
    {
        // First remove any existing bookmark for this content by the user
        $delStmt = $this->db->prepare('DELETE FROM bookmarks WHERE user_id = :uid AND content_id = :cid');
        $delStmt->execute(['uid' => $userId, 'cid' => $contentId]);

        // Insert fresh bookmark with the selected category
        $stmt = $this->db->prepare('
            INSERT INTO bookmarks (user_id, content_id, category)
            VALUES (:uid, :cid, :category)
        ');
        $stmt->execute([
            'uid' => $userId,
            'cid' => $contentId,
            'category' => $category,
        ]);
    }

    public function remove(int $userId, int $contentId): void
    {
        $stmt = $this->db->prepare('DELETE FROM bookmarks WHERE user_id = :uid AND content_id = :cid');
        $stmt->execute(['uid' => $userId, 'cid' => $contentId]);
    }

    public function getUserBookmark(int $userId, int $contentId): ?string
    {
        $stmt = $this->db->prepare('SELECT category FROM bookmarks WHERE user_id = :uid AND content_id = :cid');
        $stmt->execute(['uid' => $userId, 'cid' => $contentId]);
        $val = $stmt->fetchColumn();

        return $val !== false ? (string)$val : null;
    }
}
