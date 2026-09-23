-- Migration 003: Add trailer_url to contents table
ALTER TABLE contents ADD COLUMN IF NOT EXISTS trailer_url TEXT;

-- Index for quick trailer lookups if needed
CREATE INDEX IF NOT EXISTS idx_contents_trailer_url ON contents(trailer_url) WHERE trailer_url IS NOT NULL;

-- Populate demo trailers for existing contents
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=zSWdZVtXT7E' WHERE slug = 'interstellar-2014' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=YoHD9XEInc0' WHERE slug = 'inception-2010' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=Way9Dexny3w' WHERE slug = 'dune-part-two-2024' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=HhesaQXLuRY' WHERE slug = 'breaking-bad-2008' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=b9EkMc79ZSU' WHERE slug = 'stranger-things-2016' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=MGRm4IzK1SQ' WHERE slug = 'attack-on-titan-2013' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=VQGCKyvzIM4' WHERE slug = 'demon-slayer-2019' AND trailer_url IS NULL;
UPDATE contents SET trailer_url = 'https://www.youtube.com/watch?v=cqGjhVJWtEg' WHERE slug = 'spider-man-across-the-spider-verse-2023' AND trailer_url IS NULL;
