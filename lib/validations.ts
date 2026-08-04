import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const employeeSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon tidak valid'),
  department: z.string().min(1, 'Departemen harus dipilih'),
  position: z.string().min(1, 'Posisi harus diisi'),
  salaryLevel: z.number().min(1, 'Salary level harus dipilih'),
  joinDate: z.string().min(1, 'Tanggal bergabung harus diisi'),
  basicSalary: z.number().min(1, 'Gaji pokok harus lebih dari 0'),
  status: z.enum(['active', 'inactive', 'terminated']),
});

export const payrollConfigSchema = z.object({
  companyName: z.string().min(1, 'Nama perusahaan harus diisi'),
  taxRate: z.number().min(0).max(100, 'Tax rate harus antara 0-100'),
  allowanceRate: z.number().min(0).max(100, 'Allowance rate harus antara 0-100'),
  deductionRate: z.number().min(0).max(100, 'Deduction rate harus antara 0-100'),
  currency: z.string(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});

export const payrollRecordSchema = z.object({
  employeeId: z.string().min(1, 'Karyawan harus dipilih'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format periode harus YYYY-MM'),
  basicSalary: z.number().min(1),
  allowances: z.number().min(0),
  deductions: z.number().min(0),
  tax: z.number().min(0),
  status: z.enum(['draft', 'approved', 'paid']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type PayrollConfigInput = z.infer<typeof payrollConfigSchema>;
export type PayrollRecordInput = z.infer<typeof payrollRecordSchema>;
