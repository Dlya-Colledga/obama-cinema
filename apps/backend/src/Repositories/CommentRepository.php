<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use PDO;

class CommentRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function findByContent(int $contentId, int $page = 1, int $limit = 20): array
    {
        $offset = ($page - 1) * $limit;

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM comments WHERE content_id = :cid');
        $countStmt->execute(['cid' => $contentId]);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare('
            SELECT 
                c.id, c.content_id, c.parent_id, c.text, c.is_edited, c.created_at, c.updated_at,
                u.id as user_id, u.username, u.role, p.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE c.content_id = :cid
            ORDER BY c.created_at DESC
            LIMIT :limit OFFSET :offset
        ');
        $stmt->bindValue('cid', $contentId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        return [
            'items' => array_map([$this, 'formatComment'], $rows),
            'meta' => [
                'page' => $page,
                'perPage' => $limit,
                'total' => $total,
                'totalPages' => (int)ceil($total / max(1, $limit)),
            ],
        ];
    }

    public function findById(int $commentId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT 
                c.id, c.content_id, c.parent_id, c.text, c.is_edited, c.created_at, c.updated_at,
                u.id as user_id, u.username, u.role, p.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE c.id = :id
        ');
        $stmt->execute(['id' => $commentId]);
        $row = $stmt->fetch();

        return $row ? $this->formatComment($row) : null;
    }

    public function create(int $userId, int $contentId, string $text, ?int $parentId = null): array
    {
        $stmt = $this->db->prepare('
            INSERT INTO comments (user_id, content_id, parent_id, text)
            VALUES (:uid, :cid, :pid, :text)
            RETURNING id, content_id, parent_id, text, is_edited, created_at, updated_at
        ');
        $stmt->execute([
            'uid' => $userId,
            'cid' => $contentId,
            'pid' => $parentId,
            'text' => $text,
        ]);
        $row = $stmt->fetch();

        return $this->findById((int)$row['id']);
    }

    public function update(int $commentId, string $text): array
    {
        $stmt = $this->db->prepare('
            UPDATE comments
            SET text = :text, is_edited = true, updated_at = now()
            WHERE id = :id
            RETURNING id
        ');
        $stmt->execute([
            'id' => $commentId,
            'text' => $text,
        ]);

        return $this->findById($commentId);
    }

    public function delete(int $commentId): void
    {
        $stmt = $this->db->prepare('DELETE FROM comments WHERE id = :id');
        $stmt->execute(['id' => $commentId]);
    }

    private function formatComment(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'contentId' => (int)$row['content_id'],
            'parentId' => $row['parent_id'] ? (int)$row['parent_id'] : null,
            'text' => $row['text'],
            'isEdited' => (bool)$row['is_edited'],
            'createdAt' => (string)$row['created_at'],
            'updatedAt' => (string)$row['updated_at'],
            'user' => [
                'id' => (int)$row['user_id'],
                'username' => $row['username'],
                'role' => $row['role'],
                'avatarUrl' => $row['avatar_url'] ?? null,
            ],
        ];
    }
}
