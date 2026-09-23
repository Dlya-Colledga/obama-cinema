<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use PDO;

class RatingRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function upsert(int $userId, int $contentId, int $rating): array
    {
        $stmt = $this->db->prepare('
            INSERT INTO ratings (user_id, content_id, rating)
            VALUES (:uid, :cid, :rating)
            ON CONFLICT (user_id, content_id) 
            DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
            RETURNING rating
        ');
        $stmt->execute([
            'uid' => $userId,
            'cid' => $contentId,
            'rating' => $rating,
        ]);

        return $this->getContentStats($contentId);
    }

    public function delete(int $userId, int $contentId): array
    {
        $stmt = $this->db->prepare('DELETE FROM ratings WHERE user_id = :uid AND content_id = :cid');
        $stmt->execute([
            'uid' => $userId,
            'cid' => $contentId,
        ]);

        return $this->getContentStats($contentId);
    }

    public function getUserRating(int $userId, int $contentId): ?int
    {
        $stmt = $this->db->prepare('SELECT rating FROM ratings WHERE user_id = :uid AND content_id = :cid');
        $stmt->execute(['uid' => $userId, 'cid' => $contentId]);
        $val = $stmt->fetchColumn();

        return $val !== false ? (int)$val : null;
    }

    public function getContentStats(int $contentId): array
    {
        $stmt = $this->db->prepare('SELECT rating_cache, votes_count FROM contents WHERE id = :id');
        $stmt->execute(['id' => $contentId]);
        $row = $stmt->fetch();

        return [
            'ratingCache' => $row ? (float)$row['rating_cache'] : 0.0,
            'votesCount' => $row ? (int)$row['votes_count'] : 0,
        ];
    }
}
