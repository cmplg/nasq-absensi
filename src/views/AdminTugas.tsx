import React, { useState, useEffect } from 'react';
import { TaskLocation, Employee } from '../types';
import { MapView } from '../components/MapView';
import { searchPlaces, PlaceSuggestion, getAddressFromCoords } from '../lib/geo';
import { TaskLocationCamModal } from '../components/TaskLocationCamModal';
import { ImageViewerModal } from '../components/ImageViewerModal';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  X,
  Target,
  Layers,
  Navigation,
  Loader2,
  LocateFixed,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Camera,
  FileText,
  ZoomIn,
} from 'lucide-react';

// Helper to scale down images for lightweight resolution (~480x480 px, ~12KB)
const compressAndResizeImage = (dataUrl: string, maxWidth = 480, maxHeight = 480, quality = 0.50): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
};

interface AdminTugasProps {
  tasks: TaskLocation[];
  employees: Employee[];
  onSaveTask: (task: TaskLocation) => void;
  onDeleteTask: (id: string) => void;
}

export function AdminTugas({
  tasks,
  employees,
  onSaveTask,
  onDeleteTask,
}: AdminTugasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskLocation | null>(null);

  // Admin GPS Location State
  const [adminLat, setAdminLat] = useState<number | null>(null);
  const [adminLng, setAdminLng] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAdminLat(pos.coords.latitude);
          setAdminLng(pos.coords.longitude);
        },
        (err) => {
          console.warn('Admin GPS detection:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Autocomplete Location Search states
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [isGettingCurrentLoc, setIsGettingCurrentLoc] = useState(false);

  // Complete Task Confirmation modal state
  const [taskToComplete, setTaskToComplete] = useState<TaskLocation | null>(null);

  // Quick Action: Use Current GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }
    setIsGettingCurrentLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setAdminLat(lat);
        setAdminLng(lng);

        const addr = await getAddressFromCoords(lat, lng);
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: addr || `Lokasi GPS Terdeteksi (${lat}, ${lng})`,
        }));
        setIsGettingCurrentLoc(false);
        setShowSuggestionsDropdown(false);
      },
      (err) => {
        alert('Gagal mengambil lokasi GPS saat ini: ' + err.message);
        setIsGettingCurrentLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Action: Confirm Complete Task
  const handleConfirmCompleteTask = () => {
    if (!taskToComplete) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedTask: TaskLocation = {
      ...taskToComplete,
      status: 'selesai',
      endDate: taskToComplete.endDate < todayStr ? taskToComplete.endDate : todayStr,
    };
    onSaveTask(updatedTask);
    setTaskToComplete(null);
  };

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    address: string;
    locationNotes?: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    assignedEmployeeIds: string[];
    startDate: string;
    endDate: string;
    shiftStart: string;
    shiftEnd: string;
    status: 'aktif' | 'selesai';
    locationPhoto?: string;
  }>({
    title: '',
    description: '',
    address: '',
    locationNotes: '',
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 150,
    assignedEmployeeIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    shiftStart: '08:00',
    shiftEnd: '17:00',
    status: 'aktif',
    locationPhoto: '',
  });

  // State for Image Viewer Modal (Zoom in/out preview)
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

  // Task Web Camera Modal state
  const [showTaskCamModal, setShowTaskCamModal] = useState<boolean>(false);

  // Handle Location Photo File Upload with Automatic Compression (800x600 px, ~80KB)
  const handleLocationPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawDataUrl = reader.result as string;
        const compressed = await compressAndResizeImage(rawDataUrl, 800, 600, 0.82);
        setFormData((prev) => ({ ...prev, locationPhoto: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Debounced Place Search API call with Admin GPS proximity bias
  useEffect(() => {
    if (!showModal) {
      setPlaceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (formData.address && formData.address.length >= 2 && showSuggestionsDropdown) {
        setIsSearchingPlaces(true);
        const results = await searchPlaces(
          formData.address,
          adminLat || undefined,
          adminLng || undefined
        );
        setPlaceSuggestions(results);
        setIsSearchingPlaces(false);
      } else {
        setPlaceSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.address, showModal, showSuggestionsDropdown, adminLat, adminLng]);

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingTask(null);
    const initialLat = adminLat !== null ? adminLat : -6.2183;
    const initialLng = adminLng !== null ? adminLng : 106.8172;

    setFormData({
      title: '',
      description: '',
      address: 'Mendeteksi posisi lokasi...',
      locationNotes: '',
      latitude: initialLat,
      longitude: initialLng,
      radiusMeters: 150,
      assignedEmployeeIds: employees.length > 0 ? [employees[0].id] : [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      shiftStart: '08:00',
      shiftEnd: '17:00',
      status: 'aktif',
      locationPhoto: '',
    });

    if (adminLat !== null && adminLng !== null) {
      getAddressFromCoords(adminLat, adminLng).then((addr) => {
        setFormData((prev) => ({ ...prev, address: addr }));
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        address: 'NASQ Tower, Jl. Jend. Sudirman No. 45, Semanggi, Jakarta Selatan',
      }));
    }

    setShowModal(true);
  };

  const handleOpenEdit = (task: TaskLocation) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      address: task.address,
      locationNotes: task.locationNotes || '',
      latitude: task.latitude,
      longitude: task.longitude,
      radiusMeters: task.radiusMeters,
      assignedEmployeeIds: task.assignedEmployeeIds || [],
      startDate: task.startDate,
      endDate: task.endDate,
      shiftStart: task.shiftStart || '08:00',
      shiftEnd: task.shiftEnd || '17:00',
      status: task.status,
      locationPhoto: task.locationPhoto || '',
    });
    setShowModal(true);
  };

  const handleEmployeeToggle = (empId: string) => {
    if (formData.assignedEmployeeIds.includes(empId)) {
      setFormData({
        ...formData,
        assignedEmployeeIds: formData.assignedEmployeeIds.filter((id) => id !== empId),
      });
    } else {
      setFormData({
        ...formData,
        assignedEmployeeIds: [...formData.assignedEmployeeIds, empId],
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskObj: TaskLocation = {
      id: editingTask ? editingTask.id : `task-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      address: formData.address,
      locationNotes: formData.locationNotes?.trim() || undefined,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      radiusMeters: Number(formData.radiusMeters),
      assignedEmployeeIds: formData.assignedEmployeeIds,
      startDate: formData.startDate,
      endDate: formData.endDate,
      shiftStart: formData.shiftStart,
      shiftEnd: formData.shiftEnd,
      status: formData.status,
      locationPhoto: formData.locationPhoto,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
    };

    onSaveTask(taskObj);
    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Lokasi &amp; Tugas Lapangan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Daftarkan titik kordinat lokasi tugas, radius presensi valid, dan penugasan personel
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Penugasan Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berdasarkan nama tugas atau lokasi alamat..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
        />
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            Belum ada data penugasan lapangan yang terdaftar.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assignedEmps = employees.filter((e) => task.assignedEmployeeIds?.includes(e.id));
            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition text-xs"
              >
                <div>
                  {/* Embedded Leaflet Map & Location Photo Preview */}
                  <div className="h-48 w-full relative">
                    <MapView
                      centerLat={task.latitude}
                      centerLng={task.longitude}
                      radiusMeters={task.radiusMeters}
                      taskTitle={task.title}
                    />
                    {task.locationPhoto && task.locationPhoto.trim() !== '' ? (
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: task.locationPhoto!,
                            title: `Foto Patokan: ${task.title}`,
                            description: `${task.address}${task.locationNotes ? ` • ${task.locationNotes}` : ''}`,
                          })
                        }
                        className="absolute top-2 right-2 group z-[400] cursor-pointer"
                        title="Klik untuk melihat & perbesar foto (Zoom In/Out)"
                      >
                        <div className="relative overflow-hidden rounded-xl border-2 border-white shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg">
                          <img
                            src={task.locationPhoto}
                            alt="Foto Lokasi"
                            className="w-16 h-16 object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                          </div>
                          <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 py-0.5 rounded font-bold">
                            Foto
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                          {task.status === 'aktif' ? 'Tugas Aktif' : 'Selesai'}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">{task.title}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg shrink-0 text-xs border border-slate-200">
                        Radius {task.radiusMeters}m
                      </span>
                    </div>

                    <p className="text-slate-600 line-clamp-2">{task.description}</p>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <p className="flex items-start space-x-2 text-slate-800 font-medium">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{task.address}</span>
                      </p>
                      {task.locationNotes && task.locationNotes.trim() !== '' && (
                        <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 flex items-start space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-950">Catatan Lokasi: </span>
                            <span>{task.locationNotes}</span>
                          </div>
                        </div>
                      )}
                      <p className="flex items-center space-x-2 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Periode: {task.startDate} s.d {task.endDate}</span>
                      </p>
                    </div>

                    {/* Assigned Employees Avatars */}
                    <div className="pt-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        Karyawan Ditugaskan ({assignedEmps.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedEmps.length === 0 ? (
                          <span className="text-slate-400 italic">Belum ada karyawan ditugaskan.</span>
                        ) : (
                          assignedEmps.map((emp) => (
                            <span
                              key={emp.id}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-[11px] border border-slate-200 flex items-center space-x-1"
                            >
                              <span>{emp.name}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {task.status === 'aktif' && (
                      <button
                        onClick={() => setTaskToComplete(task)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-xs shadow-xs transition flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selesaikan Penugasan</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin menghapus penugasan "${task.title}"?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTask ? 'Edit Penugasan Lapangan' : 'Tambah Penugasan Lapangan Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Tugas / Lokasi *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Pemeliharaan Server Data Center Gedung NASQ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan ringkas instruksi penugasan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="relative">
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Alamat Lengkap &amp; Pencarian Lokasi *</span>
                  {adminLat !== null && (
                    <span className="text-[10px] text-emerald-700 font-extrabold flex items-center space-x-1">
                      <Navigation className="w-3 h-3" />
                      <span>GPS Admin Terdeteksi</span>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      setShowSuggestionsDropdown(true);
                    }}
                    onFocus={() => setShowSuggestionsDropdown(true)}
                    placeholder="Ketik alamat / nama tempat (cth: Apartemen, Gedung, Jalan)..."
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  {isSearchingPlaces ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-3" />
                  ) : (
                    formData.address && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, address: '' });
                          setPlaceSuggestions([]);
                        }}
                        className="text-slate-400 hover:text-slate-600 absolute right-3 top-3"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>

                {/* Autocomplete Dropdown List */}
                {showSuggestionsDropdown && placeSuggestions.length > 0 && (
                  <div className="absolute z-[9999] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Hasil Rekomendasi Lokasi</span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestionsDropdown(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Tutup ✕
                      </button>
                    </div>
                    {placeSuggestions.map((place) => (
                      <button
                        key={place.place_id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            address: place.display_name,
                            latitude: Number(place.lat.toFixed(5)),
                            longitude: Number(place.lng.toFixed(5)),
                          });
                          setShowSuggestionsDropdown(false);
                          setPlaceSuggestions([]);
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/60 transition flex items-start space-x-2.5 group"
                      >
                        <div className="p-1.5 bg-slate-100 group-hover:bg-emerald-100 rounded-lg text-slate-600 group-hover:text-emerald-700 shrink-0 mt-0.5">
                          <Navigation className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-slate-900 group-hover:text-emerald-800 text-xs truncate">
                              {place.short_name.split('-')[0]}
                            </p>
                            {place.distanceMeters !== undefined && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                                ±{place.distanceMeters > 1000 ? (place.distanceMeters / 1000).toFixed(1) + ' km' : place.distanceMeters + ' m'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {place.display_name}
                          </p>
                          <span className="text-[9px] text-slate-400 font-mono">
                            GPS: {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Catatan Lokasi (Detail / Patokan Khusus) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Catatan Lokasi (Detail / Patokan Khusus)</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Opsional</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.locationNotes}
                  onChange={(e) => setFormData({ ...formData, locationNotes: e.target.value })}
                  placeholder="Contoh: Masuk melalui lobby barat, gedung samping minimarket, lantai 3 ruang server..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Interactive Location Map Picker */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Pilih Koordinat di Peta:</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isGettingCurrentLoc}
                    className="px-2.5 py-1 bg-[#93eea6] hover:bg-[#7fe495] text-emerald-950 rounded-lg text-[11px] font-extrabold flex items-center space-x-1.5 transition border border-emerald-400 shrink-0 shadow-2xs"
                  >
                    {isGettingCurrentLoc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-800" />
                    ) : (
                      <LocateFixed className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                    <span>Tambahkan Lokasi Saat Ini</span>
                  </button>
                </div>
                <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-300">
                  <MapView
                    centerLat={formData.latitude}
                    centerLng={formData.longitude}
                    radiusMeters={formData.radiusMeters}
                    isInteractive={true}
                    onLocationSelect={(lat, lng) => {
                      setFormData({
                        ...formData,
                        latitude: Number(lat.toFixed(5)),
                        longitude: Number(lng.toFixed(5)),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Radius (Meter) *</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    required
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) || 100 })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Jadwal Shift Hari Ini / Jam Kerja Tugas */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <div>
                  <label className="block font-bold text-emerald-900 text-xs mb-1">Shift Mulai (Jam Masuk)</label>
                  <input
                    type="time"
                    required
                    value={formData.shiftStart}
                    onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 text-xs mb-1">Shift Selesai (Jam Pulang)</label>
                  <input
                    type="time"
                    required
                    value={formData.shiftEnd}
                    onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>
              </div>

              {/* Upload Foto Lokasi Penugasan */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700">Foto Lokasi Penugasan (Opsional):</label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Gunakan kamera web atau unggah foto patokan lokasi dengan resolusi otomatis terkompresi (~80KB) agar ringan & cepat.
                </p>

                {formData.locationPhoto && formData.locationPhoto.trim() !== '' ? (
                  <div className="rounded-2xl border border-slate-300 bg-slate-50 flex items-center justify-between p-3 gap-3">
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: formData.locationPhoto!,
                          title: formData.title || 'Foto Lokasi Penugasan',
                          description: formData.address || 'Pratinjau Foto Patokan Lokasi',
                        })
                      }
                      className="relative group cursor-pointer shrink-0"
                      title="Klik untuk memperbesar & zoom foto"
                    >
                      <img
                        src={formData.locationPhoto}
                        alt="Foto Lokasi"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p className="font-extrabold text-slate-900 text-xs truncate">Foto Lokasi Terpilih</p>
                      <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Terkompresi Web (~80KB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, locationPhoto: '' })}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: Web Camera */}
                    <button
                      type="button"
                      onClick={() => setShowTaskCamModal(true)}
                      className="flex items-center justify-center space-x-2 p-3.5 border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/80 rounded-2xl cursor-pointer transition text-emerald-950 font-bold text-xs shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Ambil Foto Kamera Web</span>
                    </button>

                    {/* Option 2: Upload File */}
                    <label className="flex items-center justify-center space-x-2 p-3.5 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer transition text-slate-700 font-bold text-xs">
                      <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Unggah File Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocationPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Multi-employee Select */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700">Pilih Karyawan Ditugaskan:</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {employees.map((emp) => {
                    const isAssigned = formData.assignedEmployeeIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleEmployeeToggle(emp.id)}
                        className={`p-2 rounded-lg text-left border font-medium flex items-center justify-between transition ${
                          isAssigned
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{emp.name}</span>
                        {isAssigned && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-2.5 bg-[#808081] hover:bg-[#6c6c6d] text-white font-bold rounded-xl shadow-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Selesaikan Penugasan */}
      {taskToComplete && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-xs text-center my-auto">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Selesaikan Penugasan Lapangan?</h3>
              <p className="text-slate-700 font-extrabold text-sm bg-slate-100 p-2 rounded-xl border border-slate-200">
                "{taskToComplete.title}"
              </p>
            </div>

            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-left space-y-2.5 text-amber-900">
              <div className="flex items-center space-x-2 font-black text-amber-950">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Konfirmasi Sebelum Mengakhiri Tugas</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                Mohon pastikan seluruh karyawan yang ditugaskan pada lokasi ini sudah selesai melakukan presensi/absen sebelum Anda mengakhiri tugas ini.
              </p>

              <div className="pt-2 border-t border-amber-200/80 text-[11px]">
                <p className="font-extrabold text-amber-950 mb-1">
                  Daftar Karyawan Ditugaskan ({taskToComplete.assignedEmployeeIds?.length || 0}):
                </p>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {employees
                    .filter((e) => taskToComplete.assignedEmployeeIds?.includes(e.id))
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="px-2.5 py-1.5 bg-white/80 rounded-lg border border-amber-200 text-slate-800 flex items-center justify-between text-[11px] font-bold"
                      >
                        <span className="truncate">{emp.name}</span>
                        <span className="text-[10px] text-amber-700 font-medium">{emp.department}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setTaskToComplete(null)}
                className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteTask}
                className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Selesaikan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Camera Modal for Task Location Photo */}
      <TaskLocationCamModal
        isOpen={showTaskCamModal}
        onClose={() => setShowTaskCamModal(false)}
        onCapturePhoto={(photoDataUrl) => {
          setFormData((prev) => ({ ...prev, locationPhoto: photoDataUrl }));
        }}
      />

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
