'use client';

import { useEffect, useState } from 'react';
import { Employee, PayrollRecord } from '@/types';
import { employeeStorage } from '@/lib/storage';
import { calculateSalary, formatCurrency } from '@/lib/calculations';
import { exportPayrollToCSV, exportPayrollToXLSX } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2,
  Download,
  Eye,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

export default function PenggajianPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PayrollRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPayrollRecords();
  }, []);

  useEffect(() => {
    const filtered = payrollRecords.filter(
      (record) => record.period === selectedPeriod
    );
    setFilteredRecords(filtered);
  }, [payrollRecords, selectedPeriod]);

  const loadPayrollRecords = async () => {
    try {
      const res = await fetch('/api/payroll');
      if (res.ok) {
        const data = await res.json();
        setPayrollRecords(data);
      }
    } catch (err) {
      console.error('Gagal memuat data penggajian:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedPeriod) {
      alert('Pilih periode terlebih dahulu');
      return;
    }

    if (!confirm('Proses penggajian untuk periode ' + selectedPeriod + '?')) {
      return;
    }

    setIsProcessing(true);

    try {
      // Fetch latest employee data from database
      const empRes = await fetch('/api/karyawan');
      if (!empRes.ok) throw new Error('Gagal mengambil data karyawan');
      const allEmployees: Employee[] = await empRes.json();
      const activeEmployees = allEmployees.filter((emp) => emp.status === 'active');

      // Fetch konfigurasi penggajian global dari database
      const cfgRes = await fetch('/api/config');
      if (!cfgRes.ok) throw new Error('Gagal mengambil konfigurasi penggajian');
      const globalConfig = await cfgRes.json();

      // Delete existing records for this period
      const existingRecords = payrollRecords.filter(
        (rec) => rec.period === selectedPeriod
      );
      await Promise.all(
        existingRecords.map((rec) =>
          fetch(`/api/payroll/${rec.id}`, { method: 'DELETE' })
        )
      );

      // Create new records via API — gunakan config DB sebagai fallback jika rate karyawan kosong
      await Promise.all(
        activeEmployees.map((emp) => {
          const calc = calculateSalary(emp, globalConfig);
          const [year, month] = selectedPeriod.split('-');

          return fetch('/api/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: emp.id,
              employeeName: emp.name,
              period: selectedPeriod,
              month: parseInt(month),
              year: parseInt(year),
              basicSalary: emp.basicSalary,
              allowances: calc.allowances,
              deductions: calc.deductions,
              tax: calc.tax,
              grossSalary: calc.grossSalary,
              netSalary: calc.netSalary,
              status: 'draft',
            }),
          });
        })
      );

      await loadPayrollRecords();
      alert('Penggajian berhasil diproses untuk ' + activeEmployees.length + ' karyawan');
    } catch (error) {
      alert('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm('Setujui penggajian ini?')) {
      await fetch(`/api/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', approvedAt: new Date().toISOString() }),
      });
      await loadPayrollRecords();
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (confirm('Tandai sebagai sudah dibayarkan?')) {
      await fetch(`/api/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidAt: new Date().toISOString() }),
      });
      await loadPayrollRecords();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus penggajian ini?')) {
      await fetch(`/api/payroll/${id}`, { method: 'DELETE' });
      await loadPayrollRecords();
    }
  };

  const handleMassApprove = async () => {
    if (!selectedPeriod) return;
    if (confirm(`Setujui SEMUA penggajian periode ${selectedPeriod}?`)) {
      setIsProcessing(true);
      try {
        const res = await fetch('/api/payroll', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: selectedPeriod, status: 'approved' }),
        });
        if (res.ok) {
          await loadPayrollRecords();
          alert('Seluruh penggajian periode ' + selectedPeriod + ' berhasil disetujui');
        } else {
          alert('Gagal menyetujui secara massal');
        }
      } catch (err) {
        alert('Terjadi kesalahan koneksi.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleMassPay = async () => {
    if (!selectedPeriod) return;
    if (confirm(`Tandai SEMUA penggajian periode ${selectedPeriod} sebagai SUDAH DIBAYARKAN?`)) {
      setIsProcessing(true);
      try {
        const res = await fetch('/api/payroll', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: selectedPeriod, status: 'paid' }),
        });
        if (res.ok) {
          await loadPayrollRecords();
          alert('Seluruh penggajian periode ' + selectedPeriod + ' berhasil ditandai sudah dibayarkan');
        } else {
          alert('Gagal memperbarui status pembayaran massal');
        }
      } catch (err) {
        alert('Terjadi kesalahan koneksi.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleMassDelete = async () => {
    if (!selectedPeriod) return;
    if (confirm(`Apakah Anda yakin ingin menghapus SEMUA data penggajian pada periode ${selectedPeriod}? Seluruh slip gaji terkait juga akan terhapus secara permanen.`)) {
      setIsProcessing(true);
      try {
        const res = await fetch(`/api/payroll?period=${selectedPeriod}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await loadPayrollRecords();
          alert('Semua data penggajian periode ' + selectedPeriod + ' berhasil dihapus.');
        } else {
          const errData = await res.json();
          alert('Gagal menghapus: ' + (errData.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Terjadi kesalahan koneksi.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const totalGross = filteredRecords.reduce((sum, rec) => sum + rec.grossSalary, 0);
  const totalNet = filteredRecords.reduce((sum, rec) => sum + rec.netSalary, 0);
  const totalTax = filteredRecords.reduce((sum, rec) => sum + rec.tax, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penggajian</h1>
          <p className="text-gray-600 mt-1">
            Kelola penggajian karyawan bulan {selectedPeriod}
          </p>
        </div>
      </div>

      {/* Period Selection and Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Pilih Periode
              </label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleProcessPayroll}
                disabled={isProcessing}
                className="gap-2"
              >
                <DollarSign className="h-4 w-4" />
                {isProcessing ? 'Memproses...' : 'Proses Penggajian'}
              </Button>
              {filteredRecords.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleMassApprove}
                    disabled={isProcessing}
                    className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Setujui Semua
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMassPay}
                    disabled={isProcessing}
                    className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Bayar Semua
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleMassDelete}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Semua Gaji
                  </Button>
                </>
              )}
            </div>
            {filteredRecords.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayrollToCSV(filteredRecords, selectedPeriod)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportPayrollToXLSX(filteredRecords, selectedPeriod)
                  }
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  XLSX
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Gaji Kotor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalGross)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Pajak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalTax)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Gaji Bersih</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Records Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Belum ada data penggajian untuk periode ini
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4">Nama Karyawan</th>
                    <th className="text-right py-3 px-4">Gaji Pokok</th>
                    <th className="text-right py-3 px-4">Tunjangan</th>
                    <th className="text-right py-3 px-4">Pajak</th>
                    <th className="text-right py-3 px-4">Gaji Bersih</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {record.employeeName}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(record.basicSalary)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(record.allowances)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(record.tax)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">
                        {formatCurrency(record.netSalary)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'paid'
                              ? 'bg-blue-100 text-blue-700'
                              : record.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {record.status === 'paid'
                            ? 'Sudah Dibayar'
                            : record.status === 'approved'
                            ? 'Disetujui'
                            : 'Belum Disetujui'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Link href={`/slip-gaji/${record.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1" title="Lihat Slip Gaji">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {record.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(record.id)}
                                className="text-green-600 hover:text-green-700"
                                title="Setujui Penggajian"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(record.id)}
                                className="text-blue-600 hover:text-blue-700 gap-1 text-xs"
                                title="Tandai Sudah Dibayar"
                              >
                                <DollarSign className="h-4 w-4" />
                                Bayar
                              </Button>
                            </>
                          )}
                          {record.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(record.id)}
                              className="text-blue-600 hover:text-blue-700 gap-1 text-xs"
                              title="Tandai Sudah Dibayar"
                            >
                              <DollarSign className="h-4 w-4" />
                              Bayar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Hapus Penggajian"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

