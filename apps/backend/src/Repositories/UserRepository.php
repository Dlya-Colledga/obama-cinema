<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Database\Connection;
use App\DTO\RegisterDTO;
use App\Entities\Profile;
use App\Entities\User;
use PDO;

class UserRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Connection::get();
    }

    public function findById(int $id): ?User
    {
        $stmt = $this->db->prepare('
            SELECT u.id, u.email, u.username, u.password_hash, u.role, u.created_at, u.updated_at,
                   p.avatar_url, p.bio, p.preferences, p.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.id = :id
        ');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->hydrateUser($row) : null;
    }

    public function findByEmail(string $email): ?User
    {
        $stmt = $this->db->prepare('
            SELECT u.id, u.email, u.username, u.password_hash, u.role, u.created_at, u.updated_at,
                   p.avatar_url, p.bio, p.preferences, p.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE LOWER(u.email) = LOWER(:email)
        ');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        return $row ? $this->hydrateUser($row) : null;
    }

    public function findByUsername(string $username): ?User
    {
        $stmt = $this->db->prepare('
            SELECT u.id, u.email, u.username, u.password_hash, u.role, u.created_at, u.updated_at,
                   p.avatar_url, p.bio, p.preferences, p.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE LOWER(u.username) = LOWER(:username)
        ');
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch();

        return $row ? $this->hydrateUser($row) : null;
    }

    public function findByToken(string $plainToken): ?User
    {
        $tokenHash = hash('sha256', $plainToken);

        $stmt = $this->db->prepare('
            SELECT u.id, u.email, u.username, u.password_hash, u.role, u.created_at, u.updated_at,
                   p.avatar_url, p.bio, p.preferences, p.updated_at as profile_updated_at
            FROM user_tokens ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE ut.token_hash = :hash AND ut.expires_at > now()
        ');
        $stmt->execute(['hash' => $tokenHash]);
        $row = $stmt->fetch();

        return $row ? $this->hydrateUser($row) : null;
    }

    public function create(RegisterDTO $dto, string $passwordHash): User
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('
                INSERT INTO users (email, username, password_hash, role)
                VALUES (:email, :username, :password_hash, :role)
                RETURNING id, email, username, password_hash, role, created_at, updated_at
            ');
            $stmt->execute([
                'email' => $dto->email,
                'username' => $dto->username,
                'password_hash' => $passwordHash,
                'role' => 'user',
            ]);
            $userData = $stmt->fetch();

            $profStmt = $this->db->prepare('
                INSERT INTO profiles (user_id, avatar_url, bio, preferences)
                VALUES (:user_id, NULL, NULL, \'{}\'::jsonb)
                RETURNING user_id, avatar_url, bio, preferences, updated_at
            ');
            $profStmt->execute(['user_id' => $userData['id']]);
            $profData = $profStmt->fetch();

            $this->db->commit();

            $userData['avatar_url'] = $profData['avatar_url'];
            $userData['bio'] = $profData['bio'];
            $userData['preferences'] = $profData['preferences'];
            $userData['profile_updated_at'] = $profData['updated_at'];

            return $this->hydrateUser($userData);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function createToken(int $userId, string $plainToken, int $lifetimeDays = 30, ?string $ip = null, ?string $ua = null): void
    {
        $tokenHash = hash('sha256', $plainToken);
        $expiresAt = date('Y-m-d H:i:sP', strtotime("+{$lifetimeDays} days"));

        $stmt = $this->db->prepare('
            INSERT INTO user_tokens (user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (:user_id, :hash, :ip, :ua, :expires_at)
        ');
        $stmt->execute([
            'user_id' => $userId,
            'hash' => $tokenHash,
            'ip' => $ip,
            'ua' => $ua ? mb_substr($ua, 0, 255) : null,
            'expires_at' => $expiresAt,
        ]);
    }

    public function deleteToken(string $plainToken): void
    {
        $tokenHash = hash('sha256', $plainToken);
        $stmt = $this->db->prepare('DELETE FROM user_tokens WHERE token_hash = :hash');
        $stmt->execute(['hash' => $tokenHash]);
    }

    public function updateProfile(int $userId, ?string $avatarUrl, ?string $bio, ?array $preferences): void
    {
        $fields = [];
        $params = ['user_id' => $userId];

        if ($avatarUrl !== null) {
            $fields[] = 'avatar_url = :avatar_url';
            $params['avatar_url'] = $avatarUrl;
        }
        if ($bio !== null) {
            $fields[] = 'bio = :bio';
            $params['bio'] = $bio;
        }
        if ($preferences !== null) {
            $fields[] = 'preferences = :preferences::jsonb';
            $params['preferences'] = json_encode($preferences);
        }

        if (empty($fields)) {
            return;
        }

        $fields[] = 'updated_at = now()';
        $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE user_id = :user_id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $stmt = $this->db->prepare('UPDATE users SET password_hash = :hash, updated_at = now() WHERE id = :id');
        $stmt->execute(['hash' => $passwordHash, 'id' => $userId]);
    }

    private function hydrateUser(array $row): User
    {
        $preferences = [];
        if (!empty($row['preferences'])) {
            $preferences = is_array($row['preferences']) ? $row['preferences'] : (json_decode($row['preferences'], true) ?? []);
        }

        $profile = new Profile(
            userId: (int)$row['id'],
            avatarUrl: $row['avatar_url'] ?? null,
            bio: $row['bio'] ?? null,
            preferences: $preferences,
            updatedAt: (string)($row['profile_updated_at'] ?? $row['updated_at'])
        );

        return new User(
            id: (int)$row['id'],
            email: (string)$row['email'],
            username: (string)$row['username'],
            passwordHash: (string)$row['password_hash'],
            role: (string)$row['role'],
            createdAt: (string)$row['created_at'],
            updatedAt: (string)$row['updated_at'],
            profile: $profile
        );
    }
}
