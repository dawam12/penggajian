"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Employee } from "@/types";
import { exportEmployeesToCSV, exportEmployeesToXLSX } from "@/lib/export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Plus, Download, Search } from "lucide-react";

export default function KaryawanPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const canCreateEmployee = user?.role === "admin";

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter((emp) => emp.department === departmentFilter);
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, departmentFilter]);

  const loadEmployees = () => {
    setIsLoading(true);
    fetch("/api/karyawan")
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat data karyawan");
        return res.json();
      })
      .then((data: Employee[]) => {
        setEmployees(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data karyawan ini?")) {
      console.log("Deleting employee id:", id);
      fetch(`/api/karyawan/${id}`, { method: "DELETE" })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Gagal menghapus karyawan");
          }
          loadEmployees();
        })
        .catch((err) => alert(err.message || "Terjadi kesalahan"));
    }
  };

  const departments = Array.from(
    new Set(employees.map((emp) => emp.department)),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-gray-600 mt-1">
            Total:{" "}
            <span className="font-semibold">{filteredEmployees.length}</span>{" "}
            karyawan
          </p>
        </div>
        {canCreateEmployee ? (
          <Link href="/karyawan/tambah">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Karyawan
            </Button>
          </Link>
        ) : (
          <div className="text-sm text-gray-500 italic">
            Hanya admin yang dapat menambah karyawan.
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Semua Departemen</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportEmployeesToCSV(filteredEmployees)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportEmployeesToXLSX(filteredEmployees)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                XLSX
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada data karyawan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4">Nama</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Departemen</th>
                    <th className="text-left py-3 px-4">Posisi</th>
                    <th className="text-right py-3 px-4">Gaji Pokok</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{emp.name}</td>
                      <td className="py-3 px-4 text-gray-600">{emp.email}</td>
                      <td className="py-3 px-4">{emp.department}</td>
                      <td className="py-3 px-4">{emp.position}</td>
                      <td className="py-3 px-4 text-right">
                        Rp{emp.basicSalary.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            emp.status === "active"
                              ? "bg-green-100 text-green-700"
                              : emp.status === "inactive"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {emp.status === "active"
                            ? "Aktif"
                            : emp.status === "inactive"
                              ? "Tidak Aktif"
                              : "Diberhentikan"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Link href={`/karyawan/${emp.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(emp.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
