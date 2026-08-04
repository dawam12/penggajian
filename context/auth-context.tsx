"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { userStorage, sessionStorage, employeeStorage } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetAdminPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const currentUser = sessionStorage.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock authentication - in real app, validate with backend
      let user = userStorage.getByEmail(email);

      if (!user) {
        // Check if email matches an existing employee
        const employees = employeeStorage.getAll();
        const matchingEmployee = employees.find(
          (emp) => emp.email.toLowerCase() === email.toLowerCase(),
        );

        if (matchingEmployee) {
          user = userStorage.create({
            email,
            role: "employee",
            password: "password",
          });
        } else {
          // Create user as admin if doesn't exist (for demo purposes)
          user = userStorage.create({
            email,
            role: "admin",
            password: "password",
          });
        }
      }

      // Check password if set (or check default 'password' if not set)
      const expectedPassword = user.password || "password";
      if (expectedPassword !== password) {
        throw new Error("Password salah");
      }

      sessionStorage.setCurrentUser(user);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const existingUser = userStorage.getByEmail(email);
      if (existingUser) {
        throw new Error("Email sudah terdaftar");
      }

      const newUser = userStorage.create({
        email,
        role: "admin",
      });

      sessionStorage.setCurrentUser(newUser);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAdminPassword = async (email: string, newPassword: string) => {
    const existingUser = userStorage.getByEmail(email);
    if (!existingUser) {
      throw new Error("Email tidak terdaftar.");
    }
    if (existingUser.role !== "admin") {
      throw new Error(
        "Fitur Lupa Kata Sandi ini hanya tersedia untuk Administrator. Untuk akun Karyawan, silakan hubungi Administrator untuk mereset kata sandi Anda."
      );
    }
    const updated = userStorage.updatePasswordByEmail(email, newPassword);
    if (!updated) {
      throw new Error("Gagal memperbarui kata sandi.");
    }
  };

  const logout = () => {
    sessionStorage.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, resetAdminPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
