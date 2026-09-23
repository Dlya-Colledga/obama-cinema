-- Seeder 003: Demo Users, Profiles, Ratings, Comments, Bookmarks, and Watch Progress

-- Demo user: demo@obama.cinema / password123
-- Admin user: admin@obama.cinema / admin123
-- Moderator user: critic@obama.cinema / password123

INSERT INTO users (email, username, password_hash, role) VALUES
    ('demo@obama.cinema', 'cinema_fan', '$2y$12$K4L07f8obwRrNr/PiXBk.O3LMRQY5BTykkPCXQITFLWyim9YlZQbe', 'user'),
    ('admin@obama.cinema', 'obama_admin', '$2y$12$wRDTyVeL2fCM.YQppQ1G2.lzHnrGQSy5TnLMBorVYMRAm.IcMxZAi', 'admin'),
    ('critic@obama.cinema', 'film_critic', '$2y$12$K4L07f8obwRrNr/PiXBk.O3LMRQY5BTykkPCXQITFLWyim9YlZQbe', 'moderator')
ON CONFLICT (email) DO NOTHING;

-- Profiles
INSERT INTO profiles (user_id, avatar_url, bio, preferences)
SELECT id, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
       'Киноман со стажем, обожаю научную фантастику и триллеры.', '{"quality": "1080p", "autoplay": true}'::jsonb
FROM users WHERE email = 'demo@obama.cinema'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, avatar_url, bio, preferences)
SELECT id, 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
       'Главный редактор и администратор Obama Cinema.', '{"quality": "1080p"}'::jsonb
FROM users WHERE email = 'admin@obama.cinema'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, avatar_url, bio, preferences)
SELECT id, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
       'Профессиональный критик и любитель авторского кинематографа.', '{"quality": "1080p"}'::jsonb
FROM users WHERE email = 'critic@obama.cinema'
ON CONFLICT (user_id) DO NOTHING;

-- Ratings
INSERT INTO ratings (user_id, content_id, rating)
SELECT u.id, c.id, 10
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'interstellar-2014'
ON CONFLICT (user_id, content_id) DO UPDATE SET rating = EXCLUDED.rating;

INSERT INTO ratings (user_id, content_id, rating)
SELECT u.id, c.id, 10
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'breaking-bad-2008'
ON CONFLICT (user_id, content_id) DO UPDATE SET rating = EXCLUDED.rating;

INSERT INTO ratings (user_id, content_id, rating)
SELECT u.id, c.id, 9
FROM users u, contents c
WHERE u.email = 'critic@obama.cinema' AND c.slug = 'inception-2010'
ON CONFLICT (user_id, content_id) DO UPDATE SET rating = EXCLUDED.rating;

-- Comments
INSERT INTO comments (user_id, content_id, text)
SELECT u.id, c.id, 'Один из величайших научно-фантастических шедевров в истории кино! Музыка Ханса Циммера пробирает до мурашек каждый раз.'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'interstellar-2014'
ON CONFLICT DO NOTHING;

INSERT INTO comments (user_id, content_id, text)
SELECT u.id, c.id, 'Нолан в очередной раз доказал, что умеет работать со сложными многоуровневыми концепциями времени и гравитации.'
FROM users u, contents c
WHERE u.email = 'critic@obama.cinema' AND c.slug = 'interstellar-2014'
ON CONFLICT DO NOTHING;

INSERT INTO comments (user_id, content_id, text)
SELECT u.id, c.id, 'Брайан Крэнстон и Аарон Пол выдали невероятную актерскую игру. Сценарий держит в напряжении от первой до последней серии!'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'breaking-bad-2008'
ON CONFLICT DO NOTHING;

-- Bookmarks for demo user
INSERT INTO bookmarks (user_id, content_id, category)
SELECT u.id, c.id, 'favorite'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'interstellar-2014'
ON CONFLICT (user_id, content_id, category) DO NOTHING;

INSERT INTO bookmarks (user_id, content_id, category)
SELECT u.id, c.id, 'watching'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'breaking-bad-2008'
ON CONFLICT (user_id, content_id, category) DO NOTHING;

INSERT INTO bookmarks (user_id, content_id, category)
SELECT u.id, c.id, 'plan_to_watch'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'dune-part-two-2024'
ON CONFLICT (user_id, content_id, category) DO NOTHING;

-- Watch Progress for demo user (gives instant "Continue Watching" test on Home page!)
INSERT INTO watch_progress (user_id, content_id, episode_id, progress_seconds, duration_seconds, is_completed, last_watched_at)
SELECT u.id, c.id, NULL, 3600, 10140, false, now() - interval '2 hours'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'interstellar-2014'
ON CONFLICT (user_id, content_id, episode_id) DO UPDATE 
SET progress_seconds = EXCLUDED.progress_seconds,
    duration_seconds = EXCLUDED.duration_seconds,
    last_watched_at = EXCLUDED.last_watched_at;

-- Watch History for demo user
INSERT INTO watch_history (user_id, content_id, episode_id, watched_at)
SELECT u.id, c.id, NULL, now() - interval '2 hours'
FROM users u, contents c
WHERE u.email = 'demo@obama.cinema' AND c.slug = 'interstellar-2014';
