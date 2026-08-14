import { neon } from '@neondatabase/serverless';
import { Employee, TaskLocation, AttendanceRecord } from '../types';

export interface AdminConfig {
  username: string;
  password: string;
  name: string;
  companyLogoUrl?: string;
  companyName?: string;
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  username: 'admin',
  password: 'testadmin',
  name: 'Administrator NASQ',
  companyLogoUrl: '',
  companyName: 'NASQ ABSENSI',
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
  (import.meta as any).env?.VITE_DATABASE_URL ||
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
        name VARCHAR(150) NOT NULL,
        company_logo_url TEXT,
        company_name VARCHAR(150)
      );
    `;
    await sql`ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS company_logo_url TEXT;`;
    await sql`ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS company_name VARCHAR(150);`;

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
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'aktif',
        location_photo TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(100) NOT NULL
      );
    `;

    // Migration columns for tasks if table already existed
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date VARCHAR(50);`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'aktif';`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_photo TEXT;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS shift_start VARCHAR(10);`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS shift_end VARCHAR(10);`;

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
        verified_photo TEXT,
        notes TEXT,
        early_reason_category VARCHAR(150),
        early_reason_notes TEXT,
        task_id VARCHAR(100),
        task_title VARCHAR(200),
        distance_from_task_meters DOUBLE PRECISION
      );
    `;

    // Migration columns for attendance if table already existed
    await sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verified_photo TEXT;`;
    await sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS distance_from_task_meters DOUBLE PRECISION;`;

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
    const rows = await sql`SELECT username, password, name, company_logo_url, company_name FROM admin_config WHERE id = 'main'`;
    if (rows.length > 0) {
      const r = rows[0];
      return {
        username: r.username,
        password: r.password,
        name: r.name,
        companyLogoUrl: r.company_logo_url || '',
        companyName: r.company_name || 'NASQ ABSENSI',
      };
    }
  } catch (err) {
    console.error('Error fetching admin_config from Neon:', err);
  }
  return DEFAULT_ADMIN_CONFIG;
}

export async function saveAdminConfigToNeon(config: AdminConfig): Promise<void> {
  await ensureNeonTables();
  try {
    const logoUrl = config.companyLogoUrl || '';
    const compName = config.companyName || 'NASQ ABSENSI';
    await sql`
      INSERT INTO admin_config (id, username, password, name, company_logo_url, company_name)
      VALUES ('main', ${config.username}, ${config.password}, ${config.name}, ${logoUrl}, ${compName})
      ON CONFLICT (id) DO UPDATE SET
        username = ${config.username},
        password = ${config.password},
        name = ${config.name},
        company_logo_url = ${logoUrl},
        company_name = ${compName}
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
    throw err;
  }
}

export async function deleteEmployeeFromNeon(id: string): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`DELETE FROM employees WHERE id = ${id}`;
    console.log('✅ Karyawan dihapus dari Neon PostgreSQL:', id);
  } catch (err) {
    console.error('❌ Gagal menghapus Karyawan dari Neon:', err);
    throw err;
  }
}

