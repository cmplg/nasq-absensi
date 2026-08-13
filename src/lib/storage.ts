import { Employee, TaskLocation, AttendanceRecord, UserSession } from '../types';

export interface AdminConfig {
  username: string;
  password: string;
  name: string;
}

const STORAGE_KEYS = {
  EMPLOYEES: 'nasq_employees_v2',
  TASKS: 'nasq_tasks_v2',
  ATTENDANCE: 'nasq_attendance_v2',
  SESSION: 'nasq_session_v2',
  ADMIN_CONFIG: 'nasq_admin_config_v2',
};

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
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
  masterPhotos: ['data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="150" cy="110" r="55" fill="%231e293b"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="28" fill="%2310b981" text-anchor="middle">SU</text></svg>'],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  isDeveloper: true,
};

const DEFAULT_EMPLOYEES: Employee[] = [SUPERUSER_EMPLOYEE];
const DEFAULT_TASKS: TaskLocation[] = [];
const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

export function getAdminConfig(): AdminConfig {
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_CONFIG);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(DEFAULT_ADMIN_CONFIG));
  return DEFAULT_ADMIN_CONFIG;
}

export function saveAdminConfig(config: AdminConfig) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(config));
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(DEFAULT_ADMIN_CONFIG));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(DEFAULT_ATTENDANCE));
  }
}

// Data Getters & Setters
export function getEmployees(): Employee[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  let list: Employee[] = raw ? JSON.parse(raw) : DEFAULT_EMPLOYEES;

  const hasSuperuser = list.some(
    (e) => e.username.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
  );

  if (!hasSuperuser) {
    list = [SUPERUSER_EMPLOYEE, ...list];
  } else {
    // Always enforce superuser password ultra and isActive true
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
  }

  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));
  return list;
}

export function saveEmployees(employees: Employee[]) {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

export function getTasks(): TaskLocation[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
  return raw ? JSON.parse(raw) : DEFAULT_TASKS;
}

export function saveTasks(tasks: TaskLocation[]) {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function getAttendanceRecords(): AttendanceRecord[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return raw ? JSON.parse(raw) : DEFAULT_ATTENDANCE;
}

export function saveAttendanceRecords(records: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
}

// Session Management
export function getCurrentSession(): UserSession | null {
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function setCurrentSession(session: UserSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

// Export CSV report generator with complete details
export function exportAttendanceToCSV(records: AttendanceRecord[]) {
  const headers = [
    'ID Presensi',
    'Nama Karyawan',
    'Jabatan',
    'Tipe Presensi',
    'Tanggal',
    'Jam WIB',
    'Status Presensi',
    'Alasan Pulang Cepat / Notes',
    'Alamat Lokasi GPS',
    'Nama Lokasi Penugasan',
    'Koordinat GPS',
  ];
  
  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.employeeName}"`,
    `"${r.employeePosition}"`,
    `"${r.type === 'masuk' ? 'Absen Datang' : r.type === 'pulang' ? 'Absen Pulang' : 'Izin'}"`,
    `"${r.dateString}"`,
    `"${r.timeString}"`,
    `"${r.status === 'tepat_waktu' ? 'Tepat Waktu' : r.status === 'terlambat' ? 'Terlambat' : r.status === 'pulang_cepat' ? 'Pulang Lebih Awal' : 'Izin'}"`,
    `"${(r.earlyReasonCategory ? (r.earlyReasonCategory + (r.earlyReasonNotes ? ' - ' + r.earlyReasonNotes : '')) : (r.notes || '-')).replace(/"/g, '""')}"`,
    `"${r.address.replace(/"/g, '""')}"`,
    `"${(r.taskTitle || 'Presensi Regular').replace(/"/g, '""')}"`,
    `"${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Absensi_NASQ_${getTodayString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
