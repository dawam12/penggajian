'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <ShieldOff className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pendaftaran Ditutup</CardTitle>
          <CardDescription>
            Pendaftaran akun mandiri tidak diizinkan. Akun hanya dapat dibuat oleh Administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Jika Anda adalah karyawan dan belum memiliki akun, silakan hubungi Administrator untuk mendapatkan akses.
          </p>
          <Link href="/login">
            <Button className="w-full">Kembali ke Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
