/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserSession, UserRole, Employee, TaskLocation, AttendanceRecord } from './types';
import {
  getEmployees,
  saveSingleEmployee,
  deleteSingleEmployee,
  getTasks,
  saveSingleTask,
  deleteSingleTask,
  getAttendanceRecords,
  saveAttendanceRecords,
  addSingleAttendanceRecord,
  getCurrentSession,
  setCurrentSession,
  getAdminConfig,
} from './lib/storage';
import { initFirestoreSync, DATA_UPDATED_EVENT } from './lib/firestoreSync';

import { Navbar } from './components/Navbar';
import { CameraModal } from './components/CameraModal';
import { SplashScreen } from './components/SplashScreen';

import { LoginView } from './views/LoginView';
import { KaryawanDashboard } from './views/KaryawanDashboard';
import { KaryawanTugas } from './views/KaryawanTugas';
import { KaryawanIzin } from './views/KaryawanIzin';
import { KaryawanRiwayat } from './views/KaryawanRiwayat';

import { AdminOverview } from './views/AdminOverview';
import { AdminKaryawan } from './views/AdminKaryawan';
import { AdminTugas } from './views/AdminTugas';
import { AdminRekap } from './views/AdminRekap';

export default function App() {
  // 1. Initialize data storage & Firestore real-time sync
  useEffect(() => {
    initFirestoreSync();

    const handleSyncUpdate = () => {
      setEmployees(getEmployees());
      setTasks(getTasks());
      setRecords(getAttendanceRecords());
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleSyncUpdate);
    handleSyncUpdate();

    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleSyncUpdate);
    };
  }, []);

  const [session, setSession] = useState<UserSession | null>(() => getCurrentSession());
  const [activeTab, setActiveTab] = useState<string>(() =>
    session?.role === 'admin' ? 'admin-overview' : 'dashboard'
  );

  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [tasks, setTasks] = useState<TaskLocation[]>(() => getTasks());
  const [records, setRecords] = useState<AttendanceRecord[]>(() => getAttendanceRecords());

  // Camera modal state
  const [absenModalType, setAbsenModalType] = useState<'masuk' | 'pulang' | null>(null);

  // Splash Screen & Login State
  const [showSplash, setShowSplash] = useState(true);

  // Sync tab with role on session change
  const handleLoginSuccess = (newSession: UserSession) => {
    setCurrentSession(newSession);
    setSession(newSession);
    setShowSplash(false);
    if (newSession.role === 'admin') {
      setActiveTab('admin-overview');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentSession(null);
    setSession(null);
    setShowSplash(true);
  };

  const handleSwitchRole = (newRole: 'karyawan' | 'admin') => {
    if (newRole === 'admin') {
      const cfg = getAdminConfig();
      const adminSession: UserSession = {
        id: 'admin-1',
        name: cfg.name,
        username: cfg.username,
        role: 'admin',
      };
      setCurrentSession(adminSession);
      setSession(adminSession);
      setActiveTab('admin-overview');
    } else {
      const defaultEmp = employees[0] || { id: 'emp-101', name: session?.name || 'Karyawan', username: session?.username || 'karyawan' };
      const empSession: UserSession = {
        id: defaultEmp.id,
        name: defaultEmp.name,
        username: defaultEmp.username,
        role: 'karyawan',
        employeeId: defaultEmp.id,
      };
      setCurrentSession(empSession);
      setSession(empSession);
      setActiveTab('dashboard');
    }
  };

  // Handlers for Employees (Direct Firestore realtime)
  const handleSaveEmployee = (emp: Employee) => {
    saveSingleEmployee(emp);
  };

  const handleDeleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    if (
      target?.username.toLowerCase() === 'superuser' ||
      target?.id === 'emp-superuser' ||
      target?.isDeveloper
    ) {
      alert('Akun tidak dapat dihapus. Hubungi Developer.');
      return;
    }
    deleteSingleEmployee(id);
  };

  // Handlers for Tasks (Direct Firestore realtime)
  const handleSaveTask = (task: TaskLocation) => {
    saveSingleTask(task);
  };

  const handleDeleteTask = (id: string) => {
    deleteSingleTask(id);
  };

  // Attendance Handler (Direct Firestore realtime)
  const handleAttendanceSuccess = (newRecord: AttendanceRecord) => {
    addSingleAttendanceRecord(newRecord);
  };

  // Current logged in Employee object if in employee mode
  const currentEmployee: Employee = employees.find((e) => e.id === session?.employeeId) || employees[0] || {
    id: session?.employeeId || 'emp-101',
    name: session?.name || 'Karyawan Baru',
    email: 'karyawan@nasq.co.id',
    username: session?.username || 'karyawan',
    position: 'Karyawan',
    department: 'Operasional',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    masterPhotos: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Assigned active tasks for current employee (tasks remain active until endDate passes)
  const currentAssignedTasks = tasks.filter(
    (t) =>
      t.status === 'aktif' &&
      (!t.endDate || todayStr <= t.endDate) &&
      t.assignedEmployeeIds?.includes(currentEmployee?.id || '')
  );

  const todayEmployeeRecords = records.filter(
    (r) => r.employeeId === currentEmployee?.id && r.dateString === todayStr
  );

  if (!session || showSplash) {
    const config = getAdminConfig();
    return (
      <SplashScreen
        onLoginSuccess={handleLoginSuccess}
        logoUrl={config.companyLogoUrl}
        companyName={config.companyName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-slate-800 selection:text-white">
      {/* Top Navbar Header */}
      <Navbar
        currentSession={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-28">
        {session.role === 'karyawan' ? (
          <>
            {activeTab === 'dashboard' && (
              <KaryawanDashboard
                employee={currentEmployee}
                todayRecords={todayEmployeeRecords}
                assignedTasks={currentAssignedTasks}
                onOpenAbsenModal={(type) => setAbsenModalType(type)}
                onNavigateToHistory={() => setActiveTab('riwayat')}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onAttendanceSubmit={handleAttendanceSuccess}
              />
            )}

            {activeTab === 'tugas-saya' && (
              <KaryawanTugas
                employee={currentEmployee}
                assignedTasks={currentAssignedTasks}
              />
            )}

            {activeTab === 'izin' && (
              <KaryawanIzin
                employee={currentEmployee}
                assignedTasks={currentAssignedTasks}
                todayRecords={todayEmployeeRecords}
                onSubmitSuccess={handleAttendanceSuccess}
              />
            )}

            {activeTab === 'riwayat' && (
              <KaryawanRiwayat
                employee={currentEmployee}
                records={records}
                tasks={tasks}
              />
            )}
          </>
        ) : (
          <>
            {activeTab === 'admin-overview' && (
              <AdminOverview
                employees={employees}
                tasks={tasks}
                records={records}
                onNavigateTab={setActiveTab}
                onPreviewSplashScreen={() => setShowSplash(true)}
              />
            )}

            {activeTab === 'admin-karyawan' && (
              <AdminKaryawan
                employees={employees}
                onSaveEmployee={handleSaveEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}

            {activeTab === 'admin-tugas' && (
              <AdminTugas
                tasks={tasks}
                employees={employees}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'admin-rekap' && (
              <AdminRekap
                records={records}
                employees={employees}
                tasks={tasks}
                onRecordsUpdated={(updated) => {
                  setRecords(updated);
                  saveAttendanceRecords(updated);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Front Camera Face Verification Modal */}
      {absenModalType && (
        <CameraModal
          type={absenModalType}
          employee={currentEmployee}
          assignedTasks={currentAssignedTasks}
          onSuccess={(record) => {
            handleAttendanceSuccess(record);
          }}
          onClose={() => setAbsenModalType(null)}
        />
      )}
    </div>
  );
}
