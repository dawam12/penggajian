'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PayrollRecord } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { employeeStorage } from '@/lib/storage';

export default function SlipGajiPage() {
  const { user } = useAuth();
  const [slips, setSlips] = useState<PayrollRecord[]>([]);
  const [filteredSlips, setFilteredSlips] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSlips();
    }
  }, [user]);

  useEffect(() => {
    let filtered = slips;

    if (searchTerm) {
      filtered = filtered.filter((slip) =>
        user?.role === 'employee'
          ? slip.period.toLowerCase().includes(searchTerm.toLowerCase())
          : slip.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((slip) => slip.status === statusFilter);
    }

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredSlips(sorted);
  }, [slips, searchTerm, statusFilter, user]);

  const loadSlips = async () => {
    try {
      let url = '/api/payroll';

      // For employee, filter by employeeId
      if (user?.role === 'employee') {
        const emp = employeeStorage.getAll().find(
          (e) => e.email.toLowerCase() === user.email.toLowerCase()
        );
        if (emp) {
          url = `/api/payroll?employeeId=${emp.id}`;
        } else {
          // Try fetch all then filter
          const res = await fetch('/api/karyawan');
          if (res.ok) {
            const employees = await res.json();
            const found = employees.find(
              (e: any) => e.email.toLowerCase() === user.email.toLowerCase()
            );
            if (found) url = `/api/payroll?employeeId=${found.id}`;
          }
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        setSlips(await res.json());
      }
    } catch (err) {
      console.error('Gagal memuat slip gaji:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Slip Gaji</h1>
        <p className="text-gray-600 mt-1">
          Total: <span className="font-semibold">{filteredSlips.length}</span> slip gaji
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={user?.role === 'employee' ? "Cari periode (YYYY-MM)..." : "Cari nama karyawan..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Slip List */}
      <Card>
        <CardContent className="pt-6">
          {filteredSlips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada slip gaji</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSlips.map((slip) => (
                <div
                  key={slip.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {slip.employeeName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Periode: {slip.period} (Bulan {slip.month}, Tahun {slip.year})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(slip.netSalary)}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          slip.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : slip.status === 'paid'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {slip.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/slip-gaji/${slip.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Lihat Detail
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
