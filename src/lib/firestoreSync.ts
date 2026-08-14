import { Employee, TaskLocation, AttendanceRecord } from '../types';
import {
  AdminConfig,
  DEFAULT_ADMIN_CONFIG,
  SUPERUSER_EMPLOYEE,
  isSupabaseConfigured,
  fetchAdminConfigFromSupabase,
  saveAdminConfigToSupabase,
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  deleteEmployeeFromSupabase,
  fetchTasksFromSupabase,
  saveTaskToSupabase,
  deleteTaskFromSupabase,
  fetchAttendanceFromSupabase,
  saveAttendanceToSupabase,
  subscribeToSupabaseRealtime,
} from './supabaseDb';

export type { AdminConfig };
export { DEFAULT_ADMIN_CONFIG, SUPERUSER_EMPLOYEE };

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
    (e) => e.username?.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
  );
  let list = hasSuperuser ? memEmployees : [SUPERUSER_EMPLOYEE, ...memEmployees];
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
    if (isSupabaseConfigured()) {
      const [cfg, emps, tasks, att] = await Promise.all([
        fetchAdminConfigFromSupabase(),
        fetchEmployeesFromSupabase(),
        fetchTasksFromSupabase(),
        fetchAttendanceFromSupabase(),
      ]);

      if (cfg) memAdminConfig = cfg;
      if (emps && emps.length > 0) memEmployees = emps;
      if (tasks) memTasks = tasks;
      if (att) memAttendance = att;

      notifyDataChanged();
      return;
    } else {
      console.warn('⚠️ [NASQ] Supabase belum dikonfigurasi. Menjalankan mode Local Cache.');
      notifyDataChanged();
    }
  } catch (err) {
    console.warn('Supabase sync warning:', err);
  }
}

export function initFirestoreSync() {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  // Initial fetch
  refreshAllDataFromBackend();

  if (isSupabaseConfigured()) {
    // Subscribe to instant Supabase realtime events
    subscribeToSupabaseRealtime(() => {
      refreshAllDataFromBackend();
    });
  }
}

// Server Actions
export async function syncSaveAdminConfig(config: AdminConfig) {
  memAdminConfig = config;
  notifyDataChanged();
  try {
    if (isSupabaseConfigured()) {
      await saveAdminConfigToSupabase(config);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Admin Config ke Supabase:', err);
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
    if (isSupabaseConfigured()) {
      await saveEmployeeToSupabase(employee);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Karyawan ke Supabase:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  memEmployees = memEmployees.filter((e) => e.id !== employeeId);
  notifyDataChanged();

  try {
    if (isSupabaseConfigured()) {
      await deleteEmployeeFromSupabase(employeeId);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menghapus Karyawan dari Supabase:', err);
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
    if (isSupabaseConfigured()) {
      await saveTaskToSupabase(task);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Tugas ke Supabase:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  memTasks = memTasks.filter((t) => t.id !== taskId);
  notifyDataChanged();

  try {
    if (isSupabaseConfigured()) {
      await deleteTaskFromSupabase(taskId);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menghapus Tugas dari Supabase:', err);
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
    if (isSupabaseConfigured()) {
      await saveAttendanceToSupabase(record);
    }
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Presensi ke Supabase:', err);
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
