CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL,
  node_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tilt DOUBLE PRECISION NOT NULL,
  vibration DOUBLE PRECISION NOT NULL,
  displacement DOUBLE PRECISION NOT NULL,
  crack_strain DOUBLE PRECISION NOT NULL,
  crack_detected BOOLEAN NOT NULL,
  battery DOUBLE PRECISION NOT NULL,
  signal DOUBLE PRECISION NOT NULL,
  risk TEXT NOT NULL,
  PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable('sensor_readings', 'recorded_at', if_not_exists => TRUE);