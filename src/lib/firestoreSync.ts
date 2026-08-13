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

export const DATA_UPDATED_EVENT = 'nasq_data_updated';

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
}

// In-Memory Realtime Cache
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

export async function refreshAllDataFromBackend() {
  try {
    const [cfgRes, empRes, taskRes, attRes] = await Promise.all([
      fetch('/api/admin-config'),
      fetch('/api/employees'),
      fetch('/api/tasks'),
      fetch('/api/attendance'),
    ]);

    if (cfgRes.ok) {
      memAdminConfig = await cfgRes.json();
    }
    if (empRes.ok) {
      const emps: Employee[] = await empRes.json();
      if (emps && emps.length > 0) {
        memEmployees = emps;
      }
    }
    if (taskRes.ok) {
      memTasks = await taskRes.json();
    }
    if (attRes.ok) {
      memAttendance = await attRes.json();
    }

    notifyDataChanged();
  } catch (err) {
    console.warn('Backend sync warning:', err);
  }
}

export function initFirestoreSync() {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  // Cleanup old local storage keys
  try {
    localStorage.removeItem('nasq_employees_v2');
    localStorage.removeItem('nasq_tasks_v2');
    localStorage.removeItem('nasq_attendance_v2');
    localStorage.removeItem('nasq_admin_config_v2');
  } catch {
    // ignore
  }

  // Initial fetch
  refreshAllDataFromBackend();

  // Poll backend every 4 seconds for instant cross-device updates
  setInterval(() => {
    refreshAllDataFromBackend();
  }, 4000);
}

// Server Actions
export async function syncSaveAdminConfig(config: AdminConfig) {
  memAdminConfig = config;
  notifyDataChanged();
  try {
    await fetch('/api/admin-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  } catch (err) {
    console.error('Gagal menyimpan Admin Config ke Neon Database:', err);
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
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Karyawan ke Neon Database:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  memEmployees = memEmployees.filter((e) => e.id !== employeeId);
  notifyDataChanged();

  try {
    await fetch(`/api/employees/${employeeId}`, {
      method: 'DELETE',
    });
    refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menghapus Karyawan dari Neon Database:', err);
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
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Tugas ke Neon Database:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  memTasks = memTasks.filter((t) => t.id !== taskId);
  notifyDataChanged();

  try {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menghapus Tugas dari Neon Database:', err);
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
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Presensi ke Neon Database:', err);
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
  await refreshAllDataFromBackend();
  return getLiveEmployees();
}

export async function fetchAdminConfigDirectFromFirestore(): Promise<AdminConfig> {
  await refreshAllDataFromBackend();
  return getLiveAdminConfig();
}


