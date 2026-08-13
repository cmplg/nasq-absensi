import { neon } from '@neondatabase/serverless';
import { Employee, TaskLocation, AttendanceRecord } from '../types';

export interface AdminConfig {
  username: string;
  password: string;
  name: string;
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  username: 'admin',
  password: 'testadmin',
  name: 'Administrator NASQ',
};

export const SUPERUSER_EMPLOYEE: Employee = {
  id: 'emp-superuser',
  name: 'Super User (Developer)',
  email: 'developer@nasq.co.id',
  username: 'superuser',
  password: 'ultra',
  position: 'Developer / Full Privilege',
  department: 'System Developer',
  shiftStart: '00:00',
  shiftEnd: '23:59',
  masterPhotos: [
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="150" cy="110" r="55" fill="%231e293b"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="28" fill="%2310b981" text-anchor="middle">SU</text></svg>',
  ],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  isDeveloper: true,
};

const DATABASE_URL =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_s2YSWA8eDupm@ep-holy-morning-az8htned-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

export const sql = neon(DATABASE_URL);

let tablesInitialized = false;

export async function ensureNeonTables() {
  if (tablesInitialized) return;
  try {
    // 1. Create admin_config
    await sql`
      CREATE TABLE IF NOT EXISTS admin_config (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
        username VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL
      );
    `;

    // 2. Create employees
    await sql`
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
    `;

    // 3. Create tasks
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        address TEXT,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius_meter DOUBLE PRECISION NOT NULL,
        assigned_employee_ids TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(100) NOT NULL
      );
    `;

    // 4. Create attendance
    await sql`
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
        photo TEXT,
        notes TEXT,
        early_reason_category VARCHAR(150),
        early_reason_notes TEXT,
        task_id VARCHAR(100),
        task_title VARCHAR(200),
        verified_face BOOLEAN DEFAULT FALSE,
        face_confidence DOUBLE PRECISION
      );
    `;

    // Seed admin_config if empty
    const adminRows = await sql`SELECT * FROM admin_config WHERE id = 'main'`;
    if (adminRows.length === 0) {
      await sql`
        INSERT INTO admin_config (id, username, password, name)
        VALUES ('main', 'admin', 'testadmin', 'Administrator NASQ')
      `;
    }

    // Seed superuser if empty
    const suRows = await sql`SELECT * FROM employees WHERE id = 'emp-superuser' OR LOWER(username) = 'superuser'`;
    if (suRows.length === 0) {
      await sql`
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
      `;
    }

    tablesInitialized = true;
    console.log('✅ Neon PostgreSQL Direct Connection Initialized Successfully!');
  } catch (err) {
    console.error('❌ Failed to initialize Neon PostgreSQL tables:', err);
  }
}

// ---------------- Admin Config ----------------
export async function fetchAdminConfigFromNeon(): Promise<AdminConfig> {
  await ensureNeonTables();
  try {
    const rows = await sql`SELECT username, password, name FROM admin_config WHERE id = 'main'`;
    if (rows.length > 0) {
      return rows[0] as AdminConfig;
    }
  } catch (err) {
    console.error('Error fetching admin_config from Neon:', err);
  }
  return DEFAULT_ADMIN_CONFIG;
}

export async function saveAdminConfigToNeon(config: AdminConfig): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`
      INSERT INTO admin_config (id, username, password, name)
      VALUES ('main', ${config.username}, ${config.password}, ${config.name})
      ON CONFLICT (id) DO UPDATE SET
        username = ${config.username},
        password = ${config.password},
        name = ${config.name}
    `;
  } catch (err) {
    console.error('Error saving admin_config to Neon:', err);
  }
}

// ---------------- Employees ----------------
export async function fetchEmployeesFromNeon(): Promise<Employee[]> {
  await ensureNeonTables();
  try {
    const rows = await sql`
      SELECT 
        id, name, email, username, password, position, department,
        shift_start AS "shiftStart", shift_end AS "shiftEnd",
        master_photos AS "masterPhotos", is_active AS "isActive",
        created_at AS "createdAt", is_developer AS "isDeveloper"
      FROM employees
      ORDER BY created_at DESC
    `;
    const employees = rows as unknown as Employee[];
    const hasSuperuser = employees.some(
      (e) => e.username?.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
    );
    let list = hasSuperuser ? employees : [SUPERUSER_EMPLOYEE, ...employees];
    return list.map((e) => {
      if (e.username?.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
        return {
          ...e,
          username: 'superuser',
          password: 'ultra',
          isActive: true,
          isDeveloper: true,
        };
      }
      return e;
    });
  } catch (err) {
    console.error('Error fetching employees from Neon:', err);
    return [SUPERUSER_EMPLOYEE];
  }
}

export async function saveEmployeeToNeon(emp: Employee): Promise<void> {
  await ensureNeonTables();
  try {
    const photos = emp.masterPhotos || [];
    await sql`
      INSERT INTO employees (
        id, name, email, username, password, position, department,
        shift_start, shift_end, master_photos, is_active, created_at, is_developer
      ) VALUES (
        ${emp.id},
        ${emp.name},
        ${emp.email || ''},
        ${emp.username},
        ${emp.password || ''},
        ${emp.position},
        ${emp.department},
        ${emp.shiftStart},
        ${emp.shiftEnd},
        ${photos},
        ${emp.isActive ?? true},
        ${emp.createdAt || new Date().toISOString()},
        ${emp.isDeveloper ?? false}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = ${emp.name},
        email = ${emp.email || ''},
        username = ${emp.username},
        password = ${emp.password || ''},
        position = ${emp.position},
        department = ${emp.department},
        shift_start = ${emp.shiftStart},
        shift_end = ${emp.shiftEnd},
        master_photos = ${photos},
        is_active = ${emp.isActive ?? true},
        created_at = ${emp.createdAt || new Date().toISOString()},
        is_developer = ${emp.isDeveloper ?? false}
    `;
    console.log('✅ Karyawan berhasil disimpan ke database Neon PostgreSQL:', emp.name);
  } catch (err) {
    console.error('❌ Gagal menyimpan Karyawan ke Neon:', err);
  }
}

export async function deleteEmployeeFromNeon(id: string): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`DELETE FROM employees WHERE id = ${id}`;
    console.log('✅ Karyawan dihapus dari Neon PostgreSQL:', id);
  } catch (err) {
    console.error('❌ Gagal menghapus Karyawan dari Neon:', err);
  }
}

// ---------------- Tasks ----------------
export async function fetchTasksFromNeon(): Promise<TaskLocation[]> {
  await ensureNeonTables();
  try {
    const rows = await sql`
      SELECT 
        id, title, description, address, latitude, longitude,
        radius_meter AS "radiusMeter", assigned_employee_ids AS "assignedEmployeeIds",
        is_active AS "isActive", created_at AS "createdAt"
      FROM tasks
      ORDER BY created_at DESC
    `;
    return rows as unknown as TaskLocation[];
  } catch (err) {
    console.error('Error fetching tasks from Neon:', err);
    return [];
  }
}

export async function saveTaskToNeon(task: TaskLocation): Promise<void> {
  await ensureNeonTables();
  try {
    const assigned = task.assignedEmployeeIds || [];
    await sql`
      INSERT INTO tasks (
        id, title, description, address, latitude, longitude,
        radius_meter, assigned_employee_ids, is_active, created_at
      ) VALUES (
        ${task.id},
        ${task.title},
        ${task.description || ''},
        ${task.address || ''},
        ${task.latitude},
        ${task.longitude},
        ${task.radiusMeter},
        ${assigned},
        ${task.isActive ?? true},
        ${task.createdAt || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = ${task.title},
        description = ${task.description || ''},
        address = ${task.address || ''},
        latitude = ${task.latitude},
        longitude = ${task.longitude},
        radius_meter = ${task.radiusMeter},
        assigned_employee_ids = ${assigned},
        is_active = ${task.isActive ?? true},
        created_at = ${task.createdAt || new Date().toISOString()}
    `;
  } catch (err) {
    console.error('Error saving task to Neon:', err);
  }
}

export async function deleteTaskFromNeon(id: string): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting task from Neon:', err);
  }
}

// ---------------- Attendance ----------------
export async function fetchAttendanceFromNeon(): Promise<AttendanceRecord[]> {
  await ensureNeonTables();
  try {
    const rows = await sql`
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
    `;
    return rows as unknown as AttendanceRecord[];
  } catch (err) {
    console.error('Error fetching attendance from Neon:', err);
    return [];
  }
}

export async function saveAttendanceToNeon(a: AttendanceRecord): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`
      INSERT INTO attendance (
        id, employee_id, employee_name, employee_position, type, timestamp,
        date_string, time_string, status, latitude, longitude, address, photo,
        notes, early_reason_category, early_reason_notes, task_id, task_title,
        verified_face, face_confidence
      ) VALUES (
        ${a.id},
        ${a.employeeId},
        ${a.employeeName},
        ${a.employeePosition || ''},
        ${a.type},
        ${a.timestamp},
        ${a.dateString},
        ${a.timeString},
        ${a.status},
        ${a.latitude},
        ${a.longitude},
        ${a.address || ''},
        ${a.photo || ''},
        ${a.notes || ''},
        ${a.earlyReasonCategory || ''},
        ${a.earlyReasonNotes || ''},
        ${a.taskId || ''},
        ${a.taskTitle || ''},
        ${a.verifiedFace ?? false},
        ${a.faceConfidence || 0}
      )
      ON CONFLICT (id) DO UPDATE SET
        employee_id = ${a.employeeId},
        employee_name = ${a.employeeName},
        employee_position = ${a.employeePosition || ''},
        type = ${a.type},
        timestamp = ${a.timestamp},
        date_string = ${a.dateString},
        time_string = ${a.timeString},
        status = ${a.status},
        latitude = ${a.latitude},
        longitude = ${a.longitude},
        address = ${a.address || ''},
        photo = ${a.photo || ''},
        notes = ${a.notes || ''},
        early_reason_category = ${a.earlyReasonCategory || ''},
        early_reason_notes = ${a.earlyReasonNotes || ''},
        task_id = ${a.taskId || ''},
        task_title = ${a.taskTitle || ''},
        verified_face = ${a.verifiedFace ?? false},
        face_confidence = ${a.faceConfidence || 0}
    `;
  } catch (err) {
    console.error('Error saving attendance to Neon:', err);
  }
}
