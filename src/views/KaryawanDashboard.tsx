import { useState, useEffect } from 'react';
import { Employee, TaskLocation, AttendanceRecord } from '../types';
import { formatIndonesianDate, formatIndonesianTime, calculateDistanceMeters, getAddressFromCoords } from '../lib/geo';
import { MapView } from '../components/MapView';
import { TidakHadirModal } from '../components/TidakHadirModal';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Briefcase,
  ChevronRight,
  UserCheck,
  Building,
  UserX,
  History,
  RotateCcw,
  Navigation,
  FileText,
} from 'lucide-react';

interface KaryawanDashboardProps {
  employee: Employee;
  todayRecords: AttendanceRecord[];
  assignedTasks: TaskLocation[];
  onOpenAbsenModal: (type: 'masuk' | 'pulang') => void;
  onNavigateToHistory: () => void;
  onAttendanceSubmit?: (record: AttendanceRecord) => void;
}

export function KaryawanDashboard({
  employee,
  todayRecords,
  assignedTasks,
  onOpenAbsenModal,
  onNavigateToHistory,
  onAttendanceSubmit,
}: KaryawanDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTidakHadirModal, setShowTidakHadirModal] = useState<boolean>(false);

  // Location & Radius state for dashboard map
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Mendeteksi lokasi GPS...');
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<TaskLocation | null>(
    assignedTasks.length > 0 ? assignedTasks[0] : null
  );
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect GPS position
  const refreshLocation = () => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);

        const addr = await getAddressFromCoords(lat, lng);
        setAddress(addr);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation fallback:', err.message);
        const defaultLat = selectedTask ? selectedTask.latitude + 0.0002 : -6.2182;
        const defaultLng = selectedTask ? selectedTask.longitude + 0.0002 : 106.8173;
        setUserLat(defaultLat);
        setUserLng(defaultLng);
        setAddress('NASQ Tower, Jl. Jend. Sudirman No. 45, Semanggi, Jakarta Selatan');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    refreshLocation();
  }, [selectedTask]);

  // Calculate distance & radius validity
  useEffect(() => {
    if (userLat !== null && userLng !== null && selectedTask) {
      const dist = calculateDistanceMeters(
        userLat,
        userLng,
        selectedTask.latitude,
        selectedTask.longitude
      );
      setDistanceMeters(dist);
      setIsWithinRadius(dist <= selectedTask.radiusMeters);
    } else {
      setDistanceMeters(0);
      setIsWithinRadius(true);
    }
  }, [userLat, userLng, selectedTask]);

  // Time-based greeting function for human connection
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // Today's attendance records for active status display & action buttons
  // Filter to strictly only include records from currently active assigned tasks
  const activeTaskIds = assignedTasks.map((t) => t.id);
  const activeTodayRecords = todayRecords.filter((r) => {
    if (activeTaskIds.length === 0) return false;
    if (!r.taskId) return false;
    return activeTaskIds.includes(r.taskId);
  });

  const masukRecord = activeTodayRecords.find((r) => r.type === 'masuk');
  const pulangRecord = activeTodayRecords.find((r) => r.type === 'pulang');
  const izinRecord = activeTodayRecords.find((r) => r.type === 'izin');

  // Check if current time is past shiftStart and employee has not checked in
  const checkIsOverdue = () => {
    if (assignedTasks.length === 0) return false;
    if (masukRecord || izinRecord) return false;
    if (!employee.shiftStart) return false;
    const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    if (currentH > shiftH) return true;
    if (currentH === shiftH && currentM > shiftM) return true;
    return false;
  };

  const isOverdue = checkIsOverdue();

  // Active status text with human-first copy
  let statusBadge = {
    label: 'Belum Presensi Hari Ini',
    subtext: 'Silakan lakukan presensi datang sesuai jam shift kerja Anda.',
    bgColor: 'bg-amber-50 text-amber-900 border-amber-200/90',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
  };

  if (assignedTasks.length === 0) {
    statusBadge = {
      label: 'Belum Ada Penugasan Tugas',
      subtext: 'Tidak ada tugas aktif untuk Anda saat ini. Status presensi otomatis direset.',
      bgColor: 'bg-slate-100 text-slate-800 border-slate-300/90',
      icon: Briefcase,
      iconColor: 'text-slate-600',
    };
  } else if (izinRecord) {
    statusBadge = {
      label: 'Konfirmasi Tidak Hadir / Izin',
      subtext: `Keterangan: ${izinRecord.earlyReasonCategory || 'Pernyataan Tidak Hadir'}${izinRecord.earlyReasonNotes ? ` (${izinRecord.earlyReasonNotes})` : ''}.`,
      bgColor: 'bg-blue-50 text-blue-900 border-blue-200/90',
      icon: FileText,
      iconColor: 'text-blue-600',
    };
  } else if (masukRecord && !pulangRecord) {
    statusBadge = {
      label: 'Sudah Absen Datang',
      subtext: `Tercatat masuk pukul ${masukRecord.timeString.substring(0, 5)} WIB (${masukRecord.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}).`,
      bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-200/90',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    };
  } else if (masukRecord && pulangRecord) {
    statusBadge = {
      label: 'Presensi Hari Ini Selesai',
      subtext: `Pulang tercatat pukul ${pulangRecord.timeString.substring(0, 5)} WIB. Terimakasih atas kerja keras Anda hari ini!`,
      bgColor: 'bg-indigo-50 text-indigo-900 border-indigo-200/90',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600',
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Human Greeting & User Identity Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                {employee.name.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {getGreeting()}, 👋
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{employee.name}</h2>
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 inline-block px-2.5 py-0.5 rounded-md mt-1 border border-emerald-200/60">
                {employee.position}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-right shrink-0">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Jadwal Shift Hari Ini</p>
            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
              {employee.shiftStart} - {employee.shiftEnd} WIB
            </p>
          </div>
        </div>

        {/* Live Clock Display */}
        <div className="text-center py-2 space-y-1 bg-gradient-to-b from-slate-50 to-emerald-50/20 p-5 rounded-2xl border border-slate-200/60">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Waktu Presensi Sekarang</p>
          <div className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 font-mono">
            {formatIndonesianTime(currentTime)}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-600 pt-1">
            {formatIndonesianDate(currentTime)}
          </p>
        </div>
      </div>

      {/* Penugasan Status & Overdue Banner */}
      {assignedTasks.length === 0 ? (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl space-y-3 shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0 border border-amber-200">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                  Notifikasi Penugasan
                </span>
                <span className="text-[11px] font-bold text-amber-800">Status Reset</span>
              </div>
              <h3 className="font-black text-slate-900 text-base">
                Belum Ada Penugasan Tugas Aktif
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Anda saat ini belum memiliki lokasi tugas aktif yang ditugaskan. Penugasan sebelumnya mungkin telah selesai atau dihapus oleh Administrator, sehingga status absen masuk, pulang, atau izin Anda otomatis direset. Silakan hubungi Administrator untuk mendapatkan penugasan lokasi baru.
              </p>
            </div>
          </div>
        </div>
      ) : isOverdue ? (
        <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl space-y-3.5 shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl shrink-0 border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                  Notifikasi Belum Absen
                </span>
                <span className="text-[11px] font-bold text-rose-800">Lewat Jam Shift!</span>
              </div>
              <h3 className="font-black text-slate-900 text-base">
                Anda Belum Melakukan Absen Datang Hari Ini
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Shift masuk kerja Anda dijadwalkan pukul <span className="font-black text-slate-900">{employee.shiftStart} WIB</span>. Saat ini sudah pukul <span className="font-black text-rose-700">{formatIndonesianTime(currentTime)} WIB</span>. Silakan segera absen datang atau konfirmasi ketidakhadiran Anda.
              </p>
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAbsenModal('masuk')}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Absen Datang Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTidakHadirModal(true)}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Konfirmasi Tidak Hadir / Izin</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Today's Status Card */}
      <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-2xs transition-all ${statusBadge.bgColor}`}>
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-white/80 rounded-2xl shadow-2xs shrink-0 mt-0.5">
            <StatusIcon className={`w-6 h-6 ${statusBadge.iconColor}`} />
          </div>
          <div>
            <p className="font-extrabold text-base text-slate-900">{statusBadge.label}</p>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{statusBadge.subtext}</p>
          </div>
        </div>
        <button
          onClick={onNavigateToHistory}
          className="text-xs font-extrabold underline flex items-center text-slate-800 hover:text-slate-900 shrink-0 ml-3"
        >
          <span>Detail</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Human Touch Attendance Action Buttons with High Visual Contrast */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Absen Datang Button - Vibrant Emerald Theme */}
        <button
          type="button"
          disabled={!!masukRecord || !!izinRecord}
          onClick={() => onOpenAbsenModal('masuk')}
          className={`p-6 rounded-3xl border-2 text-left flex flex-col justify-between space-y-4 transition-all ${
            masukRecord || izinRecord
              ? 'bg-emerald-50/80 border-emerald-200 text-slate-600 cursor-default shadow-xs'
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-emerald-400 shadow-xl shadow-emerald-600/25 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${masukRecord || izinRecord ? 'bg-emerald-100 text-emerald-800' : 'bg-white/20 text-white shadow-inner'}`}>
              <UserCheck className="w-7 h-7" />
            </div>
            {masukRecord ? (
              <span className="text-xs font-black bg-emerald-200 text-emerald-950 px-3 py-1 rounded-xl">
                Tercatat {masukRecord.timeString.substring(0, 5)} WIB
              </span>
            ) : izinRecord ? (
              <span className="text-xs font-black bg-blue-200 text-blue-950 px-3 py-1 rounded-xl">
                Izin Dikonfirmasi
              </span>
            ) : (
              <span className="text-xs font-extrabold bg-emerald-800/60 text-emerald-100 px-3 py-1 rounded-xl border border-emerald-400/40">
                Langkah 1: Masuk Shift
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider opacity-90">
              {masukRecord ? 'Status Presensi' : 'Mulai Hari Kerja'}
            </p>
            <p className="text-2xl font-black tracking-tight">
              {masukRecord ? 'Sudah Absen Datang' : 'Absen Datang'}
            </p>
            {!masukRecord && !izinRecord && (
              <p className="text-xs opacity-90 mt-1 font-medium">Klik untuk verifikasi wajah &amp; titik GPS lokasi</p>
            )}
          </div>
        </button>

        {/* Absen Pulang Button - Deep Royal Navy/Indigo Theme (High Contrast) */}
        <button
          type="button"
          disabled={!masukRecord || !!pulangRecord || !!izinRecord}
          onClick={() => onOpenAbsenModal('pulang')}
          className={`p-6 rounded-3xl border-2 text-left flex flex-col justify-between space-y-4 transition-all ${
            !masukRecord || pulangRecord || izinRecord
              ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed shadow-xs'
              : 'bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 hover:from-indigo-900 hover:to-slate-950 text-white border-indigo-500 shadow-xl shadow-indigo-900/30 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${!masukRecord || pulangRecord || izinRecord ? 'bg-slate-200 text-slate-500' : 'bg-white/15 text-white shadow-inner'}`}>
              <UserX className="w-7 h-7" />
            </div>
            {pulangRecord ? (
              <span className="text-xs font-black bg-slate-200 text-slate-800 px-3 py-1 rounded-xl">
                Tercatat {pulangRecord.timeString.substring(0, 5)} WIB
              </span>
            ) : (
              <span className="text-xs font-extrabold bg-indigo-950/80 text-indigo-200 px-3 py-1 rounded-xl border border-indigo-400/30">
                Langkah 2: Akhiri Shift
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider opacity-90">
              {pulangRecord ? 'Status Presensi' : !masukRecord ? 'Memerlukan Absen Datang' : 'Selesai Hari Kerja'}
            </p>
            <p className="text-2xl font-black tracking-tight">
              {pulangRecord ? 'Sudah Absen Pulang' : 'Absen Pulang'}
            </p>
            {!pulangRecord && masukRecord && (
              <p className="text-xs opacity-90 mt-1 font-medium">Klik untuk absen setelah jam kerja selesai</p>
            )}
          </div>
        </button>
      </div>

      {/* Button for Tidak Hadir / Ajukan Izin */}
      {!masukRecord && !pulangRecord && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-blue-500 text-slate-950 text-[10px] font-black uppercase rounded-full">
                Formulir Ketidakhadiran
              </span>
            </div>
            <h4 className="font-black text-white text-base">Tidak Hadir Kerja Hari Ini?</h4>
            <p className="text-xs text-slate-400 font-medium">
              Sakit, izin urusan keluarga, atau dinas luar? Kirimkan konfirmasi tidak hadir dengan pilihan alasan resmi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowTidakHadirModal(true)}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center space-x-2 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Konfirmasi Tidak Hadir / Izin</span>
          </button>
        </div>
      )}

      {/* Interactive Map & Radius GPS Warning Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Peta Lokasi &amp; Status Radius GPS</h3>
              <p className="text-xs text-slate-500 font-medium">Verifikasi posisi Anda terhadap lokasi titik presensi</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshLocation}
              disabled={isLocating}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Mendeteksi...' : 'Cek Lokasi GPS'}</span>
            </button>

            {selectedTask && distanceMeters !== null && (
              <span className={`px-3 py-1 rounded-full font-extrabold text-xs uppercase border ${
                isWithinRadius
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {isWithinRadius ? 'Dalam Radius' : 'Di Luar Radius'}
              </span>
            )}
          </div>
        </div>

        {/* Task Selection for Map Check */}
        {assignedTasks.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
            <span className="font-bold text-slate-700 shrink-0">Pilih Lokasi Penugasan:</span>
            <select
              value={selectedTask?.id || ''}
              onChange={(e) => {
                const t = assignedTasks.find((task) => task.id === e.target.value);
                if (t) setSelectedTask(t);
              }}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs truncate"
            >
              {assignedTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.radiusMeters}m)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Map Display */}
        <MapView
          centerLat={selectedTask ? selectedTask.latitude : (userLat || -6.2183)}
          centerLng={selectedTask ? selectedTask.longitude : (userLng || 106.8172)}
          radiusMeters={selectedTask?.radiusMeters}
          taskTitle={selectedTask?.title || 'Kantor Utama NASQ'}
          userLat={userLat || undefined}
          userLng={userLng || undefined}
          isWithinRadius={isWithinRadius}
          heightClass="h-[220px] sm:h-[250px]"
        />

        {/* Location Address Details */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start space-x-2.5 text-xs">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-bold text-slate-800">
              {isLocating ? 'Mendeteksi titik koordinat GPS...' : 'Alamat Posisi Anda:'}
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">{address}</p>
            {userLat !== null && userLng !== null && (
              <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                GPS: {userLat.toFixed(5)}, {userLng.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        {/* Prominent Outside Radius Warning Alert Banner */}
        {selectedTask && distanceMeters !== null && !isWithinRadius && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl text-xs space-y-2 animate-in fade-in shadow-xs">
            <div className="flex items-center space-x-2 font-black text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>PERINGATAN: ANDA BERADA DI LUAR RADIUS ABSENSI!</span>
            </div>
            <p className="text-rose-800 font-medium leading-relaxed">
              Posisi Anda saat ini berjarak ±<span className="font-extrabold text-rose-950">{distanceMeters} meter</span> dari lokasi titik absensi <span className="font-bold">{selectedTask.title}</span>. Batas maksimal radius yang diizinkan adalah <span className="font-extrabold text-rose-950">{selectedTask.radiusMeters} meter</span>.
            </p>
            <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-[11px] font-bold text-rose-900 flex items-center space-x-2">
              <span className="text-base">📍</span>
              <span>Silakan mendekat ke lokasi titik absensi (lingkaran merah/hijau pada peta) sebelum melakukan presensi.</span>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5 text-slate-900">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Penugasan Lapangan Hari Ini</h3>
              <p className="text-xs text-slate-400 font-medium">Lokasi titik absensi valid untuk tugas Anda</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
            {assignedTasks.length} Lokasi Penugasan
          </span>
        </div>

        {assignedTasks.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs space-y-1">
            <Building className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">Tidak Ada Penugasan Khusus</p>
            <p className="text-slate-500">Anda dapat melakukan absensi di lokasi kantor utama NASQ.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 sm:p-5 bg-slate-50/90 hover:bg-slate-100/80 rounded-3xl border border-slate-200/90 text-xs space-y-3.5 transition shadow-2xs"
              >
                {/* Task Photo Banner (if uploaded by Admin) */}
                {t.locationPhoto && t.locationPhoto.trim() !== '' ? (
                  <div className="relative rounded-2xl overflow-hidden h-36 w-full border border-slate-200 shadow-inner group">
                    <img
                      src={t.locationPhoto}
                      alt={`Foto Lokasi ${t.title}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[11px] font-black text-white bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20 flex items-center space-x-1">
                        <span>📍 Foto Bangunan / Patokan Lokasi</span>
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300">
                      Tugas Lapangan Aktif
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base tracking-tight">{t.title}</h4>
                    <p className="text-slate-600 text-xs leading-relaxed">{t.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-xl shrink-0 shadow-xs">
                    Radius {t.radiusMeters}m
                  </span>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-2 text-slate-700">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{t.address}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        GPS: {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-medium gap-2">
                    <p className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Periode: {t.startDate} s.d {t.endDate}</span>
                    </p>
                    <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Status: Aktif Valid
                    </span>
                  </div>
                </div>

                {/* Google Maps Route Navigation Button */}
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`,
                      '_blank'
                    )
                  }
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition hover:scale-[1.005] text-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Buka Navigasi Rute Maps (Google Maps)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick History Button Link */}
      <button
        onClick={onNavigateToHistory}
        className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-200/80 shadow-2xs transition"
      >
        <History className="w-4 h-4 text-emerald-600" />
        <span>Buka Riwayat Absensi &amp; Rekap Tugas Saya</span>
      </button>

      {/* Tidak Hadir / Izin Confirmation Modal */}
      <TidakHadirModal
        isOpen={showTidakHadirModal}
        onClose={() => setShowTidakHadirModal(false)}
        employee={employee}
        assignedTasks={assignedTasks}
        onSubmitSuccess={(record) => {
          if (onAttendanceSubmit) {
            onAttendanceSubmit(record);
          }
        }}
        userLat={userLat}
        userLng={userLng}
        address={address}
      />
    </div>
  );
}
