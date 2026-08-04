import {
  Employee,
  PayrollRecord,
  PayrollConfig,
  User,
  SalarySlip,
  Activity,
  AttendanceRecord,
} from "@/types";

const STORAGE_PREFIX = "payroll_app:";

// Employee Storage
export const employeeStorage = {
  getAll: (): Employee[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`${STORAGE_PREFIX}employees`);
    const all: Employee[] = data ? JSON.parse(data) : [];
    // Deduplicate by id — fix for data created with duplicate timestamps
    const seen = new Set<string>();
    const unique = all.filter((emp) => {
      if (seen.has(emp.id)) return false;
      seen.add(emp.id);
      return true;
    });
    if (unique.length !== all.length) {
      localStorage.setItem(
        `${STORAGE_PREFIX}employees`,
        JSON.stringify(unique),
      );
    }
    return unique;
  },

  getById: (id: string): Employee | null => {
    const all = employeeStorage.getAll();
    return all.find((emp) => emp.id === id) || null;
  },

  create: (
    employee: Omit<Employee, "id" | "createdAt">,
    password?: string,
  ): Employee => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const all = employeeStorage.getAll();
    all.push(newEmployee);
    localStorage.setItem(`${STORAGE_PREFIX}employees`, JSON.stringify(all));

    // Sync with userStorage: Create employee user account automatically
    try {
      const existingUser = userStorage.getByEmail(newEmployee.email);
      if (!existingUser) {
        userStorage.create({
          email: newEmployee.email,
          role: "employee",
          password: password || "password",
        });
      }
    } catch (e) {
      console.error("Failed to sync employee to user storage:", e);
    }

    return newEmployee;
  },

  update: (
    id: string,
    data: Partial<Employee>,
    password?: string,
  ): Employee | null => {
    const all = employeeStorage.getAll();
    const index = all.findIndex((emp) => emp.id === id);
    if (index === -1) return null;

    const oldEmail = all[index].email;
    const updatedEmployee = { ...all[index], ...data };
    all[index] = updatedEmployee;
    localStorage.setItem(`${STORAGE_PREFIX}employees`, JSON.stringify(all));

    // Sync with userStorage: Update user email and password
    try {
      const users = userStorage.getAll();
      const userIndex = users.findIndex((u) => u.email === oldEmail);
      if (userIndex !== -1) {
        if (data.email) users[userIndex].email = data.email;
        if (password) users[userIndex].password = password;
        localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(users));
      } else {
        // If user didn't exist, create it now
        userStorage.create({
          email: data.email || oldEmail,
          role: "employee",
          password: password || "password",
        });
      }
    } catch (e) {
      console.error("Failed to sync employee email update to user storage:", e);
    }

    return updatedEmployee;
  },

  delete: (id: string): boolean => {
    const all = employeeStorage.getAll();
    const employeeToDelete = all.find((emp) => emp.id === id);
    const filtered = all.filter((emp) => emp.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(
      `${STORAGE_PREFIX}employees`,
      JSON.stringify(filtered),
    );

    // Sync with userStorage: Delete associated user account
    if (employeeToDelete) {
      try {
        const users = userStorage.getAll();
        const filteredUsers = users.filter(
          (u) => u.email !== employeeToDelete.email,
        );
        localStorage.setItem(
          `${STORAGE_PREFIX}users`,
          JSON.stringify(filteredUsers),
        );
      } catch (e) {
        console.error("Failed to sync employee deletion to user storage:", e);
      }
    }

    return true;
  },

  clearAll: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_PREFIX}employees`);
    const users = userStorage.getAll().filter((u) => u.role !== "employee");
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(users));
  },
};

// Payroll Record Storage
export const payrollStorage = {
  getAll: (): PayrollRecord[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`${STORAGE_PREFIX}payroll_records`);
    const all: PayrollRecord[] = data ? JSON.parse(data) : [];
    // Deduplicate by id — fix for data created with duplicate timestamps
    const seen = new Set<string>();
    const unique = all.filter((rec) => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
    if (unique.length !== all.length) {
      localStorage.setItem(
        `${STORAGE_PREFIX}payroll_records`,
        JSON.stringify(unique),
      );
    }
    return unique;
  },

  getByPeriod: (period: string): PayrollRecord[] => {
    return payrollStorage.getAll().filter((rec) => rec.period === period);
  },

  getByEmployeeId: (employeeId: string): PayrollRecord[] => {
    return payrollStorage
      .getAll()
      .filter((rec) => rec.employeeId === employeeId);
  },

  create: (record: Omit<PayrollRecord, "id" | "createdAt">): PayrollRecord => {
    const newRecord: PayrollRecord = {
      ...record,
      id: `payroll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const all = payrollStorage.getAll();
    all.push(newRecord);
    localStorage.setItem(
      `${STORAGE_PREFIX}payroll_records`,
      JSON.stringify(all),
    );
    return newRecord;
  },

  update: (id: string, data: Partial<PayrollRecord>): PayrollRecord | null => {
    const all = payrollStorage.getAll();
    const index = all.findIndex((rec) => rec.id === id);
    if (index === -1) return null;
    all[index] = { ...all[index], ...data };
    localStorage.setItem(
      `${STORAGE_PREFIX}payroll_records`,
      JSON.stringify(all),
    );
    return all[index];
  },

  delete: (id: string): boolean => {
    const all = payrollStorage.getAll();
    const filtered = all.filter((rec) => rec.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(
      `${STORAGE_PREFIX}payroll_records`,
      JSON.stringify(filtered),
    );
    return true;
  },
};

