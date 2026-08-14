import { Employee, TaskLocation, AttendanceRecord, UserSession } from '../types';
import {
  AdminConfig,
  SUPERUSER_EMPLOYEE,
  DEFAULT_ADMIN_CONFIG,
  getLiveAdminConfig,
  getLiveEmployees,
  getLiveTasks,
  getLiveAttendance,
  syncSaveAdminConfig,
  syncSaveEmployee,
  syncDeleteEmployee,
  syncSaveEmployees,
  syncSaveTask,
  syncDeleteTask,
  syncSaveTasks,
  syncAddAttendanceRecord,
  syncSaveAttendanceRecords,
} from './firestoreSync';

export type { AdminConfig };
export { SUPERUSER_EMPLOYEE, DEFAULT_ADMIN_CONFIG };

const SESSION_KEY = 'nasq_session_v2';

export function getAdminConfig(): AdminConfig {
  return getLiveAdminConfig();
}

export function saveAdminConfig(config: AdminConfig) {
  syncSaveAdminConfig(config);
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function initializeStorage() {
  // Session storage initialization if needed
}

// Data Getters & Setters - Strictly Database-driven
export function getEmployees(): Employee[] {
  return getLiveEmployees();
}

export function saveEmployees(employees: Employee[]) {
  syncSaveEmployees(employees);
}

export function saveSingleEmployee(employee: Employee) {
  syncSaveEmployee(employee);
}

export function deleteSingleEmployee(employeeId: string) {
  syncDeleteEmployee(employeeId);
}

export function getTasks(): TaskLocation[] {
  return getLiveTasks();
}

export function saveTasks(tasks: TaskLocation[]) {
  syncSaveTasks(tasks);
}

export function saveSingleTask(task: TaskLocation) {
  syncSaveTask(task);
}

export function deleteSingleTask(taskId: string) {
  syncDeleteTask(taskId);
}

export function getAttendanceRecords(): AttendanceRecord[] {
  return getLiveAttendance();
}

export function saveAttendanceRecords(records: AttendanceRecord[]) {
  syncSaveAttendanceRecords(records);
}

export function addSingleAttendanceRecord(record: AttendanceRecord) {
  syncAddAttendanceRecord(record);
}

// Inactivity Configuration (Configurable from Company Settings)
export function getInactivityTimeoutMinutes(): number {
  const cfg = getAdminConfig();
  const val = cfg.inactivityTimeoutMinutes;
  return typeof val === 'number' && val > 0 ? val : 15;
}

export function getInactivityTimeoutMs(): number {
  return getInactivityTimeoutMinutes() * 60 * 1000;
}

const LAST_ACTIVITY_KEY = 'nasq_last_activity_v2';

export function recordUserActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function getLastActivityTimestamp(): number {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  return raw ? parseInt(raw, 10) || Date.now() : Date.now();
}

export function isSessionExpiredDueToInactivity(): boolean {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return false;
  const lastActive = parseInt(raw, 10);
  if (isNaN(lastActive)) return false;
  return Date.now() - lastActive > getInactivityTimeoutMs();
}

// User Session Management (Browser Tab session state)
export function getCurrentSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    // Check if session has expired due to inactivity
    if (isSessionExpiredDueToInactivity()) {
      setCurrentSession(null);
      return null;
    }
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
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
    `"${(r.earlyReasonCategory ? r.earlyReasonCategory + (r.earlyReasonNotes ? ' - ' + r.earlyReasonNotes : '') : r.notes || '-').replace(/"/g, '""')}"`,
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
