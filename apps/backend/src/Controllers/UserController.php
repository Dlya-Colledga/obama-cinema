<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\UpdateProfileDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\AuthService;

final class UserController
{
    public function __construct(
        private AuthService $authService
    ) {}

    public function profile(Request $request): void
    {
        $user = $request->requireUser();
        $data = $this->authService->getMe($user);

        Response::json($data, 200);
    }

    public function updateProfile(Request $request): void
    {
        $user = $request->requireUser();
        $dto = UpdateProfileDTO::fromArray($request->body);

        $updated = $this->authService->updateProfile($user, $dto);

        Response::json($updated, 200);
    }
}
