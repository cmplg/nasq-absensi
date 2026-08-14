import React, { useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types';
import { getEmployees, getAdminConfig } from '../lib/storage';
import {
  fetchEmployeesDirectFromFirestore,
  fetchAdminConfigDirectFromFirestore,
} from '../lib/firestoreSync';
import {
  ShieldCheck,
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
  inactivityNotice?: string | null;
  onClearInactivityNotice?: () => void;
}

export function SplashScreen({
  onLoginSuccess,
  logoUrl,
  companyName,
  inactivityNotice,
  onClearInactivityNotice,
}: SplashScreenProps) {
  // Selected Portal Role: null = Main choice screen, 'karyawan' | 'admin' = Login form active
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Typewriter effect state
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (selectedRole === 'karyawan' || selectedRole === 'admin') {
      const fullText =
        selectedRole === 'karyawan'
          ? 'Hubungi divisi Human Resources untuk mendapatkan username dan sandi karyawan.'
          : 'Dashboard khusus Human Resources. hubungi divisi terkait untuk mendapatkan user khusus HR.';

      setTypedText('');
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex <= fullText.length) {
          setTypedText(fullText.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    } else {
      setTypedText('');
    }
  }, [selectedRole]);

  const activeLogo = logoUrl || 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png';

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-100 text-slate-800 select-none overflow-y-auto transition-all duration-500">
      {/* Main Center Area: Responsive container */}
      <div
        className={`w-full max-w-md flex flex-col items-center text-center px-2 z-10 transition-all duration-500 ease-out ${
          selectedRole !== null ? 'space-y-4 py-2' : 'space-y-7 py-6'
        }`}
      >
        {/* Logo Container with Smooth Move-Up and Scale Transition */}
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-out transform ${
            selectedRole !== null ? '-translate-y-2 scale-75' : 'translate-y-0 scale-100'
          }`}
        >
          <img
            src={activeLogo}
            alt={displayName}
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain transition-all duration-500 drop-shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png';
            }}
          />
        </div>

        {/* Inactivity Notice Banner */}
        {inactivityNotice && (
          <div className="w-full p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start space-x-2 text-left animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Sesi Berakhir</span>
              <span>{inactivityNotice}</span>
            </div>
            {onClearInactivityNotice && (
              <button
                type="button"
                onClick={onClearInactivityNotice}
                className="text-amber-500 hover:text-amber-800 text-xs font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* CONDITION 1: MAIN PORTAL SELECTION (selectedRole === null) */}
        {selectedRole === null && (
          <div className="w-full space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 gap-3 text-left">
              {/* Button 1: Absen Karyawan */}
              <button
                type="button"
                onClick={() => handleSelectRole('karyawan')}
                style={{ backgroundColor: '#acddff' }}
                className="group relative w-full p-4 rounded-xl border border-sky-300/80 hover:brightness-95 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-lg bg-white/70 border border-sky-300 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-sky-800" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-slate-900 tracking-tight block">
                      Absen Karyawan
                    </span>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      Absen Masuk, Pulang &amp; Laporan Tugas
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shrink-0 group-hover:bg-white transition">
                  <ChevronRight className="w-4 h-4 text-sky-900 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Button 2: Human Resources */}
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                style={{ backgroundColor: '#f9dfa4', borderStyle: 'groove' }}
                className="group relative w-full p-4 rounded-xl border-2 border-amber-300/90 hover:brightness-95 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-lg bg-white/70 border border-amber-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-slate-900 tracking-tight block">
                      Human Resources
                    </span>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      Manajemen Karyawan &amp; Rekapitulasi Data
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shrink-0 group-hover:bg-white transition">
                  <ChevronRight className="w-4 h-4 text-amber-900 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CONDITION 2: IN-PLACE LOGIN FORM (selectedRole !== null) */}
        {selectedRole !== null && (
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-lg text-left space-y-4 animate-scaleUp transition-all duration-500">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <div className="flex items-center space-x-1.5">
                {selectedRole === 'admin' ? (
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Human Resources</span>
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Absen Karyawan</span>
                  </span>
                )}
              </div>
            </div>

            {/* Error Toast Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 transition"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kata Sandi / PIN</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 transition"
                />
              </div>

              {/* Clean Submit Login Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-3 px-4 rounded-lg font-bold text-xs tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 text-white shadow-sm active:scale-[0.99] ${
                  selectedRole === 'admin'
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
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
                    <span>LOGIN</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Typewriter Note for Karyawan & Human Resources */}
        {selectedRole !== null && (
          <div className="w-full min-h-[44px] px-3 pt-1 flex items-center justify-center">
            <p className="text-xs text-slate-600 text-center font-medium leading-relaxed">
              <span>{typedText}</span>
              <span
                className={`inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle ${
                  selectedRole === 'admin' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
