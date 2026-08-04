export interface User {
  id: string;
  email: string;
  role: "admin" | "employee";
  createdAt: string;
  password?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salaryLevel: number;
  joinDate: string;
  status: "active" | "inactive" | "terminated";
  basicSalary: number;
  taxRate?: number;
  allowanceRate?: number;
  deductionRate?: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  date: string;
  type: "checkin" | "checkout"; // masuk atau keluar
  time: string; // HH:MM format
  status: "present" | "late" | "sick" | "leave" | "absent";
  notes?: string;
  createdAt: string;
}

export interface PayrollConfig {
  id: string;
  companyName: string;
  taxRate: number; // percentage
  allowanceRate: number; // percentage
  deductionRate: number; // percentage
  currency: string;
  bankName?: string;
  bankAccount?: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // YYYY-MM
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  status: "draft" | "approved" | "paid";
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface SalarySlip {
  id: string;
  payrollRecordId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  period: string; // YYYY-MM
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  createdAt: string;
}

export interface ReportData {
  period: string;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTax: number;
  byDepartment: {
    [key: string]: {
      count: number;
      grossSalary: number;
      netSalary: number;
    };
  };
  records: PayrollRecord[];
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayrollThisMonth: number;
  pendingApprovals: number;
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId: string;
}
