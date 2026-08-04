import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Hashing helper matching seed.ts
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return `${salt}:${hash}`;
}

// GET: Read all employees from DB
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Format joinDate to YYYY-MM-DD
    const formattedEmployees = employees.map(emp => ({
      ...emp,
      joinDate: emp.joinDate.toISOString().split('T')[0],
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new employee and user account
export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Check if email already exists in Employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Create Employee in a transaction to ensure User is also created
    const result = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          name,
          email,
          phone,
          department,
          position,
          salaryLevel: Number(salaryLevel),
          joinDate: new Date(joinDate),
          status: status || 'active',
          basicSalary: Number(basicSalary),
          taxRate: taxRate !== undefined && taxRate !== "" && taxRate !== null ? Number(taxRate) : null,
          allowanceRate: allowanceRate !== undefined && allowanceRate !== "" && allowanceRate !== null ? Number(allowanceRate) : null,
          deductionRate: deductionRate !== undefined && deductionRate !== "" && deductionRate !== null ? Number(deductionRate) : null,
        },
      });

      // Check if User already exists
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        const hashedPassword = hashPassword(password || 'password');
        await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'employee',
          },
        });
      }

      return newEmployee;
    });

    // Format response joinDate to YYYY-MM-DD
    const formatted = {
      ...result,
      joinDate: result.joinDate.toISOString().split('T')[0],
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
