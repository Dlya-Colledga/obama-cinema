import pytest
from pydantic import ValidationError

from app.core.security import sanitize_text
from app.providers.kodik.client import KodikClient
from app.providers.kodik.provider import KodikStreamProvider
from app.providers.shikimori.client import ShikimoriClient
from app.repositories.content import ContentRepository
from app.schemas.auth import RegisterRequest
from app.schemas.bookmark import SetBookmarkRequest
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


def test_kodik_provider_is_generalized() -> None:
    """Ensure Kodik is not restricted to anime and supports all media types."""
    provider = KodikStreamProvider(content_repo=None, kodik_client=KodikClient())
    # Supports movies, series, cartoons, anime, doramas, donghuas
    assert provider.supports("movie")
    assert provider.supports("series")
    assert provider.supports("cartoon")
    assert provider.supports("anime")
    assert provider.supports("donghua")
    assert provider.supports("dorama")
    assert provider.get_identifier() == "kodik"


def test_extract_youtube_id() -> None:
    samples = {
        "https://www.youtube.com/watch?v=qpFcQ1Bek08": "qpFcQ1Bek08",
        "https://youtu.be/qpFcQ1Bek08": "qpFcQ1Bek08",
        "http://youtube.com/embed/qpFcQ1Bek08": "qpFcQ1Bek08",
        "https://youtu.be/TLmRzMmyYok?si=12345": "TLmRzMmyYok",
        "https://www.youtube.com/watch?v=b9EkMc79ZSU&t=30s": "b9EkMc79ZSU",
    }

    for url, expected in samples.items():
        assert ShikimoriClient.extract_youtube_id(url) == expected
        assert ContentRepository.extract_youtube_id(url) == expected

    assert ShikimoriClient.extract_youtube_id("https://vk.com/video12345") is None


def test_strict_youtube_trailer_filtering() -> None:
    """Ensure only YouTube trailers are returned, strictly rejecting VK, openings, endings, etc."""
    raw_videos = [
        {
            "kind": "op",
            "hosting": "youtube",
            "name": "Opening 1",
            "url": "https://youtu.be/OP111111111",
        },
        {
            "kind": "ed",
            "hosting": "youtube",
            "name": "Ending 1",
            "url": "https://youtu.be/ED222222222",
        },
        {
            "kind": "pv",
            "hosting": "vk",
            "name": "Трейлер VK",
            "url": "https://vk.com/video-12345_67890",
        },
        {
            "kind": "pv",
            "hosting": "smotret_anime",
            "name": "Трейлер Smotret",
            "url": "https://smotret-anime.online/video/123",
        },
        {
            "kind": "pv",
            "hosting": "youtube",
            "name": "Официальный трейлер",
            "url": "https://youtu.be/nk2BHu3Mbes",
        },
    ]

    yt_id, yt_url = ShikimoriClient.extract_strict_youtube_trailer(raw_videos)
    assert yt_id == "nk2BHu3Mbes"
    assert yt_url == "https://www.youtube.com/watch?v=nk2BHu3Mbes"


def test_anime_service_normalize_release() -> None:
    shiki = ShikimoriClient()
    kodik = KodikClient()
    service = AnimeService(shiki, kodik)

    raw_shiki = {
        "id": 16498,
        "name": "Shingeki no Kyojin",
        "russian": "Атака титанов",
        "image": {
            "original": "/system/animes/original/16498.jpg",
            "preview": "/system/animes/preview/16498.jpg",
        },
        "score": "8.58",
        "aired_on": "2013-04-07",
        "episodes": 25,
        "episodes_aired": 25,
        "duration": 24,
        "status": "released",
        "genres": [
            {"id": 1, "name": "Action", "russian": "Экшен"},
            {"id": 8, "name": "Drama", "russian": "Драма"},
        ],
        "studios": [{"id": 35, "name": "Wit Studio"}],
        "description": "[b]С давних времён[/b] человечество ведёт борьбу с титанами.",
    }

    normalized = service.normalize_release(raw_shiki, extended=True)
    assert normalized["id"] == 16498
    assert normalized["title"] == "Атака титанов"
    assert normalized["titleOriginal"] == "Shingeki no Kyojin"
    assert normalized["year"] == 2013
    assert normalized["rating"] == 8.6
    assert normalized["grade5"] == 4.3
    assert normalized["episodesTotal"] == 25
    assert normalized["studio"] == "Wit Studio"
    assert normalized["status"] == "Завершён"
    assert normalized["posterUrl"] == "https://shikimori.io/system/animes/original/16498.jpg"
    assert "[b]" not in normalized["description"]
    assert "С давних времён" in normalized["description"]
    assert len(normalized["genres"]) == 2
    assert "Экшен" in normalized["genres"]


def test_stream_source_schema_skip_segments() -> None:
    """Ensure StreamSourceSchema properly includes and serializes skipSegments."""
    from app.schemas.content import StreamSourceSchema

    source = StreamSourceSchema(
        id=5114001,
        provider="Obama Cinema Player",
        provider_code="kodik",
        player_type="hls",
        stream_url="https://cloud.solodcdn.com/test.m3u8",
        quality="720p",
        translation_title="Плеер Obama Cinema (HLS)",
        skip_segments=[[85, 170]],
    )
    dumped = source.model_dump(by_alias=True)
    assert dumped["id"] == 5114001
    assert dumped["playerType"] == "hls"
    assert dumped["skipSegments"] == [[85, 170]]
    assert dumped["translationTitle"] == "Плеер Obama Cinema (HLS)"
