<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\LoginDTO;
use App\DTO\RegisterDTO;
use App\DTO\UpdateProfileDTO;
use App\Entities\User;
use App\Exceptions\AuthenticationException;
use App\Exceptions\ConflictException;
use App\Repositories\UserRepository;
use App\Validators\Validator;

class AuthService
{
    public function __construct(
        private UserRepository $userRepo
    ) {}

    public function register(RegisterDTO $dto, ?string $ip = null, ?string $ua = null): array
    {
        Validator::validateRegister($dto);

        if ($this->userRepo->findByEmail($dto->email)) {
            throw new ConflictException('Пользователь с таким email уже зарегистрирован');
        }

        if ($this->userRepo->findByUsername($dto->username)) {
            throw new ConflictException('Пользователь с таким именем уже существует');
        }

        $passwordHash = password_hash($dto->password, PASSWORD_BCRYPT, ['cost' => 12]);
        $user = $this->userRepo->create($dto, $passwordHash);

        $plainToken = bin2hex(random_bytes(32));
        $this->userRepo->createToken($user->id, $plainToken, 30, $ip, $ua);

        return [
            'token' => $plainToken,
            'user' => $user->toArray(),
        ];
    }

    public function login(LoginDTO $dto, ?string $ip = null, ?string $ua = null): array
    {
        Validator::validateLogin($dto);

        $user = str_contains($dto->login, '@')
            ? $this->userRepo->findByEmail($dto->login)
            : $this->userRepo->findByUsername($dto->login);

        if (!$user || !password_verify($dto->password, $user->passwordHash)) {
            throw new AuthenticationException('Неверный логин или пароль');
        }

        $plainToken = bin2hex(random_bytes(32));
        $this->userRepo->createToken($user->id, $plainToken, 30, $ip, $ua);

        return [
            'token' => $plainToken,
            'user' => $user->toArray(),
        ];
    }

    public function logout(string $plainToken): void
    {
        $this->userRepo->deleteToken($plainToken);
    }

    public function getMe(User $user): array
    {
        return $user->toArray(true);
    }

    public function updateProfile(User $user, UpdateProfileDTO $dto): array
    {
        $this->userRepo->updateProfile(
            $user->id,
            $dto->avatarUrl,
            $dto->bio !== null ? Validator::sanitizeText($dto->bio) : null,
            $dto->preferences
        );

        $updated = $this->userRepo->findById($user->id);
        return $updated ? $updated->toArray(true) : $user->toArray(true);
    }
}
