import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee, TaskLocation, AttendanceRecord } from '../types';
import { AdminConfig, SUPERUSER_EMPLOYEE } from './storage';

const STORAGE_KEYS = {
  EMPLOYEES: 'nasq_employees_v2',
  TASKS: 'nasq_tasks_v2',
  ATTENDANCE: 'nasq_attendance_v2',
  ADMIN_CONFIG: 'nasq_admin_config_v2',
};

export const DATA_UPDATED_EVENT = 'nasq_data_updated';

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
}

let isSyncInitialized = false;

export function initFirestoreSync() {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  // 1. Sync Admin Config
  onSnapshot(
    doc(db, 'adminConfig', 'main'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AdminConfig;
        localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(data));
        notifyDataChanged();
      }
    },
    (err) => console.warn('Firestore adminConfig sync warning:', err)
  );

  // 2. Sync Employees
  onSnapshot(
    collection(db, 'employees'),
    (snapshot) => {
      const employees: Employee[] = [];
      snapshot.forEach((docSnap) => {
        employees.push(docSnap.data() as Employee);
      });

      if (employees.length > 0) {
        // Enforce superuser presence and password
        const hasSuperuser = employees.some(
          (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
        );
        let list = hasSuperuser ? employees : [SUPERUSER_EMPLOYEE, ...employees];
        list = list.map((e) => {
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

        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));
        notifyDataChanged();
      }
    },
    (err) => console.warn('Firestore employees sync warning:', err)
  );

  // 3. Sync Tasks
  onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      const tasks: TaskLocation[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(docSnap.data() as TaskLocation);
      });
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      notifyDataChanged();
    },
    (err) => console.warn('Firestore tasks sync warning:', err)
  );

  // 4. Sync Attendance
  onSnapshot(
    collection(db, 'attendance'),
    (snapshot) => {
      const records: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as AttendanceRecord);
      });
      // Sort newest first
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
      notifyDataChanged();
    },
    (err) => console.warn('Firestore attendance sync warning:', err)
  );

  // Initial seed check if database is empty
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
      const defaultConfig: AdminConfig = {
        username: 'admin',
        password: 'testadmin',
        name: 'Administrator NASQ',
      };
      await setDoc(doc(db, 'adminConfig', 'main'), defaultConfig);
    }
  } catch (err) {
    console.warn('Initial Firestore seed error:', err);
  }
}

// Firestore Writer Functions
export async function syncSaveAdminConfig(config: AdminConfig) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(config));
  try {
    await setDoc(doc(db, 'adminConfig', 'main'), config);
  } catch (err) {
    console.error('Gagal menyimpan Admin Config ke Firestore:', err);
  }
}

export async function syncSaveEmployee(employee: Employee) {
  try {
    await setDoc(doc(db, 'employees', employee.id), employee);
  } catch (err) {
    console.error('Gagal menyimpan Employee ke Firestore:', err);
  }
}

export async function syncDeleteEmployee(employeeId: string) {
  try {
    await deleteDoc(doc(db, 'employees', employeeId));
  } catch (err) {
    console.error('Gagal menghapus Employee dari Firestore:', err);
  }
}

export async function syncSaveEmployees(employees: Employee[]) {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  for (const emp of employees) {
    await syncSaveEmployee(emp);
  }
}

export async function syncSaveTask(task: TaskLocation) {
  try {
    await setDoc(doc(db, 'tasks', task.id), task);
  } catch (err) {
    console.error('Gagal menyimpan Task ke Firestore:', err);
  }
}

export async function syncDeleteTask(taskId: string) {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    console.error('Gagal menghapus Task dari Firestore:', err);
  }
}

export async function syncSaveTasks(tasks: TaskLocation[]) {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  for (const t of tasks) {
    await syncSaveTask(t);
  }
}

export async function syncAddAttendanceRecord(record: AttendanceRecord) {
  try {
    await setDoc(doc(db, 'attendance', record.id), record);
  } catch (err) {
    console.error('Gagal menyimpan Presensi ke Firestore:', err);
  }
}

export async function syncSaveAttendanceRecords(records: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  for (const r of records) {
    await syncAddAttendanceRecord(r);
  }
}
