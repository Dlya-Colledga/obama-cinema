import pytest
from pydantic import ValidationError

from app.core.security import sanitize_text
from app.providers.anixart.client import AnixartClient
from app.providers.anixart.parsers.anilibria import AnilibriaParser
from app.providers.anixart.parsers.kodik import KodikParser
from app.providers.anixart.parsers.resolver import StreamResolver
from app.repositories.content import ContentRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.bookmark import SetBookmarkRequest, VALID_BOOKMARK_CATEGORIES
from app.schemas.catalog import CatalogFilterParams
from app.schemas.rating import RateContentRequest
from app.services.anime import AnimeService


def test_validate_register_success() -> None:
    req = RegisterRequest(
        email="test@cinema.com",
        username="test_user",
        password="secret123",
    )
    assert req.email == "test@cinema.com"
    assert req.username == "test_user"
    assert req.password == "secret123"


def test_validate_register_invalid_email() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="invalid-email",
            username="test_user",
            password="secret123",
        )


def test_validate_register_short_password() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="valid@cinema.com",
            username="test_user",
            password="123",
        )


def test_validate_rating_range() -> None:
    assert RateContentRequest(rating=1).rating == 1
    assert RateContentRequest(rating=10).rating == 10
    assert RateContentRequest(rating=5).rating == 5

    with pytest.raises(ValidationError):
        RateContentRequest(rating=0)

    with pytest.raises(ValidationError):
        RateContentRequest(rating=11)


def test_validate_bookmark_categories() -> None:
    for cat in ["watching", "plan_to_watch", "completed", "dropped", "favorite"]:
        assert SetBookmarkRequest(content_id=1, category=cat).category == cat

    with pytest.raises(ValidationError):
        SetBookmarkRequest(content_id=1, category="invalid_category")


def test_sanitize_html_xss() -> None:
    raw = '<script>alert("xss")</script><b>Фильм огонь!</b>'
    sanitized = sanitize_text(raw)
    assert "<script>" not in sanitized
    assert "&lt;script&gt;" in sanitized


def test_catalog_filter_params() -> None:
    params = CatalogFilterParams(
        type="movie",
        genre="sci-fi",
        year_from=2010,
        year_to=2024,
        rating_from=7.5,
        sort="rating",
        page=2,
        limit=12,
    )
    assert params.type == "movie"
    assert params.genre == "sci-fi"
    assert params.page == 2
    assert params.limit == 12


def test_kodik_parser_supports() -> None:
    parser = KodikParser()
    assert parser.supports("https://kodikplayer.com/seria/123/abc/720p", "Kodik")
    assert parser.supports("https://kodik.info/video/456/def", "kodik")
    assert not parser.supports("https://youtube.com/watch?v=123", "YouTube")


def test_anilibria_parser_supports() -> None:
    parser = AnilibriaParser()
    assert parser.supports("https://anixart.libria.fun/public/iframe.php?id=8789&ep=1", "Libria")
    assert parser.supports("https://aniliberty.top/releases/123", "AniLibria")


@pytest.mark.asyncio
async def test_stream_resolver_fallback() -> None:
    resolver = StreamResolver()
    streams = await resolver.resolve("https://embed.external-player.com/watch/999", "ExternalPlayer", "AniDUB")
    assert len(streams) > 0
    first = streams[0]
    assert first["playerType"] == "iframe"
    assert first["streamUrl"] == "https://embed.external-player.com/watch/999"
    assert first["translationTitle"] == "AniDUB"


def test_anime_service_normalize_release() -> None:
    client = AnixartClient()
    resolver = StreamResolver()
    service = AnimeService(client, resolver)

    raw = {
        "id": 16648,
        "title_ru": "Магическая битва",
        "title_original": "Jujutsu Kaisen",
        "year": "2020",
        "genres": "экшен, сёнен, фэнтези",
        "grade": 4.75,
        "poster": "poster_hash_123",
        "episodes_total": 24,
        "episodes_released": 24,
        "studio": "MAPPA",
    }

    normalized = service.normalize_release(raw, extended=True)
    assert normalized["title"] == "Магическая битва"
    assert normalized["titleOriginal"] == "Jujutsu Kaisen"
    assert normalized["rating"] == 9.5  # 4.75 * 2 = 9.5
    assert normalized["posterUrl"] == "https://s.anixmirai.com/posters/poster_hash_123.jpg"
    assert len(normalized["genres"]) == 3
    assert normalized["genres"][0] == "экшен"


def test_extract_youtube_id() -> None:
    samples = {
        "https://www.youtube.com/watch?v=qpFcQ1Bek08": "qpFcQ1Bek08",
        "https://youtu.be/qpFcQ1Bek08": "qpFcQ1Bek08",
        "http://youtube.com/embed/qpFcQ1Bek08": "qpFcQ1Bek08",
        "https://youtu.be/TLmRzMmyYok?si=12345": "TLmRzMmyYok",
        "https://www.youtube.com/watch?v=b9EkMc79ZSU&t=30s": "b9EkMc79ZSU",
    }

    for url, expected in samples.items():
        assert AnimeService.extract_youtube_id(url) == expected
        assert ContentRepository.extract_youtube_id(url) == expected

    assert AnimeService.extract_youtube_id("https://vk.com/video12345") is None


@pytest.mark.asyncio
async def test_anime_service_filters_trailers() -> None:
    class FakeClient(AnixartClient):
        async def get_release_videos(self, release_id: int) -> dict:
            return {
                "code": 0,
                "last_videos": [
                    {
                        "category": {"id": 3, "name": "Опенинги"},
                        "hosting": {"id": 2, "name": "YouTube"},
                        "title": "Opening 1",
                        "url": "https://youtu.be/OP111111111",
                    },
                    {
                        "category": {"id": 4, "name": "Эндинги"},
                        "hosting": {"id": 2, "name": "YouTube"},
                        "title": "Ending 1",
                        "url": "https://youtu.be/ED222222222",
                    },
                    {
                        "category": {"id": 1, "name": "Трейлеры"},
                        "hosting": {"id": 3, "name": "ВКонтакте"},
                        "title": "Трейлер в ВК",
                        "url": "https://vk.com/video-12345_67890",
                    },
                    {
                        "category": {"id": 1, "name": "Трейлеры"},
                        "hosting": {"id": 2, "name": "YouTube"},
                        "title": "Главный трейлер",
                        "url": "https://youtu.be/TLmRzMmyYok",
                    },
                ],
            }

    service = AnimeService(FakeClient(), StreamResolver())
    trailer_id = await service.get_trailer_youtube_id(12345)
    assert trailer_id == "TLmRzMmyYok"
