"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceRecord, Employee, PayrollRecord } from "@/types";
import {
  employeeStorage,
} from "@/lib/storage";
import { calculateMonthlyPayroll, formatCurrency } from "@/lib/calculations";
import { useAuth } from "@/context/auth-context";
import { exportAttendanceToCSV, exportAttendanceToXLSX } from "@/lib/export";
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowRight,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  Eye,
  Save,
  Download,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    pendingRecords: 0,
    totalSlipsThisMonth: 0,
  });
  const [recentPayroll, setRecentPayroll] = useState<PayrollRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [mySlips, setMySlips] = useState<PayrollRecord[]>([]);
  const [attendanceToday, setAttendanceToday] =
    useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [attendanceDrafts, setAttendanceDrafts] = useState<
    Record<string, { status: AttendanceRecord["status"]; notes: string }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (user?.role === "employee") {
          // Fetch fresh data from API (database source of truth)
          let emp: Employee | null = null;
          try {
            const res = await fetch("/api/karyawan");
            if (res.ok) {
              const employeesList: Employee[] = await res.json();
              // Sync fresh data to localStorage
              localStorage.setItem(
                "payroll_app:employees",
                JSON.stringify(employeesList),
              );
              emp =
                employeesList.find(
                  (e) => e.email.toLowerCase() === user.email.toLowerCase(),
                ) || null;
            }
          } catch {
            // Fallback to localStorage if API fails (e.g. offline)
          }

          // Fallback to localStorage if API didn't return data
          if (!emp) {
            emp =
              employeeStorage
                .getAll()
                .find(
                  (e) => e.email.toLowerCase() === user.email.toLowerCase(),
                ) || null;
          }

          setEmployee(emp);
          if (emp) {
            let slips: PayrollRecord[] = [];
            try {
              const slipRes = await fetch(`/api/payroll?employeeId=${emp.id}`);
              if (slipRes.ok) {
                const allSlips: PayrollRecord[] = await slipRes.json();
                slips = allSlips.sort(
                  (a: PayrollRecord, b: PayrollRecord) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                );
              }
            } catch { /* fallback empty */ }
            setMySlips(slips);

            const today = new Date().toISOString().slice(0, 10);
            let todayAttendance = null;
            try {
              const todayRes = await fetch(`/api/attendance?employeeId=${emp.id}&date=${today}`);
              if (todayRes.ok) {
                const todayRecords: AttendanceRecord[] = await todayRes.json();
                todayAttendance = todayRecords[0] || null;
              }
            } catch {
              // fallback: null
            }
            setAttendanceToday(todayAttendance);
          }
        } else {
          // Fetch employees from database
          let employees: Employee[] = [];
          try {
            const empRes = await fetch("/api/karyawan");
            if (empRes.ok) {
              employees = await empRes.json();
            }
          } catch {
            // fallback: empty
          }

          setAllEmployees(employees.filter((emp) => emp.status === "active"));

          // Fetch payroll records from database
          let payrollRecords: PayrollRecord[] = [];
          try {
            const payrollRes = await fetch("/api/payroll");
            if (payrollRes.ok) payrollRecords = await payrollRes.json();
          } catch {
            // fallback: empty
          }

          const activeEmployees = employees.filter(
            (emp) => emp.status === "active",
          ).length;

          const currentMonth = new Date().toISOString().slice(0, 7);
          const monthlyRecords = payrollRecords.filter(
            (rec) => rec.period === currentMonth,
          );

          const draftRecords = payrollRecords.filter(
            (rec) => rec.status === "draft",
          ).length;

          const totalPayroll = monthlyRecords.reduce(
            (sum, rec) => sum + rec.netSalary,
            0,
          );

          const recentPayroll = payrollRecords
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 5);

          // Fetch attendance from database
          let allAttendance: AttendanceRecord[] = [];
          try {
            const attRes = await fetch("/api/attendance");
            if (attRes.ok) {
              allAttendance = await attRes.json();
            }
          } catch {
            // fallback: empty
          }
          allAttendance.sort((a, b) => b.date.localeCompare(a.date));

          setStats({
            totalEmployees: employees.length,
            activeEmployees,
            totalPayroll,
            pendingRecords: draftRecords,
            totalSlipsThisMonth: monthlyRecords.length,
          });

          setRecentPayroll(recentPayroll);
          setAttendanceRecords(allAttendance);
          setAttendanceDrafts(
            Object.fromEntries(
              allAttendance.map((record) => [
                record.id,
                {
                  status: record.status,
                  notes: record.notes || "",
                },
              ]),
            ),
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);





  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user?.role === "employee") {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Karyawan
          </h1>
          <p className="text-gray-600 mt-2">
            Selamat datang kembali,{" "}
            <span className="font-semibold text-blue-600">
              {employee?.name || user.email}
            </span>
          </p>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Absensi Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Status absensi Anda hari ini:{" "}
                  <span className="font-semibold text-blue-600">
                    {attendanceToday ? attendanceToday.status : "Belum absen"}
                  </span>
                </p>
              </div>
              <Link href="/absensi">
                <Button variant="outline">Kelola Absensi</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Informasi Pekerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nama</p>
                    <p className="font-medium text-gray-900">
                      {employee?.name || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">
                      {employee?.email || user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nomor Telepon</p>
                    <p className="font-medium text-gray-900">
                      {employee?.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departemen / Posisi</p>
                    <p className="font-medium text-gray-900">
                      {employee?.department || "-"} /{" "}
                      {employee?.position || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tanggal Bergabung</p>
                    <p className="font-medium text-gray-900">
                      {employee?.joinDate
                        ? new Date(employee.joinDate).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gaji Pokok</p>
                    <p className="font-semibold text-gray-900">
                      {employee?.basicSalary
                        ? formatCurrency(employee.basicSalary)
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Ringkasan Slip Gaji
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-700">Total Gaji Diterima</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(
                    mySlips.reduce((sum, rec) => sum + rec.netSalary, 0),
                  )}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">Jumlah Slip Gaji</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {mySlips.length} Slip
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Recent Slips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Slip Gaji Terakhir
            </CardTitle>
            <Link href="/slip-gaji">
              <Button variant="ghost" size="sm" className="gap-2">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {mySlips.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Belum ada slip gaji yang dirilis
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mySlips.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {record.period}
                      </p>
                      <p className="text-xs text-gray-500">
                        Bulan {record.month}, Tahun {record.year}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(record.netSalary)}
                        </p>
                        <span className="inline-block px-2 py-0.5 text-2xs rounded-full bg-blue-100 text-blue-700 uppercase">
                          {record.status}
                        </span>
                      </div>
                      <Link href={`/slip-gaji/${record.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="w-4 h-4" />
                          Detail
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Selamat datang di Sistem Penggajian Karyawan
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Karyawan
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-gray-500">
              {stats.activeEmployees} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gaji Bulan Ini
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalPayroll).replace("IDR ", "")}
            </div>
            <p className="text-xs text-gray-500">Total gaji bersih</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slip Gaji</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSlipsThisMonth}</div>
            <p className="text-xs text-gray-500">Dibuat bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRecords}</div>
            <p className="text-xs text-gray-500">Menunggu persetujuan / pembayaran</p>
          </CardContent>
        </Card>

      </div>



      {/* Riwayat Absensi Karyawan - Laporan Read-Only (Dua Tipe: Masuk & Keluar) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Laporan Riwayat Absensi Karyawan
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Ringkasan kehadiran harian karyawan (Absen Masuk & Absen Keluar)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToCSV(attendanceRecords, `laporan-absensi-${new Date().toISOString().slice(0, 10)}`)}
              disabled={attendanceRecords.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToXLSX(attendanceRecords, `laporan-absensi-${new Date().toISOString().slice(0, 10)}`)}
              disabled={attendanceRecords.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              XLSX
            </Button>
            <Link href="/absensi">
              <Button variant="outline" size="sm" className="text-xs">
                Monitoring Lengkap →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Belum ada data absensi yang tercatat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b bg-gray-50/70 text-gray-700 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Absen Masuk</th>
                    <th className="py-3 px-4">Absen Keluar</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    // Grouping records by employee and date to display Absen Masuk & Absen Keluar side-by-side
                    const map = new Map<
                      string,
                      {
                        key: string;
                        employeeName: string;
                        email: string;
                        date: string;
                        checkinTime: string | null;
                        checkoutTime: string | null;
                        status: string;
                        notes: string | null;
                      }
                    >();

                    attendanceRecords.forEach((record) => {
                      const key = `${(record.email || record.employeeName).toLowerCase()}_${record.date}`;
                      if (!map.has(key)) {
                        map.set(key, {
                          key,
                          employeeName: record.employeeName,
                          email: record.email,
                          date: record.date,
                          checkinTime: record.type === "checkin" ? record.time : null,
                          checkoutTime: record.type === "checkout" ? record.time : null,
                          status: record.status,
                          notes: record.notes || null,
                        });
                      } else {
                        const existing = map.get(key)!;
                        if (record.type === "checkin") {
                          existing.checkinTime = record.time;
                        } else if (record.type === "checkout") {
                          existing.checkoutTime = record.time;
                        }
                        if (record.notes && !existing.notes) {
                          existing.notes = record.notes;
                        }
                        if (
                          record.status &&
                          existing.status === "present" &&
                          record.status !== "present"
                        ) {
                          existing.status = record.status;
                        }
                      }
                    });

                    const groupedList = Array.from(map.values()).sort((a, b) =>
                      b.date.localeCompare(a.date)
                    );

                    return groupedList.map((row) => (
                      <tr
                        key={row.key}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">
                            {row.employeeName}
                          </div>
                          <div className="text-xs text-gray-500">{row.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-700">
                          {row.date}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.checkinTime ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {row.checkinTime}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Belum Masuk
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.checkoutTime ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-mono font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              {row.checkoutTime}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Belum Keluar
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.status === "present" && (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-200">
                              Hadir
                            </span>
                          )}
                          {row.status === "late" && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                              Terlambat
                            </span>
                          )}
                          {row.status === "sick" && (
                            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">
                              Sakit
                            </span>
                          )}
                          {row.status === "leave" && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              Cuti
                            </span>
                          )}
                          {row.status === "absent" && (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                              Tidak Hadir (Alpa)
                            </span>
                          )}
                          {!["present", "late", "sick", "leave", "absent"].includes(
                            row.status
                          ) && (
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                              {row.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                          {row.notes ? (
                            row.notes
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              Tidak ada catatan
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user?.role === "admin" ? (
            <Link href="/karyawan/tambah">
              <Button className="w-full gap-2">
                <Users className="h-4 w-4" />
                Tambah Karyawan
              </Button>
            </Link>
          ) : (
            <Button className="w-full gap-2" disabled>
              <Users className="h-4 w-4" />
              Hanya Admin
            </Button>
          )}
          <Link href="/penggajian">
            <Button variant="outline" className="w-full gap-2">
              <DollarSign className="h-4 w-4" />
              Proses Penggajian
            </Button>
          </Link>
          <Link href="/laporan">
            <Button variant="outline" className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Lihat Laporan
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Payroll */}
      {recentPayroll.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Penggajian Terakhir</CardTitle>
            <Link href="/penggajian">
              <Button variant="ghost" size="sm" className="gap-2">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayroll.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{record.employeeName}</p>
                    <p className="text-sm text-gray-500">{record.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(record.netSalary)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {record.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalEmployees === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Tidak ada data karyawan
            </h3>
            <p className="text-gray-500 mt-2">
              Mulai dengan menambahkan data karyawan baru
            </p>
            {user?.role === "admin" ? (
              <Link href="/karyawan/tambah" className="mt-4 inline-block">
                <Button>Tambah Karyawan Pertama</Button>
              </Link>
            ) : (
              <div className="mt-4 text-sm text-gray-500">
                Hubungi admin untuk menambah karyawan.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
