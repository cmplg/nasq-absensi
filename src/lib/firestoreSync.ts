import { Employee, TaskLocation, AttendanceRecord } from '../types';
import { dbQuery, initNeonRealtime, notifyRealtime } from './neon';

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

export const DATA_UPDATED_EVENT = 'nasq_data_updated';

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
}

// In-Memory Realtime Cache (No localStorage for app data)
let memAdminConfig: AdminConfig = DEFAULT_ADMIN_CONFIG;
let memEmployees: Employee[] = [SUPERUSER_EMPLOYEE];
let memTasks: TaskLocation[] = [];
let memAttendance: AttendanceRecord[] = [];

export function getLiveAdminConfig(): AdminConfig {
  return memAdminConfig;
}

export function getLiveEmployees(): Employee[] {
  const hasSuperuser = memEmployees.some(
    (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
  );
  let list = hasSuperuser ? memEmployees : [SUPERUSER_EMPLOYEE, ...memEmployees];
  return list.map((e) => {
    if (e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
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
}

export function getLiveTasks(): TaskLocation[] {
  return memTasks;
}

export function getLiveAttendance(): AttendanceRecord[] {
  return memAttendance;
}

let isSyncInitialized = false;
let neonCloseFn: (() => void) | null = null;

export function initFirestoreSync() {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  // Cleanup old local storage keys if any exist
  try {
    localStorage.removeItem('nasq_employees_v2');
    localStorage.removeItem('nasq_tasks_v2');
    localStorage.removeItem('nasq_attendance_v2');
    localStorage.removeItem('nasq_admin_config_v2');
  } catch {
    // ignore
  }

  // Initial load from Neon (Postgres JSONB storage)
  const parseRowData = (row: any) => {
    const d = row?.data ?? row;
    if (!d) return null;
    if (typeof d === 'string') {
      try {
        return JSON.parse(d);
      } catch {
        return d;
      }
    }
    return d;
  };

  (async () => {
    try {
      // Admin config
      const cfgRes = await dbQuery("SELECT data FROM admin_config WHERE id = $1", ['main']);
      if (cfgRes && cfgRes.rows && cfgRes.rows[0]) {
        const d = parseRowData(cfgRes.rows[0]);
        if (d) memAdminConfig = d as AdminConfig;
      }

      // Employees
      const empRes = await dbQuery('SELECT data FROM employees');
      if (empRes && empRes.rows) {
        const employees: Employee[] = empRes.rows.map((r: any) => parseRowData(r)).filter(Boolean);
        if (employees.length > 0) {
          const hasSuperuser = employees.some(
            (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
          );
          let list = hasSuperuser ? employees : [SUPERUSER_EMPLOYEE, ...employees];
          memEmployees = list.map((e) => {
            if (e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
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
        } else {
          memEmployees = [SUPERUSER_EMPLOYEE];
        }
      }

      // Tasks
      const taskRes = await dbQuery('SELECT data FROM tasks');
      if (taskRes && taskRes.rows) {
        memTasks = taskRes.rows.map((r: any) => parseRowData(r)).filter(Boolean) as TaskLocation[];
      }

      // Attendance
      const attRes = await dbQuery('SELECT data FROM attendance');
      if (attRes && attRes.rows) {
        const recs = attRes.rows.map((r: any) => parseRowData(r)).filter(Boolean) as AttendanceRecord[];
        recs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        memAttendance = recs;
      }

      notifyDataChanged();
    } catch (err) {
      console.warn('Neon initial load warning:', err);
    }
  })();

  // Setup SSE realtime listener — on any notification we'll re-fetch lightweight datasets
  neonCloseFn = initNeonRealtime(async (payloadStr: string) => {
    try {
      // payload may be simple collection name or JSON
      let payload: any = null;
      try { payload = JSON.parse(payloadStr); } catch { payload = payloadStr; }

      // For simplicity, re-fetch employees/tasks/attendance/admin config
      const [empRes2, taskRes2, attRes2, cfgRes2] = await Promise.all([
        dbQuery('SELECT data FROM employees'),
        dbQuery('SELECT data FROM tasks'),
        dbQuery('SELECT data FROM attendance'),
        dbQuery("SELECT data FROM admin_config WHERE id = $1", ['main']),
      ]);

      if (empRes2?.rows) {
        const employees: Employee[] = empRes2.rows.map((r: any) => parseRowData(r)).filter(Boolean);
        if (employees.length > 0) {
          const hasSuperuser = employees.some(
            (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
          );
          let list = hasSuperuser ? employees : [SUPERUSER_EMPLOYEE, ...employees];
          memEmployees = list.map((e) => {
            if (e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
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
        } else {
          memEmployees = [SUPERUSER_EMPLOYEE];
        }
      }

      if (taskRes2?.rows) memTasks = taskRes2.rows.map((r: any) => parseRowData(r)).filter(Boolean);
      if (attRes2?.rows) {
        const recs = attRes2.rows.map((r: any) => parseRowData(r)).filter(Boolean) as AttendanceRecord[];
        recs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        memAttendance = recs;
      }
      if (cfgRes2?.rows && cfgRes2.rows[0]) {
        const d = parseRowData(cfgRes2.rows[0]);
        if (d) memAdminConfig = d as AdminConfig;
      }

      notifyDataChanged();
    } catch (err) {
      console.warn('Neon realtime handler warning:', err);
    }
  });

  // Seed default admin and superuser if empty
  seedInitialDataIfEmpty();
}

async function seedInitialDataIfEmpty() {
  try {
    const empSnap = await getDocs(collection(db, 'employees'));
    if (empSnap.empty) {
      await setDoc(doc(db, 'employees', SUPERUSER_EMPLOYEE.id), SUPERUSER_EMPLOYEE);
    }

    const configSnap = await getDocs(collection(db, 'adminConfig'));
    if (configSnap.empty) {
      await setDoc(doc(db, 'adminConfig', 'main'), DEFAULT_ADMIN_CONFIG);
    }
  } catch (err) {
    console.warn('Initial Firestore seed error:', err);
  }
}

// Direct Firestore Server Actions
export async function syncSaveAdminConfig(config: AdminConfig) {
  memAdminConfig = config;
  notifyDataChanged();
  try {
    await dbQuery('INSERT INTO admin_config (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [
      'main',
      JSON.stringify(config),
    ]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'admin_config' })); } catch {}
  } catch (err) {
    console.error('Gagal menyimpan Admin Config ke Neon:', err);
  }
}

export async function syncSaveEmployee(employee: Employee) {
  const exists = memEmployees.some((e) => e.id === employee.id);
  if (exists) {
    memEmployees = memEmployees.map((e) => (e.id === employee.id ? employee : e));
  } else {
    memEmployees = [employee, ...memEmployees];
  }
  notifyDataChanged();

  try {
    await dbQuery('INSERT INTO employees (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [
      employee.id,
      JSON.stringify(employee),
    ]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'employees', id: employee.id })); } catch {}
  } catch (err) {
    console.error('Gagal menyimpan Karyawan ke Neon:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  memEmployees = memEmployees.filter((e) => e.id !== employeeId);
  notifyDataChanged();

  try {
    await dbQuery('DELETE FROM employees WHERE id = $1', [employeeId]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'employees', id: employeeId, action: 'delete' })); } catch {}
  } catch (err) {
    console.error('Gagal menghapus Karyawan dari Neon:', err);
  }
}

export async function syncSaveEmployees(employees: Employee[]) {
  memEmployees = employees;
  notifyDataChanged();
  for (const emp of employees) {
    await syncSaveEmployee(emp);
  }
}

export async function syncSaveTask(task: TaskLocation) {
  const exists = memTasks.some((t) => t.id === task.id);
  if (exists) {
    memTasks = memTasks.map((t) => (t.id === task.id ? task : t));
  } else {
    memTasks = [task, ...memTasks];
  }
  notifyDataChanged();

  try {
    await dbQuery('INSERT INTO tasks (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [
      task.id,
      JSON.stringify(task),
    ]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'tasks', id: task.id })); } catch {}
  } catch (err) {
    console.error('Gagal menyimpan Tugas ke Neon:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  memTasks = memTasks.filter((t) => t.id !== taskId);
  notifyDataChanged();

  try {
    await dbQuery('DELETE FROM tasks WHERE id = $1', [taskId]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'tasks', id: taskId, action: 'delete' })); } catch {}
  } catch (err) {
    console.error('Gagal menghapus Tugas dari Neon:', err);
  }
}

