"""Initial schema with catalog, providers, users, social, and search triggers

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-24

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Content Types
    op.execute("""
        CREATE TABLE IF NOT EXISTS content_types (
            id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );
    """)

    # 2. Genres
    op.execute("""
        CREATE TABLE IF NOT EXISTS genres (
            id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );
    """)

    # 3. Countries
    op.execute("""
        CREATE TABLE IF NOT EXISTS countries (
            id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );
    """)

    # 4. Contents
    op.execute("""
        CREATE TABLE IF NOT EXISTS contents (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            content_type_id INT NOT NULL REFERENCES content_types(id) ON DELETE RESTRICT,
            title TEXT NOT NULL,
            original_title TEXT,
            slug TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            poster_url TEXT NOT NULL,
            banner_url TEXT,
            trailer_url TEXT,
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
    """)

    # 5. Content Genres & Countries
    op.execute("""
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
    """)

    # 6. Seasons & Episodes
    op.execute("""
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
    """)

    # 7. Providers & Provider Sources
    op.execute("""
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
    """)

    # 8. Users, Profiles, UserTokens
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS user_tokens (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            ip_address TEXT,
            user_agent TEXT,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS profiles (
            user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            avatar_url TEXT,
            bio TEXT,
            preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # 9. Comments, Ratings, Bookmarks, Watch Progress & History
    op.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
            parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
            text TEXT NOT NULL CHECK (length(text) >= 2 AND length(text) <= 3000),
            is_edited BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
            rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, content_id)
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
            category TEXT NOT NULL CHECK (category IN ('watching', 'plan_to_watch', 'completed', 'dropped', 'favorite')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, content_id, category)
        );

        CREATE TABLE IF NOT EXISTS watch_progress (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
            episode_id BIGINT REFERENCES episodes(id) ON DELETE CASCADE,
            progress_seconds INT NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
            duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
            is_completed BOOLEAN NOT NULL DEFAULT false,
            last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE NULLS NOT DISTINCT (user_id, content_id, episode_id)
        );

        CREATE TABLE IF NOT EXISTS watch_history (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
            episode_id BIGINT REFERENCES episodes(id) ON DELETE CASCADE,
            watched_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # 10. Performance Indexes
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type_id);
        CREATE INDEX IF NOT EXISTS idx_contents_year ON contents(release_year);
        CREATE INDEX IF NOT EXISTS idx_contents_rating ON contents(rating_cache DESC);
        CREATE INDEX IF NOT EXISTS idx_contents_created ON contents(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_contents_featured ON contents(is_featured) WHERE is_featured = true;
        CREATE INDEX IF NOT EXISTS idx_contents_trailer_url ON contents(trailer_url) WHERE trailer_url IS NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);
        CREATE INDEX IF NOT EXISTS idx_content_countries_country ON content_countries(country_id);

        CREATE INDEX IF NOT EXISTS idx_seasons_content ON seasons(content_id);
        CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
        CREATE INDEX IF NOT EXISTS idx_episodes_content ON episodes(content_id);

        CREATE INDEX IF NOT EXISTS idx_provider_sources_content ON provider_sources(content_id);
        CREATE INDEX IF NOT EXISTS idx_provider_sources_episode ON provider_sources(episode_id);
        CREATE INDEX IF NOT EXISTS idx_provider_sources_provider ON provider_sources(provider_id);

        CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_tokens_expires ON user_tokens(expires_at);

        CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id);
        CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
        CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
        CREATE INDEX IF NOT EXISTS idx_ratings_content ON ratings(content_id);

        CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_content ON bookmarks(content_id);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_user_category ON bookmarks(user_id, category);

        CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id);
        CREATE INDEX IF NOT EXISTS idx_watch_progress_content ON watch_progress(content_id);
        CREATE INDEX IF NOT EXISTS idx_watch_progress_last_watched ON watch_progress(user_id, last_watched_at DESC);

        CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_watch_history_content ON watch_history(content_id);
        CREATE INDEX IF NOT EXISTS idx_watch_history_watched ON watch_history(user_id, watched_at DESC);
    """)

    # 11. Triggers and Stored Functions
    op.execute("""
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

        CREATE OR REPLACE FUNCTION update_content_rating_cache() RETURNS trigger AS $$
        DECLARE
            target_content_id BIGINT;
            avg_score NUMERIC(3, 1);
            cnt INT;
        BEGIN
            IF (TG_OP = 'DELETE') THEN
                target_content_id := OLD.content_id;
            ELSE
                target_content_id := NEW.content_id;
            END IF;

            SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0), COUNT(*)
            INTO avg_score, cnt
            FROM ratings
            WHERE content_id = target_content_id;

            UPDATE contents
            SET rating_cache = avg_score,
                votes_count = cnt,
                updated_at = now()
            WHERE id = target_content_id;

            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_ratings_cache_update ON ratings;
        CREATE TRIGGER trg_ratings_cache_update
        AFTER INSERT OR UPDATE OR DELETE ON ratings
        FOR EACH ROW EXECUTE FUNCTION update_content_rating_cache();
    """)


def downgrade() -> None:
    op.execute("""
        DROP TRIGGER IF EXISTS trg_ratings_cache_update ON ratings;
        DROP FUNCTION IF EXISTS update_content_rating_cache();
        DROP TRIGGER IF EXISTS trg_contents_search_vector ON contents;
        DROP FUNCTION IF EXISTS contents_search_vector_update();

        DROP TABLE IF EXISTS watch_history CASCADE;
        DROP TABLE IF EXISTS watch_progress CASCADE;
        DROP TABLE IF EXISTS bookmarks CASCADE;
        DROP TABLE IF EXISTS ratings CASCADE;
        DROP TABLE IF EXISTS comments CASCADE;
        DROP TABLE IF EXISTS profiles CASCADE;
        DROP TABLE IF EXISTS user_tokens CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS provider_sources CASCADE;
        DROP TABLE IF EXISTS providers CASCADE;
        DROP TABLE IF EXISTS episodes CASCADE;
        DROP TABLE IF EXISTS seasons CASCADE;
        DROP TABLE IF EXISTS content_countries CASCADE;
        DROP TABLE IF EXISTS content_genres CASCADE;
        DROP TABLE IF EXISTS contents CASCADE;
        DROP TABLE IF EXISTS countries CASCADE;
        DROP TABLE IF EXISTS genres CASCADE;
        DROP TABLE IF EXISTS content_types CASCADE;
    """)
