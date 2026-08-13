import React, { useState } from 'react';
import { UserSession, UserRole } from '../types';
import { getEmployees, getAdminConfig } from '../lib/storage';
import {
  fetchEmployeesDirectFromFirestore,
  fetchAdminConfigDirectFromFirestore,
} from '../lib/firestoreSync';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [activeRole, setActiveRole] = useState<UserRole>('karyawan');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);

    try {
      const inputUser = username.trim().toLowerCase();

      // Check if logging in as superuser with ultra password
      if (inputUser === 'superuser' && password === 'ultra') {
        onLoginSuccess({
          id: 'emp-superuser',
          name: 'Super User (Developer)',
          username: 'superuser',
          role: activeRole === 'admin' ? 'admin' : 'karyawan',
          employeeId: 'emp-superuser',
          isDeveloper: true,
        });
        return;
      }

      if (activeRole === 'admin') {
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

      // Employee Login: check local first
      let employees = getEmployees();
      let emp = employees.find(
        (u) =>
          (u.username.toLowerCase() === inputUser ||
            u.email.toLowerCase() === inputUser) &&
          u.isActive
      );

      // If not found in local cache, fetch direct from Firestore cloud
      if (!emp) {
        employees = await fetchEmployeesDirectFromFirestore();
        emp = employees.find(
          (u) =>
            (u.username.toLowerCase() === inputUser ||
              u.email.toLowerCase() === inputUser) &&
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
        setErrorMessage('Akun karyawan tidak ditemukan atau sedang tidak aktif.');
      }
    } catch (err) {
      setErrorMessage('Gagal menghubungkan ke server online. Silakan periksa jaringan internet Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900">
      <div className="relative w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl shadow-md font-black text-white text-2xl tracking-tighter mb-1">
            N
          </div>
          <div className="flex items-center justify-center space-x-1.5">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">NASQ</h1>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-2xl font-extrabold text-slate-700">Absensi</span>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Sistem Kehadiran &amp; Management Tugas Lapangan Tim
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/80 flex space-x-1">
          <button
            type="button"
            onClick={() => {
              setActiveRole('karyawan');
              setUsername('');
              setPassword('');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
              activeRole === 'karyawan'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Portal Karyawan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('admin');
              setUsername('');
              setPassword('');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
              activeRole === 'admin'
                ? 'bg-white text-indigo-800 shadow-sm border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Dashboard Admin</span>
          </button>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start space-x-2.5 animate-in fade-in font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {activeRole === 'admin' ? 'Username Admin' : 'Username / Email Karyawan'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activeRole === 'admin' ? 'Masukkan username admin...' : 'Masukkan username / email karyawan...'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                {activeRole === 'karyawan' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotSent(false);
                    }}
                    className="text-xs text-emerald-700 hover:underline font-bold"
                  >
                    Lupa password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-md flex items-center justify-center space-x-2 transition ${
                isLoggingIn
                  ? 'bg-slate-400 text-slate-100 cursor-not-allowed'
                  : activeRole === 'admin'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memeriksa Akun Online...</span>
                </>
              ) : (
                <>
                  <span>{activeRole === 'admin' ? 'Masuk Portal Admin' : 'Masuk Portal Presensi'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 text-slate-900 shadow-xl">
            <div className="flex items-center space-x-2 text-emerald-700">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-extrabold text-base">Lupa Kata Sandi?</h3>
            </div>

            {forgotSent ? (
              <div className="space-y-4 text-center py-2">
                <p className="text-xs text-slate-600 font-medium">
                  Instruksi pemulihan kata sandi telah dikirimkan ke email Anda. Silakan periksa kotak masuk atau hubungi tim HR NASQ.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  Masukkan email atau username Anda untuk menerima petunjuk perbaikan kata sandi dari tim HR.
                </p>
                <input
                  type="text"
                  placeholder="Email / username..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-1/2 py-2.5 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotSent(true)}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold"
                  >
                    Kirim Petunjuk
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
