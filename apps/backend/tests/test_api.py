import time
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_healthcheck(client: AsyncClient) -> None:
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_auth_and_security(client: AsyncClient) -> None:
    ts = int(time.time() * 1000)
    email = f"test_{ts}@cinema.test"
    username = f"user_{ts}"
    password = "SuperPassword123!"

    # 1. Short password rejection
    res = await client.post(
        "/auth/register",
        json={"email": f"short_{ts}@test.com", "username": f"short_{ts}", "password": "123"},
    )
    assert res.status_code == 422

    # 2. Invalid email rejection
    res = await client.post(
        "/auth/register",
        json={"email": "not-an-email", "username": f"bademail_{ts}", "password": password},
    )
    assert res.status_code == 422

    # 3. Successful registration
    res = await client.post(
        "/auth/register",
        json={"email": email, "username": username, "password": password},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    token = body["data"]["token"]
    assert token

    # 4. Duplicate registration conflict
    res = await client.post(
        "/auth/register",
        json={"email": email, "username": f"dup_{ts}", "password": password},
    )
    assert res.status_code == 409

    # 5. Login wrong password
    res = await client.post(
        "/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert res.status_code == 401

    # 6. Login correct credentials
    res = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200
    login_body = res.json()
    assert login_body["success"] is True
    assert login_body["data"]["token"]

    # 7. Access /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    me_body = res.json()
    assert me_body["data"]["email"] == email

    # 8. Access /auth/me without token -> 401
    res = await client.get("/auth/me")
    assert res.status_code == 401

    # 9. Logout
    res = await client.post("/auth/logout", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_user_profile(client: AsyncClient) -> None:
    ts = int(time.time() * 1000)
    email = f"prof_{ts}@cinema.test"
    username = f"prof_{ts}"
    password = "SuperPassword123!"

    res = await client.post(
        "/auth/register",
        json={"email": email, "username": username, "password": password},
    )
    token = res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get profile
    res = await client.get("/users/profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["username"] == username

    # Update profile
    res = await client.put(
        "/users/profile",
        json={"bio": "Киноман со стажем", "avatarUrl": "https://example.com/avatar.jpg"},
        headers=headers,
    )
    assert res.status_code == 200
    prof = res.json()["data"]["profile"]
    assert prof["bio"] == "Киноман со стажем"
    assert prof["avatarUrl"] == "https://example.com/avatar.jpg"


@pytest.mark.asyncio
async def test_catalog_and_filtering(client: AsyncClient) -> None:
    # 1. Catalog list
    res = await client.get("/catalog")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    assert "meta" in body

    # 2. Filters meta
    res = await client.get("/filters/meta")
    assert res.status_code == 200
    tax = res.json()["data"]
    assert "types" in tax
    assert "genres" in tax
    assert "countries" in tax

    # 3. Featured
    res = await client.get("/catalog/featured")
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)

    # 4. SQL Injection safety
    res = await client.get("/catalog", params={"q": "' OR 1=1 --"})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_content_and_seasons(client: AsyncClient) -> None:
    # Get first catalog item
    cat_res = await client.get("/catalog")
    items = cat_res.json()["data"]
    if not items:
        pytest.skip("No catalog items seeded")

    first = items[0]
    slug = first["slug"]
    content_id = first["id"]

    # 1. Content details by slug
    res = await client.get(f"/content/{slug}")
    assert res.status_code == 200
    assert res.json()["data"]["id"] == content_id

    # 2. Seasons
    res = await client.get(f"/content/{content_id}/seasons")
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)

    # 3. Sources
    res = await client.get(f"/content/{content_id}/sources")
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)


@pytest.mark.asyncio
async def test_comments_and_idor(client: AsyncClient) -> None:
    cat_res = await client.get("/catalog")
    items = cat_res.json()["data"]
    if not items:
        pytest.skip("No catalog items seeded")
    content_id = items[0]["id"]

    ts = int(time.time() * 1000)
    # Register author
    res1 = await client.post(
        "/auth/register",
        json={"email": f"cauthor_{ts}@test.com", "username": f"cauth_{ts}", "password": "Password123!"},
    )
    token1 = res1.json()["data"]["token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register intruder
    res2 = await client.post(
        "/auth/register",
        json={"email": f"cintruder_{ts}@test.com", "username": f"cintr_{ts}", "password": "Password123!"},
    )
    token2 = res2.json()["data"]["token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 1. Create comment with XSS
    xss_payload = '<script>alert("xss")</script><b>Потрясающее произведение!</b>'
    res = await client.post(
        f"/content/{content_id}/comments",
        json={"content": xss_payload},
        headers=headers1,
    )
    assert res.status_code == 201
    cdata = res.json()["data"]
    comment_id = cdata["id"]
    assert "<script>" not in cdata["content"]
    assert "&lt;script&gt;" in cdata["content"]

    # 2. Update comment by author
    res = await client.put(
        f"/comments/{comment_id}",
        json={"content": "Обновлённый комментарий: шедевр!"},
        headers=headers1,
    )
    assert res.status_code == 200
    assert "шедевр" in res.json()["data"]["content"]

    # 3. Intruder attempts to edit -> 403 Forbidden
    res = await client.put(
        f"/comments/{comment_id}",
        json={"content": "Взлом чужого комментария"},
        headers=headers2,
    )
    assert res.status_code == 403

    # 4. Author deletes comment
    res = await client.delete(f"/comments/{comment_id}", headers=headers1)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_ratings_and_bookmarks(client: AsyncClient) -> None:
    cat_res = await client.get("/catalog")
    items = cat_res.json()["data"]
    if not items:
        pytest.skip("No catalog items seeded")
    content_id = items[0]["id"]

    ts = int(time.time() * 1000)
    res = await client.post(
        "/auth/register",
        json={"email": f"rate_{ts}@test.com", "username": f"rate_{ts}", "password": "Password123!"},
    )
    token = res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Rate content
    res = await client.post(
        f"/content/{content_id}/ratings",
        json={"rating": 9},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["userRating"] == 9

    # 2. Invalid rating (> 10)
    res = await client.post(
        f"/content/{content_id}/ratings",
        json={"rating": 15},
        headers=headers,
    )
    assert res.status_code == 422

    # 3. Delete rating
    res = await client.delete(f"/content/{content_id}/ratings", headers=headers)
    assert res.status_code == 200

    # 4. Add bookmark
    res = await client.post(
        "/bookmarks",
        json={"content_id": content_id, "category": "watching"},
        headers=headers,
    )
    assert res.status_code in (200, 201)

    # 5. Get bookmarks
    res = await client.get("/bookmarks", headers=headers)
    assert res.status_code == 200
    b_items = res.json()["data"]
    assert len(b_items) > 0
    assert b_items[0]["category"] == "watching"

    # 6. Delete bookmark
    res = await client.delete(f"/bookmarks/{content_id}", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_watch_progress_and_history(client: AsyncClient) -> None:
    cat_res = await client.get("/catalog")
    items = cat_res.json()["data"]
    if not items:
        pytest.skip("No catalog items seeded")
    content_id = items[0]["id"]

    ts = int(time.time() * 1000)
    res = await client.post(
        "/auth/register",
        json={"email": f"watch_{ts}@test.com", "username": f"watch_{ts}", "password": "Password123!"},
    )
    token = res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Save progress
    res = await client.post(
        "/watch/progress",
        json={
            "content_id": content_id,
            "progress_seconds": 300,
            "duration_seconds": 1200,
        },
        headers=headers,
    )
    assert res.status_code == 200

    # 2. Get unfinished
    res = await client.get("/watch/unfinished", headers=headers)
    assert res.status_code == 200
    unfinished = res.json()["data"]
    assert len(unfinished) > 0
    assert unfinished[0]["contentId"] == content_id

    # 3. Get history
    res = await client.get("/watch/history", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0

    # 4. Clear history
    res = await client.delete("/watch/history", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_anime_anixart_api(client: AsyncClient) -> None:
    # 1. Popular anime
    res = await client.get("/anime/popular")
    assert res.status_code == 200
    pop = res.json()["data"]
    assert "data" in pop
    releases = pop["data"]
    assert len(releases) > 0
    first = releases[0]
    assert "id" in first
    assert "title" in first
    assert "rating" in first

    # 2. Search anime
    res = await client.get("/anime/search", params={"q": "Наруто"})
    assert res.status_code == 200
    search_data = res.json()["data"]["data"]
    has_naruto = any(
        "Наруто" in (a.get("title") or "") or "Naruto" in (a.get("titleOriginal") or "")
        for a in search_data
    )
    assert has_naruto

    # 3. Single release details (Naruto 609)
    res = await client.get("/anime/609")
    assert res.status_code == 200
    naruto = res.json()["data"]
    assert naruto["id"] == 609
    assert naruto["studio"] == "Studio Pierrot"
    assert len(naruto.get("screenshots") or []) > 0

    # 4. Dubbers
    res = await client.get("/anime/609/dubbers")
    assert res.status_code == 200
    dubbers = res.json()["data"]
    assert any(d.get("name") == "2x2" for d in dubbers)

    # 5. Episodes
    res = await client.get("/anime/609/episodes")
    assert res.status_code == 200
    ep_data = res.json()["data"]
    episodes = ep_data.get("episodes", [])
    assert len(episodes) == 220

    # 6. Streams
    res = await client.get("/anime/609/streams", params={"position": 1})
    assert res.status_code == 200
    streams = res.json()["data"]
    assert len(streams) > 0

    # 7. Universal content endpoints
    res = await client.get("/content/anime-609")
    assert res.status_code == 200
    assert res.json()["data"]["slug"] == "anime-609"

    res = await client.get("/content/609/seasons")
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0

    res = await client.get("/content/609/sources", params={"episode_id": 1})
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0
