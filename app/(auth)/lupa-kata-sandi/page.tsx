'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { userStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle2, ShieldAlert, KeyRound } from 'lucide-react';

export default function LupaKataSandiPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'verify-email' | 'reset-password' | 'success'>('verify-email');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetAdminPassword } = useAuth();

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim();
      const existingUser = userStorage.getByEmail(cleanEmail);

      if (!existingUser) {
        // If email not found in userStorage, check if email matches admin default or employees
        // Note: admin default email is admin@payroll.com
        if (cleanEmail.toLowerCase() === 'admin@payroll.com') {
          setStep('reset-password');
          return;
        }
        setError('Email tidak ditemukan dalam sistem.');
        return;
      }

      if (existingUser.role !== 'admin') {
        setError(
          'Fitur Lupa Kata Sandi ini hanya diperuntukkan bagi Administrator. Untuk akun Karyawan, silakan hubungi Administrator untuk mereset kata sandi Anda.'
        );
        return;
      }

      setStep('reset-password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memverifikasi email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('Kata sandi minimal 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      await resetAdminPassword(email.trim(), newPassword);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="bg-indigo-100 p-3 rounded-full">
              <KeyRound className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Lupa Kata Sandi</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Khusus Administrator Sistem
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {step === 'verify-email' && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  {error.includes('hanya diperuntukkan bagi Administrator') ? (
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Administrator</label>
                <Input
                  type="email"
                  placeholder="admin@payroll.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Masukkan email akun Administrator Anda untuk memverifikasi hak akses.
                </p>
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                {isLoading ? 'Memverifikasi...' : 'Verifikasi Email Admin'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
                </Link>
              </div>
            </form>
          )}

          {step === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-800 text-xs">
                Email Admin terverifikasi: <span className="font-semibold">{email}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Kata Sandi Baru</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Konfirmasi Kata Sandi Baru</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify-email');
                    setError('');
                  }}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Ganti Email
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-5 text-center py-2">
              <div className="flex justify-center">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">Kata Sandi Berhasil Diperbarui!</h3>
                <p className="text-sm text-gray-600">
                  Kata sandi akun Administrator Anda telah berhasil diubah. Silakan login kembali dengan kata sandi baru Anda.
                </p>
              </div>

              <Link href="/login" className="block w-full">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Kembali ke Halaman Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
