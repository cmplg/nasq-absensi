import { Employee, TaskLocation, AttendanceRecord } from '../types';
import { formatIndonesianDate } from '../lib/geo';
import {
  Users,
  UserCheck,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowRight,
  MapPin,
  TrendingUp,
  Calendar,
  Shield,
} from 'lucide-react';

interface AdminOverviewProps {
  employees: Employee[];
  tasks: TaskLocation[];
  records: AttendanceRecord[];
  onNavigateTab: (tab: string) => void;
  onPreviewSplashScreen?: () => void;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner - Warm Greeting Card */}
      <div className="bg-[#ede6ce] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#ded6be] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#dfd6bc] text-stone-800 text-[11px] font-extrabold rounded-lg border border-[#cfc5aa]">
                <Shield className="w-3 h-3 text-stone-700" />
                <span>Portal Admin</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-white/70 text-stone-700 text-[11px] font-bold rounded-lg border border-[#ded6be]">
                <Calendar className="w-3 h-3 text-stone-500" />
                <span>{formatIndonesianDate(new Date())}</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-stone-900 pt-0.5">
              Ringkasan Presensi &amp; Aktivitas Tim
            </h2>
            <p className="text-xs sm:text-[13px] text-stone-700 font-medium leading-relaxed">
              Monitoring absensi karyawan, validasi koordinat penugasan GPS, dan status operasional harian.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2 self-start sm:self-center">
            <span className="px-3 py-1.5 bg-white/80 rounded-xl border border-[#ded6be] text-[11px] font-extrabold text-stone-800 flex items-center space-x-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sistem Aktif</span>
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid - Compact with Distinct Pastel Palettes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Karyawan - #a7d3f1 */}
        <div className="bg-[#a7d3f1] p-3.5 sm:p-4 rounded-2xl border border-[#93c4e6] shadow-2xs space-y-1.5 transition hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-sky-950 uppercase tracking-wider">Karyawan</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/70 text-sky-900 rounded-xl flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-sky-950">{activeEmployees.length}</span>
            <span className="text-[10px] text-sky-900 font-bold">Orang</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-sky-900/80 font-semibold truncate">Personel Aktif Terdaftar</p>
        </div>

        {/* Card 2: Sudah Absen Datang - #c5f5e0 */}
        <div className="bg-[#c5f5e0] p-3.5 sm:p-4 rounded-2xl border border-[#b0ebd0] shadow-2xs space-y-1.5 transition hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Hadir Hari Ini</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/70 text-emerald-900 rounded-xl flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-950">{totalHadir}</span>
            <span className="text-[10px] font-extrabold text-emerald-950 bg-white/80 px-1.5 py-0.5 rounded-md border border-emerald-300/80">
              {hadirPercentage}%
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-emerald-900/80 font-semibold truncate">
            {totalTepatWaktu} Tepat, {totalTelat} Telat
          </p>
        </div>

        {/* Card 3: Belum Absen - #fcdcd2 */}
        <div className="bg-[#fcdcd2] p-3.5 sm:p-4 rounded-2xl border border-[#f3c8bc] shadow-2xs space-y-1.5 transition hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-rose-950 uppercase tracking-wider">Belum Absen</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/70 text-rose-900 rounded-xl flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-950">{totalBelumAbsen}</span>
            <span className="text-[10px] text-rose-900 font-bold">Orang</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-rose-900/80 font-semibold truncate">Belum Presensi Datang</p>
        </div>

        {/* Card 4: Jobs Aktif - #f4e0f7 */}
        <div className="bg-[#f4e0f7] p-3.5 sm:p-4 rounded-2xl border border-[#e4cce8] shadow-2xs space-y-1.5 transition hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-purple-950 uppercase tracking-wider">Jobs Aktif</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/70 text-purple-900 rounded-xl flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-purple-950">{activeTasksCount}</span>
            <span className="text-[10px] text-purple-900 font-bold">Titik</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-purple-900/80 font-semibold truncate">Lokasi Validasi GPS</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Visual Progress Breakdown Card - #ffdfdf */}
        <div className="bg-[#ffdfdf] p-4 sm:p-5 rounded-3xl border border-[#f3c8c8] shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#f3c8c8]/80 pb-2.5">
              <h3 className="font-black text-rose-950 text-xs sm:text-sm flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-rose-700" />
                <span>Rasio Kehadiran</span>
              </h3>
              <span className="text-[11px] font-extrabold text-rose-950 bg-white/70 px-2 py-0.5 rounded-lg border border-rose-200">
                {hadirPercentage}% Total
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Custom Multi-Color Progress Bar */}
              <div className="h-2.5 bg-white/80 rounded-full overflow-hidden flex shadow-inner border border-rose-200">
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
                  className="bg-rose-300 transition-all duration-500"
                  title="Belum Absen"
                ></div>
              </div>

              {/* 3 Metric Pills with Clean Balanced Proportions */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Sub-card 1: Tepat - #ceffe6 */}
                <div className="py-2 px-1.5 bg-[#ceffe6] rounded-xl border border-[#b4f3d2] shadow-2xs">
                  <span className="block font-black text-emerald-950 text-base leading-tight">{totalTepatWaktu}</span>
                  <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-tight">Tepat</span>
                </div>
                {/* Sub-card 2: Telat - #fff4cd */}
                <div className="py-2 px-1.5 bg-[#fff4cd] rounded-xl border border-[#fae8a8] shadow-2xs">
                  <span className="block font-black text-amber-950 text-base leading-tight">{totalTelat}</span>
                  <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-tight">Telat</span>
                </div>
                {/* Sub-card 3: Belum - #ffb9b9 */}
                <div className="py-2 px-1.5 bg-[#ffb9b9] rounded-xl border border-[#fca5a5] shadow-2xs">
                  <span className="block font-black text-rose-950 text-base leading-tight">{totalBelumAbsen}</span>
                  <span className="text-[10px] font-extrabold text-rose-950 uppercase tracking-tight">Belum</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f3c8c8]/60 text-[11px] text-rose-900/80 font-medium text-center">
            Total {activeEmployees.length} personel terdaftar
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
                    {r.verifiedPhoto && r.verifiedPhoto.trim() !== '' ? (
                      <img
                        src={r.verifiedPhoto}
                        alt="Verifikasi"
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs bg-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                        No Foto
                      </div>
                    )}
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
    </div>
  );
}
