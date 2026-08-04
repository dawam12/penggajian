"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Employee } from "@/types";
import { employeeStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface EmployeeFormProps {
  employeeId?: string;
  isEditing?: boolean;
}

const departments = ["IT", "HR", "Finance", "Marketing", "Operations", "Sales"];
const positions = [
  "Manager",
  "Supervisor",
  "Staff",
  "Developer",
  "Designer",
  "Analyst",
];
const salaryLevels = [
  { value: 1, label: "Level 1 (Junior)" },
  { value: 2, label: "Level 2 (Mid)" },
  { value: 3, label: "Level 3 (Senior)" },
  { value: 4, label: "Level 4 (Lead)" },
  { value: 5, label: "Level 5 (Manager)" },
];

export default function EmployeeForm({
  employeeId,
  isEditing = false,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [globalConfig, setGlobalConfig] = useState<{ taxRate: number; allowanceRate: number; deductionRate: number } | null>(null);

  useEffect(() => {
    // Ambil konfigurasi global dari sistem pengaturan
    fetch("/api/config")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setGlobalConfig({ taxRate: data.taxRate, allowanceRate: data.allowanceRate, deductionRate: data.deductionRate }); })
      .catch(() => {});
  }, []);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    salaryLevel: 1,
    joinDate: "",
    basicSalary: "",
    taxRate: "",
    allowanceRate: "",
    deductionRate: "",
    status: "active",
    password: "",
  });

  useEffect(() => {
    if (isEditing && employeeId) {
      setIsLoading(true);
      fetch(`/api/karyawan/${employeeId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Gagal memuat data karyawan");
          return res.json();
        })
        .then((employee: Employee) => {
          setFormData({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            department: employee.department,
            position: employee.position,
            salaryLevel: employee.salaryLevel,
            joinDate: employee.joinDate,
            basicSalary: employee.basicSalary.toString(),
            taxRate: employee.taxRate !== null && employee.taxRate !== undefined ? employee.taxRate.toString() : "",
            allowanceRate: employee.allowanceRate !== null && employee.allowanceRate !== undefined ? employee.allowanceRate.toString() : "",
            deductionRate: employee.deductionRate !== null && employee.deductionRate !== undefined ? employee.deductionRate.toString() : "",
            status: employee.status,
            password: "",
          });
        })
        .catch((err) => setError(err.message || "Terjadi kesalahan"))
        .finally(() => setIsLoading(false));
    }
  }, [isEditing, employeeId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "salaryLevel" || name === "basicSalary" || name === "taxRate" || name === "allowanceRate" || name === "deductionRate"
          ? value === "" ? "" : parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error("Semua field wajib diisi");
      }

      if (
        typeof formData.basicSalary === "string" ||
        formData.basicSalary <= 0
      ) {
        throw new Error("Gaji pokok harus lebih dari 0");
      }

      const { password, taxRate, allowanceRate, deductionRate, ...employeeData } = formData;
      const payload = {
        ...employeeData,
        basicSalary: Number(formData.basicSalary),
        salaryLevel: Number(formData.salaryLevel),
        taxRate: taxRate === "" || taxRate === null || taxRate === undefined ? null : Number(taxRate),
        allowanceRate: allowanceRate === "" || allowanceRate === null || allowanceRate === undefined ? null : Number(allowanceRate),
        deductionRate: deductionRate === "" || deductionRate === null || deductionRate === undefined ? null : Number(deductionRate),
        password: password || undefined,
      } as any;

      if (isEditing && employeeId) {
        const res = await fetch(`/api/karyawan/${employeeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Gagal memperbarui karyawan");
        }

        employeeStorage.update(
          employeeId,
          {
            ...employeeData,
            basicSalary: Number(formData.basicSalary),
            taxRate: payload.taxRate,
            allowanceRate: payload.allowanceRate,
            deductionRate: payload.deductionRate,
            status: (formData.status as Employee["status"]) || "active",
          },
          password || undefined,
        );
      } else {
        const res = await fetch("/api/karyawan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Gagal menambahkan karyawan");
        }

        employeeStorage.create(
          {
            ...employeeData,
            basicSalary: Number(formData.basicSalary),
            taxRate: payload.taxRate,
            allowanceRate: payload.allowanceRate,
            deductionRate: payload.deductionRate,
            status: (formData.status as Employee["status"]) || "active",
          },
          password || undefined,
        );
      }

      router.push("/karyawan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">
              Informasi Pribadi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nomor Telepon
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08123456789"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tanggal Bergabung
                </label>
                <Input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isEditing
                    ? "Password Baru (Kosongkan jika tidak diubah)"
                    : "Password Akun Karyawan"}
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isEditing ? "•••••••• (opsional)" : "••••••••"}
                  required={!isEditing}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">
              Informasi Pekerjaan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Departemen
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={isLoading}
                >
                  <option value="">Pilih Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Posisi</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={isLoading}
                >
                  <option value="">Pilih Posisi</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Salary Level
                </label>
                <select
                  name="salaryLevel"
                  value={formData.salaryLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isLoading}
                >
                  {salaryLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isLoading}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                  <option value="terminated">Diberhentikan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Informasi Gaji</h3>
            <div>
              <label className="block text-sm font-medium mb-1">
                Gaji Pokok (Rp)
              </label>
              <Input
                type="number"
                name="basicSalary"
                value={formData.basicSalary}
                onChange={handleChange}
                placeholder="10000000"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Employee-Specific Payroll Settings */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Pengaturan Penggajian Khusus (Opsional)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Biarkan kosong untuk mengikuti pengaturan sistem{globalConfig ? ` (Pajak: ${globalConfig.taxRate}%, Tunjangan: ${globalConfig.allowanceRate}%, Potongan: ${globalConfig.deductionRate}%)` : "."}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pajak Khusus (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    placeholder={globalConfig ? `Sistem: ${globalConfig.taxRate}` : "Ikut sistem"}
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tunjangan Khusus (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="allowanceRate"
                    value={formData.allowanceRate}
                    onChange={handleChange}
                    placeholder={globalConfig ? `Sistem: ${globalConfig.allowanceRate}` : "Ikut sistem"}
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Potongan Khusus (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="deductionRate"
                    value={formData.deductionRate}
                    onChange={handleChange}
                    placeholder={globalConfig ? `Sistem: ${globalConfig.deductionRate}` : "Ikut sistem"}
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : isEditing ? "Perbarui" : "Tambah"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
