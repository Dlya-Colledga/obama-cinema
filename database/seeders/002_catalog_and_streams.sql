-- Seeder 002: Catalog, Seasons, Episodes, and Stream Sources

-- 1. Movies
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'movie'),
    'Интерстеллар',
    'Interstellar',
    'interstellar-2014',
    'Когда засуха, пыльные бури и вымирание растений приводят человечество к продовольственному кризису, коллектив исследователей и учёных отправляется сквозь червоточину в поисках новой обитаемой планеты.',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    2014, '16+', 169, true, 8.9, 1250
),
(
    (SELECT id FROM content_types WHERE code = 'movie'),
    'Начало',
    'Inception',
    'inception-2010',
    'Кобб — непревзойденный вор, лучший из лучших в опасном искусстве извлечения: он крадет ценные секреты из глубин подсознания во время сна, когда человеческий разум наиболее уязвим.',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    2010, '16+', 148, true, 8.8, 980
),
(
    (SELECT id FROM content_types WHERE code = 'movie'),
    'Дюна: Часть вторая',
    'Dune: Part Two',
    'dune-part-two-2024',
    'Пол Атрейдес объединяется с Чани и фременами, чтобы отомстить заговорщикам, уничтожившим его семью. Стоя перед выбором между любовью всей жизни и судьбой вселенной, он пытается предотвратить кошмарное будущее.',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    2024, '16+', 166, true, 8.6, 640
) ON CONFLICT (slug) DO NOTHING;

-- 2. Series
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'series'),
    'Во все тяжкие',
    'Breaking Bad',
    'breaking-bad-2008',
    'Школьный учитель химии Уолтер Уайт узнаёт, что болен раком лёгких. Чтобы обеспечить будущее семьи, он решает заняться производством метамфетамина со своим бывшим учеником Джесси Пинкманом.',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80',
    2008, '18+', NULL, true, 9.5, 2300
),
(
    (SELECT id FROM content_types WHERE code = 'series'),
    'Очень странные дела',
    'Stranger Things',
    'stranger-things-2016',
    '1980-е годы, тихий провинциальный американский городок. Загадочное исчезновение подростка по имени Уилл нарушает спокойную жизнь города. Друзья пропавшего начинают собственное расследование.',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    2016, '16+', NULL, false, 8.7, 1400
) ON CONFLICT (slug) DO NOTHING;

-- 3. Anime
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'anime'),
    'Атака титанов',
    'Shingeki no Kyojin',
    'attack-on-titan-2013',
    'Человечество живёт за огромными стенами, защищающими от гигантских людоедов — титанов. Но однажды неприступная стена падает, и юный Эрен Йегер клянётся истребить всех титанов до единого.',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80',
    2013, '18+', 24, true, 9.1, 3100
),
(
    (SELECT id FROM content_types WHERE code = 'anime'),
    'Клинок, рассекающий демонов',
    'Kimetsu no Yaiba',
    'demon-slayer-2019',
    'Эпоха Тайсё. Тандзиро Камадо возвращается домой и находит свою семью убитой демоном, а сестру Нэдзуко — обращённой в чудовище. Юноша решает стать мечником, чтобы спасти сестру.',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1600&q=80',
    2019, '16+', 24, false, 8.8, 1850
) ON CONFLICT (slug) DO NOTHING;

-- 4. Cartoons
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'cartoon'),
    'Человек-паук: Паутина вселенных',
    'Spider-Man: Across the Spider-Verse',
    'spider-man-across-the-spider-verse-2023',
    'Майлз Моралес отправляется в путешествие по Мультивселенной, где встречает команду Людей-пауков, защищающих само существование миров. Но когда герои сталкиваются во взглядах, Майлзу приходится бросить им вызов.',
    'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80',
    2023, '12+', 140, true, 8.9, 1500
) ON CONFLICT (slug) DO NOTHING;

-- 5. Donghua
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'donghua'),
    'Боевой континент',
    'Douluo Dalu',
    'soul-land-2018',
    'Тан Сань, ученик элитной школы боевых искусств клана Тан, перерождается в удивительном мире Боевого Континента, где каждый человек обладает духовной силой и собственным Духом.',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80',
    2018, '16+', 20, false, 8.5, 720
) ON CONFLICT (slug) DO NOTHING;

-- 6. Doramas
INSERT INTO contents (
    content_type_id, title, original_title, slug, description, poster_url, banner_url,
    release_year, age_rating, duration_minutes, is_featured, rating_cache, votes_count
) VALUES
(
    (SELECT id FROM content_types WHERE code = 'dorama'),
    'Игра в кальмара',
    'Squid Game',
    'squid-game-2021',
    '456 отчаявшихся людей с финансовыми трудностями получают таинственное приглашение сыграть в серию детских игр за приз в 45,6 миллиарда вон. Однако проигрыш означает мгновенную смерть.',
    'https://images.unsplash.com/photo-1634157703702-3c124b455499?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    2021, '18+', NULL, true, 8.4, 2100
) ON CONFLICT (slug) DO NOTHING;

-- Link Genres
INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g
WHERE (c.slug = 'interstellar-2014' AND g.slug IN ('sci-fi', 'drama', 'adventure'))
   OR (c.slug = 'inception-2010' AND g.slug IN ('sci-fi', 'action', 'thriller'))
   OR (c.slug = 'dune-part-two-2024' AND g.slug IN ('sci-fi', 'action', 'adventure'))
   OR (c.slug = 'breaking-bad-2008' AND g.slug IN ('crime', 'drama', 'thriller'))
   OR (c.slug = 'stranger-things-2016' AND g.slug IN ('sci-fi', 'horror', 'drama'))
   OR (c.slug = 'attack-on-titan-2013' AND g.slug IN ('animation', 'action', 'fantasy'))
   OR (c.slug = 'demon-slayer-2019' AND g.slug IN ('animation', 'action', 'fantasy'))
   OR (c.slug = 'spider-man-across-the-spider-verse-2023' AND g.slug IN ('animation', 'action', 'adventure'))
   OR (c.slug = 'soul-land-2018' AND g.slug IN ('animation', 'action', 'fantasy'))
   OR (c.slug = 'squid-game-2021' AND g.slug IN ('thriller', 'drama', 'detective'))
