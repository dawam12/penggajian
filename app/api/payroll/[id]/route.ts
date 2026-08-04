import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// GET: Ambil record spesifik berdasarkan id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await prisma.payrollRecord.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      approvedAt: record.approvedAt?.toISOString() ?? null,
      paidAt: record.paidAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error fetching payroll record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update status (approve / paid / dll)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.approvedAt !== undefined) data.approvedAt = body.approvedAt ? new Date(body.approvedAt) : null;
    if (body.paidAt !== undefined) data.paidAt = body.paidAt ? new Date(body.paidAt) : null;

    const updated = await prisma.payrollRecord.update({
      where: { id },
      data,
      include: {
        employee: true,
      },
    });

    // Automatically create a SalarySlip in the database when approved or paid
    if (body.status === "approved" || body.status === "paid") {
      try {
        const existingSlip = await prisma.salarySlip.findUnique({
          where: { payrollRecordId: id },
        });

        if (!existingSlip) {
          await prisma.salarySlip.create({
            data: {
              payrollRecordId: updated.id,
              employeeId: updated.employeeId,
              employeeName: updated.employeeName,
              position: updated.employee?.position || "Staff",
              department: updated.employee?.department || "Umum",
              period: updated.period,
              month: updated.month,
              year: updated.year,
              basicSalary: updated.basicSalary,
              allowances: updated.allowances,
              deductions: updated.deductions,
              tax: updated.tax,
              grossSalary: updated.grossSalary,
              netSalary: updated.netSalary,
            },
          });
        }
      } catch (slipError) {
        console.error("Gagal membuat SalarySlip otomatis:", slipError);
      }
    }

    const actionDesc = body.status === 'approved' ? 'menyetujui' : body.status === 'paid' ? 'membayar' : 'memperbarui';
    await logActivity("payroll_update", `Mengubah status penggajian ${updated.employeeName} periode ${updated.period} menjadi ${body.status}`);

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      paidAt: updated.paidAt?.toISOString() ?? null,
    });
  } catch (error: any) {
    console.error('Error updating payroll record:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus record penggajian
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await prisma.payrollRecord.findUnique({ where: { id } });
    
    if (record) {
      // Hapus slip gaji terkait terlebih dahulu jika ada agar terhindar dari error foreign key constraint
      await prisma.salarySlip.deleteMany({
        where: { payrollRecordId: id }
      });
      
      await prisma.payrollRecord.delete({ where: { id } });
      await logActivity("payroll_deleted", `Menghapus penggajian ${record.employeeName} periode ${record.period}`);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payroll record:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
