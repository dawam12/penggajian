"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  BarChart3,
  Users,
  DollarSign,
  FileText,
  Settings,
  Home,
  CalendarCheck2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/karyawan", label: "Data Karyawan", icon: Users },
  { href: "/absensi", label: "Absensi", icon: CalendarCheck2 },
  { href: "/penggajian", label: "Penggajian", icon: DollarSign },
  { href: "/slip-gaji", label: "Slip Gaji", icon: FileText },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const allowedItems = navItems.filter((item) => {
    if (user?.role === "employee") {
      return ["/", "/dashboard", "/absensi", "/slip-gaji"].includes(item.href);
    }
    return true;
  });

  return (
    <aside className="w-64 bg-gray-900 text-white shadow-lg overflow-y-auto hidden md:block">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
            PP
          </div>
          <div>
            <h1 className="font-bold text-lg">Payroll Pro</h1>
            <p className="text-xs text-gray-400">v1.0</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
