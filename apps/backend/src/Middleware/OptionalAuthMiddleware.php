<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use App\Repositories\UserRepository;

final class OptionalAuthMiddleware
{
    public static function handle(Request $request): void
    {
        $token = $request->getBearerToken();
        if ($token) {
            $userRepo = new UserRepository();
            $user = $userRepo->findByToken($token);
            if ($user) {
                $request->user = $user;
            }
        }
    }
}
