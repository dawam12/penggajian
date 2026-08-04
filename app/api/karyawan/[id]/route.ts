import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    console.error("GET called without id");
    return NextResponse.json(
      { error: "ID karyawan tidak ditemukan dalam path" },
      { status: 400 },
    );
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    const formatted = {
      ...employee,
      joinDate: employee.joinDate.toISOString().split("T")[0],
    };
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID karyawan tidak ditemukan dalam path" },
      { status: 400 },
    );
  }
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      department,
      position,
      salaryLevel,
      joinDate,
      status,
      basicSalary,
      password,
      taxRate,
      allowanceRate,
      deductionRate,
    } = body;

    if (!name || !email || !phone || !joinDate || !basicSalary) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 },
      );
    }

    // Get current employee info first to check email change
    const currentEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!currentEmployee) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Check for email conflict with other employees
    const conflict = await prisma.employee.findFirst({
      where: { email, NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Email sudah digunakan oleh karyawan lain" },
        { status: 400 },
      );
    }

    // Update employee info
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        department,
        position,
        salaryLevel: Number(salaryLevel),
        joinDate: new Date(joinDate),
        status: status || "active",
        basicSalary: Number(basicSalary),
        taxRate: taxRate !== undefined && taxRate !== "" && taxRate !== null ? Number(taxRate) : null,
        allowanceRate: allowanceRate !== undefined && allowanceRate !== "" && allowanceRate !== null ? Number(allowanceRate) : null,
        deductionRate: deductionRate !== undefined && deductionRate !== "" && deductionRate !== null ? Number(deductionRate) : null,
      },
    });

    // Update user login email if old email was different
    const oldEmail = currentEmployee.email;
    if (oldEmail !== email) {
      const existingUserWithOldEmail = await prisma.user.findUnique({
        where: { email: oldEmail },
      });
      if (existingUserWithOldEmail) {
        await prisma.user.update({
          where: { email: oldEmail },
          data: { email },
        });
      }
    }

    // Update password if provided
    if (password) {
      const hashed = hashPassword(password);
      await prisma.user.updateMany({
        where: { email },
        data: { password: hashed },
      });
    }

    const result = updatedEmployee;

    const formatted = {
      ...result,
      joinDate: result.joinDate.toISOString().split("T")[0],
    };
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error updating employee:", error);
    const msg = error.message || "Internal Server Error";
    const status = msg.includes("Email sudah digunakan") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID karyawan tidak ditemukan dalam path" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.findUnique({ where: { id } });
      if (!emp) throw new Error("Employee not found");

      await tx.employee.delete({ where: { id } });
      await tx.user.deleteMany({ where: { email: emp.email } });

      return { deleted: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    const status = error.message === "Employee not found" ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status },
    );
  }
}