ON CONFLICT DO NOTHING;

-- Link Countries
INSERT INTO content_countries (content_id, country_id)
SELECT c.id, ct.id FROM contents c, countries ct
WHERE (c.slug IN ('interstellar-2014', 'inception-2010', 'dune-part-two-2024', 'breaking-bad-2008', 'stranger-things-2016', 'spider-man-across-the-spider-verse-2023') AND ct.code = 'US')
   OR (c.slug IN ('attack-on-titan-2013', 'demon-slayer-2019') AND ct.code = 'JP')
   OR (c.slug = 'soul-land-2018' AND ct.code = 'CN')
   OR (c.slug = 'squid-game-2021' AND ct.code = 'KR')
ON CONFLICT DO NOTHING;

-- Seasons & Episodes for 'Breaking Bad'
INSERT INTO seasons (content_id, season_number, title, release_year)
SELECT id, 1, 'Сезон 1: Начало пути', 2008 FROM contents WHERE slug = 'breaking-bad-2008'
ON CONFLICT DO NOTHING;

INSERT INTO episodes (season_id, content_id, episode_number, title, duration_minutes)
SELECT s.id, s.content_id, ep.num, ep.t, 48
FROM seasons s
JOIN contents c ON s.content_id = c.id
CROSS JOIN (VALUES 
    (1, 'Пилотная серия (Pilot)'),
    (2, 'Кот в мешке (Cat''s in the Bag...)'),
    (3, 'И мешок в реке (...And the Bag''s in the River)'),
    (4, 'Раковый больной (Cancer Man)'),
    (5, 'Серые кардиналы (Gray Matter)'),
    (6, 'Сумасшедшая горсть ничего (Crazy Handful of Nothin'')'),
    (7, 'Нестандартное соглашение (A No-Rough-Stuff-Type Deal)')
) AS ep(num, t)
WHERE c.slug = 'breaking-bad-2008' AND s.season_number = 1
ON CONFLICT DO NOTHING;

-- Seasons & Episodes for 'Attack on Titan'
INSERT INTO seasons (content_id, season_number, title, release_year)
SELECT id, 1, 'Сезон 1: Падение Сигансины', 2013 FROM contents WHERE slug = 'attack-on-titan-2013'
ON CONFLICT DO NOTHING;

INSERT INTO episodes (season_id, content_id, episode_number, title, duration_minutes)
SELECT s.id, s.content_id, ep.num, ep.t, 24
FROM seasons s
JOIN contents c ON s.content_id = c.id
CROSS JOIN (VALUES 
    (1, 'Тебе, спустя 2000 лет: Падение Сигансины, часть 1'),
    (2, 'Тот день: Падение Сигансины, часть 2'),
    (3, 'Тусклый свет посреди отчаяния'),
    (4, 'Ночь выпускной церемонии'),
    (5, 'Первая битва: Оборона Троста, часть 1')
) AS ep(num, t)
WHERE c.slug = 'attack-on-titan-2013' AND s.season_number = 1
ON CONFLICT DO NOTHING;

-- Stream Sources for Movies (Direct MP4 / HLS streams ready for instant playback)
INSERT INTO provider_sources (
    content_id, episode_id, provider_id, stream_url, player_type, quality, translation_title
)
SELECT 
    c.id, NULL, p.id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'mp4', '1080p', 'Дубляж (Red Head Sound)'
FROM contents c, providers p
WHERE c.slug = 'interstellar-2014' AND p.code = 'demo_stream'
ON CONFLICT DO NOTHING;

INSERT INTO provider_sources (
    content_id, episode_id, provider_id, stream_url, player_type, quality, translation_title
)
SELECT 
    c.id, NULL, p.id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'mp4', '1080p', 'Оригинал (Subtitles)'
FROM contents c, providers p
WHERE c.slug = 'inception-2010' AND p.code = 'demo_stream'
ON CONFLICT DO NOTHING;

INSERT INTO provider_sources (
    content_id, episode_id, provider_id, stream_url, player_type, quality, translation_title
)
SELECT 
    c.id, NULL, p.id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'mp4', '1080p', 'Дубляж (Line Dub)'
FROM contents c, providers p
WHERE c.slug = 'dune-part-two-2024' AND p.code = 'demo_stream'
ON CONFLICT DO NOTHING;

-- Stream sources for Episodes of Breaking Bad & Attack on Titan
INSERT INTO provider_sources (
    content_id, episode_id, provider_id, stream_url, player_type, quality, translation_title
)
SELECT 
    e.content_id, e.id, p.id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'mp4', '1080p', 'Дубляж LostFilm'
FROM episodes e
JOIN contents c ON e.content_id = c.id
CROSS JOIN providers p
WHERE c.slug = 'breaking-bad-2008' AND p.code = 'demo_stream'
ON CONFLICT DO NOTHING;

INSERT INTO provider_sources (
    content_id, episode_id, provider_id, stream_url, player_type, quality, translation_title
)
SELECT 
    e.content_id, e.id, p.id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'mp4', '1080p', 'Озвучка Studio Band'
FROM episodes e
JOIN contents c ON e.content_id = c.id
CROSS JOIN providers p
WHERE c.slug = 'attack-on-titan-2013' AND p.code = 'demo_stream'
ON CONFLICT DO NOTHING;
