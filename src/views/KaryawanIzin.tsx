import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Employee, TaskLocation } from '../types';
import { formatIndonesianDate, formatIndonesianTime, getAddressFromCoords } from '../lib/geo';
import { FileText, AlertTriangle, CheckCircle2, ArrowRight, Briefcase, MapPin, Loader2 } from 'lucide-react';

interface KaryawanIzinProps {
  employee: Employee;
  assignedTasks: TaskLocation[];
  onSubmitSuccess: (record: AttendanceRecord) => void;
  todayRecords: AttendanceRecord[];
}

export function KaryawanIzin({
  employee,
  assignedTasks,
  onSubmitSuccess,
  todayRecords,
}: KaryawanIzinProps) {
  const [category, setCategory] = useState<string>('Pekerjaan Selesai');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // GPS position state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [userAddress, setUserAddress] = useState<string>('Mendeteksi posisi GPS...');
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          setIsLoadingGps(false);

          const addr = await getAddressFromCoords(lat, lng);
          setUserAddress(addr || `Lokasi GPS Terdeteksi (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        },
        (err) => {
          console.warn('Izin GPS error:', err.message);
          setUserAddress('Lokasi GPS tidak terdeteksi (Gunakan lokasi default)');
          setIsLoadingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLoadingGps(false);
    }
  }, []);

  const categories = [
    { label: 'Pekerjaan Selesai Lebih Awal', desc: 'Tugas/proyek lapangan telah tuntas dilaksanakan' },
    { label: 'Ada Urusan Keluarga / Penting', desc: 'Keperluan pribadi mendesak atau keluarga' },
    { label: 'Kecelakaan Kerja / Sakit', desc: 'Kondisi kesehatan menurun atau insiden saat bertugas' },
    { label: 'Anggota Keluarga Sakit', desc: 'Mendampingi anggota keluarga yang memerlukan perawatan' },
    { label: 'Lainnya', desc: 'Alasan khusus lainnya (Tuliskan penjelasan pada kolom catatan)' },
  ];

  const existingIzin = todayRecords.find((r) => r.type === 'izin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = formatIndonesianTime(now);

    const finalAddress =
      userAddress !== 'Mendeteksi posisi GPS...'
        ? userAddress
        : 'Mampang Prapatan, Jakarta Selatan, DKI Jakarta';

    const activeTask = assignedTasks && assignedTasks.length > 0 ? assignedTasks[0] : null;

    const record: AttendanceRecord = {
      id: `att-izin-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeePosition: employee.position,
      type: 'izin',
      timestamp: now.toISOString(),
      dateString: dateStr,
      timeString: timeStr,
      status: 'izin',
      verifiedPhoto: '',
      latitude: userLat || -6.2183,
      longitude: userLng || 106.8172,
      address: finalAddress,
      taskId: activeTask ? activeTask.id : undefined,
      taskTitle: activeTask ? activeTask.title : 'Pengajuan Tidak Hadir / Izin',
      earlyReasonCategory: category,
      earlyReasonNotes: customNotes.trim() || undefined,
      notes: `Pengajuan Tidak Hadir: ${category}${customNotes ? ` - ${customNotes}` : ''}`,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onSubmitSuccess(record);
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-amber-800/50 space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Formulir Ketidakhadiran / Izin</h2>
            <p className="text-xs text-amber-200/80 font-medium">
              Pengajuan resmi tidak hadir atau pulang lebih awal
            </p>
          </div>
        </div>
      </div>

      {/* Warning if no assigned task */}
      {assignedTasks.length === 0 ? (
        <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-3xl space-y-3 text-center shadow-xs">
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base">Belum Ada Penugasan Aktif</h3>
            <p className="text-xs text-slate-700 leading-relaxed max-w-md mx-auto font-medium">
              Anda belum memiliki penugasan lokasi kerja aktif saat ini. Pengajuan izin membutuhkan penugasan aktif dari Administrator.
            </p>
          </div>
        </div>
      ) : existingIzin ? (
        <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-3xl space-y-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-full">
                Izin Diterima
              </span>
              <h3 className="font-black text-slate-900 text-base">Izin Hari Ini Sudah Terdaftar</h3>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Keterangan: <span className="font-extrabold text-emerald-900">{existingIzin.earlyReasonCategory}</span>
                {existingIzin.earlyReasonNotes ? ` (${existingIzin.earlyReasonNotes})` : ''}.
              </p>
              <p className="text-[11px] text-slate-500 font-medium pt-1">
                Waktu pengajuan: {formatIndonesianDate(existingIzin.dateString)} • {existingIzin.timeString} WIB
              </p>
            </div>
          </div>
        </div>
      ) : isSuccess ? (
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center space-y-4 shadow-md">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">Pengajuan Izin Berhasil!</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-sm mx-auto">
              Konfirmasi ketidakhadiran Anda telah dicatat secara resmi ke dalam sistem laporan presensi.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          {/* Live GPS location indicator */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs">
            {isLoadingGps ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Lokasi Pengajuan GPS</p>
              <p className="font-bold text-slate-800 truncate">{userAddress}</p>
            </div>
          </div>

          {/* Active Task Reference */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-xs">
            <Briefcase className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Penugasan Aktif</p>
              <p className="font-extrabold text-emerald-950 truncate">{assignedTasks[0].title}</p>
            </div>
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
              Pilih Kategori Alasan Tidak Hadir *
            </label>
            <div className="space-y-2">
              {categories.map((item) => {
                const isSelected = category === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCategory(item.label)}
                    className={`w-full p-3.5 rounded-2xl text-left transition flex items-start space-x-3 border ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-xs font-black ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
              Catatan Penjelasan Tambahan {category === 'Lainnya' ? '*' : '(Opsional)'}
            </label>
            <textarea
              rows={3}
              required={category === 'Lainnya'}
              placeholder="Tuliskan keterangan detail terkait alasan izin..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Pengajuan...</span>
              </>
            ) : (
              <>
                <span>Kirim Pengajuan Izin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
