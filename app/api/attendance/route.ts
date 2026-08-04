import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// GET: Ambil data absensi dari Neon Database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const email = searchParams.get("email");

    const where: any = {};
    if (date) where.date = date;

    if (employeeId || email) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            ...(employeeId ? [{ id: employeeId }, { email: employeeId.toLowerCase() }] : []),
            ...(email ? [{ email: email.toLowerCase() }] : []),
          ],
        },
      });

      if (emp) {
        where.employeeId = emp.id;
      } else if (employeeId) {
        where.employeeId = employeeId;
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((r: any) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Buat atau Update data absensi (checkin/checkout)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeName,
      email,
      date,
      type,
      time,
      status,
      notes,
    } = body;

    if (!employeeId || !employeeName || !email || !date || !type || !time) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Cari karyawan di database berdasarkan id atau email
    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeId },
          { email: email.toLowerCase() },
        ],
      },
    });

    if (!emp) {
      // Jika data karyawan belum ada di database, buatkan data karyawan otomatis
      emp = await prisma.employee.create({
        data: {
          name: employeeName,
          email: email.toLowerCase(),
          phone: "08123456789",
          department: "Umum",
          position: "Karyawan",
          salaryLevel: 1,
          joinDate: new Date(),
          status: "active",
          basicSalary: 5000000,
        },
      });
    }

    const validEmployeeId = emp.id;

    // Auto-determine status for check-in: if time > 08:00 and status is present/unspecified, set to 'late'
    let finalStatus = status || "present";
    if (type === "checkin") {
      if (!status || status === "present" || status === "late") {
        const [h, m] = time.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const totalMinutes = h * 60 + m;
          if (totalMinutes > 8 * 60) {
            finalStatus = "late";
          } else if (status === "present" || !status) {
            finalStatus = "present";
          }
        }
      }
    }

    // Validasi waktu Absen Keluar (harus antara 17:00 dan 18:00)
    if (type === "checkout" && !body.bypassTimeLimit) {
      const [h, m] = time.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const totalMinutes = h * 60 + m;
        const startMinutes = 17 * 60; // 17:00 = 1020
        const endMinutes = 18 * 60;   // 18:00 = 1080
        if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
          return NextResponse.json(
            { error: "Absen keluar hanya dapat dilakukan pada jam 17:00 sampai 18:00." },
            { status: 400 }
          );
        }
      }
    }

    // Cari apakah sudah ada absensi dengan validEmployeeId, date, dan type yang sama
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: validEmployeeId,
        date,
        type,
      },
    });

    let record;
    if (existing) {
      // Update
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          time,
          status: finalStatus,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
      await logActivity(
        "attendance_update",
        `Memperbarui absensi ${type} untuk ${emp.name} pada tanggal ${date} (${finalStatus})`
      );
    } else {
      // Create
      record = await prisma.attendance.create({
        data: {
          employeeId: validEmployeeId,
          employeeName: emp.name,
          email: emp.email,
          date,
          type,
          time,
          status: finalStatus,
          notes: notes || null,
        },
      });
      await logActivity(
        "attendance_create",
        `Mencatat absensi ${type} baru untuk ${emp.name} pada tanggal ${date} (${finalStatus})`
      );
    }

    return NextResponse.json({
      ...record,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error processing attendance record:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Hapus absensi (opsional, untuk admin unmark)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date");

    if (!employeeId || !date) {
      return NextResponse.json({ error: "employeeId and date are required" }, { status: 400 });
    }

    // Hapus semua absensi untuk karyawan ini pada tanggal ini
    await prisma.attendance.deleteMany({
      where: {
        employeeId,
        date,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting attendance records:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
