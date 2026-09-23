-- Seeder 001: Content Types, Genres, Countries, and Providers

INSERT INTO content_types (code, name) VALUES
    ('movie', 'Фильмы'),
    ('series', 'Сериалы'),
    ('anime', 'Аниме'),
    ('cartoon', 'Мультфильмы'),
    ('donghua', 'Донхуа'),
    ('dorama', 'Дорамы')
ON CONFLICT (code) DO NOTHING;

INSERT INTO genres (slug, name) VALUES
    ('action', 'Боевик'),
    ('drama', 'Драма'),
    ('comedy', 'Комедия'),
    ('sci-fi', 'Фантастика'),
    ('thriller', 'Триллер'),
    ('adventure', 'Приключения'),
    ('fantasy', 'Фэнтези'),
    ('detective', 'Детектив'),
    ('crime', 'Криминал'),
    ('romance', 'Мелодрама'),
    ('horror', 'Ужасы'),
    ('animation', 'Анимация'),
    ('mystery', 'Мистика')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (code, name) VALUES
    ('US', 'США'),
    ('RU', 'Россия'),
    ('JP', 'Япония'),
    ('KR', 'Южная Корея'),
    ('CN', 'Китай'),
    ('GB', 'Великобритания'),
    ('FR', 'Франция'),
    ('DE', 'Германия')
ON CONFLICT (code) DO NOTHING;

INSERT INTO providers (code, name, base_url, is_active, priority) VALUES
    ('demo_stream', 'Obama Direct Stream (HLS/MP4)', 'https://commondatastorage.googleapis.com', true, 1),
    ('embed_player', 'Obama Cinema Embed Engine', 'https://www.youtube.com', true, 2)
ON CONFLICT (code) DO NOTHING;
