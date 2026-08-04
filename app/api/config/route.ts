import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Ambil konfigurasi penggajian (buat default jika belum ada)
export async function GET() {
  try {
    let config = await prisma.payrollConfig.findFirst();

    if (!config) {
      config = await prisma.payrollConfig.create({
        data: {
          companyName: "Perusahaan Anda",
          taxRate: 15,
          allowanceRate: 20,
          deductionRate: 5,
          currency: "IDR",
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching payroll config:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST/PUT: Simpan atau update konfigurasi penggajian
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, taxRate, allowanceRate, deductionRate, currency, bankName, bankAccount } = body;

    if (!companyName) {
      return NextResponse.json({ error: "Nama perusahaan wajib diisi" }, { status: 400 });
    }

    const existingConfig = await prisma.payrollConfig.findFirst();

    let config;
    if (existingConfig) {
      config = await prisma.payrollConfig.update({
        where: { id: existingConfig.id },
        data: {
          companyName,
          taxRate: Number(taxRate),
          allowanceRate: Number(allowanceRate),
          deductionRate: Number(deductionRate),
          currency: currency || "IDR",
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        },
      });
    } else {
      config = await prisma.payrollConfig.create({
        data: {
          companyName,
          taxRate: Number(taxRate),
          allowanceRate: Number(allowanceRate),
          deductionRate: Number(deductionRate),
          currency: currency || "IDR",
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error saving payroll config:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
