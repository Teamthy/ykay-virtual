-- 000002_location: geos + locations for tutor matching (Tuteria parity)
CREATE TYPE location_type AS ENUM ('COUNTRY','STATE','CITY','AREA','CUSTOM');

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    type location_type NOT NULL,
    parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    country_code VARCHAR(2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_type ON locations(type);

-- Seed Nigeria base
INSERT INTO locations (name, slug, type, country_code) VALUES
('Nigeria','nigeria','COUNTRY','NG'),
('United Kingdom','united-kingdom','COUNTRY','GB'),
('United States','united-states','COUNTRY','US'),
('Canada','canada','COUNTRY','CA')
ON CONFLICT (slug) DO NOTHING;
