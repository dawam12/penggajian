# Sistem Penggajian Karyawan

Aplikasi web modern untuk mengelola penggajian karyawan dengan antarmuka yang intuitif, perhitungan gaji otomatis, dan fitur pelaporan lengkap.

## 🎯 Fitur Utama

### 1. **Dashboard**
- Overview statistik (total karyawan, penggajian bulan ini, pending approvals)
- Quick actions untuk navigasi cepat
- Recent activities dan riwayat penggajian terbaru
- Visualisasi data dengan cards informatif

### 2. **Data Karyawan (CRUD)**
- Daftar lengkap semua karyawan dengan pencarian dan filter
- Tambah karyawan baru dengan form tervalidasi
- Edit informasi karyawan
- Hapus data karyawan
- Export ke CSV dan XLSX
- Filter berdasarkan departemen

### 3. **Perhitungan Penggajian**
- Proses penggajian otomatis untuk semua karyawan aktif
- Perhitungan berdasarkan:
  - Gaji pokok
  - Tunjangan (persentase yang dapat dikonfigurasi)
  - Potongan (persentase yang dapat dikonfigurasi)
  - Pajak (persentase yang dapat dikonfigurasi)
- Status tracking: Draft → Approved → Paid
- Bulk processing per periode

### 4. **Slip Gaji**
- Lihat detail slip gaji per karyawan
- Rincian lengkap perhitungan gaji
- Cetak/Download slip
- History slip gaji untuk berbagai periode
- Filter berdasarkan status

### 5. **Laporan**
- Laporan penggajian dengan filter periode
- Ringkasan per departemen
- Statistik gaji kotor, pajak, dan gaji bersih
- Export laporan dalam format CSV dan XLSX
- Visualisasi data per departemen

### 6. **Pengaturan**
- Konfigurasi pajak, tunjangan, dan potongan
- Informasi perusahaan (nama, mata uang, bank)
- Preview perhitungan dengan contoh
- Simpan konfigurasi untuk perhitungan periode selanjutnya

## 🚀 Teknologi Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Zustand
- **Data Storage**: localStorage (MVP) - Siap untuk backend integration
- **Export**: PapaParse (CSV) + XLSX (Excel)
- **Validasi**: Zod
- **Date/Time**: date-fns
- **Icons**: Lucide React

## 📋 Struktur Folder

```
app/
├── (auth)/                      # Auth pages
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/                 # Main app
│   ├── dashboard/page.tsx
│   ├── karyawan/
│   │   ├── page.tsx
│   │   ├── [id]/edit/page.tsx
│   │   └── tambah/page.tsx
│   ├── penggajian/page.tsx
│   ├── slip-gaji/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── laporan/page.tsx
│   ├── settings/page.tsx
│   └── layout.tsx
├── layout.tsx
└── page.tsx

components/
├── auth/
├── karyawan/
├── common/
│   ├── sidebar.tsx
│   ├── header.tsx
├── ui/
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...

lib/
├── storage.ts              # localStorage utilities
├── calculations.ts         # Salary calculation logic
├── export.ts              # CSV/XLSX export
├── validations.ts         # Zod schemas
└── utils.ts

context/
├── auth-context.tsx       # Authentication context

hooks/
├── use-local-storage.ts   # Custom hooks

types/
└── index.ts              # Type definitions
```

## 🔐 Authentikasi

**Demo Credentials:**
- Email: `admin@payroll.com`
- Password: `password123`

Sistem menggunakan mock authentication dengan localStorage untuk MVP. Siap untuk integrasi dengan backend authentication (NextAuth, Auth0, etc).

## 💾 Penyimpanan Data

Data disimpan di **localStorage** dengan struktur JSON:
- `payroll_app:employees` - Data karyawan
- `payroll_app:payroll_records` - Riwayat penggajian
- `payroll_app:settings` - Konfigurasi sistem
- `payroll_app:users` - User accounts
- `payroll_app:current_user` - Session user

### Contoh Data Karyawan
```json
{
  "id": "emp_1234567890",
  "name": "Bambang Sutrisno",
  "email": "bambang@example.com",
  "phone": "08123456789",
  "department": "IT",
  "position": "Senior Developer",
  "salaryLevel": 5,
  "joinDate": "2022-01-15",
  "status": "active",
  "basicSalary": 15000000,
  "createdAt": "2024-07-14T..."
}
```

## 📊 Perhitungan Gaji

Rumus perhitungan gaji berdasarkan konfigurasi:

