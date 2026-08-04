"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { employeeStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck2,
  Clock,
  ClipboardList,
  Save,
  AlertCircle,
  Calendar,
  Download,
} from "lucide-react";
import type { AttendanceRecord, Employee } from "@/types";
import { exportAttendanceToCSV, exportAttendanceToXLSX } from "@/lib/export";

const statusOptions: Array<{
  value: AttendanceRecord["status"];
  label: string;
}> = [
    { value: "present", label: "Hadir (Tepat Waktu)" },
    { value: "late", label: "Terlambat" },
    { value: "sick", label: "Sakit" },
    { value: "leave", label: "Cuti" },
    { value: "absent", label: "Tidak Hadir (Alpa)" },
  ];

const CHECKIN_START = "07:00";
const CHECKIN_END = "08:00";
const CHECKOUT_START = "17:00";
const CHECKOUT_END = "18:00";

function isTimeInRange(time: string, start: string, end: string): boolean {
  const [timeH, timeM] = time.split(":").map(Number);
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  const timeInMinutes = timeH * 60 + timeM;
  const startInMinutes = startH * 60 + startM;
  const endInMinutes = endH * 60 + endM;

  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [status, setStatus] = useState<AttendanceRecord["status"]>("present");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [checkinRecord, setCheckinRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [checkoutRecord, setCheckoutRecord] = useState<AttendanceRecord | null>(
    null,
  );

  useEffect(() => {
    if (!user?.email) return;

    const loadData = async () => {
      try {
        let currentEmp: Employee | null = null;
        const empRes = await fetch("/api/karyawan");
        if (empRes.ok) {
          const list: Employee[] = await empRes.json();
          currentEmp =
            list.find(
              (item) => item.email.toLowerCase() === user.email.toLowerCase(),
            ) || null;
        }

        if (!currentEmp) {
          const localList = employeeStorage.getAll();
          currentEmp =
            localList.find(
              (item) => item.email.toLowerCase() === user.email.toLowerCase(),
            ) || null;
        }

        if (!currentEmp) {
          const emailName = user.email.split("@")[0];
          const displayName =
            (user as any)?.name ||
            emailName.charAt(0).toUpperCase() + emailName.slice(1);
          currentEmp = {
            id: user.id || `emp_${Date.now()}`,
            name: displayName,
            email: user.email,
            phone: "08123456789",
            department: "Umum",
            position: "Karyawan",
            salaryLevel: 1,
            joinDate: new Date().toISOString().slice(0, 10),
            status: "active",
            basicSalary: 5000000,
            createdAt: new Date().toISOString(),
          };
        }

        setEmployee(currentEmp);

        const attRes = await fetch(
          `/api/attendance?email=${encodeURIComponent(user.email)}`,
        );
        if (attRes.ok) {
          const allRecords: AttendanceRecord[] = await attRes.json();
          setRecords(allRecords);

          const today = new Date().toISOString().slice(0, 10);
          const todayCheckin = allRecords.find(
            (r) => r.date === today && r.type === "checkin",
          );
          const todayCheckout = allRecords.find(
            (r) => r.date === today && r.type === "checkout",
          );
          setCheckinRecord(todayCheckin || null);
          setCheckoutRecord(todayCheckout || null);
        }
      } catch (err) {
        console.error("Gagal memuat data absensi:", err);
      }
    };

    loadData();
  }, [user]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitCheckin = async (event: React.FormEvent) => {
    event.preventDefault();
    const activeEmail = employee?.email || user?.email;
    const activeName = employee?.name || (user as any)?.name || user?.email?.split("@")[0] || "Karyawan";
    const activeId = employee?.id || user?.id || activeEmail;

    if (!activeEmail) return;

    const now = getCurrentTime();
    setSaving(true);
    setMessage("");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: activeId,
          employeeName: activeName,
          email: activeEmail,
          date: today,
          type: "checkin",
          time: now,
          status,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menyimpan absen masuk");
      }

      const record: AttendanceRecord = await res.json();

      const listRes = await fetch(
        `/api/attendance?email=${encodeURIComponent(activeEmail)}`,
      );
      if (listRes.ok) {
        setRecords(await listRes.json());
      }

      setCheckinRecord(record);
      setStatus("present");
      setNotes("");
      setMessage(`Absen masuk berhasil disimpan pukul ${now}`);
    } catch (err: any) {
      setMessage(err.message || "Gagal melakukan absen masuk");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    const activeEmail = employee?.email || user?.email;
    const activeName = employee?.name || (user as any)?.name || user?.email?.split("@")[0] || "Karyawan";
    const activeId = employee?.id || user?.id || activeEmail;

    if (!activeEmail) return;

    const now = getCurrentTime();

    if (!isTimeInRange(now, CHECKOUT_START, CHECKOUT_END)) {
      setMessage("Absen keluar hanya dapat dilakukan pada jam 17:00 sampai 18:00.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: activeId,
          employeeName: activeName,
          email: activeEmail,
          date: today,
          type: "checkout",
          time: now,
          status: "present",
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menyimpan absen keluar");
      }

      const record: AttendanceRecord = await res.json();

      const listRes = await fetch(
        `/api/attendance?email=${encodeURIComponent(activeEmail)}`,
      );
      if (listRes.ok) {
        setRecords(await listRes.json());
      }

      setCheckoutRecord(record);
      setNotes("");
      setMessage(`Absen keluar berhasil disimpan pukul ${now}`);
    } catch (err: any) {
      setMessage(err.message || "Gagal melakukan absen keluar");
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === "admin") {
    return <AdminAttendanceMonitor />;
  }

  const isCheckoutAllowed = isTimeInRange(currentTime, CHECKOUT_START, CHECKOUT_END);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Absensi</h1>
        <p className="text-gray-600 mt-2">
          Catat kehadiran Anda hari ini dengan cepat.
        </p>
      </div>

      {/* Current Time Display */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Jam saat ini:</span>
              <span className="font-mono text-lg font-bold text-blue-600">
                {currentTime}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-green-600" />
            Absen Masuk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkinRecord ? (
            <div className="space-y-3 rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700">
                ✓ Anda sudah absen masuk pukul{" "}
                <span className="font-mono font-bold">
                  {checkinRecord.time}
                </span>
              </p>
              <p className="text-xs text-green-600">
                Status: {checkinRecord.status === "present" ? "Hadir (Tepat Waktu)" : checkinRecord.status === "late" ? "Terlambat" : checkinRecord.status === "sick" ? "Sakit" : checkinRecord.status === "leave" ? "Cuti" : "Tidak Hadir (Alpa)"}
              </p>
              {checkinRecord.notes && (
                <p className="text-xs text-green-600">
                  Catatan: {checkinRecord.notes}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitCheckin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nama
                </label>
                <Input value={employee?.name || user?.email || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as AttendanceRecord["status"])
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Catatan
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Opsional, misal izin atau lembur"
                />
              </div>

              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Absen Masuk"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Check-out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-purple-600" />
            Absen Keluar (17:00 - 18:00)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkoutRecord ? (
            <div className="space-y-3 rounded-lg bg-purple-50 border border-purple-200 p-4">
              <p className="text-sm text-purple-700">
                ✓ Anda sudah absen keluar pukul{" "}
                <span className="font-mono font-bold">
                  {checkoutRecord.time}
                </span>
              </p>
              {checkoutRecord.notes && (
                <p className="text-xs text-purple-600">
                  Catatan: {checkoutRecord.notes}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitCheckout} className="space-y-4">
              {!isCheckoutAllowed && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  ⚠️ Absen keluar hanya dapat dilakukan pada jam <strong>17:00 - 18:00</strong>. Saat ini pukul <strong>{currentTime}</strong>.
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nama
                </label>
                <Input value={employee?.name || user?.email || ""} disabled />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Catatan
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Opsional, misal lembur atau tugas"
                />
              </div>

              <Button type="submit" disabled={saving || !isCheckoutAllowed} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Absen Keluar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Message Display */}
      {message && (
        <Card
          className={`border-l-4 ${message.includes("berhasil")
            ? "border-l-green-500 bg-green-50"
            : "border-l-red-500 bg-red-50"
            }`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${message.includes("berhasil")
                  ? "text-green-600"
                  : "text-red-600"
                  }`}
              />
              <p
                className={`text-sm ${message.includes("berhasil")
                  ? "text-green-700"
                  : "text-red-700"
                  }`}
              >
                {message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Riwayat Absensi Anda
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToCSV(records, `riwayat-absensi-saya`)}
              disabled={records.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToXLSX(records, `riwayat-absensi-saya`)}
              disabled={records.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              XLSX
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada catatan absensi.</p>
          ) : (
            <div className="space-y-3">
              {records
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {record.date}
                        </p>
                        <span className="inline-block px-2 py-0.5 text-2xs rounded-full bg-gray-100 text-gray-600 uppercase">
                          {record.type === "checkin" ? "Masuk" : "Keluar"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {record.notes || "Tidak ada catatan"} • Pukul{" "}
                        {record.time}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${record.status === "present"
                        ? "bg-green-100 text-green-700"
                        : record.status === "late"
                          ? "bg-amber-100 text-amber-700"
                          : record.status === "sick"
                            ? "bg-yellow-100 text-yellow-700"
                            : record.status === "leave"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                        }`}
                    >
                      {record.status === "present"
                        ? "Hadir"
                        : record.status === "late"
                          ? "Terlambat"
                          : record.status === "sick"
                            ? "Sakit"
                            : record.status === "leave"
                              ? "Cuti"
                              : "Tidak Hadir"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Subcomponent monitor absensi harian untuk Admin
function AdminAttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // State untuk Absensi Manual Admin
  const [manualAttendance, setManualAttendance] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "08:00",
    type: "checkin" as "checkin" | "checkout",
    status: "present" as AttendanceRecord["status"],
    notes: "",
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState("");

  const loadAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        setAttendanceRecords(await res.json());
      }
    } catch (err) {
      console.error("Gagal memuat data absensi:", err);
    }
  };

  useEffect(() => {
    // Load data karyawan aktif dari API (database source of truth)
    const loadEmployees = async () => {
      try {
        const res = await fetch("/api/karyawan");
        if (res.ok) {
          const list: Employee[] = await res.json();
          setEmployees(list.filter((emp) => emp.status === "active"));
        }
      } catch (err) {
        console.error("Gagal memuat karyawan:", err);
      }
    };

    loadEmployees();
    loadAttendance();
  }, [selectedDate]);

  const getEmployeeAttendance = (employeeId: string) => {
    const dayRecords = attendanceRecords.filter(
      (r) => r.employeeId === employeeId && r.date === selectedDate
    );

    const checkin = dayRecords.find((r) => r.type === "checkin") || null;
    const checkout = dayRecords.find((r) => r.type === "checkout") || null;

    return { checkin, checkout };
  };

  const handleStatusChange = async (
    emp: Employee,
    newStatus: AttendanceRecord["status"] | "unmarked"
  ) => {
    const { checkin } = getEmployeeAttendance(emp.id);

    if (newStatus === "unmarked") {
      try {
        await fetch(`/api/attendance?employeeId=${emp.id}&date=${selectedDate}`, {
          method: "DELETE",
        });
        await loadAttendance();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          employeeName: emp.name,
          email: emp.email,
          date: selectedDate,
          type: "checkin",
          time: checkin?.time || "08:00",
          status: newStatus,
          notes: checkin?.notes || undefined,
          bypassTimeLimit: true,
        }),
      });
      await loadAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotesChange = async (emp: Employee, notes: string) => {
    const { checkin } = getEmployeeAttendance(emp.id);

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          employeeName: emp.name,
          email: emp.email,
          date: selectedDate,
          type: "checkin",
          time: checkin?.time || "08:00",
          status: checkin?.status || "present",
          notes: notes.trim() || undefined,
          bypassTimeLimit: true,
        }),
      });
      await loadAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendance.employeeId) return;

    const emp = employees.find((item) => item.id === manualAttendance.employeeId);
    if (!emp) return;

    setManualSubmitting(true);
    setManualMessage("");

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          employeeName: emp.name,
          email: emp.email,
          date: manualAttendance.date,
          type: manualAttendance.type,
          time: manualAttendance.time,
          status: manualAttendance.status,
          notes: manualAttendance.notes.trim() || undefined,
          bypassTimeLimit: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menyimpan absensi manual");
      }

      setManualMessage(`Absensi manual untuk ${emp.name} berhasil disimpan!`);

      if (selectedDate !== manualAttendance.date) {
        setSelectedDate(manualAttendance.date);
      } else {
        await loadAttendance();
      }

      setManualAttendance((prev) => ({
        ...prev,
        employeeId: "",
        notes: "",
      }));
    } catch (err: any) {
      setManualMessage(err.message || "Gagal menambahkan absensi manual");
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monitoring & Absensi Admin</h1>
        <p className="text-gray-600 mt-2">
          Kelola absensi manual dan pantau kehadiran harian seluruh karyawan.
        </p>
      </div>

      {/* Tambah Absensi Manual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Tambah Absensi Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {manualMessage && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm flex items-center gap-2 ${
                manualMessage.includes("berhasil")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{manualMessage}</span>
            </div>
          )}

          <form onSubmit={handleManualAttendanceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Karyawan
                </label>
                <select
                  value={manualAttendance.employeeId}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      employeeId: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Pilih Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={manualAttendance.date}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Waktu (Jam)
                </label>
                <input
                  type="time"
                  value={manualAttendance.time}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tipe
                </label>
                <select
                  value={manualAttendance.type}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      type: e.target.value as "checkin" | "checkout",
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="checkin">Masuk</option>
                  <option value="checkout">Keluar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={manualAttendance.status}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      status: e.target.value as AttendanceRecord["status"],
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="present">Hadir (Tepat Waktu)</option>
                  <option value="late">Terlambat</option>
                  <option value="sick">Sakit</option>
                  <option value="leave">Cuti</option>
                  <option value="absent">Tidak Hadir (Alpa)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Catatan
                </label>
                <input
                  type="text"
                  value={manualAttendance.notes}
                  onChange={(e) =>
                    setManualAttendance((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Tambahkan catatan jika ada"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={manualSubmitting} className="gap-2 bg-black hover:bg-gray-800 text-white">
                <Save className="h-4 w-4" />
                {manualSubmitting ? "Menyimpan..." : "Tambah Absensi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Date Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Tanggal Pemantauan
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full md:w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                Hadir: {employees.filter(emp => getEmployeeAttendance(emp.id).checkin?.status === "present").length}
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Terlambat: {employees.filter(emp => getEmployeeAttendance(emp.id).checkin?.status === "late").length}
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                Izin/Sakit: {employees.filter(emp => ["sick", "leave"].includes(getEmployeeAttendance(emp.id).checkin?.status || "")).length}
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Alpa: {employees.filter(emp => getEmployeeAttendance(emp.id).checkin?.status === "absent").length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Grid/Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Daftar Kehadiran Karyawan ({selectedDate})
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Unduh data atau perbarui status kehadiran harian secara langsung.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToCSV(attendanceRecords, `absensi-${selectedDate}`)}
              disabled={attendanceRecords.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportAttendanceToXLSX(attendanceRecords, `absensi-${selectedDate}`)}
              disabled={attendanceRecords.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              XLSX
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {employees.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Tidak ada data karyawan aktif.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4">Karyawan</th>
                    <th className="text-left py-3 px-4">Departemen</th>
                    <th className="text-left py-3 px-4">Absen Masuk</th>
                    <th className="text-left py-3 px-4">Absen Keluar</th>
                    <th className="text-center py-3 px-4" style={{ width: "200px" }}>Status Kehadiran</th>
                    <th className="text-left py-3 px-4">Catatan Harian</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const { checkin, checkout } = getEmployeeAttendance(emp.id);
                    const currentStatus = checkin ? checkin.status : "unmarked";

                    return (
                      <tr key={emp.id} className="border-b hover:bg-gray-50/50">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.email}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{emp.department}</td>
                        <td className="py-4 px-4">
                          {checkin ? (
                            <div className="font-mono text-gray-900 font-medium">{checkin.time}</div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Belum masuk</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {checkout ? (
                            <div className="font-mono text-gray-900 font-medium">{checkout.time}</div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Belum keluar</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(emp, e.target.value as any)}
                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="unmarked">-- Belum Absen --</option>
                            <option value="present">Hadir (Tepat Waktu)</option>
                            <option value="late">Terlambat</option>
                            <option value="sick">Sakit (Izin)</option>
                            <option value="leave">Cuti (Izin)</option>
                            <option value="absent">Tidak Hadir (Alpa)</option>
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          <NotesInput
                            emp={emp}
                            checkin={checkin}
                            onSave={handleNotesChange}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Komponen Input Catatan dengan State Lokal agar ketikan spasi & karakter lancar
interface NotesInputProps {
  emp: Employee;
  checkin: any;
  onSave: (emp: Employee, notes: string) => void;
}

function NotesInput({ emp, checkin, onSave }: NotesInputProps) {
  const [value, setValue] = useState(checkin?.notes || "");

  useEffect(() => {
    setValue(checkin?.notes || "");
  }, [checkin?.notes]);

  const handleBlur = () => {
    // Trim hanya saat simpan ke database, dan hanya jika nilainya berubah
    const trimmedValue = value.trim();
    if (trimmedValue !== (checkin?.notes || "")) {
      onSave(emp, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      placeholder="Ketik catatan di sini..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  );
}