export async function syncSaveTasks(tasks: TaskLocation[]) {
  memTasks = tasks;
  notifyDataChanged();
  for (const t of tasks) {
    await syncSaveTask(t);
  }
}

export async function syncAddAttendanceRecord(record: AttendanceRecord) {
  memAttendance = [record, ...memAttendance];
  notifyDataChanged();

  try {
    await dbQuery('INSERT INTO attendance (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [
      record.id,
      JSON.stringify(record),
    ]);
    try { await notifyRealtime(process.env.NEON_REALTIME_CHANNEL || 'nasq_data_updated', JSON.stringify({ collection: 'attendance', id: record.id })); } catch {}
  } catch (err) {
    console.error('Gagal menyimpan Presensi ke Neon:', err);
  }
}

export async function syncSaveAttendanceRecords(records: AttendanceRecord[]) {
  memAttendance = records;
  notifyDataChanged();
  for (const r of records) {
    await syncAddAttendanceRecord(r);
  }
}

export async function fetchEmployeesDirectFromFirestore(): Promise<Employee[]> {
  try {
    const res = await dbQuery('SELECT data FROM employees');
    if (res && res.rows) {
      const employees: Employee[] = res.rows.map((r: any) => r.data ?? r).map((d: any) => (typeof d === 'string' ? JSON.parse(d) : d)).filter(Boolean);
      if (employees.length > 0) {
        const hasSuperuser = employees.some(
          (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
        );
        let list = hasSuperuser ? employees : [SUPERUSER_EMPLOYEE, ...employees];
        memEmployees = list.map((e) => {
          if (e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
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
        notifyDataChanged();
        return memEmployees;
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil data karyawan langsung dari Neon:', err);
  }
  return getLiveEmployees();
}

export async function fetchAdminConfigDirectFromFirestore(): Promise<AdminConfig> {
  try {
    const res = await dbQuery("SELECT data FROM admin_config WHERE id = $1", ['main']);
    if (res && res.rows && res.rows[0]) {
      const d = res.rows[0].data ?? res.rows[0];
      const cfg = typeof d === 'string' ? JSON.parse(d) : d;
      memAdminConfig = cfg as AdminConfig;
      notifyDataChanged();
      return memAdminConfig;
    }
  } catch (err) {
    console.warn('Gagal mengambil konfigurasi Admin langsung dari Neon:', err);
  }
  return getLiveAdminConfig();
}