```
Tunjangan = Gaji Pokok × (Allowance Rate / 100)
Gaji Kotor = Gaji Pokok + Tunjangan
Pajak = Gaji Kotor × (Tax Rate / 100)
Potongan = Gaji Pokok × (Deduction Rate / 100)
Gaji Bersih = Gaji Kotor - Potongan - Pajak
```

### Contoh dengan Rate Default (15% tax, 20% allowance, 5% deduction):
```
Gaji Pokok: Rp 10.000.000
Tunjangan (20%): Rp 2.000.000
Gaji Kotor: Rp 12.000.000
Pajak (15%): Rp 1.800.000
Potongan (5%): Rp 500.000
Gaji Bersih: Rp 9.700.000
```

## 📈 Export Fitur

### CSV Export
- Daftar karyawan
- Laporan penggajian per periode
- Data brut untuk import ke sistem lain

### XLSX Export
- Format profesional dengan multiple sheets
- Ringkasan per departemen
- Formatted columns dan calculations
- Siap untuk presentasi

## 🔄 Migrasi ke Backend

Data structure sudah match dengan database schema, sehingga mudah untuk migrasi:

### Database Schema Ready
```sql
CREATE TABLE employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  salaryLevel INT,
  joinDate DATE,
  status VARCHAR(20),
  basicSalary BIGINT,
  createdAt TIMESTAMP
);

CREATE TABLE payroll_records (
  id VARCHAR(50) PRIMARY KEY,
  employeeId VARCHAR(50),
  period VARCHAR(7),
  basicSalary BIGINT,
  allowances BIGINT,
  deductions BIGINT,
  tax BIGINT,
  grossSalary BIGINT,
  netSalary BIGINT,
  status VARCHAR(20),
  createdAt TIMESTAMP
);
```

## 🚀 Getting Started

### Instalasi
```bash
# Clone project
git clone <repository>

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### Build untuk Production
```bash
pnpm build
pnpm start
```

## 📝 Penggunaan

### 1. Login
1. Akses halaman login
2. Masukkan email dan password demo
3. Klik tombol Login

### 2. Tambah Karyawan
1. Navigasi ke "Data Karyawan"
2. Klik tombol "Tambah Karyawan"
3. Isi semua informasi yang diperlukan
4. Klik "Tambah"

### 3. Proses Penggajian
1. Navigasi ke "Penggajian"
2. Pilih periode bulan (e.g., 2024-07)
3. Klik "Proses Penggajian"
4. Sistem akan membuat penggajian untuk semua karyawan aktif
5. Klik "Setujui" untuk setiap penggajian
6. Klik "Tandai Dibayarkan" setelah pembayaran dilakukan

### 4. Export Data
1. Di halaman Data Karyawan atau Penggajian
2. Klik tombol "CSV" atau "XLSX"
3. File akan otomatis diunduh

### 5. Konfigurasi Sistem
1. Navigasi ke "Pengaturan"
2. Ubah persentase pajak, tunjangan, potongan
3. Masukkan informasi perusahaan
4. Klik "Simpan Pengaturan"

## 🎨 Customization

### Mengubah Tema
Edit `app/globals.css` untuk mengubah warna dan tema:

```css
:root {
  --primary: oklch(...);
  --secondary: oklch(...);
  /* ... */
}
```

### Menambah Departemen atau Posisi
Edit di `components/karyawan/employee-form.tsx`:

```typescript
const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'YOUR_DEPT'];
```

## 🔒 Security Notes

- Data disimpan di localStorage browser (tidak secure untuk production)
- Gunakan HTTPS ketika deploy
- Implement proper authentication di backend
- Gunakan Row Level Security (RLS) di database
- Validate semua input di server-side
- Encrypt sensitive data

## 🚦 Status Penggajian

- **Draft**: Penggajian baru, belum disetujui
- **Approved**: Sudah disetujui oleh manager/HRD
- **Paid**: Sudah dibayarkan ke karyawan

## 📞 Support & Maintenance

Untuk integrasi dengan database backend atau fitur tambahan, silakan hubungi tim development.

## 📄 License

Proprietary - PT. Contoh Perusahaan

## 🎯 Roadmap

- [ ] Integration dengan payment gateway
- [ ] Mobile app (React Native)
- [ ] Advanced reporting dengan charts
- [ ] Email slip gaji otomatis
- [ ] QR code pada slip gaji
- [ ] Multi-currency support
- [ ] Attendance integration
- [ ] Leave management
- [ ] Performance review module
