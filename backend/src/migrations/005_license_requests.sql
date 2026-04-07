-- Migration 005: License Request System
-- Run: psql -U postgres -d asset_hub -f 005_license_requests.sql

CREATE TABLE IF NOT EXISTS license_requests (
  request_id    SERIAL PRIMARY KEY,
  asset_id      INTEGER      NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  requested_by  INTEGER      NOT NULL REFERENCES users(user_id),
  license_type  VARCHAR(100) NOT NULL,
  quantity      INTEGER      NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  reason        TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   INTEGER REFERENCES users(user_id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_asset    ON license_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_license_requests_status   ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_license_requests_user     ON license_requests(requested_by);
