import { PayrollConfig, Employee } from '@/types';
import { configStorage } from './storage';

export interface SalaryCalculation {
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  tax: number;
  netSalary: number;
}

export const calculateSalary = (
  employee: Employee,
  config?: PayrollConfig
): SalaryCalculation => {
  const cfg = config || configStorage.get();
  const basicSalary = employee.basicSalary;
  
  const allowanceRate = employee.allowanceRate ?? cfg.allowanceRate;
  const deductionRate = employee.deductionRate ?? cfg.deductionRate;
  const taxRate = employee.taxRate ?? cfg.taxRate;
  
  const allowances = (basicSalary * allowanceRate) / 100;
  const grossSalary = basicSalary + allowances;
  
  const deductions = (basicSalary * deductionRate) / 100;
  const tax = (grossSalary * taxRate) / 100;
  
  const netSalary = grossSalary - deductions - tax;
  
  return {
    basicSalary,
    allowances: Math.round(allowances),
    grossSalary: Math.round(grossSalary),
    deductions: Math.round(deductions),
    tax: Math.round(tax),
    netSalary: Math.round(netSalary),
  };
};

export const calculateMonthlyPayroll = (
  employees: Employee[],
  config?: PayrollConfig
) => {
  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;
  
  employees.forEach(emp => {
    const calc = calculateSalary(emp, config);
    totalGross += calc.grossSalary;
    totalNet += calc.netSalary;
    totalTax += calc.tax;
  });
  
  return {
    totalEmployees: employees.length,
    totalGrossSalary: totalGross,
    totalNetSalary: totalNet,
    totalTax: totalTax,
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value}%`;
};
