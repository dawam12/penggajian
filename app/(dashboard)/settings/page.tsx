"use client";

import { useEffect, useState } from "react";
import { PayrollConfig } from "@/types";
import { configStorage } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState<PayrollConfig>({
    id: "",
    companyName: "Memuat...",
    taxRate: 0,
    allowanceRate: 0,
    deductionRate: 0,
    currency: "IDR",
    bankName: "",
    bankAccount: "",
    updatedAt: "",
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        setError("Gagal memuat konfigurasi");
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]:
        name === "taxRate" ||
        name === "allowanceRate" ||
        name === "deductionRate"
          ? value === ""
            ? 0
            : parseFloat(value)
          : value,
    }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!config.companyName) {
        throw new Error("Nama perusahaan wajib diisi");
      }

      if (
        config.taxRate < 0 ||
        config.taxRate > 100 ||
        config.allowanceRate < 0 ||
        config.allowanceRate > 100 ||
        config.deductionRate < 0 ||
        config.deductionRate > 100
      ) {
        throw new Error("Persentase harus antara 0-100");
      }

      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan konfigurasi");
      }

      const updatedData = await res.json();
      setConfig(updatedData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-gray-600 mt-1">
          Kelola konfigurasi penggajian dan informasi perusahaan
        </p>
      </div>

      {/* Notifications */}
      {isSaved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          Pengaturan berhasil disimpan
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Perusahaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nama Perusahaan
              </label>
              <Input
                type="text"
                name="companyName"
                value={config.companyName}
                onChange={handleChange}
                placeholder="PT. Contoh Perusahaan"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mata Uang
              </label>
              <Input
                type="text"
                name="currency"
                value={config.currency}
                onChange={handleChange}
                placeholder="IDR"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nama Bank
                </label>
                <Input
                  type="text"
                  name="bankName"
                  value={config.bankName || ""}
                  onChange={handleChange}
                  placeholder="BCA"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nomor Rekening
                </label>
                <Input
                  type="text"
                  name="bankAccount"
                  value={config.bankAccount || ""}
                  onChange={handleChange}
                  placeholder="1234567890"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Penggajian</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Sesuaikan persentase perhitungan gaji karyawan
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pajak (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="taxRate"
                    value={config.taxRate}
                    onChange={handleChange}
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
                <label className="block text-sm font-medium mb-2">
                  Tunjangan (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="allowanceRate"
                    value={config.allowanceRate}
                    onChange={handleChange}
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
                <label className="block text-sm font-medium mb-2">
                  Potongan (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="deductionRate"
                    value={config.deductionRate}
                    onChange={handleChange}
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

            {/* Rate Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-2">
              <p className="font-semibold">Contoh Perhitungan:</p>
              <p>
                Gaji Pokok: Rp 10.000.000
                <br />
                Tunjangan ({config.allowanceRate}%): Rp{" "}
                {(10000000 * config.allowanceRate) / 100}
                <br />
                Gaji Kotor: Rp{" "}
                {10000000 + (10000000 * config.allowanceRate) / 100}
                <br />
                Pajak ({config.taxRate}%): Rp{" "}
                {Math.round(
                  (10000000 + (10000000 * config.allowanceRate) / 100) *
                    (config.taxRate / 100),
                )}
                <br />
                Potongan ({config.deductionRate}%): Rp{" "}
                {(10000000 * config.deductionRate) / 100}
                <br />
                <strong>
                  Gaji Bersih: Rp{" "}
                  {Math.round(
                    10000000 +
                      (10000000 * config.allowanceRate) / 100 -
                      (10000000 * config.deductionRate) / 100 -
                      ((10000000 + (10000000 * config.allowanceRate) / 100) *
                        config.taxRate) /
                        100,
                  )}
                </strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <Button
            type="reset"
            variant="outline"
            onClick={() => setConfig(configStorage.get())}
            disabled={isLoading}
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Catatan Penting</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>
              Perubahan pengaturan akan berlaku untuk penggajian periode
              berikutnya
            </li>
            <li>Persentase pajak akan dikenakan pada gaji kotor</li>
            <li>Data tersimpan di localStorage browser Anda</li>
            <li>
              Untuk integrasi database, silakan hubungi administrator sistem
            </li>
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}
