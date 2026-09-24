import re
from pydantic import EmailStr, field_validator, model_validator
from app.schemas.common import CamelModel
from app.schemas.user import UserResponse


class RegisterRequest(CamelModel):
    email: str
    username: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Email обязателен для заполнения")
        # Email format regex
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Некорректный формат email")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Имя пользователя обязательно")
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Имя пользователя должно содержать от 3 до 30 символов")
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError(
                "Имя пользователя может содержать только латинские буквы, цифры, _ и -"
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль должен содержать минимум 6 символов")
        return v


class LoginRequest(CamelModel):
    login: str | None = None
    email: str | None = None
    username: str | None = None
    password: str

    @model_validator(mode="after")
    def resolve_login(self) -> "LoginRequest":
        effective_login = (self.login or self.email or self.username or "").strip()
        if not effective_login:
            raise ValueError("Логин или email обязателен")
        self.login = effective_login
        return self

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError("Пароль обязателен")
        return v


class AuthResponse(CamelModel):
    token: str
    user: UserResponse
