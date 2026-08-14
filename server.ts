import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

let pool: Pool | null = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

// Auto-create database tables
async function initDatabase() {
  if (!pool) {
    console.log('ℹ️ [NASQ] DATABASE_URL tidak diset. Aplikasi berjalan dalam mode Frontend Supabase REST/Realtime Client.');
    return;
  }
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
        username VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        company_logo_url TEXT,
        company_name VARCHAR(150) DEFAULT 'NASQ ABSENSI'
      );

      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        username VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        position VARCHAR(150) NOT NULL,
        department VARCHAR(150) NOT NULL,
        shift_start VARCHAR(10) NOT NULL,
        shift_end VARCHAR(10) NOT NULL,
        master_photos TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(100) NOT NULL,
        is_developer BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        address TEXT,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius_meter DOUBLE PRECISION NOT NULL,
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
    `);

    // Seed default admin config if not exists
    const adminCheck = await client.query(`SELECT * FROM admin_config WHERE id = 'main'`);
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO admin_config (id, username, password, name, company_name)
        VALUES ('main', 'admin', 'testadmin', 'Administrator NASQ', 'NASQ ABSENSI')
      `);
    }

    // Seed developer superuser if not exists
    const superuserCheck = await client.query(`SELECT * FROM employees WHERE id = 'emp-superuser' OR LOWER(username) = 'superuser'`);
    if (superuserCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO employees (
          id, name, email, username, password, position, department, shift_start, shift_end, master_photos, is_active, created_at, is_developer
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
        )
      `);
    }

    console.log('✅ Supabase PostgreSQL Pool initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing Supabase PostgreSQL Database Pool:', err);
  } finally {
    if (client) client.release();
  }
}

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/health', async (req, res) => {
    try {
      const dbRes = await pool.query('SELECT NOW()');
      res.json({ status: 'ok', dbTime: dbRes.rows[0].now });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Database disconnected' });
    }
  });

  // 1. Admin Config
  app.get('/api/admin-config', async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT username, password, name FROM admin_config WHERE id = 'main'`);
      if (rows.length > 0) {
        return res.json(rows[0]);
      }
      res.json({ username: 'admin', password: 'testadmin', name: 'Administrator NASQ' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin-config', async (req, res) => {
    try {
      const { username, password, name } = req.body;
      await pool.query(
        `INSERT INTO admin_config (id, username, password, name)
         VALUES ('main', $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET username = $1, password = $2, name = $3`,
        [username, password, name]
      );
      res.json({ success: true, config: { username, password, name } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Employees
  app.get('/api/employees', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          id, name, email, username, password, position, department,
          shift_start AS "shiftStart", shift_end AS "shiftEnd",
          master_photos AS "masterPhotos", is_active AS "isActive",
          created_at AS "createdAt", is_developer AS "isDeveloper"
        FROM employees
        ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/employees', async (req, res) => {
    try {
      const emp = req.body;
      await pool.query(
        `INSERT INTO employees (
          id, name, email, username, password, position, department,
          shift_start, shift_end, master_photos, is_active, created_at, is_developer
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = $2, email = $3, username = $4, password = $5, position = $6,
          department = $7, shift_start = $8, shift_end = $9, master_photos = $10,
          is_active = $11, created_at = $12, is_developer = $13`,
        [
          emp.id,
          emp.name,
          emp.email || '',
          emp.username,
          emp.password || '',
          emp.position,
          emp.department,
          emp.shiftStart,
          emp.shiftEnd,
          emp.masterPhotos || [],
          emp.isActive ?? true,
          emp.createdAt || new Date().toISOString(),
          emp.isDeveloper ?? false,
        ]
      );
      res.json({ success: true, employee: emp });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/employees/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM employees WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Tasks
  app.get('/api/tasks', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          id, title, description, address, latitude, longitude,
          radius_meter AS "radiusMeter", assigned_employee_ids AS "assignedEmployeeIds",
          is_active AS "isActive", created_at AS "createdAt"
        FROM tasks
        ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const t = req.body;
      await pool.query(
        `INSERT INTO tasks (
          id, title, description, address, latitude, longitude,
          radius_meter, assigned_employee_ids, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = $2, description = $3, address = $4, latitude = $5, longitude = $6,
          radius_meter = $7, assigned_employee_ids = $8, is_active = $9, created_at = $10`,
        [
          t.id,
          t.title,
          t.description || '',
          t.address || '',
          t.latitude,
          t.longitude,
          t.radiusMeter,
          t.assignedEmployeeIds || [],
          t.isActive ?? true,
          t.createdAt || new Date().toISOString(),
        ]
      );
      res.json({ success: true, task: t });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Attendance
  app.get('/api/attendance', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          id, employee_id AS "employeeId", employee_name AS "employeeName",
          employee_position AS "employeePosition", type, timestamp,
          date_string AS "dateString", time_string AS "timeString", status,
          latitude, longitude, address, photo, notes,
          early_reason_category AS "earlyReasonCategory", early_reason_notes AS "earlyReasonNotes",
          task_id AS "taskId", task_title AS "taskTitle",
          verified_face AS "verifiedFace", face_confidence AS "faceConfidence"
        FROM attendance
        ORDER BY timestamp DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const a = req.body;
      await pool.query(
        `INSERT INTO attendance (
          id, employee_id, employee_name, employee_position, type, timestamp,
          date_string, time_string, status, latitude, longitude, address, photo,
          notes, early_reason_category, early_reason_notes, task_id, task_title,
          verified_face, face_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          employee_id = $2, employee_name = $3, employee_position = $4, type = $5,
          timestamp = $6, date_string = $7, time_string = $8, status = $9,
          latitude = $10, longitude = $11, address = $12, photo = $13, notes = $14,
          early_reason_category = $15, early_reason_notes = $16, task_id = $17,
          task_title = $18, verified_face = $19, face_confidence = $20`,
        [
          a.id,
          a.employeeId,
          a.employeeName,
          a.employeePosition || '',
          a.type,
          a.timestamp,
          a.dateString,
          a.timeString,
          a.status,
          a.latitude,
          a.longitude,
          a.address || '',
          a.photo || '',
          a.notes || '',
          a.earlyReasonCategory || '',
          a.earlyReasonNotes || '',
          a.taskId || '',
          a.taskTitle || '',
          a.verifiedFace ?? false,
          a.faceConfidence || 0,
        ]
      );
      res.json({ success: true, record: a });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite or Static file serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
