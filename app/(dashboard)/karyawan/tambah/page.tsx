"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import EmployeeForm from "@/components/karyawan/employee-form";

export default function TambahKaryawanPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Tambah Karyawan Baru
        </h1>
        <p className="text-gray-600 mt-1">
          Isikan informasi karyawan baru dengan lengkap
        </p>
      </div>
      <EmployeeForm />
    </div>
  );
}
