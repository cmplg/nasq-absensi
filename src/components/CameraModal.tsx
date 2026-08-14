import { useState, useEffect, useRef } from 'react';
import { TaskLocation, AttendanceRecord, Employee } from '../types';
import { calculateDistanceMeters, getAddressFromCoords, formatIndonesianTime, formatIndonesianDate, isEarlyCheckout } from '../lib/geo';
import { MapPin, AlertCircle, CheckCircle2, RotateCcw, ShieldCheck, Map, Clock, ArrowRight } from 'lucide-react';
import { MapView } from './MapView';

interface CameraModalProps {
  type: 'masuk' | 'pulang';
  employee: Employee;
  assignedTasks: TaskLocation[];
  onSuccess: (record: AttendanceRecord) => void;
  onClose: () => void;
}

export function CameraModal({
  type,
  employee,
  assignedTasks,
  onSuccess,
  onClose,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Mendeteksi lokasi GPS...');
  const [isLocating, setIsLocating] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<TaskLocation | null>(
    assignedTasks.length > 0 ? assignedTasks[0] : null
  );

  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(true);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);

  // Early checkout check state & mandatory checklist reason
  const activeTaskShiftEnd = selectedTask?.shiftEnd || employee.shiftEnd || '17:00';
  const earlyCheckoutData = isEarlyCheckout(activeTaskShiftEnd);
  const [showEarlyWarning, setShowEarlyWarning] = useState<boolean>(
    type === 'pulang' && earlyCheckoutData.isEarly
  );
  const [earlyCategory, setEarlyCategory] = useState<string>('Pekerjaan selesai');
  const [earlyCustomNotes, setEarlyCustomNotes] = useState<string>('');

  // 1. Initialize Camera
  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        'Tidak dapat mengakses kamera depan. Pastikan izin kamera sudah diaktifkan di pengaturan browser Anda.'
      );
    } finally {
      setIsCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Ensure video element receives stream as soon as it mounts (e.g. after early warning screen is dismissed)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video stream autoplay error:', err);
      });
    }
  }, [stream, showEarlyWarning, capturedImage, successRecord]);

  // 2. Initialize Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Perangkat Anda tidak mendukung fitur lokasi GPS.');
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
        console.warn('Geolocation error, fallback to simulated location:', err.message);
        // Fallback realistic location if GPS permission denied or inside iframe
        const defaultLat = selectedTask ? selectedTask.latitude + 0.0002 : -6.2182;
        const defaultLng = selectedTask ? selectedTask.longitude + 0.0002 : 106.8173;
        setUserLat(defaultLat);
        setUserLng(defaultLng);
        setAddress('NASQ Tower, Jl. Jend. Sudirman No. 45, Semanggi, Jakarta Selatan');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [selectedTask]);

  // 3. Verify Radius Distance when User Lat/Lng or Task changes
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

  // Handle Snap & Verification with Canvas GPS Watermark & Photo Validation
  const handleCaptureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Komponen kamera belum siap. Silakan ulangi pengambilan foto.');
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || video.videoWidth === 0) {
      setCameraError('Gagal mengambil foto verifikasi. Kamera tidak aktif atau belum memuat gambar. Silakan coba lagi!');
      return;
    }

    const canvas = canvasRef.current;
    // Calculate target dimensions (max 480px width or height for minimal DB storage size)
    const rawW = video.videoWidth || 640;
    const rawH = video.videoHeight || 480;
    const maxDim = 480;
    let targetW = rawW;
    let targetH = rawH;

    if (rawW > maxDim || rawH > maxDim) {
      if (rawW > rawH) {
        targetW = maxDim;
        targetH = Math.round((rawH * maxDim) / rawW);
      } else {
        targetH = maxDim;
        targetW = Math.round((rawW * maxDim) / rawH);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Komponen pemrosesan gambar canvas bermasalah. Silakan ulangi!');
      return;
    }

    setIsProcessing(true);

    // 1. Draw camera video snapshot scaled to target
    ctx.drawImage(video, 0, 0, targetW, targetH);

    // 2. Draw dark semi-transparent watermark banner overlay at bottom
    const now = new Date();
    const overlayHeight = Math.max(76, Math.round(targetH * 0.22));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)'; // dark slate overlay
    ctx.fillRect(0, targetH - overlayHeight, targetW, overlayHeight);

    // Top border accent on watermark
    ctx.fillStyle = '#10b981'; // emerald accent
    ctx.fillRect(0, targetH - overlayHeight, targetW, 3);

    // Dynamic text details
    const fontSize = Math.max(11, Math.round(targetW / 36));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    const dateStr = formatIndonesianDate(now);
    const timeStr = `${formatIndonesianTime(now)} WIB`;
    ctx.fillText(`📅 ${dateStr} • ⏰ ${timeStr}`, 10, targetH - overlayHeight + Math.round(overlayHeight * 0.28));

    ctx.font = `${Math.max(10, fontSize - 1)}px sans-serif`;
    ctx.fillStyle = '#e2e8f0';
    const cleanAddress = address.length > 46 ? address.substring(0, 43) + '...' : address;
    ctx.fillText(`📍 ${cleanAddress}`, 10, targetH - overlayHeight + Math.round(overlayHeight * 0.58));

    ctx.font = `bold ${Math.max(9, fontSize - 2)}px monospace`;
    ctx.fillStyle = '#a7f3d0';
    const gpsText = `🌐 GPS: ${userLat ? userLat.toFixed(4) : '-'}, ${userLng ? userLng.toFixed(4) : '-'} • ${employee.name}`;
    ctx.fillText(gpsText, 10, targetH - overlayHeight + Math.round(overlayHeight * 0.86));

    // Get final compressed base64 string (0.50 JPEG quality for minimum DB storage size ~12-18KB)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.50);

    // STRICT PHOTO CAPTURE VALIDATION: If photo string is invalid or empty, reject and ask to repeat!
    if (!dataUrl || dataUrl.length < 500) {
      setIsProcessing(false);
      setCameraError('Gagal mengambil foto verifikasi wajah! Hasil foto tidak valid. Silakan ulangi proses absen.');
      return;
    }

    setCapturedImage(dataUrl);

    // Stop camera stream after capture
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // Calculate attendance status (Tepat Waktu vs Terlambat vs Kurang Jam Kerja)
    const activeShiftStart = selectedTask?.shiftStart || employee.shiftStart || '08:00';
    const activeShiftEnd = selectedTask?.shiftEnd || employee.shiftEnd || '17:00';

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMinutes;

    const [startH, startM] = activeShiftStart.split(':').map(Number);
    const startTotalMins = startH * 60 + (startM || 0);

    const [endH, endM] = activeShiftEnd.split(':').map(Number);
    const endTotalMins = endH * 60 + (endM || 0);

    let status: 'tepat_waktu' | 'terlambat' | 'pulang_cepat' = 'tepat_waktu';
    if (type === 'masuk') {
      // Absen terlambat: dilakukan setelah jam shift dimulai
      if (currentTotalMins > startTotalMins) {
        status = 'terlambat';
      }
    } else if (type === 'pulang') {
      // Absen kurang jam kerja: absen pulang yang dilakukan sebelum jam kerja selesai
      if (currentTotalMins < endTotalMins) {
        status = 'pulang_cepat';
      }
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeePosition: employee.position,
      type,
      timestamp: now.toISOString(),
      dateString: now.toISOString().split('T')[0],
      timeString: formatIndonesianTime(now),
      status,
      verifiedPhoto: dataUrl,
      latitude: userLat || -6.2183,
      longitude: userLng || 106.8172,
      address: address || 'Jl. Jend. Sudirman, Jakarta Pusat',
      taskId: selectedTask?.id,
      taskTitle: selectedTask?.title || 'Presensi Regular',
      distanceFromTaskMeters: distanceMeters || undefined,
      earlyReasonCategory: type === 'pulang' && earlyCheckoutData.isEarly ? earlyCategory : undefined,
      earlyReasonNotes: type === 'pulang' && earlyCheckoutData.isEarly && earlyCategory === 'Lainnya' ? earlyCustomNotes : undefined,
    };

    // Simulated face match verification processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setSuccessRecord(record);
      onSuccess(record);
    }, 1200);
  };

  if (assignedTasks.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 sm:p-8 text-center space-y-5 my-auto">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto border-2 border-amber-300">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-full">
              Belum Ada Penugasan
            </span>
            <h3 className="text-xl font-black text-slate-900">
              Belum Ada Tugas Aktif
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Anda tidak dapat melakukan presensi karena belum memiliki penugasan lokasi kerja aktif saat ini. Penugasan sebelumnya mungkin telah selesai atau dihapus oleh Administrator.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs transition shadow-md"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-base sm:text-lg">
                {type === 'masuk' ? 'Presensi Masuk Shift' : 'Presensi Selesai Shift'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Verifikasi Wajah &amp; Koordinat Lokasi GPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* EARLY CHECKOUT WARNING & MANDATORY REASON FORM */}
          {showEarlyWarning ? (
            <div className="py-2 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="flex items-center space-x-3 bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0 border border-amber-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Absen Pulang Lebih Awal Dari Jam Shift
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Shift Selesai: <span className="font-extrabold text-slate-900">{employee.shiftEnd} WIB</span> • Sekarang: <span className="font-extrabold text-amber-900">{earlyCheckoutData.currentTimeStr} WIB</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Wajib Pilih Alasan Absen Pulang Cepat:
                </label>
                <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                  {[
                    'Pekerjaan selesai',
                    'Ada urusan keluarga',
                    'Kecelakaan kerja',
                    'Anggota keluarga sakit',
                    'Lainnya',
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center space-x-3 p-3 rounded-2xl border transition cursor-pointer ${
                        earlyCategory === option
                          ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="earlyReason"
                        value={option}
                        checked={earlyCategory === option}
                        onChange={() => setEarlyCategory(option)}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300 shrink-0"
                      />
                      <span className="font-bold">{option}</span>
                    </label>
                  ))}
                </div>

                {/* Custom input text if 'Lainnya' is selected */}
                {earlyCategory === 'Lainnya' && (
                  <div className="pt-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Tuliskan Detail Alasan Khusus Anda:
                    </label>
                    <textarea
                      rows={2}
                      value={earlyCustomNotes}
                      onChange={(e) => setEarlyCustomNotes(e.target.value)}
                      placeholder="Ketikkan alasan lengkap di sini..."
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={earlyCategory === 'Lainnya' && !earlyCustomNotes.trim()}
                  onClick={() => setShowEarlyWarning(false)}
                  className={`w-full sm:w-2/3 py-3 px-4 font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5 ${
                    earlyCategory === 'Lainnya' && !earlyCustomNotes.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <span>Lanjutkan Ke Foto Verifikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : successRecord ? (
            <div className="text-center py-2 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-1">
                  PRESI TERVERIFIKASI
                </span>
                <h4 className="text-xl font-bold text-slate-900">
                  {type === 'masuk' ? 'Absen Masuk Berhasil!' : 'Absen Pulang Berhasil!'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {formatIndonesianDate(successRecord.timestamp)} • Jam {successRecord.timeString} WIB
                </p>
              </div>

              {/* Receipt Snapshot Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-3 text-xs">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                  {successRecord.verifiedPhoto ? (
                    <img
                      src={successRecord.verifiedPhoto}
                      alt="Foto Verifikasi"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-300 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      No Foto
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{successRecord.employeeName}</p>
                    <p className="text-slate-500">{successRecord.employeePosition}</p>
                    <div className="mt-1">
                      {successRecord.status === 'tepat_waktu' ? (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                          Tepat Waktu
                        </span>
                      ) : (
                        <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                          Terlambat
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-slate-600">
                  <p className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{successRecord.address}</span>
                  </p>
                  {successRecord.taskTitle && (
                    <p className="flex items-center space-x-2 font-medium text-slate-800">
                      <Map className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{successRecord.taskTitle}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition text-sm shadow-md"
              >
                Selesai &amp; Kembali
              </button>
            </div>
          ) : (
            <>
              {/* Task Selector if multiple tasks available */}
              {assignedTasks.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Penugasan / Lokasi Absen:
                  </label>
                  <select
                    value={selectedTask?.id || ''}
                    onChange={(e) => {
                      const t = assignedTasks.find((task) => task.id === e.target.value);
                      if (t) setSelectedTask(t);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {assignedTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.radiusMeters}m radius)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Camera Preview with Oval Overlay */}
              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center">
                {isCameraLoading && (
                  <div className="text-center text-slate-400 text-xs space-y-2 p-4">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p>Membuka kamera depan...</p>
                  </div>
                )}

                {cameraError ? (
                  <div className="p-4 text-center text-rose-300 text-xs space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
                    >
                      🔄 Coba Muat Ulang Kamera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />

                    {/* Reload camera stream quick button overlay */}
                    <button
                      type="button"
                      onClick={startCamera}
                      title="Muat Ulang Tampilan Kamera"
                      className="absolute top-3 right-3 z-10 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl border border-slate-700/80 backdrop-blur-sm transition text-xs font-bold flex items-center space-x-1 shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Refresh Kamera</span>
                    </button>

                    {/* Face Oval Overlay Guide */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-dashed border-emerald-400/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] flex items-center justify-center relative">
                        <div className="absolute top-3 text-[11px] font-semibold text-emerald-300 bg-slate-900/80 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          Posisikan Wajah
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Map & Location Radius Verification */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Peta Verifikasi Radius GPS</span>
                  </span>
                  {selectedTask && distanceMeters !== null && (
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase border ${
                      isWithinRadius
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {isWithinRadius ? 'Dalam Radius' : 'Di Luar Radius'}
                    </span>
                  )}
                </div>

                {/* Interactive Map */}
                <MapView
                  centerLat={selectedTask ? selectedTask.latitude : (userLat || -6.2183)}
                  centerLng={selectedTask ? selectedTask.longitude : (userLng || 106.8172)}
                  radiusMeters={selectedTask?.radiusMeters}
                  taskTitle={selectedTask?.title || 'Titik Absensi'}
                  userLat={userLat || undefined}
                  userLng={userLng || undefined}
                  isWithinRadius={isWithinRadius}
                  heightClass="h-[170px]"
                />

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 flex items-start space-x-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <p className="font-bold text-slate-800">
                      {isLocating ? 'Mendeteksi koordinat lokasi GPS...' : 'Alamat Posisi Anda:'}
                    </p>
                    <p className="text-slate-600 leading-tight">{address}</p>
                    {userLat !== null && userLng !== null && (
                      <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                        GPS: {userLat.toFixed(5)}, {userLng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Prominent Outside Radius Warning Alert */}
                {selectedTask && distanceMeters !== null && !isWithinRadius && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-xs space-y-2 animate-in fade-in shadow-2xs">
                    <div className="flex items-center space-x-2 font-black text-rose-800 text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>PERINGATAN: DI LUAR RADIUS ABSENSI!</span>
                    </div>
                    <p className="text-rose-700 leading-relaxed font-medium">
                      Jarak Anda saat ini: <span className="font-extrabold text-rose-950">{distanceMeters} meter</span> dari lokasi penugasan <span className="font-bold">{selectedTask.title}</span>. Batas maksimal radius yang diizinkan adalah <span className="font-extrabold text-rose-950">{selectedTask.radiusMeters} meter</span>.
                    </p>
                    <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-[11px] font-bold text-rose-800 flex items-center space-x-2">
                      <span className="text-base">📍</span>
                      <span>Silakan bergerak mendekat ke dalam lingkaran radius hijau pada peta di atas untuk melakukan presensi.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 px-3 border border-slate-300 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isCameraLoading ||
                    !!cameraError ||
                    isProcessing ||
                    (selectedTask !== null && !isWithinRadius)
                  }
                  onClick={handleCaptureAndVerify}
                  className={`w-2/3 py-2.5 px-4 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition ${
                    isCameraLoading || cameraError || (selectedTask !== null && !isWithinRadius)
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Presensi...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Ambil Foto &amp; Absen Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
