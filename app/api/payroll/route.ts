import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// GET: Ambil semua payroll records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const where = employeeId ? { employeeId } : {};

    const records = await prisma.payrollRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Convert dates to ISO string
    const formatted = records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Buat record penggajian baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeName,
      period,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      tax,
      grossSalary,
      netSalary,
      status,
      notes,
    } = body;

    if (!employeeId || !employeeName || !period) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const record = await prisma.payrollRecord.create({
      data: {
        employeeId,
        employeeName,
        period,
        month: Number(month),
        year: Number(year),
        basicSalary: Number(basicSalary),
        allowances: Number(allowances),
        deductions: Number(deductions),
        tax: Number(tax),
        grossSalary: Number(grossSalary),
        netSalary: Number(netSalary),
        status: status || 'draft',
        notes: notes || null,
      },
    });

    await logActivity("payroll_created", `Memproses penggajian untuk ${employeeName} periode ${period}`);

    return NextResponse.json({
      ...record,
      createdAt: record.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payroll record:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus semua data penggajian pada periode tertentu secara massal
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Periode harus ditentukan' }, { status: 400 });
    }

    // Dapatkan semua record pada periode ini
    const records = await prisma.payrollRecord.findMany({
      where: { period },
    });

    const recordIds = records.map((r) => r.id);

    // Hapus salary slips terkait massal
    await prisma.salarySlip.deleteMany({
      where: { payrollRecordId: { in: recordIds } },
    });

    // Hapus payroll records massal
    const deleteResult = await prisma.payrollRecord.deleteMany({
      where: { period },
    });

    await logActivity("payroll_deleted_mass", `Menghapus massal semua data penggajian periode ${period}`);

    return NextResponse.json({ success: true, count: deleteResult.count });
  } catch (error: any) {
    console.error('Error mass deleting payroll records:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update status secara massal untuk periode tertentu
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { period, status } = body;

    if (!period || !status) {
      return NextResponse.json({ error: 'Periode dan status harus ditentukan' }, { status: 400 });
    }

    const data: Record<string, unknown> = { status };
    if (status === 'approved') data.approvedAt = new Date();
    if (status === 'paid') data.paidAt = new Date();

    const updateResult = await prisma.payrollRecord.updateMany({
      where: { period },
      data,
    });

    if (status === 'approved' || status === 'paid') {
      const records = await prisma.payrollRecord.findMany({
        where: { period },
        include: { employee: true },
      });

      for (const rec of records) {
        try {
          const existingSlip = await prisma.salarySlip.findUnique({
            where: { payrollRecordId: rec.id },
          });
          if (!existingSlip) {
            await prisma.salarySlip.create({
              data: {
                payrollRecordId: rec.id,
                employeeId: rec.employeeId,
                employeeName: rec.employeeName,
                position: rec.employee?.position || 'Staff',
                department: rec.employee?.department || 'Umum',
                period: rec.period,
                month: rec.month,
                year: rec.year,
                basicSalary: rec.basicSalary,
                allowances: rec.allowances,
                deductions: rec.deductions,
                tax: rec.tax,
                grossSalary: rec.grossSalary,
                netSalary: rec.netSalary,
              },
            });
          }
        } catch (slipErr) {
          console.error('Error creating slip mass:', slipErr);
        }
      }
    }

    const actionText = status === 'paid' ? 'membayar' : 'menyetujui';
    await logActivity("payroll_update_mass", `Mengubah status massal penggajian periode ${period} menjadi ${status} (${actionText})`);

    return NextResponse.json({ success: true, count: updateResult.count });
  } catch (error: any) {
    console.error('Error mass updating payroll records:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

