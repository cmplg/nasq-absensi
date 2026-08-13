import React, { useState } from 'react';
import { Employee, TaskLocation, AttendanceRecord } from '../types';
import { formatIndonesianDate } from '../lib/geo';
import { getAdminConfig, saveAdminConfig } from '../lib/storage';
import {
  Users,
  UserCheck,
  Clock,
  Briefcase,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  MapPin,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
} from 'lucide-react';

interface AdminOverviewProps {
  employees: Employee[];
  tasks: TaskLocation[];
  records: AttendanceRecord[];
  onNavigateTab: (tab: string) => void;
}

export function AdminOverview({
  employees,
  tasks,
  records,
  onNavigateTab,
}: AdminOverviewProps) {
  const activeEmployees = employees.filter((e) => e.isActive);
  const todayStr = new Date().toISOString().split('T')[0];

  const todayRecords = records.filter((r) => r.dateString === todayStr);
  const todayMasukRecords = todayRecords.filter((r) => r.type === 'masuk');

  const totalHadir = todayMasukRecords.length;
  const totalTepatWaktu = todayMasukRecords.filter((r) => r.status === 'tepat_waktu').length;
  const totalTelat = todayMasukRecords.filter((r) => r.status === 'terlambat').length;
  const totalBelumAbsen = Math.max(0, activeEmployees.length - totalHadir);
  const activeTasksCount = tasks.filter((t) => t.status === 'aktif').length;

  const hadirPercentage = activeEmployees.length > 0 ? Math.round((totalHadir / activeEmployees.length) * 100) : 0;

  // Admin Account Editing State
  const [adminConfig, setAdminConfigState] = useState(() => getAdminConfig());
  const [newUsername, setNewUsername] = useState(adminConfig.username);
  const [newPassword, setNewPassword] = useState(adminConfig.password);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSaveAdminConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    const updated = {
      ...adminConfig,
      username: newUsername.trim(),
      password: newPassword.trim(),
    };
    saveAdminConfig(updated);
    setAdminConfigState(updated);
    setSaveSuccessMsg('Username dan kata sandi admin berhasil diperbarui!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner - Warm Greeting Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 uppercase tracking-wider">
              Portal Admin NASQ
            </span>
            <span className="text-slate-400 text-xs font-medium">• {formatIndonesianDate(new Date())}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
            Ringkasan Kehadiran Tim 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Pantau kehadiran karyawan, validasi lokasi penugasan, dan kelola laporan absensi harian secara mudah.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateTab('admin-karyawan')}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition flex items-center space-x-2 border border-slate-200"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Tambah Karyawan</span>
          </button>
          <button
            onClick={() => onNavigateTab('admin-rekap')}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Rekap CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Karyawan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karyawan Aktif</span>
            <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">{activeEmployees.length}</span>
            <span className="text-xs text-slate-500 font-semibold ml-2">Personel Terdaftar</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Tim terdata dalam sistem NASQ</p>
        </div>

        {/* Card 2: Sudah Absen Datang */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hadir Hari Ini</span>
            <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600">{totalHadir}</span>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {hadirPercentage}% Kehadiran
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {totalTepatWaktu} tepat waktu, {totalTelat} terlambat
          </p>
        </div>

        {/* Card 3: Belum Absen */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Presensi</span>
            <div className="w-11 h-11 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600">{totalBelumAbsen}</span>
            <span className="text-xs text-slate-500 font-semibold">Orang</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Belum melakukan presensi datang</p>
        </div>

        {/* Card 4: Tugas Berjalan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lokasi Penugasan</span>
            <div className="w-11 h-11 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-indigo-600">{activeTasksCount}</span>
            <span className="text-xs text-slate-500 font-semibold">Titik Aktif</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Penugasan dengan verifikasi GPS</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Progress Breakdown Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Rasio Kehadiran</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Custom Multi-Color Progress Bar */}
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/70">
              <div
                style={{ width: `${activeEmployees.length > 0 ? (totalTepatWaktu / activeEmployees.length) * 100 : 0}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title="Tepat Waktu"
              ></div>
              <div
                style={{ width: `${activeEmployees.length > 0 ? (totalTelat / activeEmployees.length) * 100 : 0}%` }}
                className="bg-amber-500 transition-all duration-500"
                title="Terlambat"
              ></div>
              <div
                style={{ width: `${activeEmployees.length > 0 ? (totalBelumAbsen / activeEmployees.length) * 100 : 0}%` }}
                className="bg-slate-300 transition-all duration-500"
                title="Belum Absen"
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="block font-black text-emerald-800 text-lg">{totalTepatWaktu}</span>
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase">Tepat Waktu</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="block font-black text-amber-800 text-lg">{totalTelat}</span>
                <span className="text-[10px] font-extrabold text-amber-800 uppercase">Terlambat</span>
              </div>
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="block font-black text-slate-800 text-lg">{totalBelumAbsen}</span>
                <span className="text-[10px] font-extrabold text-slate-600 uppercase">Belum Absen</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigasi Cepat:</p>
            <button
              onClick={() => onNavigateTab('admin-tugas')}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-bold text-xs flex items-center justify-between border border-slate-200/80 transition"
            >
              <span>Atur Lokasi Tugas &amp; Radius GPS</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigateTab('admin-rekap')}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-bold text-xs flex items-center justify-between border border-slate-200/80 transition"
            >
              <span>Rekapitulasi Absensi Lengkap</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Real-time Activity Log Feed */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Aktivitas Presensi Terbaru</span>
            </h3>
            <button
              onClick={() => onNavigateTab('admin-rekap')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 uppercase tracking-wider flex items-center"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {records.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Belum Ada Aktivitas Presensi Hari Ini</p>
              <p className="text-slate-400">Presensi karyawan akan muncul secara real-time di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    <img
                      src={r.verifiedPhoto}
                      alt="Verifikasi"
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs bg-slate-100"
                    />
                    <div className="truncate space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-sm truncate">{r.employeeName}</span>
                      </div>
                      <p className="text-slate-600 text-xs truncate">
                        {r.taskTitle || 'Kantor NASQ'} • <span className="font-mono text-slate-800 font-bold">{r.timeString} WIB</span>
                      </p>
                      <p className="text-slate-400 text-[11px] flex items-center space-x-1 truncate font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{r.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {r.status === 'tepat_waktu' ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200">
                        Tepat Waktu
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border border-amber-200">
                        Terlambat
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Sistem verifikasi ganda: Foto Verifikasi Wajah + Titik Koordinat GPS
            </p>
          </div>
        </div>
      </div>

      {/* Admin Account Settings Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Pengaturan Akun Administrator</h3>
              <p className="text-xs text-slate-500 font-medium">
                Ubah username dan kata sandi login untuk akun administrator HRD
              </p>
            </div>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-2.5 font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAdminConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Username Admin</span>
            </label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username admin..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Kata Sandi Admin</span>
            </label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kata sandi admin..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition shadow-sm flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan Perubahan Akun</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
