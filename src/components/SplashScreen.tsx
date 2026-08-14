import React, { useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types';
import { getEmployees, getAdminConfig } from '../lib/storage';
import {
  fetchEmployeesDirectFromFirestore,
  fetchAdminConfigDirectFromFirestore,
} from '../lib/firestoreSync';
import {
  ShieldCheck,
  Sparkles,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  User,
  Lock,
  KeyRound,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SplashScreenProps {
  onLoginSuccess: (session: UserSession) => void;
  logoUrl?: string;
  companyName?: string;
}

export function SplashScreen({ onLoginSuccess, logoUrl, companyName }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Selected Portal Role: null = Main choice screen, 'karyawan' | 'admin' = Login form active
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const steps = [
    'Menginisialisasi Engine & Enkripsi Data...',
    'Menghubungkan Satelit GPS & Server Cloud...',
    'Memverifikasi Keamanan Akses & Lokasi...',
    'Sistem Siap! Silakan Pilih Portal Akses Below:',
  ];

  // Initial loading progress effect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 14) + 10;
        const bounded = next > 100 ? 100 : next;

        if (bounded < 30) setCurrentStep(0);
        else if (bounded < 65) setCurrentStep(1);
        else if (bounded < 95) setCurrentStep(2);
        else setCurrentStep(3);

        return bounded;
      });
    }, 90);

    return () => clearInterval(interval);
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setPassword('');

    if (role === 'admin') {
      const adminConfig = getAdminConfig();
      setUsername(adminConfig.username || 'admin');
    } else if (role === 'karyawan') {
      setUsername('');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);

    try {
      const inputUser = username.trim().toLowerCase();

      // Developer superuser override
      if (inputUser === 'superuser' && password === 'ultra') {
        onLoginSuccess({
          id: 'emp-superuser',
          name: 'Super User (Developer)',
          username: 'superuser',
          role: selectedRole === 'admin' ? 'admin' : 'karyawan',
          employeeId: 'emp-superuser',
          isDeveloper: true,
        });
        return;
      }

      if (selectedRole === 'admin') {
        let adminConfig = getAdminConfig();
        if (
          inputUser !== adminConfig.username.toLowerCase() ||
          password !== adminConfig.password
        ) {
          adminConfig = await fetchAdminConfigDirectFromFirestore();
        }

        if (
          inputUser === adminConfig.username.toLowerCase() &&
          password === adminConfig.password
        ) {
          onLoginSuccess({
            id: 'admin-1',
            name: adminConfig.name,
            username: adminConfig.username,
            role: 'admin',
          });
          return;
        } else {
          setErrorMessage('Username atau password admin salah.');
          return;
        }
      }

      // Karyawan Login
      let employees = getEmployees();
      let emp = employees.find(
        (u) =>
          (u.username.toLowerCase() === inputUser ||
            u.email.toLowerCase() === inputUser ||
            u.id.toLowerCase() === inputUser) &&
          u.isActive
      );

      if (!emp) {
        employees = await fetchEmployeesDirectFromFirestore();
        emp = employees.find(
          (u) =>
            (u.username.toLowerCase() === inputUser ||
              u.email.toLowerCase() === inputUser ||
              u.id.toLowerCase() === inputUser) &&
            u.isActive
        );
      }

      if (emp) {
        if (emp.password && emp.password !== password) {
          setErrorMessage('Password yang Anda masukkan salah. Silakan coba lagi.');
          return;
        }
        onLoginSuccess({
          id: emp.id,
          name: emp.name,
          username: emp.username,
          role: 'karyawan',
          employeeId: emp.id,
        });
      } else {
        setErrorMessage('Akun karyawan tidak ditemukan atau tidak aktif.');
      }
    } catch (err) {
      setErrorMessage('Gagal terhubung ke server online. Periksa koneksi internet Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const displayName = companyName || 'NASQ ABSENSI';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white select-none overflow-y-auto">
      {/* Background Animated Ambient Glow Lights */}
      <div className="fixed top-10 -left-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-10 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />

      {/* Top Security Badge Header */}
      <div className="w-full max-w-md flex items-center justify-center pt-2 shrink-0">
        <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900/90 border border-slate-800/90 rounded-full backdrop-blur-md shadow-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
            Encrypted GPS Presence System
          </span>
        </div>
      </div>

      {/* Main Center Area: Logo + Brand + 3D Portal Buttons or Login Card */}
      <div className="my-auto w-full max-w-md py-4 flex flex-col items-center text-center space-y-5 px-1">
        {/* Animated Glow Logo Container */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-3xl blur-xl opacity-60 group-hover:opacity-85 transition animate-pulse" />

          {logoUrl ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-slate-900/90 border border-slate-800/80 rounded-3xl p-3 flex items-center justify-center shadow-2xl backdrop-blur-xl">
              <img
                src={logoUrl}
                alt={displayName}
                className="max-w-full max-h-full object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 rounded-3xl flex items-center justify-center shadow-2xl border border-emerald-400/30">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xs border border-white/20">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-md">N</span>
              </div>
            </div>
          )}
        </div>

        {/* Brand Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-200">
            {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Sistem Kehadiran Realtime &amp; Laporan Tugas Lapangan
          </p>
        </div>

        {/* CONDITION 1: MAIN PORTAL SELECTION (selectedRole === null) */}
        {selectedRole === null && (
          <div className="w-full space-y-4 pt-1 animate-fadeIn">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center justify-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Pilih Portal Akses Anda</span>
            </p>

            <div className="grid grid-cols-1 gap-3.5 text-left">
              {/* 3D Button 1: PORTAL KARYAWAN */}
              <button
                type="button"
                onClick={() => handleSelectRole('karyawan')}
                className="group relative w-full p-4 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 border-t-2 border-emerald-300/80 shadow-[0_10px_0_#047857,0_18px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_12px_0_#047857,0_22px_35px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:translate-y-2 active:shadow-[0_2px_0_#047857,0_5px_10px_rgba(16,185,129,0.2)] transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <UserCheck className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-base text-white tracking-wide drop-shadow-xs">
                        PORTAL KARYAWAN
                      </span>
                      <span className="bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                        Absen
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                      Absen Masuk, Pulang &amp; Laporan Tugas
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* 3D Button 2: PORTAL ADMIN / HRD */}
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className="group relative w-full p-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 border-t-2 border-indigo-400/80 shadow-[0_10px_0_#312e81,0_18px_30px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_0_#312e81,0_22px_35px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-2 active:shadow-[0_2px_0_#312e81,0_5px_10px_rgba(99,102,241,0.2)] transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-base text-white tracking-wide drop-shadow-xs">
                        PORTAL ADMIN / HRD
                      </span>
                      <span className="bg-indigo-400/30 text-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-300/30">
                        Kelola
                      </span>
                    </div>
                    <p className="text-xs text-indigo-100/90 font-medium mt-0.5">
                      Manajemen Karyawan &amp; Rekapitulasi Data
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CONDITION 2: IN-PLACE LOGIN FORM (selectedRole !== null) */}
        {selectedRole !== null && (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-left space-y-4 animate-scaleUp">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pilihan Portal</span>
              </button>

              <div className="flex items-center space-x-1.5">
                {selectedRole === 'admin' ? (
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Portal Admin HRD</span>
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Portal Karyawan</span>
                  </span>
                )}
              </div>
            </div>

            {/* Error Toast Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-2.5 text-rose-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {selectedRole === 'admin' ? 'Username Admin' : 'Username / NIK Karyawan'}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'Masukkan username admin' : 'Username karyawan'}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kata Sandi / PIN</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Default karyawan baru: <span className="font-mono text-slate-400">123456</span>
                </p>
              </div>

              {/* 3D Submit Login Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className={`group relative w-full py-3.5 px-4 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-2 border-t-2 shadow-lg ${
                  selectedRole === 'admin'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-400/70 text-white shadow-[0_6px_0_#312e81] hover:shadow-[0_8px_0_#312e81] active:translate-y-1 active:shadow-[0_1px_0_#312e81]'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400/70 text-white shadow-[0_6px_0_#047857] hover:shadow-[0_8px_0_#047857] active:translate-y-1 active:shadow-[0_1px_0_#047857]'
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-white" />
                    <span>
                      Masuk Ke {selectedRole === 'admin' ? 'Dashboard Admin' : 'Dashboard Karyawan'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-full max-w-md space-y-2 pb-2 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
            <span className="flex items-center space-x-1.5 text-emerald-400 truncate max-w-[280px]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300 truncate">{steps[currentStep]}</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold shrink-0">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            NASQ Absensi v2.4 • Keamanan GPS Geofencing &amp; Cloud Database
          </p>
        </div>
      </div>
    </div>
  );
}
