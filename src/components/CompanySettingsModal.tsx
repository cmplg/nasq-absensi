import React, { useState } from 'react';
import { getAdminConfig, saveAdminConfig } from '../lib/storage';
import { AdminConfig } from '../lib/supabaseDb';
import {
  Building2,
  ShieldCheck,
  Image,
  User,
  Lock,
  Timer,
  CheckCircle2,
  Play,
  Link,
  Trash2,
  X,
} from 'lucide-react';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewSplashScreen?: () => void;
}

export function CompanySettingsModal({
  isOpen,
  onClose,
  onPreviewSplashScreen,
}: CompanySettingsModalProps) {
  const [adminConfig, setAdminConfigState] = useState<AdminConfig>(() => getAdminConfig());
  const [newUsername, setNewUsername] = useState(adminConfig.username);
  const [newPassword, setNewPassword] = useState(adminConfig.password);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(adminConfig.companyLogoUrl || '');
  const [companyName, setCompanyName] = useState(adminConfig.companyName || 'NASQ ABSENSI');
  const [inactivityMinutes, setInactivityMinutes] = useState<number>(
    adminConfig.inactivityTimeoutMinutes ?? 15
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveAdminConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    const updated: AdminConfig = {
      ...adminConfig,
      username: newUsername.trim(),
      password: newPassword.trim(),
      companyLogoUrl: companyLogoUrl.trim(),
      companyName: companyName.trim() || 'NASQ ABSENSI',
      inactivityTimeoutMinutes: Math.max(1, inactivityMinutes || 15),
    };
    saveAdminConfig(updated);
    setAdminConfigState(updated);
    setSaveSuccessMsg('Pengaturan perusahaan, branding & durasi sesi berhasil disimpan!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const sampleImageKitUrls = [
    { label: 'NASQ Logo Default', url: 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png' },
    { label: 'ImageKit Sample 1', url: 'https://ik.imagekit.io/demo/img/logo.png' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xl space-y-6 my-auto text-left animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Pengaturan Perusahaan &amp; Sistem</h3>
              <p className="text-xs text-slate-500 font-medium">
                Konfigurasi identitas perusahaan, branding logo, batas waktu sesi, dan akun HR.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{saveSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAdminConfig} className="space-y-5 text-xs">
          {/* Section 1: Identitas & Logo Perusahaan */}
          <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
                <Image className="w-4 h-4 text-indigo-600" />
                <span>Identitas &amp; Logo Perusahaan</span>
              </div>
              {onPreviewSplashScreen && (
                <button
                  type="button"
                  onClick={onPreviewSplashScreen}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition"
                >
                  <Play className="w-3 h-3" />
                  <span>Preview Login</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Perusahaan / Sistem</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Contoh: PT MAJU BERSAMA"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>URL Logo ImageKit (HTTPS)</span>
                  {companyLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogoUrl('')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center space-x-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus URL</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    placeholder="https://ik.imagekit.io/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-9"
                  />
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Quick Suggestions & Live Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="text-[11px] font-bold text-slate-500">Preset Logo:</span>
                {sampleImageKitUrls.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setCompanyLogoUrl(preset.url)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-200 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Logo Preview */}
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                <span className="text-[10px] font-bold text-slate-400">Pratinjau:</span>
                <img
                  src={companyLogoUrl || 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png'}
                  alt="Preview Logo"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Durasi Batas Waktu Tanpa Aktivitas (Inactivity Timeout) */}
          <div className="p-4 sm:p-5 bg-amber-50/50 rounded-2xl border border-amber-200/70 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
                <Timer className="w-4 h-4 text-amber-600" />
                <span>Batas Durasi Sesi Tanpa Aktivitas (Auto-Logout)</span>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-300">
                Aktif: {inactivityMinutes} Menit
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Jika pengguna tidak melakukan aktivitas mouse, keyboard, atau layar selama durasi ini, sistem akan otomatis mengakhiri sesi dan meminta login kembali demi keamanan data.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                {[5, 10, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setInactivityMinutes(mins)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      inactivityMinutes === mins
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mins} Menit
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 sm:ml-auto">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Kustom (Menit):</label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={inactivityMinutes}
                  onChange={(e) => setInactivityMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Kredensial Administrator */}
          <div className="p-4 sm:p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Kredensial Akun Administrator (HR)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Username Admin</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username admin..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kata Sandi Admin</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kata sandi admin..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer / Save Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition shadow-md shadow-indigo-600/20 flex items-center space-x-2 active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
