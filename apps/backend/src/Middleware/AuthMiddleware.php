<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Exceptions\AuthenticationException;
use App\Http\Request;
use App\Repositories\UserRepository;

final class AuthMiddleware
{
    public static function handle(Request $request): void
    {
        $token = $request->getBearerToken();
        if (!$token) {
            throw new AuthenticationException('Не передан токен авторизации (Authorization: Bearer <token>)');
        }

        $userRepo = new UserRepository();
        $user = $userRepo->findByToken($token);

        if (!$user) {
            throw new AuthenticationException('Недействительный или истекший токен авторизации');
        }

        $request->user = $user;
    }
}
