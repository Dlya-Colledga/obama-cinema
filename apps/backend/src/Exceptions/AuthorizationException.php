<?php

declare(strict_types=1);

namespace App\Exceptions;

final class AuthorizationException extends HttpException
{
    public function __construct(string $message = 'Доступ запрещен')
    {
        parent::__construct($message, 403, 'FORBIDDEN');
    }
}
