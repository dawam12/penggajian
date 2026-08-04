'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { PayrollRecord } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { exportSalarySlipToXLSX } from '@/lib/export';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function SlipGajiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [slip, setSlip] = useState<PayrollRecord | null>(null);
  const [config, setConfig] = useState<any>({ companyName: "Memuat..." });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slipRes, configRes] = await Promise.all([
          fetch(`/api/payroll/${resolvedParams.id}`),
          fetch("/api/config"),
        ]);

        if (configRes.ok) {
          setConfig(await configRes.json());
        }

        if (!slipRes.ok) {
          setSlip(null);
          return;
        }
        const data: PayrollRecord = await slipRes.json();

        // For employee role: verify ownership
        if (user?.role === 'employee') {
          const empRes = await fetch('/api/karyawan');
          if (empRes.ok) {
            const employees = await empRes.json();
            const emp = employees.find(
              (e: any) => e.email.toLowerCase() === user.email.toLowerCase()
            );
            if (emp && data.employeeId === emp.id) {
              setSlip(data);
            } else {
              setSlip(null);
            }
          }
        } else {
          setSlip(data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Slip gaji tidak ditemukan</p>
        <Button onClick={() => router.back()} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportSalarySlipToXLSX(
                slip.employeeName,
                {
                  basicSalary: slip.basicSalary,
                  allowances: slip.allowances,
                  deductions: slip.deductions,
                  tax: slip.tax,
                  grossSalary: slip.grossSalary,
                  netSalary: slip.netSalary,
                },
                slip.period
              )
            }
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Slip Content */}
      <Card className="print:border-0">
        <CardContent className="pt-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 border-b pb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {config.companyName}
              </h1>
              <p className="text-gray-600 mt-2">SLIP GAJI KARYAWAN</p>
              {config.bankAccount && (
                <p className="text-sm text-gray-500 mt-1">
                  Bank: {config.bankName} - {config.bankAccount}
                </p>
              )}
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 border-b pb-6 text-sm">
              <div>
                <p className="text-gray-500">Nama Karyawan</p>
                <p className="font-semibold text-gray-900">
                  {slip.employeeName}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Jabatan / Departemen</p>
                <p className="font-semibold text-gray-900">
                  {(slip as any).employee?.position || "Staff"} / {(slip as any).employee?.department || "Umum"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Periode</p>
                <p className="font-semibold text-gray-900">{slip.period}</p>
              </div>
              <div>
                <p className="text-gray-500">Status Pembayaran</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                    slip.status === 'paid'
                      ? 'bg-blue-100 text-blue-700'
                      : slip.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {slip.status === 'paid'
                    ? 'Sudah Dibayar'
                    : slip.status === 'approved'
                    ? 'Disetujui'
                    : 'Belum Disetujui'}
                </span>
              </div>
            </div>

            {/* Salary Details */}
            <div className="mb-8">
              <h2 className="font-semibold text-gray-900 mb-4">
                RINCIAN GAJI
              </h2>

              <table className="w-full">
                <tbody>
                  {/* Earnings */}
                  <tr className="border-b">
                    <td className="py-3 text-gray-700">Gaji Pokok</td>
                    <td className="py-3 text-right text-gray-900 font-semibold">
                      {formatCurrency(slip.basicSalary)}
                    </td>
                  </tr>
                  {slip.allowances > 0 && (
                    <tr className="border-b">
                      <td className="py-3 text-gray-700">Tunjangan</td>
                      <td className="py-3 text-right text-gray-900 font-semibold">
                        {formatCurrency(slip.allowances)}
                      </td>
                    </tr>
                  )}

                  {/* Deductions */}
                  {slip.deductions > 0 && (
                    <tr className="border-b">
                      <td className="py-3 text-gray-700">Potongan</td>
                      <td className="py-3 text-right text-red-600 font-semibold">
                        -{formatCurrency(slip.deductions)}
                      </td>
                    </tr>
                  )}

                  {slip.tax > 0 && (
                    <tr className="border-b">
                      <td className="py-3 text-gray-700">Pajak</td>
                      <td className="py-3 text-right text-red-600 font-semibold">
                        -{formatCurrency(slip.tax)}
                      </td>
                    </tr>
                  )}

                  {/* Totals */}
                  <tr className="border-b">
                    <td className="py-3 text-gray-700 font-semibold">
                      Gaji Kotor
                    </td>
                    <td className="py-3 text-right text-gray-900 font-semibold">
                      {formatCurrency(slip.grossSalary)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-3 text-gray-900 font-bold">
                      Gaji Bersih
                    </td>
                    <td className="py-3 text-right text-blue-600 font-bold text-lg">
                      {formatCurrency(slip.netSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div className="border-t pt-6 text-center text-sm text-gray-600">
              <p>
                Dokumen ini dicetak pada{' '}
                {new Date().toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Untuk informasi lebih lanjut, hubungi bagian HR.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
