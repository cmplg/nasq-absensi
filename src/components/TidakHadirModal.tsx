import React, { useState } from 'react';
import { AttendanceRecord, Employee, TaskLocation } from '../types';
import { formatIndonesianDate, formatIndonesianTime } from '../lib/geo';
import { FileText, AlertTriangle, X, CheckCircle2, ArrowRight, Briefcase } from 'lucide-react';

interface TidakHadirModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  assignedTasks?: TaskLocation[];
  onSubmitSuccess: (record: AttendanceRecord) => void;
  userLat: number | null;
  userLng: number | null;
  address: string;
}

export const IZIN_CATEGORIES = [
  'Sakit (Dengan / Tanpa Surat Dokter)',
  'Izin Urusan Keluarga / Pribadi',
  'Dinas Luar / Tugas Lapangan Khusus',
  'Cuti Karyawan',
  'Halangan Darurat / Kecelakaan',
  'Lainnya',
];

export function TidakHadirModal({
  isOpen,
  onClose,
  employee,
  assignedTasks,
  onSubmitSuccess,
  userLat,
  userLng,
  address,
}: TidakHadirModalProps) {
  const [category, setCategory] = useState<string>('Sakit (Dengan / Tanpa Surat Dokter)');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate watermarked permit badge image
  const createIzinBadgeImage = (
    empName: string,
    cat: string,
    notes: string,
    dateStr: string,
    timeStr: string,
    addrStr: string
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 640, 480);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 480);

    // Header Accent Line
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 640, 12);

    // Badge Title
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('NASQ ATTENDANCE SYSTEM • SURAT PERNYATAAN TIDAK HADIR', 32, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 22px sans-serif';
    ctx.fillText('KONFIRMASI IZIN / TIDAK HADIR', 32, 80);

    // Divider Line
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(32, 95, 576, 2);

    // Employee Details Box
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.fillRect(32, 115, 576, 270);

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('INFORMASI KARYAWAN', 52, 145);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Nama: ${empName}`, 52, 175);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Jabatan: ${employee.position} • Shift: ${employee.shiftStart} - ${employee.shiftEnd} WIB`, 52, 200);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`Kategori Alasan: ${cat}`, 52, 240);

    if (notes) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px sans-serif';
      const cleanNotes = notes.length > 55 ? notes.substring(0, 52) + '...' : notes;
      ctx.fillText(`Detail Catatan: "${cleanNotes}"`, 52, 270);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`📅 Tanggal Waktu: ${dateStr} • ${timeStr} WIB`, 52, 310);
    const cleanAddr = addrStr.length > 55 ? addrStr.substring(0, 52) + '...' : addrStr;
    ctx.fillText(`📍 Lokasi GPS: ${cleanAddr}`, 52, 335);
    ctx.fillText(`🌐 Koordinat GPS: ${userLat ? userLat.toFixed(5) : '-'}, ${userLng ? userLng.toFixed(5) : '-'}`, 52, 360);

    // Bottom Watermark Banner
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 420, 640, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('VERIFIED PERMIT RECORD • TERDOKUMENTASI SISTEM ADMIN NASQ', 32, 455);

    return canvas.toDataURL('image/jpeg', 0.50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category === 'Lainnya' && !customNotes.trim()) {
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const dateStr = formatIndonesianDate(now);
    const timeStr = `${formatIndonesianTime(now)}`;
    const finalAddress = address || 'Jl. Jend. Sudirman, Jakarta Pusat';

    const verifiedPhoto = createIzinBadgeImage(
      employee.name,
      category,
      customNotes,
      dateStr,
      timeStr,
      finalAddress
    );

    const activeTask = assignedTasks && assignedTasks.length > 0 ? assignedTasks[0] : null;

    const record: AttendanceRecord = {
      id: `att-izin-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeePosition: employee.position,
      type: 'izin',
      timestamp: now.toISOString(),
      dateString: now.toISOString().split('T')[0],
      timeString: timeStr,
      status: 'izin',
      verifiedPhoto,
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
      onSubmitSuccess(record);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 my-auto text-xs text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Konfirmasi Tidak Hadir / Izin</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pemberitahuan ketidakhadiran resmi untuk rekapitulasi admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200/80 space-y-1 text-blue-900">
            <p className="font-bold text-xs flex items-center space-x-1.5 text-blue-950">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Pernyataan Ketidakhadiran Hari Ini</span>
            </p>
            <p className="text-[11px] leading-relaxed text-blue-800 font-medium">
              Data tidak hadir ini akan tercatat resmi di rekapitulasi kehadiran Admin atas nama{' '}
              <span className="font-black text-blue-950">{employee.name}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-800">
              Pilih Alasan Tidak Hadir / Izin:
            </label>
            <div className="space-y-1.5">
              {IZIN_CATEGORIES.map((catOption) => (
                <label
                  key={catOption}
                  className={`flex items-center space-x-3 p-3 rounded-2xl border transition cursor-pointer ${
                    category === catOption
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700 font-semibold'
                  }`}
                >
                  <input
                    type="radio"
                    name="izinCategory"
                    value={catOption}
                    checked={category === catOption}
                    onChange={() => setCategory(catOption)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0"
                  />
                  <span>{catOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Notes Area */}
          <div className="space-y-1 pt-1">
            <label className="block text-xs font-black text-slate-800">
              Detail Alasan Tambahan {category === 'Lainnya' ? '(Wajib Diisi)' : '(Opsional)'}:
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Tuliskan keterangan detail atau catatan tambahan di sini..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (category === 'Lainnya' && !customNotes.trim())}
              className={`w-full sm:w-2/3 py-3 px-4 font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2 ${
                category === 'Lainnya' && !customNotes.trim()
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
              }`}
            >
              {isSubmitting ? (
                <span>Menyimpan Konfirmasi...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim Konfirmasi Tidak Hadir</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
