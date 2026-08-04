'use client';

import { useEffect, useState } from 'react';
import { PayrollRecord, Employee } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { exportPayrollToCSV, exportPayrollToXLSX } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, TrendingUp } from 'lucide-react';

interface DepartmentSummary {
  [key: string]: {
    count: number;
    grossSalary: number;
    netSalary: number;
    tax: number;
  };
}

export default function LaporanPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<PayrollRecord[]>([]);
  const [departmentSummary, setDepartmentSummary] =
    useState<DepartmentSummary>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSummarize();
  }, [payrollRecords, employees, startDate, endDate]);

  const loadData = async () => {
    try {
      const [payrollRes, employeeRes] = await Promise.all([
        fetch('/api/payroll'),
        fetch('/api/karyawan')
      ]);
      const payrollData = await payrollRes.json();
      const employeeData = await employeeRes.json();
      setPayrollRecords(payrollData);
      setEmployees(employeeData);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSummarize = () => {
    let filtered = payrollRecords;

    if (startDate) {
      filtered = filtered.filter((rec) => rec.period >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((rec) => rec.period <= endDate);
    }

    setFilteredRecords(filtered);

    // Calculate department summary
    const summary: DepartmentSummary = {};

    const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

    filtered.forEach((record) => {
      const employee = employeeMap.get(record.employeeId);
      if (employee) {
        const dept = employee.department;
        if (!summary[dept]) {
          summary[dept] = {
            count: 0,
            grossSalary: 0,
            netSalary: 0,
            tax: 0,
          };
        }
        summary[dept].count += 1;
        summary[dept].grossSalary += record.grossSalary;
        summary[dept].netSalary += record.netSalary;
        summary[dept].tax += record.tax;
      }
    });

    setDepartmentSummary(summary);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan Penggajian</h1>
        <p className="text-gray-600 mt-1">
          Analisis data penggajian dan statistik karyawan
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Dari Periode
              </label>
              <Input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Hingga Periode
              </label>
              <Input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {filteredRecords.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportPayrollToCSV(
                      filteredRecords,
                      `laporan-${startDate || 'all'}-${endDate || 'all'}`
                    )
                  }
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportPayrollToXLSX(
                      filteredRecords,
                      `laporan-${startDate || 'all'}-${endDate || 'all'}`
                    )
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

      {/* Summary Stats */}
      {filteredRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Penggajian</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredRecords.length}</p>
              <p className="text-xs text-gray-500 mt-2">periode tercakup</p>
            </CardContent>
          </Card>

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
        </div>
      )}

      {/* Department Summary */}
      {Object.keys(departmentSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ringkasan per Departemen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4">Departemen</th>
                    <th className="text-center py-3 px-4">Jumlah</th>
                    <th className="text-right py-3 px-4">Gaji Kotor</th>
                    <th className="text-right py-3 px-4">Pajak</th>
                    <th className="text-right py-3 px-4">Gaji Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(departmentSummary).map(([dept, data]) => (
                    <tr key={dept} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{dept}</td>
                      <td className="py-3 px-4 text-center">{data.count}</td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(data.grossSalary)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(data.tax)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(data.netSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-center">
                      {filteredRecords.length}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(totalGross)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(totalNet)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-8 text-center">
            <p className="text-gray-500">Belum ada data laporan untuk periode ini</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
