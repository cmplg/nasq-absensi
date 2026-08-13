import React, { useState, useRef } from 'react';
import { Employee } from '../types';
import { readAndCompressFile } from '../lib/imageUtils';
import { EmployeeMasterCamModal } from '../components/EmployeeMasterCamModal';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Upload,
  Camera,
  X,
  ShieldCheck,
  User,
  KeyRound,
  Loader2,
  UserCheck,
} from 'lucide-react';

interface AdminKaryawanProps {
  employees: Employee[];
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export function AdminKaryawan({
  employees,
  onSaveEmployee,
  onDeleteEmployee,
}: AdminKaryawanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    username: string;
    password?: string;
    position: string;
    department: string;
    shiftStart: string;
    shiftEnd: string;
    isActive: boolean;
    masterPhotos: string[];
  }>({
    name: '',
    email: '',
    username: '',
    password: 'password123',
    position: '',
    department: '',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    isActive: true,
    masterPhotos: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showEmpCamModal, setShowEmpCamModal] = useState(false);

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setFormData({
      name: '',
      email: '',
      username: '',
      password: 'password123',
      position: '',
      department: 'Operasional',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      isActive: true,
      masterPhotos: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      username: emp.username,
      password: emp.password || 'password123',
      position: emp.position,
      department: emp.department,
      shiftStart: emp.shiftStart,
      shiftEnd: emp.shiftEnd,
      isActive: emp.isActive,
      masterPhotos: emp.masterPhotos || [],
    });
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingPhoto(true);
      try {
        const compressed = await readAndCompressFile(file, 600, 600, 0.82);
        setFormData((prev) => ({
          ...prev,
          masterPhotos: [compressed], // Replace with single master photo
        }));
      } catch (err) {
        alert('Gagal memproses file foto. Silakan coba file gambar lain.');
      } finally {
        setIsUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleCameraCapture = (photoUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      masterPhotos: [photoUrl], // Replace with single master photo
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate fallback avatar SVG if no master photo uploaded
    let photos = formData.masterPhotos;
    if (photos.length === 0) {
      const initials = formData.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <circle cx="150" cy="110" r="55" fill="#334155"/>
        <path d="M 60 250 C 60 185, 240 185, 240 250 Z" fill="#334155"/>
        <text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="28" fill="#ffffff" text-anchor="middle">${initials}</text>
      </svg>`;
      photos = [`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`];
    }

    const isEditingSuper =
      editingEmp?.username.toLowerCase() === 'superuser' ||
      editingEmp?.id === 'emp-superuser' ||
      editingEmp?.isDeveloper;

    const employeeObj: Employee = {
      id: editingEmp ? editingEmp.id : `emp-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      username: isEditingSuper ? 'superuser' : formData.username,
      password: isEditingSuper ? 'ultra' : formData.password || 'password123',
      position: formData.position,
      department: formData.department,
      shiftStart: formData.shiftStart,
      shiftEnd: formData.shiftEnd,
      isActive: isEditingSuper ? true : formData.isActive,
      masterPhotos: photos,
      createdAt: editingEmp ? editingEmp.createdAt : new Date().toISOString(),
      isDeveloper: isEditingSuper ? true : undefined,
    };

    onSaveEmployee(employeeObj);
    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Karyawan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Kelola data akun personel, jam shift, dan master foto verifikasi wajah
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berdasarkan nama, username, atau jabatan..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
        />
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Karyawan &amp; Foto Master</th>
                <th className="p-4">Username / Email</th>
                <th className="p-4">Jabatan &amp; Depertemen</th>
                <th className="p-4">Jam Shift Kerja</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada data karyawan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSuper =
                    emp.username.toLowerCase() === 'superuser' ||
                    emp.id === 'emp-superuser' ||
                    emp.isDeveloper;

                  return (
                    <tr key={emp.id} className={`transition ${isSuper ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={emp.masterPhotos[0] || 'https://via.placeholder.com/150'}
                            alt={emp.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                              {isSuper && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-[10px] inline-flex items-center space-x-1 shadow-2xs">
                                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                                  <span>Developer</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {emp.id}</p>
                            {isSuper && (
                              <p className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 mt-1 inline-block">
                                🛡️ Akun tidak dapat dihapus. Hubungi Developer.
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900">@{emp.username}</p>
                        <p className="text-slate-500 text-[11px]">{emp.email}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Sandi: {emp.password || 'password123'}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900">{emp.position}</p>
                        <p className="text-slate-500 text-[11px]">{emp.department}</p>
                      </td>

                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                          {emp.shiftStart} - {emp.shiftEnd} WIB
                        </span>
                      </td>

                      <td className="p-4">
                        {emp.isActive ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200 text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Nonaktif</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Edit Data"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isSuper ? (
                          <button
                            type="button"
                            onClick={() => alert('Akun tidak dapat dihapus. Hubungi Developer.')}
                            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-lg transition"
                            title="Akun tidak dapat dihapus. Hubungi Developer."
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus akun ${emp.name}?`)) {
                                onDeleteEmployee(emp.id);
                              }
                            }}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 my-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: budi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi (Password) *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contoh: password123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Email Karyawan *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="budi@nasq.co.id"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * Akun ini akan digunakan oleh karyawan untuk masuk di <strong>Portal Absensi Karyawan</strong>.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Contoh: IT Support"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departemen *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Contoh: Teknologi Informasi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Kerja Masuk</label>
                  <input
                    type="time"
                    required
                    value={formData.shiftStart}
                    onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Kerja Pulang</label>
                  <input
                    type="time"
                    required
                    value={formData.shiftEnd}
                    onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Master Photo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700">Foto Master Verifikasi Wajah (1 Foto)</label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Foto ini digunakan sebagai acuan pencocokan wajah saat karyawan melakukan presensi.
                </p>

                {formData.masterPhotos.length > 0 ? (
                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <img
                      src={formData.masterPhotos[0]}
                      alt="Master Wajah"
                      className="w-14 h-14 rounded-xl object-cover border border-emerald-300 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900 text-xs truncate">Foto Master Tersimpan</p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                        ✓ Terkompresi Web (~60KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, masterPhotos: [] })}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Camera Web Option */}
                    <button
                      type="button"
                      onClick={() => setShowEmpCamModal(true)}
                      className="flex items-center justify-center space-x-2 p-3 bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-300 rounded-2xl text-emerald-950 font-bold text-xs transition shadow-2xs"
                    >
                      <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Ambil Kamera Web</span>
                    </button>

                    {/* File Upload Option */}
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-2 p-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl text-slate-700 font-bold text-xs transition"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                          <span>Mengompres Foto...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Unggah File Foto</span>
                        </>
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-800">
                  Status Akun Karyawan Aktif
                </label>
              </div>

              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  Simpan Data Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Web Camera Modal for Employee Master Photo */}
      <EmployeeMasterCamModal
        isOpen={showEmpCamModal}
        onClose={() => setShowEmpCamModal(false)}
        onCapturePhoto={handleCameraCapture}
      />
    </div>
  );
}
