<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use PDO;

class WatchRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function upsertProgress(
        int $userId,
        int $contentId,
        ?int $episodeId,
        int $progressSeconds,
        int $durationSeconds,
        bool $isCompleted
    ): void {
        $this->db->beginTransaction();
        try {
            // Upsert progress
            $sql = '
                INSERT INTO watch_progress (user_id, content_id, episode_id, progress_seconds, duration_seconds, is_completed, last_watched_at)
                VALUES (:uid, :cid, :eid, :progress, :duration, :completed, now())
                ON CONFLICT (user_id, content_id, episode_id)
                DO UPDATE SET 
                    progress_seconds = EXCLUDED.progress_seconds,
                    duration_seconds = EXCLUDED.duration_seconds,
                    is_completed = EXCLUDED.is_completed,
                    last_watched_at = now()
            ';
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue('uid', $userId, PDO::PARAM_INT);
            $stmt->bindValue('cid', $contentId, PDO::PARAM_INT);
            $stmt->bindValue('eid', $episodeId, $episodeId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue('progress', $progressSeconds, PDO::PARAM_INT);
            $stmt->bindValue('duration', $durationSeconds, PDO::PARAM_INT);
            $stmt->bindValue('completed', $isCompleted, PDO::PARAM_BOOL);
            $stmt->execute();

            // Insert into history log
            $histStmt = $this->db->prepare('
                INSERT INTO watch_history (user_id, content_id, episode_id, watched_at)
                VALUES (:uid, :cid, :eid, now())
            ');
            $histStmt->bindValue('uid', $userId, PDO::PARAM_INT);
            $histStmt->bindValue('cid', $contentId, PDO::PARAM_INT);
            $histStmt->bindValue('eid', $episodeId, $episodeId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $histStmt->execute();

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getProgress(int $userId, int $contentId, ?int $episodeId = null): ?array
    {
        $sql = '
            SELECT progress_seconds, duration_seconds, is_completed, last_watched_at, episode_id
            FROM watch_progress
            WHERE user_id = :uid AND content_id = :cid
        ';
        $params = ['uid' => $userId, 'cid' => $contentId];

        if ($episodeId !== null) {
            $sql .= ' AND episode_id = :eid';
            $params['eid'] = $episodeId;
        } else {
            $sql .= ' ORDER BY last_watched_at DESC LIMIT 1';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return [
            'contentId' => $contentId,
            'episodeId' => $row['episode_id'] !== null ? (int)$row['episode_id'] : null,
            'progressSeconds' => (int)$row['progress_seconds'],
            'durationSeconds' => (int)$row['duration_seconds'],
            'isCompleted' => (bool)$row['is_completed'],
            'lastWatchedAt' => (string)$row['last_watched_at'],
        ];
    }

    public function getRecentUnfinished(int $userId, int $limit = 10): array
    {
        $sql = "
            SELECT 
                wp.progress_seconds, wp.duration_seconds, wp.is_completed, wp.last_watched_at, wp.episode_id,
                c.id, c.title, c.original_title, c.slug, c.poster_url, c.banner_url, c.release_year,
                c.rating_cache, c.votes_count,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                ep.episode_number, ep.title as episode_title, s.season_number
            FROM watch_progress wp
            JOIN contents c ON wp.content_id = c.id
            JOIN content_types ct ON c.content_type_id = ct.id
            LEFT JOIN episodes ep ON wp.episode_id = ep.id
            LEFT JOIN seasons s ON ep.season_id = s.id
            WHERE wp.user_id = :uid AND wp.is_completed = false AND wp.progress_seconds > 30
            ORDER BY wp.last_watched_at DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue('uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        return array_map(function($r) {
            return [
                'contentId' => (int)$r['id'],
                'episodeId' => $r['episode_id'] !== null ? (int)$r['episode_id'] : null,
                'progressSeconds' => (int)$r['progress_seconds'],
                'durationSeconds' => (int)$r['duration_seconds'],
                'isCompleted' => (bool)$r['is_completed'],
                'lastWatchedAt' => (string)$r['last_watched_at'],
                'episode' => $r['episode_id'] ? [
                    'id' => (int)$r['episode_id'],
                    'episodeNumber' => (int)$r['episode_number'],
                    'seasonNumber' => (int)$r['season_number'],
                    'title' => $r['episode_title'],
                ] : null,
                'content' => [
                    'id' => (int)$r['id'],
                    'title' => $r['title'],
                    'originalTitle' => $r['original_title'],
                    'slug' => $r['slug'],
                    'posterUrl' => $r['poster_url'],
                    'bannerUrl' => $r['banner_url'],
                    'releaseYear' => (int)$r['release_year'],
                    'ratingCache' => (float)$r['rating_cache'],
                    'contentType' => [
                        'code' => $r['type_code'],
                        'name' => $r['type_name'],
                    ],
                ]
            ];
        }, $rows);
    }

    public function getHistory(int $userId, int $page = 1, int $limit = 24): array
    {
        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM watch_history WHERE user_id = :uid');
        $countStmt->execute(['uid' => $userId]);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT 
                wh.id as history_id, wh.watched_at, wh.episode_id,
                c.id, c.title, c.original_title, c.slug, c.poster_url, c.banner_url, c.release_year,
                c.rating_cache, c.votes_count,
                ct.id as type_id, ct.code as type_code, ct.name as type_name,
                ep.episode_number, ep.title as episode_title, s.season_number
            FROM watch_history wh
            JOIN contents c ON wh.content_id = c.id
            JOIN content_types ct ON c.content_type_id = ct.id
            LEFT JOIN episodes ep ON wh.episode_id = ep.id
            LEFT JOIN seasons s ON ep.season_id = s.id
            WHERE wh.user_id = :uid
            ORDER BY wh.watched_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue('uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        return [
            'items' => array_map(function($r) {
                return [
                    'id' => (int)$r['history_id'],
                    'watchedAt' => (string)$r['watched_at'],
                    'episode' => $r['episode_id'] ? [
                        'id' => (int)$r['episode_id'],
                        'episodeNumber' => (int)$r['episode_number'],
                        'seasonNumber' => (int)$r['season_number'],
                        'title' => $r['episode_title'],
                    ] : null,
                    'content' => [
                        'id' => (int)$r['id'],
                        'title' => $r['title'],
                        'originalTitle' => $r['original_title'],
                        'slug' => $r['slug'],
                        'posterUrl' => $r['poster_url'],
                        'bannerUrl' => $r['banner_url'],
                        'releaseYear' => (int)$r['release_year'],
                        'ratingCache' => (float)$r['rating_cache'],
                        'contentType' => [
                            'code' => $r['type_code'],
                            'name' => $r['type_name'],
                        ],
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

    public function clearHistory(int $userId, ?int $historyId = null): void
    {
        if ($historyId !== null) {
            $stmt = $this->db->prepare('DELETE FROM watch_history WHERE id = :hid AND user_id = :uid');
            $stmt->execute(['hid' => $historyId, 'uid' => $userId]);
        } else {
            $stmt = $this->db->prepare('DELETE FROM watch_history WHERE user_id = :uid');
            $stmt->execute(['uid' => $userId]);
        }
    }
}
