<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\LoginDTO;
use App\DTO\RegisterDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\AuthService;

final class AuthController
{
    public function __construct(
        private AuthService $authService
    ) {}

    public function register(Request $request): void
    {
        $dto = RegisterDTO::fromArray($request->body);
        $result = $this->authService->register($dto, $request->getIp(), $request->getUserAgent());

        Response::json($result, 201);
    }

    public function login(Request $request): void
    {
        $dto = LoginDTO::fromArray($request->body);
        $result = $this->authService->login($dto, $request->getIp(), $request->getUserAgent());

        Response::json($result, 200);
    }

    public function logout(Request $request): void
    {
        $token = $request->getBearerToken();
        if ($token) {
            $this->authService->logout($token);
        }

        Response::json(['message' => 'Успешный выход из системы'], 200);
    }

    public function me(Request $request): void
    {
        $user = $request->requireUser();
        $data = $this->authService->getMe($user);

        Response::json($data, 200);
    }
}
