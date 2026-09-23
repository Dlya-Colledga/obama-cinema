-- Migration 001: Initial Schema (Media Catalog & Providers)

CREATE TABLE IF NOT EXISTS content_types (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS countries (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_type_id INT NOT NULL REFERENCES content_types(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    original_title TEXT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    banner_url TEXT,
    release_year INT NOT NULL CHECK (release_year BETWEEN 1890 AND 2100),
    age_rating TEXT NOT NULL DEFAULT '16+',
    duration_minutes INT,
    rating_cache NUMERIC(3, 1) NOT NULL DEFAULT 0.0 CHECK (rating_cache BETWEEN 0.0 AND 10.0),
    votes_count INT NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_genres (
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, genre_id)
);

CREATE TABLE IF NOT EXISTS content_countries (
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    country_id INT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, country_id)
);

CREATE TABLE IF NOT EXISTS seasons (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    season_number INT NOT NULL CHECK (season_number > 0),
    title TEXT,
    release_year INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (content_id, season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    episode_number INT NOT NULL CHECK (episode_number > 0),
    title TEXT,
    duration_minutes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (season_id, episode_number)
);

CREATE TABLE IF NOT EXISTS providers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    base_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_sources (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    episode_id BIGINT REFERENCES episodes(id) ON DELETE CASCADE,
    provider_id INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    stream_url TEXT NOT NULL,
    player_type TEXT NOT NULL CHECK (player_type IN ('iframe', 'hls', 'mp4')),
    quality TEXT NOT NULL DEFAULT '1080p',
    translation_title TEXT NOT NULL DEFAULT 'Оригинал / Дубляж',
    extra_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance and foreign keys
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type_id);
CREATE INDEX IF NOT EXISTS idx_contents_year ON contents(release_year);
CREATE INDEX IF NOT EXISTS idx_contents_rating ON contents(rating_cache DESC);
CREATE INDEX IF NOT EXISTS idx_contents_created ON contents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_featured ON contents(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_content_countries_country ON content_countries(country_id);

CREATE INDEX IF NOT EXISTS idx_seasons_content ON seasons(content_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_content ON episodes(content_id);

CREATE INDEX IF NOT EXISTS idx_provider_sources_content ON provider_sources(content_id);
CREATE INDEX IF NOT EXISTS idx_provider_sources_episode ON provider_sources(episode_id);
CREATE INDEX IF NOT EXISTS idx_provider_sources_provider ON provider_sources(provider_id);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION contents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('russian', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.original_title, '')), 'B') ||
        setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contents_search_vector ON contents;
CREATE TRIGGER trg_contents_search_vector
BEFORE INSERT OR UPDATE OF title, original_title, description ON contents
FOR EACH ROW EXECUTE FUNCTION contents_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_contents_search_vector ON contents USING gin(search_vector);
