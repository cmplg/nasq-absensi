import { useState } from 'react';
import { Employee, AttendanceRecord, TaskLocation } from '../types';
import { formatIndonesianDate } from '../lib/geo';
import { printRekapPDF, RekapExportData } from '../lib/exportUtils';
import { WhatsAppShareModal } from '../components/WhatsAppShareModal';
import { exportAttendanceToCSV } from '../lib/storage';
import {
  Calendar,
  Filter,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Search,
  Eye,
  X,
  Building,
  Navigation,
  Share2,
  Printer,
  Download,
} from 'lucide-react';

interface KaryawanRiwayatProps {
  employee: Employee;
  records: AttendanceRecord[];
  tasks: TaskLocation[];
}

export function KaryawanRiwayat({ employee, records, tasks }: KaryawanRiwayatProps) {
  const [activeTab, setActiveTab] = useState<'riwayat' | 'tugas'>('riwayat');
  const [filterPeriod, setFilterPeriod] = useState<'semua' | 'hari_ini' | 'bulan_ini'>('semua');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showWAShareModal, setShowWAShareModal] = useState<boolean>(false);

  const empRecords = records
    .filter((r) => r.employeeId === employee.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  const filteredRecords = empRecords.filter((r) => {
    if (filterPeriod === 'hari_ini') return r.dateString === todayStr;
    if (filterPeriod === 'bulan_ini') return r.dateString.startsWith(currentMonthStr);
    return true;
  });

  const empTasks = tasks.filter((t) => t.assignedEmployeeIds.includes(employee.id));

  // Export metrics calculation
  const uniqueDays = new Set(filteredRecords.map((r) => r.dateString)).size;
  let totalMinutesWorked = 0;
  const datePairs: Record<string, { masuk?: string; pulang?: string }> = {};

  filteredRecords.forEach((r) => {
    if (!datePairs[r.dateString]) datePairs[r.dateString] = {};
    if (r.type === 'masuk') datePairs[r.dateString].masuk = r.timestamp;
    else if (r.type === 'pulang') datePairs[r.dateString].pulang = r.timestamp;
  });

  Object.values(datePairs).forEach((pair) => {
    if (pair.masuk && pair.pulang) {
      const startMs = new Date(pair.masuk).getTime();
      const endMs = new Date(pair.pulang).getTime();
      if (endMs > startMs) {
        totalMinutesWorked += Math.round((endMs - startMs) / (1000 * 60));
      }
    }
  });

  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const remainingMinsWorked = totalMinutesWorked % 60;

  const totalMasuk = filteredRecords.filter((r) => r.type === 'masuk').length;
  const totalTepat = filteredRecords.filter((r) => r.status === 'tepat_waktu' && r.type === 'masuk').length;
  const totalTelat = filteredRecords.filter((r) => r.status === 'terlambat' && r.type === 'masuk').length;
  const totalPulangCepat = filteredRecords.filter((r) => r.status === 'pulang_cepat' || !!r.earlyReasonCategory).length;
  const totalIzin = filteredRecords.filter((r) => r.type === 'izin' || r.status === 'izin').length;

  const exportData: RekapExportData = {
    title: `Rekap Presensi Karyawan - ${employee.name}`,
    filterLabel: filterPeriod === 'hari_ini' ? 'Hari Ini' : filterPeriod === 'bulan_ini' ? 'Bulan Ini' : 'Semua Periode',
    employeeName: employee.name,
    uniqueDays,
    totalHoursWorked,
    remainingMinsWorked,
    totalMasuk,
    totalTepat,
    totalTelat,
    totalPulangCepat,
    totalIzin,
    records: filteredRecords,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Riwayat Presensi &amp; Tugas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kehadiran dan penugasan lapangan pribadi untuk {employee.name}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'riwayat'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Absensi
          </button>
          <button
            onClick={() => setActiveTab('tugas')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'tugas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Tugas ({empTasks.length})
          </button>
        </div>
      </div>

      {activeTab === 'riwayat' ? (
        <div className="space-y-4">
          {/* Filters & Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 text-xs gap-3">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Filter Periode:</span>
              <div className="flex space-x-1.5 ml-1">
                <button
                  onClick={() => setFilterPeriod('semua')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    filterPeriod === 'semua'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterPeriod('hari_ini')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    filterPeriod === 'hari_ini'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setFilterPeriod('bulan_ini')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    filterPeriod === 'bulan_ini'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowWAShareModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition flex items-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Share WA</span>
              </button>

              <button
                type="button"
                onClick={() => printRekapPDF(exportData)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl transition flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cetak PDF</span>
              </button>
            </div>
          </div>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 text-slate-500 text-xs">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Belum ada riwayat presensi.</p>
              <p>Riwayat absensi harian Anda akan ditampilkan secara otomatis di sini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-3.5">
                    {r.verifiedPhoto && r.verifiedPhoto.trim() !== '' ? (
                      <img
                        src={r.verifiedPhoto}
                        alt="Foto Presensi"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                        No Foto
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {r.type === 'masuk' ? 'Absen Datang' : 'Absen Pulang'}
                        </span>
                        {r.status === 'tepat_waktu' ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Tepat Waktu
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            Terlambat
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 font-medium">
                        {formatIndonesianDate(r.timestamp)} • <span className="font-mono text-slate-700 font-bold">{r.timeString} WIB</span>
                      </p>

                      <p className="flex items-center space-x-1 text-slate-500 text-[11px] truncate max-w-md">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{r.address}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRecord(r)}
                    className="self-end sm:self-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold flex items-center space-x-1.5 text-xs transition border border-slate-200 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tasks List Tab */
        <div className="space-y-4">
          {empTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 text-slate-500 text-xs">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Belum ada penugasan lapangan khusus.</p>
              <p>Admin akan mendaftarkan tugas dan lokasi presensi penugasan Anda di sini.</p>
            </div>
          ) : (
            empTasks.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5 text-xs">
                {/* Location photo banner if uploaded */}
                {t.locationPhoto && t.locationPhoto.trim() !== '' ? (
                  <div className="relative rounded-2xl overflow-hidden h-40 w-full border border-slate-200 shadow-inner group">
                    <img
                      src={t.locationPhoto}
                      alt={`Foto Lokasi ${t.title}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[11px] font-black text-white bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20">
                        📍 Foto Patokan Lokasi Gedung
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                        t.status === 'aktif' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Tugas {t.status === 'aktif' ? 'Aktif' : 'Selesai'}
                      </span>
                      <span className="text-slate-400 font-bold text-[11px]">
                        Radius Valid: {t.radiusMeters} Meter
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base">{t.title}</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">{t.description}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-slate-600">
                  <p className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">{t.address}</span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        GPS: {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
                      </p>
                    </div>
                  </p>
                  <p className="flex items-center space-x-2 text-slate-500 text-[11px] border-t border-slate-200/60 pt-1.5 mt-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Periode Penugasan: {t.startDate} s.d {t.endDate}</span>
                  </p>
                </div>

                {/* Open Navigation in Google Maps */}
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`,
                      '_blank'
                    )
                  }
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition text-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Petunjuk Navigasi Rute (Google Maps)</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Detail Verifikasi Presensi</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedRecord.verifiedPhoto && selectedRecord.verifiedPhoto.trim() !== '' ? (
              <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <img
                  src={selectedRecord.verifiedPhoto}
                  alt="Verifikasi"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-sm"
                />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{selectedRecord.employeeName}</p>
                  <p className="text-slate-500">{selectedRecord.employeePosition}</p>
                  <p className="font-mono text-slate-700 font-bold text-xs">
                    {formatIndonesianDate(selectedRecord.timestamp)} • {selectedRecord.timeString} WIB
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 border-t border-slate-100 pt-3 text-slate-700">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Tipe Presensi</p>
                <p className="font-semibold text-slate-900 capitalize">
                  {selectedRecord.type === 'masuk' ? 'Absen Datang' : 'Absen Pulang'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Lokasi GPS Terverifikasi</p>
                <p className="font-medium text-slate-800">{selectedRecord.address}</p>
                <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                  Lat: {selectedRecord.latitude.toFixed(6)}, Lng: {selectedRecord.longitude.toFixed(6)}
                </p>
              </div>
              {selectedRecord.taskTitle && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Lokasi Penugasan</p>
                  <p className="font-semibold text-slate-900">{selectedRecord.taskTitle}</p>
                  {selectedRecord.distanceFromTaskMeters !== undefined && (
                    <p className="text-emerald-700 font-medium text-[11px]">
                      Jarak dari titik lokasi: ±{selectedRecord.distanceFromTaskMeters} meter
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWAShareModal}
        onClose={() => setShowWAShareModal(false)}
        data={exportData}
      />
    </div>
  );
}
