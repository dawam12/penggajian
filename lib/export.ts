import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Employee, PayrollRecord } from '@/types';

export const exportEmployeesToCSV = (employees: Employee[]) => {
  const data = employees.map(emp => ({
    'Nama': emp.name,
    'Email': emp.email,
    'Telepon': emp.phone,
    'Departemen': emp.department,
    'Posisi': emp.position,
    'Gaji Pokok': emp.basicSalary,
    'Status': emp.status,
    'Tanggal Bergabung': emp.joinDate,
  }));
  
  const csv = Papa.unparse(data);
  downloadFile(csv, 'daftar-karyawan.csv', 'text/csv');
};

export const exportEmployeesToXLSX = (employees: Employee[]) => {
  const data = employees.map(emp => ({
    'Nama': emp.name,
    'Email': emp.email,
    'Telepon': emp.phone,
    'Departemen': emp.department,
    'Posisi': emp.position,
    'Gaji Pokok': emp.basicSalary,
    'Status': emp.status,
    'Tanggal Bergabung': emp.joinDate,
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ];
  
  XLSX.writeFile(wb, 'daftar-karyawan.xlsx');
};

export const exportPayrollToCSV = (records: PayrollRecord[], period: string) => {
  const data = records.map(rec => ({
    'Nama Karyawan': rec.employeeName,
    'Periode': rec.period,
    'Gaji Pokok': rec.basicSalary,
    'Tunjangan': rec.allowances,
    'Gaji Kotor': rec.grossSalary,
    'Potongan': rec.deductions,
    'Pajak': rec.tax,
    'Gaji Bersih': rec.netSalary,
    'Status': rec.status,
  }));
  
  const csv = Papa.unparse(data);
  downloadFile(csv, `laporan-penggajian-${period}.csv`, 'text/csv');
};

export const exportPayrollToXLSX = (records: PayrollRecord[], period: string) => {
  const data = records.map(rec => ({
    'Nama Karyawan': rec.employeeName,
    'Periode': rec.period,
    'Gaji Pokok': rec.basicSalary,
    'Tunjangan': rec.allowances,
    'Gaji Kotor': rec.grossSalary,
    'Potongan': rec.deductions,
    'Pajak': rec.tax,
    'Gaji Bersih': rec.netSalary,
    'Status': rec.status,
  }));
  
  // Add summary
  const summary = {
    'RINGKASAN PENGGAJIAN PERIODE': period,
    '': '',
    'Jumlah Karyawan': records.length,
    'Total Gaji Kotor': records.reduce((sum, rec) => sum + rec.grossSalary, 0),
    'Total Potongan': records.reduce((sum, rec) => sum + rec.deductions, 0),
    'Total Pajak': records.reduce((sum, rec) => sum + rec.tax, 0),
    'Total Gaji Bersih': records.reduce((sum, rec) => sum + rec.netSalary, 0),
  };
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wsSummary = XLSX.utils.json_to_sheet([summary]);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Detail Penggajian');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
  ];
  
  XLSX.writeFile(wb, `laporan-penggajian-${period}.xlsx`);
};

export const exportSalarySlipToXLSX = (
  employeeName: string,
  data: any,
  period: string
) => {
  const ws = XLSX.utils.json_to_sheet([
    { 'Slip Gaji': '' },
    { 'Nama': employeeName },
    { 'Periode': period },
    { '': '' },
    { 'Komponen': 'Nominal' },
    { 'Gaji Pokok': data.basicSalary },
    { 'Tunjangan': data.allowances },
    { 'Potongan': data.deductions },
    { 'Pajak': data.tax },
    { '': '' },
    { 'Gaji Kotor': data.grossSalary },
    { 'Gaji Bersih': data.netSalary },
  ]);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Slip Gaji');
  
  XLSX.writeFile(wb, `slip-gaji-${employeeName}-${period}.xlsx`);
};

function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export report data to multiple formats
export const exportReportToCSV = (
  data: any,
  filename: string
) => {
  const csv = Papa.unparse(data);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
};

export const exportReportToXLSX = (
  data: any,
  filename: string
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

function getAttendanceStatusLabel(status: string): string {
  switch (status) {
    case 'present':
      return 'Hadir (Tepat Waktu)';
    case 'late':
      return 'Terlambat';
    case 'sick':
      return 'Sakit';
    case 'leave':
      return 'Cuti';
    case 'absent':
      return 'Tidak Hadir (Alpa)';
    default:
      return status || '-';
  }
}

export const formatAttendanceRecordsForExport = (records: AttendanceRecord[]) => {
  const map = new Map<string, {
    name: string;
    email: string;
    date: string;
    checkinTime: string;
    checkoutTime: string;
    status: string;
    notes: string;
  }>();

  records.forEach((rec) => {
    const key = `${rec.employeeId || rec.email}_${rec.date}`;
    if (!map.has(key)) {
      map.set(key, {
        name: rec.employeeName || 'Karyawan',
        email: rec.email || '-',
        date: rec.date,
        checkinTime: rec.type === 'checkin' ? rec.time : '-',
        checkoutTime: rec.type === 'checkout' ? rec.time : '-',
        status: getAttendanceStatusLabel(rec.status),
        notes: rec.notes || '-',
      });
    } else {
      const existing = map.get(key)!;
      if (rec.type === 'checkin') {
        existing.checkinTime = rec.time;
        if (rec.status) existing.status = getAttendanceStatusLabel(rec.status);
      } else if (rec.type === 'checkout') {
        existing.checkoutTime = rec.time;
      }
      if (rec.notes) {
        existing.notes = existing.notes === '-' ? rec.notes : `${existing.notes} | ${rec.notes}`;
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
};

export const exportAttendanceToCSV = (
  records: AttendanceRecord[],
  filename = 'laporan-absensi'
) => {
  const formattedData = formatAttendanceRecordsForExport(records).map(item => ({
    'Nama Karyawan': item.name,
    'Email': item.email,
    'Tanggal': item.date,
    'Absen Masuk': item.checkinTime,
    'Absen Keluar': item.checkoutTime,
    'Status': item.status,
    'Catatan': item.notes,
  }));

  const csv = Papa.unparse(formattedData);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

export const exportAttendanceToXLSX = (
  records: AttendanceRecord[],
  filename = 'laporan-absensi'
) => {
  const formattedData = formatAttendanceRecordsForExport(records).map(item => ({
    'Nama Karyawan': item.name,
    'Email': item.email,
    'Tanggal': item.date,
    'Absen Masuk': item.checkinTime,
    'Absen Keluar': item.checkoutTime,
    'Status': item.status,
    'Catatan': item.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Absensi');

  ws['!cols'] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 30 },
  ];

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

