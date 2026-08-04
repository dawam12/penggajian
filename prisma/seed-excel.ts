import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mapping departmentId & positionId dari Excel ke nama yang readable
const departmentMap: Record<string, string> = {
  "dept-1": "IT",
  "dept-2": "HR",
  "dept-3": "Finance",
  "dept-4": "Marketing",
  "dept-5": "Operations",
};

const positionMap: Record<string, string> = {
  "pos-1": "Senior Developer",
  "pos-2": "Software Engineer",
  "pos-3": "HR Manager",
  "pos-4": "HR Staff",
  "pos-5": "Finance Analyst",
  "pos-6": "Finance Intern",
  "pos-7": "Marketing Manager",
  "pos-8": "Operations Staff",
};

const statusMap: Record<string, string> = {
  "Permanent": "active",
  "Contract": "active",
  "Internship": "active",
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

const employeesFromExcel = [
  {
    id: "emp-3",
    name: "Adi Wijaya",
    nip: "NIP202305011",
    email: "adi.wijaya@company.com",
    phone: "081234567892",
    departmentId: "dept-1",
    positionId: "pos-2",
    status: "Contract",
    bankName: "BCA",
    bankAccount: "1122334455",
    joinDate: "2023-05-01",
    baseSalary: 12000000,
  },
  {
    id: "emp-1",
    name: "Budi Santoso",
    nip: "NIP202301001",
    email: "budi.santoso@company.com",
    phone: "081234567890",
    departmentId: "dept-1",
    positionId: "pos-1",
    status: "Permanent",
    bankName: "BCA",
    bankAccount: "1234567890",
    joinDate: "2023-01-15",
    baseSalary: 18000000,
  },
  {
    id: "emp-8",
    name: "Citra Dewi",
    nip: "NIP202501002",
    email: "citra.dewi@company.com",
    phone: "081234567897",
    departmentId: "dept-3",
    positionId: "pos-6",
    status: "Internship",
    bankName: "Mandiri",
    bankAccount: "8899001122",
    joinDate: "2025-01-05",
    baseSalary: 4500000,
  },
  {
    id: "emp-4",
    name: "Dewi Lestari",
    nip: "NIP202303005",
    email: "dewi.lestari@company.com",
    phone: "081234567893",
    departmentId: "dept-3",
    positionId: "pos-5",
    status: "Permanent",
    bankName: "BNI",
    bankAccount: "5566778899",
    joinDate: "2023-03-20",
    baseSalary: 14000000,
  },
  {
    id: "emp-7",
    name: "Eko Prasetyo",
    nip: "NIP202405001",
    email: "eko.prasetyo@company.com",
    phone: "081234567896",
    departmentId: "dept-4",
    positionId: "pos-7",
    status: "Permanent",
    bankName: "BCA",
    bankAccount: "9900112233",
    joinDate: "2024-05-15",
    baseSalary: 13000000,
  },
  {
    id: "emp-6",
    name: "Fitriani Indah",
    nip: "NIP202403002",
    email: "fitriani.indah@company.com",
    phone: "081234567895",
    departmentId: "dept-2",
    positionId: "pos-4",
    status: "Contract",
    bankName: "CIMB Niaga",
    bankAccount: "2233445566",
    joinDate: "2024-03-01",
    baseSalary: 8500000,
  },
  {
    id: "emp-5",
    name: "Rian Pratama",
    nip: "NIP202401001",
    email: "rian.pratama@company.com",
    phone: "081234567894",
    departmentId: "dept-5",
    positionId: "pos-8",
    status: "Permanent",
    bankName: "BCA",
    bankAccount: "7788990011",
    joinDate: "2024-01-10",
    baseSalary: 10000000,
  },
  {
    id: "emp-2",
    name: "Siti Aminah",
    nip: "NIP202301002",
    email: "siti.aminah@company.com",
    phone: "081234567891",
    departmentId: "dept-2",
    positionId: "pos-3",
    status: "Permanent",
    bankName: "Mandiri",
    bankAccount: "9876543210",
    joinDate: "2023-02-10",
    baseSalary: 15000000,
  },
];

async function main() {
  console.log("🌱 Memulai import data karyawan dari Excel...\n");

  let created = 0;
  let skipped = 0;

  for (const emp of employeesFromExcel) {
    const existing = await prisma.employee.findUnique({
      where: { email: emp.email },
    });

    if (existing) {
      console.log(`⚠️  Karyawan "${emp.name}" (${emp.email}) sudah ada, dilewati.`);
      skipped++;
      continue;
    }

    const department = departmentMap[emp.departmentId] || "Umum";
    const position = positionMap[emp.positionId] || "Karyawan";
    const status = statusMap[emp.status] || "active";

    // Hitung salary level berdasarkan gaji
    let salaryLevel = 1;
    if (emp.baseSalary >= 15000000) salaryLevel = 5;
    else if (emp.baseSalary >= 12000000) salaryLevel = 4;
    else if (emp.baseSalary >= 9000000) salaryLevel = 3;
    else if (emp.baseSalary >= 6000000) salaryLevel = 2;
    else salaryLevel = 1;

    // Buat employee
    const newEmp = await prisma.employee.create({
      data: {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department,
        position,
        salaryLevel,
        joinDate: new Date(emp.joinDate),
        status,
        basicSalary: emp.baseSalary,
      },
    });

    // Buat akun user untuk login
    const existingUser = await prisma.user.findUnique({
      where: { email: emp.email },
    });

    if (!existingUser) {
      const hashedPassword = hashPassword("Karyawan@123");
      await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          role: "employee",
        },
      });
    }

    console.log(`✅ Karyawan "${emp.name}" (${department} - ${position}) berhasil ditambahkan!`);
    created++;
  }

  console.log(`\n📊 Hasil Import:`);
  console.log(`   ✅ Berhasil ditambahkan: ${created} karyawan`);
  console.log(`   ⚠️  Dilewati (sudah ada): ${skipped} karyawan`);
  console.log(`\n🎉 Import selesai!`);
  console.log(`\n📌 Semua akun karyawan baru dapat login dengan password: Karyawan@123`);
}

main()
  .catch((e) => {
    console.error("❌ Error saat import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
