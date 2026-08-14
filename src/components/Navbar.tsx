import { useState } from 'react';
import { UserSession } from '../types';
import { getAdminConfig } from '../lib/storage';
import { CompanySettingsModal } from './CompanySettingsModal';
import {
  LogOut,
  UserCheck,
  ShieldCheck,
  Calendar,
  Layers,
  Users,
  MapPin,
  FileSpreadsheet,
  ChevronDown,
  Sparkles,
  Briefcase,
  FileText,
  Settings,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  currentSession: UserSession | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onPreviewSplashScreen?: () => void;
}

export function Navbar({
  currentSession,
  activeTab,
  setActiveTab,
  onLogout,
  onPreviewSplashScreen,
}: NavbarProps) {
  const [profileBottomSheetOpen, setProfileBottomSheetOpen] = useState(false);
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false);

  const isAdmin = currentSession?.role === 'admin';

  const employeeNavItems = [
    { id: 'dashboard', label: 'Presensi', icon: UserCheck },
    { id: 'tugas-saya', label: 'Tugas', icon: Briefcase },
    { id: 'izin', label: 'Izin', icon: FileText },
    { id: 'riwayat', label: 'Riwayat', icon: Calendar },
  ];

  const adminNavItems = [
    { id: 'admin-overview', label: 'Overview', icon: Layers },
    { id: 'admin-karyawan', label: 'Karyawan', icon: Users },
    { id: 'admin-tugas', label: 'Jobs', icon: MapPin },
    { id: 'admin-rekap', label: 'Rekap', icon: FileSpreadsheet },
  ];

  const currentNavItems = isAdmin ? adminNavItems : employeeNavItems;

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Presensi NASQ';
      case 'tugas-saya':
        return 'Tugas Lapangan Saya';
      case 'izin':
        return 'Formulir Ketidakhadiran';
      case 'riwayat':
        return 'Riwayat & Penugasan';
      case 'admin-overview':
        return 'Dashboard Admin';
      case 'admin-karyawan':
        return 'Manajemen Karyawan';
      case 'admin-tugas':
        return 'Jobs & Titik Lokasi GPS';
      case 'admin-rekap':
        return 'Rekap Laporan Absensi';
      default:
        return 'NASQ Absensi';
    }
  };

  return (
    <>
      {/* Material Design Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* App Icon (NASQ ImageKit Logo) */}
            <img
              src={getAdminConfig().companyLogoUrl || 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png'}
              alt="NASQ Logo"
              onClick={() => setActiveTab(isAdmin ? 'admin-overview' : 'dashboard')}
              className="w-[38px] h-[38px] object-contain rounded-2xl p-1 bg-white border border-slate-200 shadow-md cursor-pointer active:scale-95 transition-transform shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png';
              }}
            />
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {getActiveTabTitle()}
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                {currentSession?.name} • <span className="capitalize font-bold text-slate-700">{currentSession?.role}</span>
              </p>
            </div>
          </div>

          {/* Action Chips / Profile Switcher Button */}
          <button
            onClick={() => setProfileBottomSheetOpen(true)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-full border border-slate-200/80 text-xs font-bold text-slate-800 transition active:scale-95 shadow-2xs"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white ${
                isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {isAdmin ? 'A' : currentSession?.name.charAt(0) || 'K'}
            </div>
            <span className="hidden sm:inline-block max-w-[90px] truncate">{currentSession?.name.split(' ')[0]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Material 3 Bottom Navigation Bar (Fixed at bottom on all viewports) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-lg px-2 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center py-1 px-3 group focus:outline-none"
              >
                {/* Active Indicator Pill */}
                <div
                  className={`px-5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isActive
                      ? isAdmin
                        ? 'bg-indigo-100 text-indigo-900 shadow-2xs'
                        : 'bg-emerald-100 text-emerald-900 shadow-2xs'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 font-bold stroke-[2.5]' : 'stroke-2'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-1 font-bold tracking-tight transition-colors ${
                    isActive
                      ? isAdmin
                        ? 'text-indigo-900 font-extrabold'
                        : 'text-emerald-900 font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Quick Switcher Bottom Nav Action */}
          <button
            onClick={() => setProfileBottomSheetOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 group focus:outline-none"
          >
            <div className="px-5 py-1 rounded-full text-slate-500 group-hover:text-slate-800 transition-all flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500 stroke-2" />
            </div>
            <span className="text-[11px] mt-1 font-bold text-slate-500">Menu</span>
          </button>
        </div>
      </nav>

      {/* Android Bottom Sheet Modal for Profile & Role Switching */}
      {profileBottomSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottom Sheet Handle Bar */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2"></div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                    isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-6 h-6" /> : currentSession?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{currentSession?.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Username: @{currentSession?.username}</p>
                </div>
              </div>
              <button
                onClick={() => setProfileBottomSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Session Info Details */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Sesi Terhubung:</p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Peran Akses:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold uppercase text-[10px] ${
                    isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isAdmin ? 'HRD / Administrator' : 'Karyawan'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">ID Pengguna:</span>
                  <span className="font-mono font-bold text-slate-800">{currentSession?.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Username:</span>
                  <span className="font-bold text-slate-800">@{currentSession?.username}</span>
                </div>
              </div>
            </div>

            {/* Management & Settings Action */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setProfileBottomSheetOpen(false);
                  setCompanySettingsOpen(true);
                }}
                className="w-full py-3.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-2xl font-bold text-xs flex items-center justify-between transition shadow-2xs group text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">Pengaturan Perusahaan</span>
                    <span className="text-[11px] text-slate-500 font-medium">Logo, nama perusahaan, durasi sesi &amp; akun</span>
                  </div>
                </div>
                <span className="text-indigo-600 font-black text-sm group-hover:translate-x-0.5 transition-transform">›</span>
              </button>

              {/* Logout Action */}
              <button
                onClick={() => {
                  setProfileBottomSheetOpen(false);
                  onLogout();
                }}
                className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-extrabold text-xs flex items-center justify-center space-x-2 transition shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sesi (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company & Session Settings Modal */}
      <CompanySettingsModal
        isOpen={companySettingsOpen}
        onClose={() => setCompanySettingsOpen(false)}
        onPreviewSplashScreen={onPreviewSplashScreen}
      />
    </>
  );
}

