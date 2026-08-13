import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
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

  // 1. Realtime Sync Admin Config
  onSnapshot(
    doc(db, 'adminConfig', 'main'),
    (docSnap) => {
      if (docSnap.exists()) {
        memAdminConfig = docSnap.data() as AdminConfig;
        notifyDataChanged();
      }
    },
    (err) => console.warn('Firestore adminConfig sync warning:', err)
  );

  // 2. Realtime Sync Employees
  onSnapshot(
    collection(db, 'employees'),
    (snapshot) => {
      const employees: Employee[] = [];
      snapshot.forEach((docSnap) => {
        employees.push(docSnap.data() as Employee);
      });

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
      notifyDataChanged();
    },
    (err) => console.warn('Firestore employees sync warning:', err)
  );

  // 3. Realtime Sync Tasks
  onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      const tasks: TaskLocation[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(docSnap.data() as TaskLocation);
      });
      memTasks = tasks;
      notifyDataChanged();
    },
    (err) => console.warn('Firestore tasks sync warning:', err)
  );

  // 4. Realtime Sync Attendance Records
  onSnapshot(
    collection(db, 'attendance'),
    (snapshot) => {
      const records: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as AttendanceRecord);
      });
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      memAttendance = records;
      notifyDataChanged();
    },
    (err) => console.warn('Firestore attendance sync warning:', err)
  );

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
    await setDoc(doc(db, 'adminConfig', 'main'), config);
  } catch (err) {
    console.error('Gagal menyimpan Admin Config ke Firestore:', err);
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
    await setDoc(doc(db, 'employees', employee.id), employee);
  } catch (err) {
    console.error('Gagal menyimpan Karyawan ke Firestore:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  memEmployees = memEmployees.filter((e) => e.id !== employeeId);
  notifyDataChanged();

  try {
    await deleteDoc(doc(db, 'employees', employeeId));
  } catch (err) {
    console.error('Gagal menghapus Karyawan dari Firestore:', err);
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
    await setDoc(doc(db, 'tasks', task.id), task);
  } catch (err) {
    console.error('Gagal menyimpan Tugas ke Firestore:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  memTasks = memTasks.filter((t) => t.id !== taskId);
  notifyDataChanged();

  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    console.error('Gagal menghapus Tugas dari Firestore:', err);
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
    await setDoc(doc(db, 'attendance', record.id), record);
  } catch (err) {
    console.error('Gagal menyimpan Presensi ke Firestore:', err);
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
    const snapshot = await getDocs(collection(db, 'employees'));
    const employees: Employee[] = [];
    snapshot.forEach((docSnap) => {
      employees.push(docSnap.data() as Employee);
    });

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
  } catch (err) {
    console.warn('Gagal mengambil data karyawan langsung dari Firestore:', err);
  }
  return getLiveEmployees();
}

export async function fetchAdminConfigDirectFromFirestore(): Promise<AdminConfig> {
  try {
    const docSnap = await getDoc(doc(db, 'adminConfig', 'main'));
    if (docSnap.exists()) {
      memAdminConfig = docSnap.data() as AdminConfig;
      notifyDataChanged();
      return memAdminConfig;
    }
  } catch (err) {
    console.warn('Gagal mengambil konfigurasi Admin langsung dari Firestore:', err);
  }
  return getLiveAdminConfig();
}

