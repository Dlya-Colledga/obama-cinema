<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ValidationException extends HttpException
{
    public function __construct(string $message = 'Неверные данные запроса', array $details = [])
    {
        parent::__construct($message, 422, 'VALIDATION_ERROR', $details);
    }
}
