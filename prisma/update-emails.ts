import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Memulai update email karyawan ke @gmail.com...\n");

  const employees = await prisma.employee.findMany();
  let updated = 0;

  for (const emp of employees) {
    // Skip jika sudah @gmail.com atau email sistem (admin, dll)
    if (emp.email.endsWith("@gmail.com") || emp.email.endsWith("@penggajian.com")) {
      console.log(`⏭️  Dilewati: ${emp.name} (${emp.email})`);
      continue;
    }

    // Buat email baru: ambil bagian sebelum @ dan ganti domainnya
    const localPart = emp.email.split("@")[0];
    const newEmail = `${localPart}@gmail.com`;

    // Cek apakah email baru sudah dipakai
    const emailConflict = await prisma.employee.findUnique({ where: { email: newEmail } });
    if (emailConflict && emailConflict.id !== emp.id) {
      console.log(`⚠️  Konflik: ${newEmail} sudah dipakai, dilewati.`);
      continue;
    }

    // Update email di tabel employees
    await prisma.employee.update({
      where: { id: emp.id },
      data: { email: newEmail },
    });

    // Update email di tabel users (akun login)
    const user = await prisma.user.findUnique({ where: { email: emp.email } });
    if (user) {
      // Cek apakah email user baru sudah ada
      const userConflict = await prisma.user.findUnique({ where: { email: newEmail } });
      if (!userConflict) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: newEmail },
        });
      }
    }

    // Update semua record absensi yang menggunakan email lama
    await prisma.attendance.updateMany({
      where: { email: emp.email },
      data: { email: newEmail },
    });

    console.log(`✅ ${emp.name}: ${emp.email} → ${newEmail}`);
    updated++;
  }

  console.log(`\n📊 Selesai! ${updated} email karyawan berhasil diperbarui.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
