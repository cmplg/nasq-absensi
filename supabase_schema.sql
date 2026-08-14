-- ========================================================================
-- NASQ ABSENSI - SUPABASE SQL SCHEMA MIGRATION
-- Buka Supabase Dashboard > SQL Editor > New Query > Paste dan Run query ini
-- ========================================================================

-- 1. Tabel Konfigurasi Admin & Brand
CREATE TABLE IF NOT EXISTS admin_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  company_logo_url TEXT,
  company_name VARCHAR(150) DEFAULT 'NASQ ABSENSI'
);

-- 2. Tabel Karyawan
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  position VARCHAR(150) NOT NULL,
  department VARCHAR(150) NOT NULL,
  shift_start VARCHAR(10) NOT NULL DEFAULT '08:00',
  shift_end VARCHAR(10) NOT NULL DEFAULT '17:00',
  master_photos TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at VARCHAR(100) NOT NULL,
  is_developer BOOLEAN DEFAULT FALSE
);

-- 3. Tabel Tugas / Lokasi Penugasan (Geofencing)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meter DOUBLE PRECISION NOT NULL DEFAULT 150,
  assigned_employee_ids TEXT[] DEFAULT '{}',
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  status VARCHAR(50) DEFAULT 'aktif',
  location_photo TEXT,
  shift_start VARCHAR(10) DEFAULT '08:00',
  shift_end VARCHAR(10) DEFAULT '17:00',
  is_active BOOLEAN DEFAULT TRUE,
  created_at VARCHAR(100) NOT NULL
);

-- 4. Tabel Riwayat Presensi (Attendance)
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(100) PRIMARY KEY,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(200) NOT NULL,
  employee_position VARCHAR(150),
  type VARCHAR(50) NOT NULL,
  timestamp VARCHAR(100) NOT NULL,
  date_string VARCHAR(50) NOT NULL,
  time_string VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  verified_photo TEXT,
  notes TEXT,
  early_reason_category VARCHAR(150),
  early_reason_notes TEXT,
  task_id VARCHAR(100),
  task_title VARCHAR(200),
  distance_from_task_meters DOUBLE PRECISION
);

-- Enable Row Level Security (RLS) & Allow public read/write via Anon Key
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Buat Policy Akses Penuh untuk Aplikasi Web (Anon Key)
CREATE POLICY "Allow all access to admin_config" ON admin_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime untuk sinkronisasi instan antar perangkat
ALTER PUBLICATION supabase_realtime ADD TABLE admin_config;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Seed Data Awal: Admin & Super User
INSERT INTO admin_config (id, username, password, name, company_name)
VALUES ('main', 'admin', 'testadmin', 'Administrator NASQ', 'NASQ ABSENSI')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (
  id, name, email, username, password, position, department,
  shift_start, shift_end, master_photos, is_active, created_at, is_developer
) VALUES (
  'emp-superuser',
  'Super User (Developer)',
  'developer@nasq.co.id',
  'superuser',
  'ultra',
  'Developer / Full Privilege',
  'System Developer',
  '00:00',
  '23:59',
  ARRAY['data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="150" cy="110" r="55" fill="%231e293b"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="28" fill="%2310b981" text-anchor="middle">SU</text></svg>'],
  TRUE,
  '2026-01-01T00:00:00.000Z',
  TRUE
) ON CONFLICT (id) DO NOTHING;