// Attendance Storage
export const attendanceStorage = {
  getAll: (): AttendanceRecord[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`${STORAGE_PREFIX}attendance`);
    return data ? JSON.parse(data) : [];
  },

  getByEmployeeAndDate: (
    employeeId: string,
    date: string,
  ): AttendanceRecord | null => {
    return (
      attendanceStorage
        .getAll()
        .find(
          (record) => record.employeeId === employeeId && record.date === date,
        ) || null
    );
  },

  createOrUpdate: (
    record: Omit<AttendanceRecord, "id" | "createdAt">,
  ): AttendanceRecord => {
    const all = attendanceStorage.getAll();
    const existingIndex = all.findIndex(
      (item) =>
        item.employeeId === record.employeeId && item.date === record.date,
    );

    const newRecord: AttendanceRecord = {
      id:
        existingIndex >= 0
          ? all[existingIndex].id
          : `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...record,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = newRecord;
    } else {
      all.push(newRecord);
    }

    localStorage.setItem(`${STORAGE_PREFIX}attendance`, JSON.stringify(all));
    return newRecord;
  },

  createOrUpdateAttendance: (
    record: Omit<AttendanceRecord, "id" | "createdAt">,
  ): AttendanceRecord => {
    const all = attendanceStorage.getAll();
    const existingIndex = all.findIndex(
      (item) =>
        item.employeeId === record.employeeId &&
        item.date === record.date &&
        item.type === record.type,
    );

    const newRecord: AttendanceRecord = {
      id:
        existingIndex >= 0
          ? all[existingIndex].id
          : `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...record,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = newRecord;
    } else {
      all.push(newRecord);
    }

    localStorage.setItem(`${STORAGE_PREFIX}attendance`, JSON.stringify(all));
    return newRecord;
  },

  getByEmployee: (employeeId: string): AttendanceRecord[] => {
    return attendanceStorage
      .getAll()
      .filter((record) => record.employeeId === employeeId);
  },
};

// Config Storage
export const configStorage = {
  get: (): PayrollConfig => {
    if (typeof window === "undefined") {
      return getDefaultConfig();
    }
    const data = localStorage.getItem(`${STORAGE_PREFIX}config`);
    return data ? JSON.parse(data) : getDefaultConfig();
  },

  set: (config: PayrollConfig) => {
    localStorage.setItem(`${STORAGE_PREFIX}config`, JSON.stringify(config));
  },
};

// User Storage (Mock Auth)
export const userStorage = {
  getAll: (): User[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`${STORAGE_PREFIX}users`);
    return data ? JSON.parse(data) : [];
  },

  getByEmail: (email: string): User | null => {
    const all = userStorage.getAll();
    return all.find((user) => user.email === email) || null;
  },

  create: (user: Omit<User, "id" | "createdAt">): User => {
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const all = userStorage.getAll();
    all.push(newUser);
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(all));
    return newUser;
  },

  updatePasswordByEmail: (email: string, newPassword: string): boolean => {
    const all = userStorage.getAll();
    const index = all.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (index === -1) return false;
    all[index].password = newPassword;
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(all));
    return true;
  },
};

// Session Storage
export const sessionStorage = {
  setCurrentUser: (user: User) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(user));
  },

  getCurrentUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(`${STORAGE_PREFIX}current_user`);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
  },
};

// Helper Functions
function getDefaultConfig(): PayrollConfig {
  return {
    id: `config_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    companyName: "Perusahaan Anda",
    taxRate: 15,
    allowanceRate: 20,
    deductionRate: 5,
    currency: "IDR",
    updatedAt: new Date().toISOString(),
  };
}

// Initialize Demo Data
export const initializeDemoData = () => {
  if (typeof window === "undefined") return;

  // Check if already initialized
  if (localStorage.getItem(`${STORAGE_PREFIX}initialized`)) return;

  // Create demo employees
  const demoEmployees: Omit<Employee, "id" | "createdAt">[] = [
    {
      name: "Bambang Sutrisno",
      email: "bambang@example.com",
      phone: "08123456789",
      department: "IT",
      position: "Senior Developer",
      salaryLevel: 5,
      joinDate: "2022-01-15",
      status: "active",
      basicSalary: 15000000,
    },
    {
      name: "Siti Nurhaliza",
      email: "siti@example.com",
      phone: "08234567890",
      department: "HR",
      position: "HR Manager",
      salaryLevel: 4,
      joinDate: "2021-06-20",
      status: "active",
      basicSalary: 12000000,
    },
    {
      name: "Adi Pratama",
      email: "adi@example.com",
      phone: "08345678901",
      department: "Finance",
      position: "Finance Analyst",
      salaryLevel: 3,
      joinDate: "2022-09-10",
      status: "active",
      basicSalary: 10000000,
    },
  ];

  demoEmployees.forEach((emp) => employeeStorage.create(emp));

  // Create demo user
  userStorage.create({
    email: "admin@payroll.com",
    role: "admin",
  });

  localStorage.setItem(`${STORAGE_PREFIX}initialized`, "true");
};