// ---------------- Tasks ----------------
export async function fetchTasksFromNeon(): Promise<TaskLocation[]> {
  await ensureNeonTables();
  try {
    const rows = await sql`
      SELECT 
        id, title, description, address, latitude, longitude,
        radius_meter AS "radiusMeters",
        assigned_employee_ids AS "assignedEmployeeIds",
        COALESCE(start_date, '') AS "startDate",
        COALESCE(end_date, '') AS "endDate",
        COALESCE(status, 'aktif') AS "status",
        COALESCE(location_photo, '') AS "locationPhoto",
        COALESCE(shift_start, '08:00') AS "shiftStart",
        COALESCE(shift_end, '17:00') AS "shiftEnd",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM tasks
      ORDER BY created_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      address: r.address || '',
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: Number(r.radiusMeters || 150),
      assignedEmployeeIds: Array.isArray(r.assignedEmployeeIds) ? r.assignedEmployeeIds : [],
      startDate: r.startDate || new Date().toISOString().split('T')[0],
      endDate: r.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      status: r.status || 'aktif',
      locationPhoto: r.locationPhoto || '',
      shiftStart: r.shiftStart || '08:00',
      shiftEnd: r.shiftEnd || '17:00',
      createdAt: r.createdAt || new Date().toISOString(),
    })) as TaskLocation[];
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
        radius_meter, assigned_employee_ids, start_date, end_date, status, location_photo, shift_start, shift_end, is_active, created_at
      ) VALUES (
        ${task.id},
        ${task.title},
        ${task.description || ''},
        ${task.address || ''},
        ${task.latitude},
        ${task.longitude},
        ${task.radiusMeters || 150},
        ${assigned},
        ${task.startDate || new Date().toISOString().split('T')[0]},
        ${task.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]},
        ${task.status || 'aktif'},
        ${task.locationPhoto || ''},
        ${task.shiftStart || '08:00'},
        ${task.shiftEnd || '17:00'},
        ${task.status === 'aktif'},
        ${task.createdAt || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = ${task.title},
        description = ${task.description || ''},
        address = ${task.address || ''},
        latitude = ${task.latitude},
        longitude = ${task.longitude},
        radius_meter = ${task.radiusMeters || 150},
        assigned_employee_ids = ${assigned},
        start_date = ${task.startDate || new Date().toISOString().split('T')[0]},
        end_date = ${task.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]},
        status = ${task.status || 'aktif'},
        location_photo = ${task.locationPhoto || ''},
        shift_start = ${task.shiftStart || '08:00'},
        shift_end = ${task.shiftEnd || '17:00'},
        is_active = ${task.status === 'aktif'},
        created_at = ${task.createdAt || new Date().toISOString()}
    `;
    console.log('✅ Task penugasan berhasil disimpan ke Neon:', task.title);
  } catch (err) {
    console.error('❌ Gagal menyimpan Task ke Neon:', err);
    throw err;
  }
}

export async function deleteTaskFromNeon(id: string): Promise<void> {
  await ensureNeonTables();
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    console.log('✅ Task penugasan berhasil dihapus dari Neon:', id);
  } catch (err) {
    console.error('Error deleting task from Neon:', err);
    throw err;
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
        latitude, longitude, address,
        COALESCE(verified_photo, '') AS "verifiedPhoto", notes,
        early_reason_category AS "earlyReasonCategory", early_reason_notes AS "earlyReasonNotes",
        task_id AS "taskId", task_title AS "taskTitle",
        distance_from_task_meters AS "distanceFromTaskMeters"
      FROM attendance
      ORDER BY timestamp DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeePosition: r.employeePosition || '',
      type: r.type,
      timestamp: r.timestamp,
      dateString: r.dateString,
      timeString: r.timeString,
      status: r.status,
      verifiedPhoto: r.verifiedPhoto || '',
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      address: r.address || '',
      taskId: r.taskId || '',
      taskTitle: r.taskTitle || '',
      distanceFromTaskMeters: r.distanceFromTaskMeters ? Number(r.distanceFromTaskMeters) : undefined,
      earlyReasonCategory: r.earlyReasonCategory || '',
      earlyReasonNotes: r.earlyReasonNotes || '',
      notes: r.notes || '',
    })) as AttendanceRecord[];
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
        date_string, time_string, status, latitude, longitude, address, verified_photo,
        notes, early_reason_category, early_reason_notes, task_id, task_title,
        distance_from_task_meters
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
        ${a.verifiedPhoto || ''},
        ${a.notes || ''},
        ${a.earlyReasonCategory || ''},
        ${a.earlyReasonNotes || ''},
        ${a.taskId || ''},
        ${a.taskTitle || ''},
        ${a.distanceFromTaskMeters || 0}
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
        verified_photo = ${a.verifiedPhoto || ''},
        notes = ${a.notes || ''},
        early_reason_category = ${a.earlyReasonCategory || ''},
        early_reason_notes = ${a.earlyReasonNotes || ''},
        task_id = ${a.taskId || ''},
        task_title = ${a.taskTitle || ''},
        distance_from_task_meters = ${a.distanceFromTaskMeters || 0}
    `;
    console.log('✅ Absensi berhasil disimpan ke Neon:', a.employeeName);
  } catch (err) {
    console.error('Error saving attendance to Neon:', err);
    throw err;
  }
}
