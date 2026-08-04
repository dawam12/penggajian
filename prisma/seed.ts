import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Memulai seeding database...");

  // 1. Buat atau update user admin
  const adminEmail = "admin@penggajian.com";
  const adminPassword = "Admin@123";

  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const hashedPassword = hashPassword(adminPassword);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      },
    });
    console.log("✅ Admin berhasil dibuat!");
  } else {
    console.log(`⚠️  Admin dengan email "${adminEmail}" sudah ada, dilewati.`);
  }

  // 2. Buat Default Payroll Config jika belum ada
  let config = await prisma.payrollConfig.findFirst();
  if (!config) {
    config = await prisma.payrollConfig.create({
      data: {
        companyName: "PT. Maju Mundur Sejahtera",
        taxRate: 10,
        allowanceRate: 15,
        deductionRate: 5,
        currency: "IDR",
        bankName: "Bank Central Asia (BCA)",
        bankAccount: "8001234567",
      },
    });
    console.log("✅ Default Payroll Config berhasil dibuat!");
  } else {
    console.log("⚠️  Payroll Config sudah ada, dilewati.");
  }

  // 3. Buat demo Karyawan jika belum ada
  const employeesData = [
    {
      name: "Bambang Sutrisno",
      email: "bambang@penggajian.com",
      phone: "08123456789",
      department: "IT",
      position: "Senior Developer",
      salaryLevel: 5,
      joinDate: new Date("2022-01-15"),
      status: "active",
      basicSalary: 15000000,
      taxRate: 5,
      allowanceRate: 10,
      deductionRate: 2,
    },
    {
      name: "Siti Nurhaliza",
      email: "siti@penggajian.com",
      phone: "08234567890",
      department: "HR",
      position: "HR Manager",
      salaryLevel: 4,
      joinDate: new Date("2021-06-20"),
      status: "active",
      basicSalary: 12000000,
      taxRate: null,
      allowanceRate: null,
      deductionRate: null,
    },
    {
      name: "Dewa Adi Pratama",
      email: "dewa@penggajian.com",
      phone: "08345678901",
      department: "Finance",
      position: "Finance Analyst",
      salaryLevel: 3,
      joinDate: new Date("2022-09-10"),
      status: "active",
      basicSalary: 10000000,
      taxRate: null,
      allowanceRate: null,
      deductionRate: null,
    }
  ];

  const seededEmployees = [];
  for (const empData of employeesData) {
    let emp = await prisma.employee.findUnique({
      where: { email: empData.email },
    });

    if (!emp) {
      emp = await prisma.employee.create({
        data: empData,
      });

      // Buat akun user untuk karyawan
      const hashedPassword = hashPassword("Karyawan@123");
      await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          role: "employee",
        },
      });

      console.log(`✅ Karyawan & User ${emp.name} berhasil dibuat!`);
    } else {
      console.log(`⚠️  Karyawan ${emp.name} sudah ada, dilewati.`);
    }
    seededEmployees.push(emp);
  }

  // 4. Buat demo Payroll Record & Salary Slip jika belum ada
  const existingPayroll = await prisma.payrollRecord.findFirst();
  if (!existingPayroll && seededEmployees.length > 0) {
    const period = "2026-06";
    const month = 6;
    const year = 2026;

    for (const emp of seededEmployees) {
      // Hitung gaji sederhana untuk seed
      const basicSalary = emp.basicSalary;
      const allowanceRate = emp.allowanceRate ?? config.allowanceRate;
      const taxRate = emp.taxRate ?? config.taxRate;
      const deductionRate = emp.deductionRate ?? config.deductionRate;

      const allowances = (basicSalary * allowanceRate) / 100;
      const grossSalary = basicSalary + allowances;
      const deductions = (basicSalary * deductionRate) / 100;
      const tax = (grossSalary * taxRate) / 100;
      const netSalary = grossSalary - deductions - tax;

      // Create Payroll Record
      const payroll = await prisma.payrollRecord.create({
        data: {
          employeeId: emp.id,
          employeeName: emp.name,
          period,
          month,
          year,
          basicSalary,
          allowances,
          deductions,
          tax,
          grossSalary,
          netSalary,
          status: "paid",
          notes: "Gaji Bulanan Juni 2026",
          paidAt: new Date(),
          approvedAt: new Date(),
        },
      });

      // Create Salary Slip
      await prisma.salarySlip.create({
        data: {
          payrollRecordId: payroll.id,
          employeeId: emp.id,
          employeeName: emp.name,
          position: emp.position,
          department: emp.department,
          period,
          month,
          year,
          basicSalary,
          allowances,
          deductions,
          tax,
          grossSalary,
          netSalary,
        },
      });
      console.log(`✅ Payroll & Slip Gaji ${emp.name} periode ${period} berhasil dibuat!`);
    }
  } else {
    console.log("⚠️  Payroll Record / Salary Slip sudah ada, dilewati.");
  }

  // 5. Buat demo Activity logs jika belum ada
  const existingActivity = await prisma.activity.findFirst();
  if (!existingActivity && admin) {
    const activities = [
      {
        type: "auth_login",
        description: "Admin berhasil masuk ke dalam sistem penggajian.",
        userId: admin.id,
      },
      {
        type: "employee_created",
        description: "Admin menambahkan data karyawan baru: Dewa Adi Pratama.",
        userId: admin.id,
      },
      {
        type: "config_update",
        description: "Mengubah persentase pajak default menjadi 10%.",
        userId: admin.id,
      },
      {
        type: "payroll_created",
        description: "Memproses seluruh data penggajian periode Juni 2026.",
        userId: admin.id,
      },
      {
        type: "payroll_update",
        description: "Menyetujui dan melakukan pembayaran gaji periode Juni 2026.",
        userId: admin.id,
      }
    ];

    for (const act of activities) {
      await prisma.activity.create({
        data: act,
      });
    }
    console.log("✅ Demo log aktivitas berhasil dibuat!");
  } else {
    console.log("⚠️  Aktivitas log sudah ada, dilewati.");
  }

  // 6. Buat demo Attendance (Absensi) untuk karyawan yang ada jika belum ada
  const allEmployees = await prisma.employee.findMany();
  for (const emp of allEmployees) {
    const today = new Date().toISOString().slice(0, 10);
    const existingAtt = await prisma.attendance.findFirst({
      where: { employeeId: emp.id, date: today },
    });

    if (!existingAtt) {
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          employeeName: emp.name,
          email: emp.email,
          date: today,
          type: "checkin",
          time: "08:00",
          status: "present",
          notes: "Hadir tepat waktu",
        },
      });
      console.log(`✅ Absensi demo untuk ${emp.name} (${today}) berhasil dibuat!`);
    }
  }

  console.log("\n🎉 Seeding selesai!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
