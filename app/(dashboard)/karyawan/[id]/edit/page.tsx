"use client";

import { use } from "react";
import EmployeeForm from "@/components/karyawan/employee-form";

export default function EditKaryawanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Data Karyawan</h1>
        <p className="text-gray-600 mt-1">Perbarui informasi karyawan</p>
      </div>
      <EmployeeForm employeeId={resolvedParams.id} isEditing />
    </div>
  );
}
