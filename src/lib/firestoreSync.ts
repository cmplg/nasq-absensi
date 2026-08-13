import { Employee, TaskLocation, AttendanceRecord } from '../types';
import {
  AdminConfig,
  DEFAULT_ADMIN_CONFIG,
  SUPERUSER_EMPLOYEE,
  fetchAdminConfigFromNeon,
  saveAdminConfigToNeon,
  fetchEmployeesFromNeon,
  saveEmployeeToNeon,
  deleteEmployeeFromNeon,
  fetchTasksFromNeon,
  saveTaskToNeon,
  deleteTaskFromNeon,
  fetchAttendanceFromNeon,
  saveAttendanceToNeon,
} from './neonDb';

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
    const [cfg, emps, tasks, att] = await Promise.all([
      fetchAdminConfigFromNeon(),
      fetchEmployeesFromNeon(),
      fetchTasksFromNeon(),
      fetchAttendanceFromNeon(),
    ]);

    if (cfg) {
      memAdminConfig = cfg;
    }
    if (emps && emps.length > 0) {
      memEmployees = emps;
    }
    if (tasks) {
      memTasks = tasks;
    }
    if (att) {
      memAttendance = att;
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

  // Initial fetch from Neon
  refreshAllDataFromBackend();

  // Poll Neon database every 4 seconds for instant cross-device updates
  setInterval(() => {
    refreshAllDataFromBackend();
  }, 4000);
}

// Server Actions
export async function syncSaveAdminConfig(config: AdminConfig) {
  memAdminConfig = config;
  notifyDataChanged();
  try {
    await saveAdminConfigToNeon(config);
    await refreshAllDataFromBackend();
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
    await saveEmployeeToNeon(employee);
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Karyawan ke Neon Database:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  memEmployees = memEmployees.filter((e) => e.id !== employeeId);
  notifyDataChanged();

  try {
    await deleteEmployeeFromNeon(employeeId);
    await refreshAllDataFromBackend();
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
    await saveTaskToNeon(task);
    await refreshAllDataFromBackend();
  } catch (err) {
    console.error('Gagal menyimpan Tugas ke Neon Database:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  memTasks = memTasks.filter((t) => t.id !== taskId);
  notifyDataChanged();

  try {
    await deleteTaskFromNeon(taskId);
    await refreshAllDataFromBackend();
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
    await saveAttendanceToNeon(record);
    await refreshAllDataFromBackend();
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



