import { useState, useEffect } from 'react';
import { TaskLocation, Employee } from '../types';
import { MapView } from '../components/MapView';
import { calculateDistanceMeters, formatIndonesianDate } from '../lib/geo';
import { ImageViewerModal } from '../components/ImageViewerModal';
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  Compass,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Search,
  Building2,
  FileText,
  ZoomIn,
} from 'lucide-react';

interface KaryawanTugasProps {
  employee: Employee;
  assignedTasks: TaskLocation[];
}

export function KaryawanTugas({ assignedTasks }: KaryawanTugasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.warn('GPS location error:', err.message),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const filteredTasks = assignedTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-md border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Daftar Tugas</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Daftar lokasi kerja &amp; penugasan aktif Anda saat ini
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-xs rounded-full">
            {assignedTasks.length} Tugas
          </span>
        </div>

        {/* Search input */}
        {assignedTasks.length > 0 && (
          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3.5 top-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tugas atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        )}
      </div>

      {/* Task List */}
      {assignedTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto border border-slate-200">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base">Tidak Ada Penugasan Aktif</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
              Anda tidak sedang ditugaskan di lokasi kerja manapun saat ini. Penugasan baru dari Administrator akan otomatis muncul di sini.
            </p>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-2 shadow-sm">
          <p className="text-xs font-bold text-slate-600">Tidak ada penugasan yang cocok dengan kata kunci &quot;{searchTerm}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task, idx) => {
            const distanceMeters =
              userLat && userLng
                ? Math.round(calculateDistanceMeters(userLat, userLng, task.latitude, task.longitude))
                : null;
            const isWithinRadius = distanceMeters !== null && distanceMeters <= task.radiusMeters;

            const shiftStart = task.shiftStart || '08:00';
            const shiftEnd = task.shiftEnd || '17:00';

            return (
              <div
                key={task.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0 transition hover:border-slate-300"
              >
                {/* Task Card Header */}
                <div className="p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full tracking-wider border border-emerald-200">
                          Tugas #{idx + 1}
                        </span>
                        {isWithinRadius ? (
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Di Lokasi</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full tracking-wider">
                            {distanceMeters !== null ? `${distanceMeters} meter` : 'GPS...'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {task.title}
                      </h3>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition shrink-0"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Rute GPS</span>
                    </a>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {task.description}
                    </p>
                  )}

                  {/* Badges: Shift, Radius & Periode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-900 p-2.5 rounded-2xl border border-emerald-200/80">
                      <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Shift Kerja</p>
                        <p className="font-extrabold text-xs text-emerald-950">{shiftStart} - {shiftEnd} WIB</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-50 text-slate-800 p-2.5 rounded-2xl border border-slate-200/80">
                      <Compass className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Radius Absensi</p>
                        <p className="font-extrabold text-xs text-slate-900">{task.radiusMeters} Meter</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-50 text-slate-800 p-2.5 rounded-2xl border border-slate-200/80">
                      <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Masa Penugasan</p>
                        <p className="font-extrabold text-[11px] text-slate-900 truncate">
                          {formatIndonesianDate(task.startDate)} - {formatIndonesianDate(task.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address & Interactive Map */}
                <div className="p-5 space-y-3 bg-slate-50/50">
                  <div className="flex items-start space-x-2 text-xs text-slate-700 font-semibold">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{task.address}</span>
                  </div>

                  {task.locationNotes && task.locationNotes.trim() !== '' && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-amber-950 text-xs">Catatan / Patokan Khusus Lokasi:</p>
                        <p className="font-medium text-amber-900 mt-0.5 leading-relaxed">{task.locationNotes}</p>
                      </div>
                    </div>
                  )}

                  <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                    <MapView
                      centerLat={task.latitude}
                      centerLng={task.longitude}
                      radiusMeters={task.radiusMeters}
                      taskTitle={task.title}
                      userLat={userLat || undefined}
                      userLng={userLng || undefined}
                      isWithinRadius={isWithinRadius}
                      heightClass="h-full"
                    />
                  </div>

                  {/* Task Location Photo if available */}
                  {task.locationPhoto && task.locationPhoto.trim() !== '' && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">Foto Patokan Lokasi:</p>
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: task.locationPhoto!,
                            title: `Foto Lokasi: ${task.title}`,
                            description: `${task.address}${task.locationNotes ? ` • ${task.locationNotes}` : ''}`,
                          })
                        }
                        className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 shadow-xs"
                        title="Klik untuk memperbesar & zoom foto"
                      >
                        <img
                          src={task.locationPhoto}
                          alt={`Patokan ${task.title}`}
                          className="w-full max-h-48 object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-white text-xs font-bold">
                          <ZoomIn className="w-5 h-5 drop-shadow-md" />
                          <span>Perbesar Foto</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Image Zoom In/Out Viewer Modal */}
      {previewImage && (
        <ImageViewerModal
          isOpen={Boolean(previewImage)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          description={previewImage.description}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
