import { useState } from 'react';
import { AttendanceRecord, Employee, TaskLocation } from '../types';
import { exportAttendanceToCSV } from '../lib/storage';
import { printRekapPDF, RekapExportData } from '../lib/exportUtils';
import { WhatsAppShareModal } from '../components/WhatsAppShareModal';
import { formatIndonesianDate } from '../lib/geo';
import { MapView } from '../components/MapView';
import {
  Search,
  Filter,
  Download,
  Eye,
  MapPin,
  CheckCircle2,
  Clock,
  X,
  UserCheck,
  Calendar,
  AlertTriangle,
  Briefcase,
  FileText,
  User,
  Share2,
  Printer,
} from 'lucide-react';

interface AdminRekapProps {
  records: AttendanceRecord[];
  employees: Employee[];
  tasks: TaskLocation[];
  onRecordsUpdated: (records: AttendanceRecord[]) => void;
}

export function AdminRekap({
  records,
  employees,
  tasks,
}: AdminRekapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('semua');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showWAShareModal, setShowWAShareModal] = useState<boolean>(false);

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taskTitle && r.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEmployee = selectedEmployeeId === 'semua' || r.employeeId === selectedEmployeeId;
    const matchesTask = selectedTaskId === 'semua' || r.taskId === selectedTaskId;
    
    let matchesStatus = true;
    if (selectedStatus === 'tepat_waktu') matchesStatus = r.status === 'tepat_waktu';
    else if (selectedStatus === 'terlambat') matchesStatus = r.status === 'terlambat';
    else if (selectedStatus === 'pulang_cepat') matchesStatus = r.status === 'pulang_cepat' || !!r.earlyReasonCategory;
    else if (selectedStatus === 'izin') matchesStatus = r.type === 'izin' || r.status === 'izin';

    let matchesDate = true;
    if (startDate && r.dateString < startDate) matchesDate = false;
    if (endDate && r.dateString > endDate) matchesDate = false;

    return matchesSearch && matchesEmployee && matchesTask && matchesStatus && matchesDate;
  });

  // Calculate Metrics
  const uniqueDays = new Set(filteredRecords.map((r) => r.dateString)).size;

  // Calculate Working Hours per employee per day
  let totalMinutesWorked = 0;
  const empDatePairs: Record<string, Record<string, { masuk?: string; pulang?: string }>> = {};

  filteredRecords.forEach((r) => {
    if (!empDatePairs[r.employeeId]) empDatePairs[r.employeeId] = {};
    if (!empDatePairs[r.employeeId][r.dateString]) empDatePairs[r.employeeId][r.dateString] = {};
    
    if (r.type === 'masuk') {
      empDatePairs[r.employeeId][r.dateString].masuk = r.timestamp;
    } else if (r.type === 'pulang') {
      empDatePairs[r.employeeId][r.dateString].pulang = r.timestamp;
    }
  });

  Object.values(empDatePairs).forEach((datesObj) => {
    Object.values(datesObj).forEach((pair) => {
      if (pair.masuk && pair.pulang) {
        const startMs = new Date(pair.masuk).getTime();
        const endMs = new Date(pair.pulang).getTime();
        if (endMs > startMs) {
          totalMinutesWorked += Math.round((endMs - startMs) / (1000 * 60));
        }
      }
    });
  });

  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const remainingMinsWorked = totalMinutesWorked % 60;

  const totalMasuk = filteredRecords.filter((r) => r.type === 'masuk').length;
  const totalTepat = filteredRecords.filter((r) => r.status === 'tepat_waktu' && r.type === 'masuk').length;
  const totalTelat = filteredRecords.filter((r) => r.status === 'terlambat' && r.type === 'masuk').length;
  const totalPulangCepat = filteredRecords.filter((r) => r.status === 'pulang_cepat' || !!r.earlyReasonCategory).length;
  const totalIzin = filteredRecords.filter((r) => r.type === 'izin' || r.status === 'izin').length;

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeId);

  const exportData: RekapExportData = {
    title: 'Rekapitulasi Presensi & Jam Kerja Karyawan',
    filterLabel: selectedEmployeeObj
      ? `Karyawan: ${selectedEmployeeObj.name}`
      : startDate || endDate
      ? `Periode ${startDate || 'Awal'} s.d. ${endDate || 'Saat ini'}`
      : 'Semua Periode Data',
    employeeName: selectedEmployeeObj?.name,
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

  const isFilterActive =
    selectedEmployeeId !== 'semua' ||
    selectedTaskId !== 'semua' ||
    selectedStatus !== 'semua' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchTerm.trim());

  const handleExportCSV = () => {
    exportAttendanceToCSV(filteredRecords);
  };

  const handleExportPDF = () => {
    printRekapPDF(exportData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-6 space-y-4 sm:space-y-5">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase rounded-lg border border-emerald-200">
              Laporan Presensi Karyawan
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
            Rekapitulasi Jam Kerja, Absensi &amp; Lokasi
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-medium leading-relaxed">
            Sistem rekapitulasi lengkap jumlah hari hadir, akumulasi jam kerja, verifikasi foto watermarked, dan pengajuan izin.
          </p>
        </div>

        {/* Action Export Options: WhatsApp, PDF, CSV (Hanya muncul jika filter aktif/dipilih) */}
        {isFilterActive && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowWAShareModal(true)}
              title="Bagikan Teks Rekap ke WhatsApp"
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center shrink-0"
            >
              <Share2 className="w-4 h-4 text-emerald-100" />
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              title="Cetak Laporan PDF"
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition flex items-center justify-center shrink-0"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export Data CSV"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition flex items-center justify-center shrink-0"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* Selected Employee Highlights Banner (If specific employee selected) */}
      {selectedEmployeeObj && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-500 text-slate-950 font-black text-xl rounded-2xl flex items-center justify-center shrink-0">
              {selectedEmployeeObj.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Rekap Individual Karyawan</p>
              <h3 className="text-xl font-black">{selectedEmployeeObj.name}</h3>
              <p className="text-xs text-slate-400 font-medium">
                {selectedEmployeeObj.position} • Shift Official: {selectedEmployeeObj.shiftStart} - {selectedEmployeeObj.shiftEnd} WIB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Jumlah Hari</p>
              <p className="text-lg font-black text-white">{uniqueDays} Hari</p>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Total Jam Kerja</p>
              <p className="text-lg font-black text-emerald-400">{totalHoursWorked}j {remainingMinsWorked}m</p>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Terlambat</p>
              <p className="text-lg font-black text-amber-400">{totalTelat} Kali</p>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Pulang Cepat</p>
              <p className="text-lg font-black text-rose-400">{totalPulangCepat} Kali</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Bento Cards Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-slate-100 text-slate-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-slate-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Jumlah Hari</p>
            <p className="text-base sm:text-lg font-black text-slate-900">{uniqueDays} Hari</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Jam Kerja</p>
            <p className="text-base sm:text-lg font-black text-emerald-600">{totalHoursWorked}j {remainingMinsWorked}m</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Masuk Tepat</p>
            <p className="text-base sm:text-lg font-black text-blue-600">{totalTepat} Entri</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Terlambat</p>
            <p className="text-base sm:text-lg font-black text-amber-600">{totalTelat} Entri</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-rose-100 text-rose-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-rose-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Pulang Cepat</p>
            <p className="text-base sm:text-lg font-black text-rose-600">{totalPulangCepat} Entri</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-indigo-100 text-indigo-800 rounded-xl font-bold flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Izin / Off</p>
            <p className="text-base sm:text-lg font-black text-indigo-600">{totalIzin} Entri</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel - Compact & Clean without Emojis */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center space-x-2 font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs">Filter Kriteria Laporan Absensi:</span>
          </div>

          {(selectedEmployeeId !== 'semua' || selectedTaskId !== 'semua' || selectedStatus !== 'semua' || startDate || endDate || searchTerm) && (
            <button
              onClick={() => {
                setSelectedEmployeeId('semua');
                setSelectedTaskId('semua');
                setSelectedStatus('semua');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama / alamat..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
            />
          </div>

          {/* Employee Dropdown Filter */}
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          >
            <option value="semua">Semua Karyawan</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.position})
              </option>
            ))}
          </select>

          {/* Task Location Filter */}
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          >
            <option value="semua">Semua Penugasan</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          >
            <option value="semua">Semua Status Waktu</option>
            <option value="tepat_waktu">Tepat Waktu</option>
            <option value="terlambat">Terlambat Masuk</option>
            <option value="pulang_cepat">Pulang Lebih Awal</option>
            <option value="izin">Izin / Off</option>
          </select>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-[11px]"
              title="Tanggal Mulai"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-[11px]"
              title="Tanggal Selesai"
            />
          </div>
        </div>
      </div>

      {/* Attendance Records Data Table - Compact Rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Karyawan &amp; Wajah</th>
                <th className="py-3 px-3.5">Tipe &amp; Waktu</th>
                <th className="py-3 px-3.5">Status &amp; Alasan</th>
                <th className="py-3 px-3.5">Lokasi Alamat GPS</th>
                <th className="py-3 px-3.5">Lokasi Penugasan</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-400 font-medium">
                    Tidak ada riwayat presensi yang sesuai dengan kriteria pencarian filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center space-x-2.5">
                        {r.verifiedPhoto && r.verifiedPhoto.trim() !== '' ? (
                          <img
                            src={r.verifiedPhoto}
                            alt="Verifikasi Wajah"
                            className="w-9 h-9 rounded-lg object-cover border border-slate-300 shadow-2xs bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-300 shrink-0 flex items-center justify-center text-slate-400 font-bold text-[9px]">
                            No Foto
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{r.employeeName}</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{r.employeePosition}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <p className="font-bold text-slate-900 capitalize text-xs">
                        {r.type === 'masuk' ? 'Absen Datang' : r.type === 'pulang' ? 'Absen Pulang' : 'Izin'}
                      </p>
                      <p className="text-slate-500 font-mono text-[10px] sm:text-[11px]">
                        {r.dateString} • <span className="font-bold text-slate-800">{r.timeString} WIB</span>
                      </p>
                    </td>

                    <td className="py-2.5 px-3.5 space-y-0.5">
                      {r.status === 'tepat_waktu' && (
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-md border border-emerald-200 text-[10px]">
                          Tepat Waktu
                        </span>
                      )}
                      {r.status === 'terlambat' && (
                        <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold rounded-md border border-rose-200 text-[10px]" title="Absen dilakukan setelah jam shift dimulai">
                          Terlambat Masuk
                        </span>
                      )}
                      {(r.status === 'pulang_cepat' || r.earlyReasonCategory) && (
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold rounded-md border border-amber-200 text-[10px]" title="Absen pulang dilakukan sebelum jam kerja selesai">
                            Kurang Jam Kerja
                          </span>
                          <p className="text-[10px] font-semibold text-amber-900 mt-0.5">
                            Alasan: <span className="font-extrabold">{r.earlyReasonCategory}</span>
                            {r.earlyReasonNotes && ` (${r.earlyReasonNotes})`}
                          </p>
                        </div>
                      )}
                      {r.type === 'izin' && (
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold rounded-md border border-blue-200 text-[10px]">
                          Izin Resmi
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-800 text-[11px] leading-snug">{r.address}</p>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <p className="font-semibold text-slate-900 text-xs">{r.taskTitle || 'Presensi Regular'}</p>
                      {r.distanceFromTaskMeters !== undefined && (
                        <p className="text-emerald-700 text-[10px] font-bold">
                          Jarak: ±{r.distanceFromTaskMeters}m
                        </p>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center space-x-1 text-xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Entry Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Detail Verifikasi Presensi</h3>
                <p className="text-[11px] text-slate-400 font-medium">Foto watermarked dengan koordinat GPS resmi</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Watermark Display */}
            {selectedRecord.verifiedPhoto && selectedRecord.verifiedPhoto.trim() !== '' ? (
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800">Foto Hasil Capture Watermarked:</p>
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
                  <img
                    src={selectedRecord.verifiedPhoto}
                    alt="Verifikasi Watermark"
                    className="w-full h-60 object-contain mx-auto"
                  />
                </div>
              </div>
            ) : null}

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-slate-900 text-sm">{selectedRecord.employeeName}</p>
                  <p className="text-slate-500 font-medium">{selectedRecord.employeePosition}</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[11px] font-bold rounded-xl">
                  {selectedRecord.type === 'masuk' ? 'Absen Masuk' : selectedRecord.type === 'pulang' ? 'Absen Pulang' : 'Izin'}
                </span>
              </div>

              <p className="font-mono text-slate-700 font-bold border-t border-slate-200 pt-2">
                📅 {formatIndonesianDate(selectedRecord.timestamp)} • ⏰ {selectedRecord.timeString} WIB
              </p>

              {/* Early Checkout Reason Display */}
              {selectedRecord.earlyReasonCategory && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1 text-rose-900">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider">Alasan Pulang Lebih Awal:</p>
                  <p className="font-black text-sm">{selectedRecord.earlyReasonCategory}</p>
                  {selectedRecord.earlyReasonNotes && (
                    <p className="text-xs font-medium text-rose-800">
                      Catatan Tambahan: &quot;{selectedRecord.earlyReasonNotes}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mini Map Location Verification */}
            <div className="space-y-1">
              <p className="font-bold text-slate-800">Peta Lokasi Terverifikasi GPS:</p>
              <div className="h-36 w-full rounded-2xl overflow-hidden border border-slate-200">
                <MapView
                  centerLat={selectedRecord.latitude}
                  centerLng={selectedRecord.longitude}
                  taskTitle={selectedRecord.employeeName}
                  userLat={selectedRecord.latitude}
                  userLng={selectedRecord.longitude}
                />
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-2 text-slate-700">
              <p className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-800">{selectedRecord.address}</span>
              </p>
              {selectedRecord.taskTitle && (
                <p className="font-bold text-slate-900">
                  Lokasi Penugasan: {selectedRecord.taskTitle}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition"
            >
              Tutup Modal
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
