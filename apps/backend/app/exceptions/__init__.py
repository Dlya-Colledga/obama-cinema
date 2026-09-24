from typing import Any


class AppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "ERROR",
        details: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}


class ValidationException(AppException):
    def __init__(
        self,
        message: str = "Ошибка валидации",
        details: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=422,
            code="VALIDATION_ERROR",
            details=details,
        )


class AuthenticationException(AppException):
    def __init__(self, message: str = "Необходима авторизация") -> None:
        super().__init__(
            message=message,
            status_code=401,
            code="UNAUTHORIZED",
        )


class AuthorizationException(AppException):
    def __init__(self, message: str = "Доступ запрещен") -> None:
        super().__init__(
            message=message,
            status_code=403,
            code="FORBIDDEN",
        )


class NotFoundException(AppException):
    def __init__(self, message: str = "Ресурс не найден") -> None:
        super().__init__(
            message=message,
            status_code=404,
            code="NOT_FOUND",
        )


class ConflictException(AppException):
    def __init__(self, message: str = "Конфликт данных") -> None:
        super().__init__(
            message=message,
            status_code=409,
            code="CONFLICT",
        )
