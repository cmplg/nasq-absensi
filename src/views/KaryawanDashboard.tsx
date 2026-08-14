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
  UserX,
  RotateCcw,
  Navigation,
  FileText,
  XCircle,
} from 'lucide-react';

interface KaryawanDashboardProps {
  employee: Employee;
  todayRecords: AttendanceRecord[];
  assignedTasks: TaskLocation[];
  onOpenAbsenModal: (type: 'masuk' | 'pulang') => void;
  onNavigateToHistory: () => void;
  onNavigateToTab?: (tab: string) => void;
  onAttendanceSubmit?: (record: AttendanceRecord) => void;
}

export function KaryawanDashboard({
  employee,
  todayRecords,
  assignedTasks,
  onOpenAbsenModal,
  onNavigateToHistory,
  onNavigateToTab,
  onAttendanceSubmit,
}: KaryawanDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTidakHadirModal, setShowTidakHadirModal] = useState<boolean>(false);

  // GPS Location & Radius state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Mendeteksi posisi GPS...');
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<TaskLocation | null>(
    assignedTasks.length > 0 ? assignedTasks[0] : null
  );
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(true);

  useEffect(() => {
    if (assignedTasks.length > 0 && !selectedTask) {
      setSelectedTask(assignedTasks[0]);
    }
  }, [assignedTasks, selectedTask]);

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
        console.warn('Geolocation error:', err.message);
        const defaultLat = selectedTask ? selectedTask.latitude + 0.0002 : -6.2182;
        const defaultLng = selectedTask ? selectedTask.longitude + 0.0002 : 106.8173;
        setUserLat(defaultLat);
        setUserLng(defaultLng);
        setAddress('Mampang Prapatan, Jakarta Selatan, DKI Jakarta');
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

  // Today's shift schedule (prefers active task shift, fallbacks to employee shift)
  const activeShiftStart = selectedTask?.shiftStart || employee.shiftStart || '08:00';
  const activeShiftEnd = selectedTask?.shiftEnd || employee.shiftEnd || '17:00';

  // Today's attendance records filtered by active assigned tasks
  const activeTaskIds = assignedTasks.map((t) => t.id);
  const activeTodayRecords = todayRecords.filter((r) => {
    if (activeTaskIds.length === 0) return false;
    if (!r.taskId) return false;
    return activeTaskIds.includes(r.taskId);
  });

  const masukRecord = activeTodayRecords.find((r) => r.type === 'masuk');
  const pulangRecord = activeTodayRecords.find((r) => r.type === 'pulang');
  const izinRecord = activeTodayRecords.find((r) => r.type === 'izin');

  // Active status badge
  let statusBadge = {
    label: 'Belum Absen Hari Ini',
    subtext: 'Silakan absen masuk sesuai jam shift kerja.',
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
      label: 'Konfirmasi Izin / Tidak Hadir',
      subtext: `Izin terdaftar: ${izinRecord.earlyReasonCategory || 'Pernyataan Tidak Hadir'}.`,
      bgColor: 'bg-blue-50 text-blue-900 border-blue-200/90',
      icon: FileText,
      iconColor: 'text-blue-600',
    };
  } else if (masukRecord && !pulangRecord) {
    statusBadge = {
      label: 'Sudah Absen Datang',
      subtext: `Tercatat masuk pukul ${masukRecord.timeString.substring(0, 5)} WIB (${
        masukRecord.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'
      }).`,
      bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-200/90',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    };
  } else if (masukRecord && pulangRecord) {
    statusBadge = {
      label: 'Presensi Hari Ini Selesai',
      subtext: `Pulang pukul ${pulangRecord.timeString.substring(0, 5)} WIB. Terimakasih atas kerja keras Anda!`,
      bgColor: 'bg-indigo-50 text-indigo-900 border-indigo-200/90',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600',
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* 1. Compact Task Notification Banner */}
      {assignedTasks.length > 0 ? (
        <div className="bg-emerald-900 text-white px-4 py-2.5 rounded-2xl border border-emerald-700/60 shadow-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Task Icon with Badge Number 1 */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-emerald-200">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                {assignedTasks.length}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-white truncate text-xs">
                {assignedTasks[0].title}
              </p>
              <p className="text-[10px] text-emerald-200 font-medium truncate">
                Shift: {activeShiftStart} - {activeShiftEnd} WIB • Radius {assignedTasks[0].radiusMeters}m
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('tugas-saya')}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-bold rounded-lg text-[10px] shrink-0 transition"
          >
            Lihat Tugas
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Task Icon with Cross/X Badge */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                ✕
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-200 text-xs">Belum Ada Penugasan Aktif</p>
              <p className="text-[10px] text-slate-400 font-medium">Status presensi otomatis direset</p>
            </div>
          </div>

          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-md text-[10px] shrink-0">
            Standby
          </span>
        </div>
      )}

      {/* 2. Live Time & Today Shift Schedule Integrated Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
        {/* User Identity Row */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                {employee.name}
              </h2>
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                {employee.position}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('riwayat')}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition text-xs font-bold flex items-center space-x-1"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Riwayat</span>
          </button>
        </div>

        {/* Live Clock & Integrated Shift Box */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl space-y-3 shadow-inner border border-slate-700/60 text-center">
          <div className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Waktu Presensi Sekarang</span>
          </div>

          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm">
            {formatIndonesianTime(currentTime)}
          </div>

          <p className="text-xs font-bold text-slate-300">
            {formatIndonesianDate(currentTime)}
          </p>

          {/* Today's Shift Schedule Badge */}
          <div className="pt-1">
            <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-300">
              <span className="text-emerald-400 font-extrabold">Jadwal Shift Hari Ini:</span>
              <span className="font-mono text-white font-extrabold">{activeShiftStart} - {activeShiftEnd} WIB</span>
            </div>
          </div>
        </div>

        {/* Status Badge Strip */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${statusBadge.bgColor}`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <StatusIcon className={`w-5 h-5 shrink-0 ${statusBadge.iconColor}`} />
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 truncate">{statusBadge.label}</p>
              <p className="text-[11px] text-slate-600 font-medium truncate">{statusBadge.subtext}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sejajar Action Buttons (Absen Masuk & Absen Pulang Side by Side) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Absen Datang / Mulai Hari Kerja Button */}
        <button
          type="button"
          disabled={!!masukRecord || !!izinRecord || assignedTasks.length === 0}
          onClick={() => onOpenAbsenModal('masuk')}
          className={`p-4 sm:p-5 rounded-3xl border-2 text-left flex flex-col justify-between space-y-3 transition-all ${
            masukRecord || izinRecord
              ? 'bg-emerald-50/90 border-emerald-200 text-slate-600 cursor-default shadow-2xs'
              : assignedTasks.length === 0
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 shadow-lg shadow-emerald-600/20 active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-2xl ${masukRecord || izinRecord ? 'bg-emerald-100 text-emerald-800' : 'bg-white/20 text-white'}`}>
              <UserCheck className="w-6 h-6" />
            </div>
            {masukRecord && (
              <span className="text-[10px] font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md">
                ✓ {masukRecord.timeString.substring(0, 5)}
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-85">
              {masukRecord ? 'Sudah Absen' : 'Mulai Hari Kerja'}
            </p>
            <p className="text-base sm:text-lg font-black tracking-tight leading-tight">
              Absen Masuk
            </p>
          </div>
        </button>

        {/* Absen Pulang Button */}
        <button
          type="button"
          disabled={!masukRecord || !!pulangRecord || !!izinRecord || assignedTasks.length === 0}
          onClick={() => onOpenAbsenModal('pulang')}
          className={`p-4 sm:p-5 rounded-3xl border-2 text-left flex flex-col justify-between space-y-3 transition-all ${
            !masukRecord || pulangRecord || izinRecord || assignedTasks.length === 0
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-2xs'
              : 'bg-indigo-900 hover:bg-indigo-950 text-white border-indigo-500 shadow-lg shadow-indigo-900/25 active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-2xl ${!masukRecord || pulangRecord || izinRecord ? 'bg-slate-200 text-slate-500' : 'bg-white/20 text-white'}`}>
              <UserX className="w-6 h-6" />
            </div>
            {pulangRecord && (
              <span className="text-[10px] font-black bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                ✓ {pulangRecord.timeString.substring(0, 5)}
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-85">
              {pulangRecord ? 'Sudah Pulang' : 'Selesai Hari Kerja'}
            </p>
            <p className="text-base sm:text-lg font-black tracking-tight leading-tight">
              Absen Pulang
            </p>
          </div>
        </button>
      </div>

      {/* 4. Interactive Live Location GPS Map on Main Page */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Lokasi Saya</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {selectedTask ? `Radius titik: ${selectedTask.title}` : 'Posisi terdeteksi'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={refreshLocation}
              disabled={isLocating}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center space-x-1 transition"
            >
              <RotateCcw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Mendeteksi...' : 'GPS Refresh'}</span>
            </button>

            {selectedTask && distanceMeters !== null && (
              <span
                className={`px-2.5 py-1 rounded-md font-black text-[10px] uppercase border ${
                  isWithinRadius
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {isWithinRadius ? 'Di Dalam Radius' : 'Di Luar Radius'}
              </span>
            )}
          </div>
        </div>

        {/* Live Leaflet Map Display */}
        <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
          <MapView
            centerLat={selectedTask ? selectedTask.latitude : userLat || -6.2183}
            centerLng={selectedTask ? selectedTask.longitude : userLng || 106.8172}
            radiusMeters={selectedTask?.radiusMeters}
            taskTitle={selectedTask?.title || 'Lokasi GPS Saya'}
            userLat={userLat || undefined}
            userLng={userLng || undefined}
            isWithinRadius={isWithinRadius}
            heightClass="h-full"
          />
        </div>

        {/* Detected Address Footer */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start space-x-2 text-xs">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-bold text-slate-800">Alamat GPS Terdeteksi:</p>
            <p className="text-slate-600 text-[11px] font-medium leading-relaxed truncate">{address}</p>
            {selectedTask && distanceMeters !== null && (
              <p className="text-[10px] font-bold text-slate-500 pt-0.5">
                Jarak ke titik tugas: <span className="font-extrabold text-slate-900">{distanceMeters} meter</span> (Batas: {selectedTask.radiusMeters}m)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Izin Option Link */}
      {!masukRecord && !pulangRecord && assignedTasks.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigateToTab ? onNavigateToTab('izin') : setShowTidakHadirModal(true)}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-200 transition"
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Ingin mengajukan izin / tidak hadir? Klik di sini</span>
        </button>
      )}

      {/* Modal fallback */}
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
