-- Create medications_catalog table
CREATE TABLE IF NOT EXISTS medications_catalog (
  id SERIAL PRIMARY KEY,
  fest_id VARCHAR(100) UNIQUE,
  varenummer VARCHAR(20),
  name VARCHAR(500) NOT NULL,
  active_substance VARCHAR(500),
  atc_code VARCHAR(20),
  form VARCHAR(100),
  strength VARCHAR(100),
  manufacturer VARCHAR(500),
  prescription_required BOOLEAN NOT NULL DEFAULT true,
  approved BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications_catalog(name);
CREATE INDEX IF NOT EXISTS idx_medications_substance ON medications_catalog(active_substance);
CREATE INDEX IF NOT EXISTS idx_medications_atc ON medications_catalog(atc_code);
CREATE INDEX IF NOT EXISTS idx_medications_search_vector ON medications_catalog USING gin(search_vector);

-- Create user_medications table
CREATE TABLE IF NOT EXISTS user_medications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_medication_id INTEGER REFERENCES medications_catalog(id) ON DELETE SET NULL,
  custom_name VARCHAR(255),
  medication_type VARCHAR(20) NOT NULL CHECK (medication_type IN ('mcas', 'prescription', 'over_counter', 'supplement')) DEFAULT 'mcas',
  dosage VARCHAR(100),
  dosage_unit VARCHAR(50),
  time_taken TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_medications
CREATE INDEX IF NOT EXISTS idx_user_medications_user_id ON user_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_medications_time_taken ON user_medications(time_taken);
CREATE INDEX IF NOT EXISTS idx_user_medications_catalog_id ON user_medications(catalog_medication_id);
