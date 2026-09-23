<?php

declare(strict_types=1);

namespace App\Validators;

use App\DTO\RegisterDTO;
use App\DTO\LoginDTO;
use App\Exceptions\ValidationException;

final class Validator
{
    public static function validateRegister(RegisterDTO $dto): void
    {
        $errors = [];

        if (empty($dto->email)) {
            $errors['email'][] = 'Email обязателен для заполнения';
        } elseif (!filter_var($dto->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'][] = 'Некорректный формат email';
        }

        if (empty($dto->username)) {
            $errors['username'][] = 'Имя пользователя обязательно';
        } elseif (mb_strlen($dto->username) < 3 || mb_strlen($dto->username) > 30) {
            $errors['username'][] = 'Имя пользователя должно содержать от 3 до 30 символов';
        } elseif (!preg_match('/^[a-zA-Z0-9_\-]+$/', $dto->username)) {
            $errors['username'][] = 'Имя пользователя может содержать только латинские буквы, цифры, _ и -';
        }

        if (empty($dto->password)) {
            $errors['password'][] = 'Пароль обязателен';
        } elseif (mb_strlen($dto->password) < 6) {
            $errors['password'][] = 'Пароль должен содержать минимум 6 символов';
        }

        if (!empty($errors)) {
            throw new ValidationException('Ошибка валидации при регистрации', $errors);
        }
    }

    public static function validateLogin(LoginDTO $dto): void
    {
        $errors = [];

        if (empty($dto->login)) {
            $errors['login'][] = 'Логин или email обязателен';
        }

        if (empty($dto->password)) {
            $errors['password'][] = 'Пароль обязателен';
        }

        if (!empty($errors)) {
            throw new ValidationException('Ошибка валидации при входе', $errors);
        }
    }

    public static function validateComment(string $text): void
    {
        $errors = [];
        $len = mb_strlen(trim($text));

        if ($len < 2) {
            $errors['text'][] = 'Комментарий не может быть короче 2 символов';
        } elseif ($len > 3000) {
            $errors['text'][] = 'Комментарий не может превышать 3000 символов';
        }

        if (!empty($errors)) {
            throw new ValidationException('Ошибка валидации комментария', $errors);
        }
    }

    public static function validateRating(int $rating): void
    {
        if ($rating < 1 || $rating > 10) {
            throw new ValidationException('Ошибка валидации оценки', [
                'rating' => ['Оценка должна быть целым числом от 1 до 10']
            ]);
        }
    }

    public static function validateBookmarkCategory(string $category): void
    {
        $allowed = ['watching', 'plan_to_watch', 'completed', 'dropped', 'favorite'];
        if (!in_array($category, $allowed, true)) {
            throw new ValidationException('Ошибка валидации категории закладки', [
                'category' => ['Недопустимая категория закладки']
            ]);
        }
    }

    public static function sanitizeText(string $input): string
    {
        return htmlspecialchars(trim($input), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
