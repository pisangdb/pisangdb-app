# PRD: PisangDB — Fresh Databases, Peels Away When Done 🍌

| Field         | Detail                                          |
| ------------- | ----------------------------------------------- |
| **Version**   | 1.0                                             |
| **Status**    | Final                                           |
| **Author**    | Kernix                                          |
| **Created**   | 12 Maret 2026                                   |
| **Teams**     | Satriyo @satrijo, Rizky @kidutpapuy, Trisna @trisna14 |
| **Tech Stack**| TanStack Start · PostgreSQL · MySQL · MariaDB · Docker · Gemini AI|

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Database Schema](#9-database-schema)
10. [API Design](#10-api-design)
11. [User Flow & Wireframes](#11-user-flow--wireframes)
12. [Security & Compliance](#12-security--compliance)
13. [Risk Assessment & Mitigasi](#13-risk-assessment--mitigasi)
14. [Timeline & Milestones](#14-timeline--milestones)
15. [Infrastructure & Resource Planning](#15-infrastructure--resource-planning)
16. [Future Roadmap (v2+)](#16-future-roadmap-v2)

---

## 1. Executive Summary

### Apa itu PisangDB?

**PisangDB** adalah SaaS *developer utility tool* yang memungkinkan developer membuat database sementara (*ephemeral*) secara instan — tanpa perlu install database engine apapun di mesin lokal.

User cukup:
1. **Pilih engine** — PostgreSQL, MySQL, atau MariaDB
2. **Pilih durasi** — 1 jam sampai 7 hari
3. **Klik "Buat Sandbox"**

Dalam hitungan detik, sistem akan membuatkan database beserta **credentials lengkap** (host, port, username, password, connection string) yang langsung bisa di-paste ke file `.env` project lokal. Setelah durasi habis, database dihapus otomatis — zero cleanup, zero maintenance.

### Filosofi — Kenapa "Pisang"? 🍌

Nama **PISANG** terinspirasi dari filosofi buah pisang — sebuah buah yang simple, accessible, dan tidak butuh alat untuk dikonsumsi:

| Buah Pisang | PisangDB |
|-------------|----------|
| 🍌 **Kupas** — Buka kulitnya | **Create** — Buat sandbox baru |
| 🍌 **Makan** — Nikmati isinya | **Use** — Pakai untuk development |
| 🍌 **Buang kulitnya** — Selesai, bersih | **Auto-cleanup** — Sistem hapus otomatis |

Seperti pisang yang tidak butuh pisau, piring, atau ritual apapun untuk dimakan — PisangDB tidak butuh instalasi, konfigurasi, atau maintenance apapun untuk dipakai.

### Core Flow

```
┌─────────┐     ┌───────────┐     ┌──────────────────────┐
│ Register│───▶│   Login   │───▶│     Dashboard        │
└─────────┘     └───────────┘     └──────────┬───────────┘
                                             │
                                   ┌─────────▼───────────┐
                                   │   Create Sandbox    │
                                   │   • Pilih Engine    │
                                   │   • Pilih Region    │
                                   │   • Pilih Durasi    │
                                   │   • (Opsional) AI   │
                                   └──────────┬──────────┘
                                              │
                              ┌───────────────▼────────────────┐
                              │  🎉 Sandbox Ready!             │
                              │  Host: id.pisangdb.com         │
                              │  Port: 5432                    │
                              │  User: sb_a1b2x8               │
                              │  Pass: ●●●●●●●●                │
                              │  DB:   pisang_a1b2_myapp_x8k2  │
                              │                                │
                              │  [📋 Copy Connection String]   │
                              └────────────────┬───────────────┘
                                               │
                              ┌─────────────────▼──────────────┐
                              │  Developer pakai di project:   │
                              │                                │
                              │  .env                          │
                              │  DATABASE_URL=postgresql://... │
                              │                                │
                              │  $ npx prisma migrate dev      │
                              │  $ npm run dev                 │
                              │  ✅ Connected!                 │
                              └─────────────────┬──────────────┘
                                                │
                                     (TTL habis / manual delete)
                                                │
                              ┌─────────────────▼──────────────┐
                              │  🧹 Auto-cleanup               │
                              │  Database + User dihapus       │
                              │  Zero effort dari developer    │
                              └────────────────────────────────┘
```

### Kenapa PisangDB Dibutuhkan?

Developer — baik profesional maupun pelajar — menghadapi **7 masalah utama** saat bekerja dengan database untuk development:

1. **Database pollution** — Database dev penuh "tabel zombie" yang lupa dihapus
2. **Tedious local setup** — Harus install, config, dan maintain engine di laptop
3. **Cross-engine pain** — Beda project beda engine, laptop jadi berat
4. **Migration risk** — Takut test migrasi di staging, tapi tidak ada tempat lain
5. **Collaboration friction** — Susah share database temporary untuk code review
6. **Learning barrier** — Pelajar stuck di instalasi, bukan belajar SQL
7. **Resource waste** — Engine DB yang selalu menyala makan RAM

PisangDB menyelesaikan **semua** masalah di atas dengan satu solusi: **database ephemeral instan yang multi-engine, terisolasi, dan auto-cleanup**.

### Apa yang Membuat PisangDB Berbeda?

| Feature | PisangDB | Install Lokal | Docker Manual | Cloud DB (Supabase, PlanetScale) |
|---------|----------|---------------|---------------|----------------------------------|
| Setup time | **< 2 detik** | 30 min - 2 jam | 5-10 menit | 1-5 menit |
| Install required | ❌ Tidak perlu | ✅ Wajib | ✅ Docker + compose | ❌ Tidak perlu |
| Multi-engine | ✅ PG + MySQL + MariaDB | ⚠️ Install satu-satu | ⚠️ Setup per engine | ❌ Biasanya 1 engine |
| Auto-cleanup | ✅ Otomatis sesuai TTL | ❌ Manual | ❌ Manual | ❌ Tidak ada |
| AI seed data | ✅ Natural language | ❌ Manual | ❌ Manual | ❌ Tidak ada |
| Biaya | 🆓 Free (MVP) | 🆓 Free | 🆓 Free | 💰 Bisa berbayar |
| Target user | Developer + Pelajar | Developer | Developer | Production apps |

### Fitur Utama (MVP)

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 🔐 | **Auth System** | Register/login dengan email & password |
| 🗄️ | **Multi-Engine Sandbox** | Buat database PostgreSQL, MySQL, atau MariaDB instan |
| 📋 | **Credentials Dashboard** | Copy-paste connection string, credentials, dan `.env` snippet |
| ⏰ | **Auto-Cleanup** | Database otomatis dihapus setelah TTL habis (1 jam - 7 hari) |
| 💻 | **SQL Console** | Jalankan query langsung dari browser dengan syntax highlighting |
| 🤖 | **AI SQL Seeder** | Generate schema + seed data dari prompt natural language (Gemini AI) |
| 🔒 | **Isolated Users** | Setiap sandbox punya dedicated DB user yang hanya bisa akses DB-nya |

### Value Proposition

| Tanpa PisangDB | Dengan PisangDB |
|---|---|
| Install PostgreSQL/MySQL di laptop → config → buat database → test → lupa hapus | Klik **"New Sandbox"** → pilih engine → langsung dapat endpoint → auto-cleanup |
| Setiap project beda engine, harus install semua | Pilih PostgreSQL / MySQL / MariaDB sesuai kebutuhan, tanpa install apapun |
| Database development penuh tabel percobaan | Selalu bersih, sandbox terisolasi per project |
| Takut coba migrasi baru di staging | Test migrasi dengan aman di sandbox |
| Buat data dummy manual | AI generate tabel + seed data dalam detik |
| Sharing database config ribet | Share credentials sandbox ke rekan tim |
| Laptop berat karena 3 DB engine jalan bersamaan | Semua engine di cloud, laptop ringan |

---

## 2. Problem Statement

### 2.1 Database Pollution — "Sampah Digital" yang Menumpuk

Developer sering mengotori database lokal/development dengan tabel-tabel percobaan, temporary columns, atau data dummy yang lupa dihapus. Seiring waktu, database menjadi berantakan:

- **Tabel zombie** — `users_backup`, `test_orders_v2`, `tmp_migration_check` yang tidak pernah dihapus
- **Data dummy tercampur** — Data test dari 3 bulan lalu masih nyangkut, bikin bingung saat debugging
- **Schema drift** — Kolom percobaan yang tidak pernah di-revert, menyebabkan perbedaan antara development dan production
- **Cognitive overload** — Developer baru join tim langsung bingung: *"Tabel mana yang production-ready, mana yang cuma percobaan?"*

> **Dampak**: Waktu terbuang untuk cleanup manual, risiko bug karena data test masuk production, onboarding developer baru jadi lambat.

### 2.2 Tedious Local Setup — Sebelum Coding, Harus Setup Dulu

Sebelum bisa menulis satu baris kode pun yang berkaitan dengan database, developer harus melewati ritual panjang:

1. **Install engine** — Download & install PostgreSQL/MySQL/MariaDB (beda OS, beda cara)
2. **Konfigurasi** — Set password root, buat user, atur permission
3. **Buat database** — `createdb` atau `CREATE DATABASE` manual
4. **Setup connection** — Tulis connection string di `.env`, tes koneksi
5. **Troubleshoot** — Port conflict, permission denied, service not running, versi tidak cocok

Proses ini bisa memakan **30 menit hingga 2 jam**, terutama untuk developer pemula atau ketika berpindah ke mesin baru. Dan ini harus diulang setiap kali butuh database baru untuk eksperimen.

> **Dampak**: Developer kehilangan momentum coding. Banyak ide eksperimen yang dibatalkan karena *"males setup database dulu"*.

### 2.3 Painful Cross-Engine Development — Multi-Project, Multi-Engine

Developer yang mengerjakan beberapa project sekaligus sering harus install dan maintain beberapa database engine secara bersamaan:

| Project | Engine | Port | Status |
|---------|--------|------|--------|
| Project A (Laravel) | MySQL 8 | 3306 | ✅ Running |
| Project B (NestJS) | PostgreSQL 15 | 5432 | ⚠️ Port conflict |
| Project C (Legacy) | MariaDB 10 | 3307 | ❌ Wrong version |

Setiap engine butuh instalasi, konfigurasi, dan manajemen terpisah. Port conflict, versi tidak cocok, dan memory usage yang membengkak karena 3 DB engine berjalan bersamaan adalah masalah sehari-hari.

> **Dampak**: Laptop developer jadi berat, boros resource, dan rawan conflict antar engine. Switching antar project jadi lambat.

### 2.4 Migration Risk — Takut Salah, Tapi Harus Coba

Menjalankan migrasi skema (ALTER TABLE, schema changes) langsung di database production/staging sangat berisiko:

- **Irreversible changes** — `DROP COLUMN` tidak bisa di-undo
- **Data loss potential** — Migrasi yang salah bisa menghapus data production
- **Downtime** — Lock table pada migrasi besar bisa menyebabkan aplikasi tidak responsif
- **No safe playground** — Developer sering tidak punya tempat untuk test migrasi pada data yang mendekati kondisi asli

Akibatnya, developer cenderung menunda migrasi atau langsung push ke staging tanpa testing yang memadai — keduanya sama-sama berisiko.

> **Dampak**: Bug di production karena migrasi yang belum di-test, rollback yang mahal, atau technical debt karena migrasi yang terus ditunda.

### 2.5 Collaboration Friction — Susah Berbagi Database

Ketika bekerja dalam tim, muncul berbagai friction terkait database sharing:

- **Code review** — Reviewer ingin test migration script dari PR, tapi malas setup database terpisah
- **Pair programming** — Dua developer butuh akses ke database yang sama untuk debugging
- **Bug reproduction** — *"Di local saya jalan kok"* — karena data dan skema berbeda-beda tiap mesin
- **Demo ke stakeholder** — Butuh database dengan data contoh yang siap pakai untuk presentasi

Solusi saat ini (share credentials database development) berbahaya karena satu orang bisa tidak sengaja menghapus data developer lain.

> **Dampak**: Proses code review lambat, debugging jadi finger-pointing, dan demo sering gagal karena data tidak siap.

### 2.6 Learning Barrier — Mau Belajar SQL Saja Susah

Pelajar dan bootcamp student menghadapi barrier yang tidak perlu sebelum bisa mulai belajar SQL:

- **Instalasi gagal** — Berbeda OS (Windows/Mac/Linux), berbeda masalah
- **Konfigurasi membingungkan** — *"Password root apa? Port berapa? Service-nya sudah running belum?"*
- **Takut merusak** — Takut tabel tugas terhapus saat bereksperimen
- **Tidak ada data contoh** — Database kosong tidak menarik untuk belajar query
- **Instruktur pakai engine berbeda** — Instruktur pakai PostgreSQL, student pakai MySQL, syntax berbeda

Banyak waktu belajar terbuang hanya untuk troubleshoot instalasi, bukan untuk belajar SQL itu sendiri.

> **Dampak**: Motivasi pelajar turun, waktu belajar terbuang untuk setup bukan belajar, dan banyak yang stuck di step 0.

### 2.7 Resource Waste — Database Engine Selalu Menyala

Database engine yang terinstall lokal **selalu berjalan di background**, mengonsumsi RAM dan CPU meski tidak sedang dipakai:

- PostgreSQL service: **~30-50MB RAM** idle
- MySQL service: **~150-300MB RAM** idle
- Jalankan ketiganya: **~500MB+ RAM** terbuang saat tidak coding

Untuk developer dengan laptop spesifikasi terbatas (8GB RAM), ini sangat terasa — terutama saat harus jalankan engine + IDE + browser + Docker sekaligus.

> **Dampak**: Laptop lemot, battery drain, developer terpaksa pilih salah satu engine dan tidak bisa cross-test.

---

### Problem Summary

| # | Problem | Siapa yang Terdampak | Severity |
|---|---------|---------------------|----------|
| P1 | Database pollution | Semua developer | 🟡 Medium |
| P2 | Tedious local setup | Developer pemula, pindah mesin | 🔴 High |
| P3 | Cross-engine pain | Multi-project developer | 🟡 Medium |
| P4 | Migration risk | Backend developer, DevOps | 🔴 High |
| P5 | Collaboration friction | Tim development | 🟡 Medium |
| P6 | Learning barrier | Pelajar, bootcamp student | 🔴 High |
| P7 | Resource waste | Developer laptop terbatas | 🟡 Medium |

**PisangDB menyelesaikan semua 7 problem di atas** dengan menyediakan database ephemeral multi-engine yang instan, terisolasi, dan auto-cleanup — tanpa instalasi, tanpa konfigurasi, tanpa maintenance.

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Menyediakan database ephemeral instan (multi-engine) | Database ready < 2 detik setelah request |
| G2 | Zero-setup untuk user | User tidak perlu install DB engine lokal |
| G3 | Zero-maintenance untuk user | 100% sandbox ter-cleanup otomatis sesuai TTL |
| G4 | AI-assisted database seeding | User bisa generate schema + seed data via prompt natural language |
| G5 | Developer-first UX | ≤ 3 klik dari login sampai mendapat credentials + endpoint |

### 3.2 Key Performance Indicators (KPIs)

| KPI | Target (MVP) | Target (3 Bulan) |
|-----|-------------|-------------------|
| Database creation time | < 2 detik | < 1 detik |
| Uptime | 95% | 99.5% |
| User satisfaction (NPS) | — | > 40 |
| Sandbox created per user/day | Avg 2 | Avg 5 |
| AI seeder usage rate | 30% of sessions | 60% of sessions |
| Multi-engine adoption | 60% PostgreSQL, 30% MySQL, 10% MariaDB | Balanced usage |

---

## 4. User Personas

### 4.1 Backend Developer — "Andi"
- **Peran**: Full-stack developer di startup
- **Pain Point**: Project-nya pakai PostgreSQL, tapi malas setup database baru setiap mulai fitur baru. Database dev-nya sudah penuh tabel percobaan.
- **Kebutuhan**: Buat database ephemeral instan, dapat endpoint, langsung pakai di `.env` project.
- **Frekuensi Penggunaan**: Harian

### 4.2 DevOps / System Admin — "Budi"
- **Peran**: DevOps engineer yang mengelola CI/CD pipeline
- **Pain Point**: Butuh database temporary untuk validasi migration script dan automation pipeline sebelum masuk staging.
- **Kebutuhan**: Database ephemeral yang bisa dibuat via API/CLI dan auto-destroy setelah pipeline selesai.
- **Frekuensi Penggunaan**: Beberapa kali per minggu

### 4.3 Bootcamp Student — "Citra"
- **Peran**: Peserta bootcamp intensif full-stack
- **Pain Point**: Kesulitan install PostgreSQL/MySQL di laptop. Pernah salah config sampai harus reinstall. Takut merusak database tugas saat bereksperimen.
- **Kebutuhan**: Cukup buka PisangDB, pilih engine yang diminta instruktur, langsung dapat endpoint untuk dipakai di project bootcamp. Plus bantuan AI untuk generate contoh data.
- **Frekuensi Penggunaan**: Harian selama masa bootcamp

### 4.4 Tech Lead / Reviewer — "Diana"
- **Peran**: Lead developer yang melakukan code review
- **Pain Point**: Ingin test migration script dari PR anggota tim tanpa mengotori environment pribadi.
- **Kebutuhan**: Spin up database cepat, jalankan migration, validasi, lalu buang.
- **Frekuensi Penggunaan**: Beberapa kali per minggu

---

## 5. User Stories

### Authentication
| ID | Story | Priority |
|----|-------|----------|
| US-01 | Sebagai user baru, saya ingin mendaftar akun agar bisa menggunakan PisangDB | **Must** |
| US-02 | Sebagai user, saya ingin login dengan email & password agar bisa mengakses dashboard | **Must** |
| US-03 | Sebagai user, saya ingin login dengan OAuth (Google) agar lebih cepat masuk | **Should** |

### Sandbox Management
| ID | Story | Priority |
|----|-------|----------|
| US-10 | Sebagai user, saya ingin membuat sandbox baru dengan memilih **database engine**, nama, dan durasi hidup | **Must** |
| US-11 | Sebagai user, saya ingin bisa memilih **PostgreSQL, MySQL, atau MariaDB** sebagai engine sandbox | **Must** |
| US-12 | Sebagai user, saya ingin melihat daftar semua sandbox aktif saya beserta engine, sisa TTL, dan credentials | **Must** |
| US-13 | Sebagai user, saya ingin menyalin **connection string / credentials** dengan satu klik untuk langsung dipakai di project lokal | **Must** |
| US-14 | Sebagai user, saya ingin memperpanjang durasi sandbox yang masih aktif | **Must** |
| US-15 | Sebagai user, saya ingin menghapus sandbox secara manual kapan saja | **Must** |
| US-16 | Sebagai user, saya ingin melihat detail sandbox (engine, status, host, port, credentials, created_at, expired_at, size) | **Must** |
| US-17 | Sebagai user, saya ingin mendapat notifikasi/warning ketika sandbox hampir expired | **Should** |

### SQL Console
| ID | Story | Priority |
|----|-------|----------|
| US-20 | Sebagai user, saya ingin menjalankan query SQL langsung dari dashboard tanpa tool eksternal | **Must** |
| US-21 | Sebagai user, saya ingin melihat hasil query dalam format tabel yang rapi | **Must** |
| US-22 | Sebagai user, saya ingin melihat history query yang pernah saya jalankan di sandbox | **Should** |

### AI Integration
| ID | Story | Priority |
|----|-------|----------|
| US-30 | Sebagai user, saya ingin mendeskripsikan skema yang diinginkan dan AI membuatkan SQL-nya (sesuai engine yang dipilih) | **Must** |
| US-31 | Sebagai user, saya ingin AI men-generate seed data berdasarkan skema yang sudah ada | **Must** |
| US-32 | Sebagai user, saya ingin melihat SQL yang di-generate AI sebelum mengeksekusinya | **Must** |
| US-33 | Sebagai user, saya ingin menyimpan prompt + response AI untuk referensi nanti | **Should** |

### Template (Fitur Tambahan)
| ID | Story | Priority |
|----|-------|----------|
| US-40 | Sebagai user, saya ingin memilih template database (e-commerce, blog, inventory) saat membuat sandbox | **Could** |
| US-41 | Sebagai user, saya ingin menyimpan skema sandbox saya sebagai template pribadi | **Could** |

---

## 6. Functional Requirements

### 6.1 User Authentication & Authorization

#### 6.1.1 Registration
- User mendaftar dengan **email** dan **password**
- Password di-hash menggunakan **bcrypt** (min cost factor 10)
- Email harus unik dan tervalidasi formatnya
- Setelah register, user langsung masuk ke dashboard (no email verification untuk MVP)

#### 6.1.2 Login
- Login dengan email + password
- Session management menggunakan **better-auth** (session-based, HTTP-only cookies)
- Token expiry: **7 hari** (auto-refresh)
- Rate limit: Max **5 failed attempts** per 15 menit per IP

#### 6.1.3 OAuth (Should Have)
- Login via **Google OAuth** untuk mempercepat onboarding developer
- Auto-create account jika belum terdaftar
- Aktif secara otomatis jika `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di-set di environment

#### 6.1.4 Authorization
- Setiap user hanya bisa mengakses sandbox miliknya sendiri
- Role-based access: `user` (default), `admin` (manage semua sandbox + system)
- Admin bisa melihat usage statistics dan mengelola semua sandbox

---

### 6.2 Sandbox Management (Core Feature)

#### 6.2.1 Create Sandbox
- **Input**: Database Engine, Region, Nama sandbox, Retention Time
- **Engine Options**: 🐘 PostgreSQL 16 | 🐬 MySQL 8 | 🦭 MariaDB 11
- **Region Options**: 🇮🇩 Indonesia (`id`) — default | 🇸🇬 Singapore (`sg`) — coming soon | 🇺🇸 US (`us`) — coming soon
- **Retention Time Options**: 1 jam, 6 jam, 12 jam, 24 jam, 3 hari, 7 hari
- **Process**:
  1. User memilih engine, region, nama, dan durasi
  2. System menentukan target Docker container berdasarkan engine
  3. System menentukan host berdasarkan region (`{region}.pisangdb.com`)
  4. Generate unique database name: `pisang_{user_short_id}_{sandbox_name}_{random_suffix}`
  5. Generate unique database username: `sb_{random_8_char}`
  6. Generate random password (32 char, cryptographic random)
  7. Connect ke container engine yang dipilih **sebagai admin**
  8. **CREATE DATABASE** pada container tersebut
  9. **CREATE USER** — buat akun database baru khusus untuk sandbox ini
  10. **GRANT** — berikan user tersebut akses **hanya** ke database sandbox-nya, tidak ke database lain
  11. **REVOKE** — pastikan user tidak punya akses superuser/root, tidak bisa create database lain
  12. Generate credentials (host, port, username, password, database name)
  13. Simpan metadata ke tabel `sandboxes` (termasuk `db_user` dan `db_password` ter-encrypt)
- **Output (Credentials Panel)**:
  ```
  Engine:     PostgreSQL 16
  Region:     🇮🇩 Indonesia (id)
  Host:       id.pisangdb.com
  Port:       5432
  Database:   pisang_a1b2_myapp_x8k2m9
  Username:   sb_a1b2x8
  Password:   ●●●●●●●● [reveal] [copy]
  
  Connection String:
  postgresql://sb_a1b2x8:***@id.pisangdb.com:5432/pisang_a1b2_myapp_x8k2m9 [copy]
  
  Expires: 6 jam lagi (18:00 WIB)
  ```
- **Connection String Formats** (per engine):
  - PostgreSQL: `postgresql://user:pass@{region}.pisangdb.com:5432/dbname`
  - MySQL: `mysql://user:pass@{region}.pisangdb.com:3306/dbname`
  - MariaDB: `mysql://user:pass@{region}.pisangdb.com:3307/dbname`
  - Region subdomain menunjukkan lokasi server (e.g., `id` = Indonesia, `sg` = Singapore)
- **Constraints**:
  - Max **5 sandbox aktif** per user (free tier, across all engines)
  - Database creation harus selesai dalam **< 2 detik**
  - Max database size: **100MB** per sandbox

#### 6.2.2 List Sandboxes
- Tampilkan semua sandbox milik user yang sedang login
- Informasi per sandbox:
  - **Engine icon + label** (🐘 PostgreSQL / 🐬 MySQL / 🦭 MariaDB)
  - **Region** (🇮🇩 Indonesia / 🇸🇬 Singapore / 🇺🇸 US)
  - Nama & status (`active`, `expired`, `destroying`)
  - Sisa waktu hidup (TTL) dalam format human-readable (contoh: "2 jam 15 menit lagi")
  - Connection string + credentials (masked, klik untuk reveal + copy)
  - Host & port
  - Ukuran database saat ini
  - Tanggal dibuat
- **Sorting**: Default by `created_at` DESC
- **Polling/SSE**: Status ter-update secara real-time setiap 30 detik via TanStack Query

#### 6.2.3 Sandbox Detail
- Tampilkan informasi lengkap sandbox:
  - Semua info dari list view
  - **Quick Setup Guide** — Snippet `.env` yang tinggal di-copy:
    ```env
    DATABASE_URL=postgresql://sb_a1b2x8:***@id.pisangdb.com:5432/pisang_a1b2_myapp_x8k2m9
    ```
  - **ORM Config Examples** — Contoh konfigurasi untuk Drizzle, Prisma, Sequelize (sesuai engine)
  - Daftar tabel yang ada di dalam sandbox
  - Jumlah row per tabel
  - Embedded SQL Console
  - AI Seeder panel
  - History query yang pernah dijalankan

#### 6.2.4 Extend Sandbox
- User bisa menambah durasi sandbox yang statusnya masih `active`
- Opsi perpanjangan: +1 jam, +6 jam, +12 jam, +24 jam
- Max total lifetime: **7 hari** dari tanggal pembuatan
- Update `expired_at` di database

#### 6.2.5 Delete Sandbox
- User bisa menghapus sandbox kapan saja
- **Confirmation dialog** sebelum delete (destructive action)
- **Process**:
  1. Set status → `destroying`
  2. Connect ke container engine yang sesuai **sebagai admin**
  3. Terminate semua active connections milik `db_user` sandbox
  4. Execute `DROP DATABASE IF EXISTS {db_name}`
  5. Execute `DROP USER IF EXISTS {db_user}` — hapus akun database-nya
  6. Set status → `expired`
  7. Hapus / soft-delete metadata dari tabel `sandboxes`
- Sandbox yang di-delete tidak bisa di-recover

---

### 6.3 Ephemeral Engine (Background Worker)

#### 6.3.1 Auto-Destruct Mechanism
- **Scheduler** berjalan setiap **30 detik** (configurable)
- Query: `SELECT * FROM sandboxes WHERE expired_at <= NOW() AND status = 'active'`
- Untuk setiap sandbox yang expired:
  1. Set status → `destroying`
  2. Tentukan target engine container berdasarkan kolom `engine`
  3. Connect ke container engine **sebagai admin**
  4. Terminate semua active connections milik `db_user` sandbox
  5. Execute `DROP DATABASE IF EXISTS {db_name}` pada container yang sesuai
  6. Execute `DROP USER IF EXISTS {db_user}` — hapus akun database sandbox
  7. Set status → `expired`
  8. Log cleanup event

#### 6.3.2 Database Name Isolation
- Format: `pisang_{short_id}_{name}_{6_char_random}`
- Contoh: `pisang_a1b2_mytest_x8k2m9`
- Validasi uniqueness sebelum create
- Retry dengan random suffix baru jika collision terjadi (max 3 retries)

#### 6.3.3 Health Check
- Worker memiliki heartbeat yang tercatat di tabel `system_health`
- Jika worker tidak heartbeat > 2 menit, kirim alert (log level: CRITICAL)
- Endpoint `/api/health` untuk monitoring external

---

### 6.4 SQL Console (Built-in Query Editor)

#### 6.4.1 Query Execution
- Text editor dengan **syntax highlighting** untuk SQL (menggunakan CodeMirror atau Monaco)
- Tombol **"Run"** atau shortcut `Ctrl+Enter` untuk eksekusi query
- Support multi-statement execution (dipisah titik koma)
- Hasil ditampilkan dalam **tabel interaktif** yang bisa di-sort per kolom
- Tampilkan execution time dan jumlah rows affected

#### 6.4.2 Safety Guards
- **Read timeout**: Query di-kill otomatis setelah **30 detik**
- **Blocked commands**: `DROP DATABASE`, `ALTER SYSTEM`, dan perintah superuser lainnya
- Sandbox user hanya memiliki permission: `CREATE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `REFERENCES`, `TRIGGER` pada database-nya sendiri

#### 6.4.3 Query History
- Simpan 50 query terakhir per sandbox
- Tampilkan timestamp, query, status (success/error), dan execution time
- Klik untuk re-run query dari history

---

### 6.5 AI SQL Seeder (Gemini AI Integration)

#### 6.5.1 Schema Generation
- User mengetik prompt natural language, contoh:
  - *"Buatkan tabel users, products, dan orders untuk e-commerce"*
  - *"Buat skema blog dengan tabel posts, comments, dan tags"*
- AI men-generate DDL (CREATE TABLE statements) yang valid sesuai engine sandbox (PostgreSQL/MySQL/MariaDB)
- Tampilkan **preview SQL** sebelum eksekusi
- User bisa **edit** SQL result sebelum menjalankan

#### 6.5.2 Data Seeding
- User bisa request seed data, contoh:
  - *"Isi tabel users dengan 20 data karyawan Indonesia"*
  - *"Generate 50 produk elektronik dengan harga realistis"*
- AI men-generate INSERT statements
- Eksekusi batch insert dengan transaction safety

#### 6.5.3 Query Helper
- User bisa tanya AI untuk membantu menulis query:
  - *"Bagaimana cara JOIN tabel orders dengan users?"*
  - *"Buatkan query untuk mencari top 5 produk terlaris"*
- AI men-generate query yang bisa langsung dijalankan di SQL Console

#### 6.5.4 AI Guardrails
- System prompt yang membatasi AI hanya menghasilkan SQL yang valid sesuai engine sandbox (PostgreSQL/MySQL/MariaDB syntax)
- Reject prompt yang mengandung instruksi berbahaya (prompt injection protection)
- Rate limit: Max **30 AI requests per user per hari** (free tier)
- Log setiap prompt dan response ke tabel `ai_logs`

---

### 6.6 Database Templates (Nice to Have)

#### 6.6.1 Built-in Templates
- Saat membuat sandbox, user bisa memilih template:
  - **Blank** — Database kosong (default)
  - **E-commerce** — users, products, categories, orders, order_items
  - **Blog** — users, posts, comments, tags, post_tags
  - **Inventory** — warehouses, products, stock_movements
  - **HR** — employees, departments, positions, attendance
- Template berisi DDL + sample data (10-20 rows per tabel)

---

## 7. Non-Functional Requirements

### 7.1 Performance
| Metric | Target |
|--------|--------|
| Sandbox creation | < 2 detik |
| SQL query response (simple) | < 500ms |
| AI response (schema/seed) | < 10 detik |
| Dashboard initial load | < 3 detik |
| API response (general) | < 300ms |

### 7.2 Scalability
- Arsitektur mendukung **horizontal scaling** pada application layer
- PostgreSQL connection pooling untuk mengelola koneksi sandbox
- MySQL/MariaDB connection pooling (mysql2 library)
- Target: Support hingga **100 sandbox aktif** secara bersamaan (MVP, across all engines)

### 7.3 Reliability
- **Uptime target**: 99.5%
- Graceful degradation: Jika AI service down, fitur lain tetap berjalan
- Auto-destruct worker harus **idempotent** — safe untuk di-retry
- Database backup untuk tabel metadata aplikasi (bukan sandbox)

### 7.4 Usability
- Dashboard responsif (desktop-first, mobile-friendly)
- **Click-to-copy** pada semua connection string
- TTL ditampilkan sebagai countdown yang ter-update real-time
- Toast notification untuk setiap aksi penting (create, delete, extend)
- Color-coded status badges: 🟢 active, 🟡 expiring soon (< 30 menit), 🔴 expired

### 7.5 Monitoring & Observability
- Structured logging (JSON format) untuk semua operasi penting
- Request logging dengan correlation ID
- Metrics: sandbox create/delete count, AI usage, error rate
- Health check endpoint: `GET /api/health`

---

## 8. Technical Architecture

### 8.1 Tech Stack Detail

| Layer | Technology | Justifikasi |
|-------|-----------|-------------|
| **Framework** | TanStack Start | Full-stack SSR, type-safe, modern React meta-framework |
| **Language** | TypeScript | Type-safety end-to-end, DX terbaik |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, konsisten, accessible |
| **State Management** | TanStack Query | Cache management, real-time polling, optimistic updates |
| **Database (App)** | PostgreSQL 16+ | Robust, battle-tested RDBMS untuk data aplikasi |
| **Database (Sandbox)** | PostgreSQL 16 + MySQL 8 + MariaDB 11 | Multi-engine support via Docker containers |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great DX with PostgreSQL |
| **Database Driver** | pg + mysql2 | Native drivers untuk PostgreSQL dan MySQL/MariaDB |
| **Auth** | better-auth | Session-based auth, email/password + Google OAuth |
| **AI** | TBD (Gemini / OpenRouter) | Belum final — keduanya dipertimbangkan |
| **SQL Editor** | CodeMirror 6 | Extensible, modern, great SQL support |
| **Deployment** | Docker + Docker Compose | Konsisten environment, easy deployment |
| **CI/CD** | GitHub Actions | Automasi build, test, deploy ke VPS |
| **Reverse Proxy** | Caddy / Nginx | HTTPS otomatis, load balancing |

### 8.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │Dashboard│  │SQL Console│  │AI Seeder  │  │Auth Pages  │  │
│  └────┬────┘  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  │
└───────┼─────────────┼──────────────┼──────────────┼─────────┘
        │             │              │              │
        ▼             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TanStack Start (SSR)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Server Functions                     ││
│  │  ┌──────────┐ ┌───────────┐ ┌────────┐ ┌────────────┐   ││
│  │  │Auth API  │ │Sandbox API│ │SQL API │ │AI API      │   ││
│  │  └──────────┘ └───────────┘ └────────┘ └────────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Middleware Layer                     ││
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐    ││
│  │  │Auth Guard│ │Rate Limiter│ │Request Validation   │    ││
│  │  └──────────┘ └───────────┘ └──────────────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Engine Router                        ││
│  │  Routes sandbox operations to the correct DB container  ││
│  └─────────────────────────────────────────────────────────┘│
└──────┬───────────┬────────────┬────────┬────────────────────┘
       │           │            │        │
       ▼           ▼            ▼        ▼
┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ PostgreSQL │ │ MySQL    │ │ MariaDB  │ │ Gemini AI API    │
│ (App DB +  │ │ (Sandbox)│ │ (Sandbox)│ │ (External)       │
│  Sandbox)  │ │          │ │          │ └──────────────────┘
│ • users    │ │          │ │          │
│ • sandboxes│ │          │ │          │ ┌──────────────────┐
│ • ai_logs  │ │          │ │          │ │ Ephemeral Engine │
│ • templates│ │          │ │          │ │ (Background)     │
└──────┬─────┘ └────┬─────┘ └────┬─────┘ │ • Scheduler      │
       │           │            │        │ • Multi-engine   │
       │           │            │        │   cleanup        │
       ▼           ▼            ▼        └─────────┬────────┘
┌──────────────────────────────────────────────────┘────────┐
│              Sandbox Databases (User-facing)              │
│                                                           │
│  🐘 PostgreSQL Container (:5432)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │sandbox_1 │ │sandbox_2 │ │sandbox_n │  ...              │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                           │
│  🐬 MySQL Container (:3306)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │sandbox_3 │ │sandbox_4 │ │sandbox_n │  ...              │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                           │
│  🦭 MariaDB Container (:3307)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │sandbox_5 │ │sandbox_6 │ │sandbox_n │  ...              │
│  └──────────┘ └──────────┘ └──────────┘                   │
└───────────────────────────────────────────────────────────┘
```

> **Developer connects from local machine:**
> ```
> # .env di project lokal user
> DATABASE_URL=postgresql://sb_a1b2x8:pass@id.pisangdb.com:5432/pisang_a1b2_myapp_x8k2m9
> # atau
> DATABASE_URL=mysql://sb_c3d4y9:pass@id.pisangdb.com:3306/pisang_c3d4_myapp_z7j1n3
> ```

### 8.3 Subdomain Strategy (Location-Based)

PisangDB menggunakan **location-based subdomain** sebagai host untuk koneksi database, dengan kolom `region` di tabel `sandboxes` untuk tracking:

```
{region}.pisangdb.com
```

| Subdomain | Region Code | Lokasi | Keterangan |
|-----------|-------------|--------|------------|
| `id.pisangdb.com` | `id` | Indonesia (Jakarta) | **Default MVP** — server utama |
| `sg.pisangdb.com` | `sg` | Singapore | Future expansion (v2+) |
| `us.pisangdb.com` | `us` | United States | Future expansion (v2+) |
| `eu.pisangdb.com` | `eu` | Europe | Future expansion (v2+) |

Kolom `region` pada tabel `sandboxes` menyimpan region code (`id`, `sg`, `us`, `eu`). System menentukan `host` dari region: `host = "{region}.pisangdb.com"`. Pada MVP hanya `id` yang available, region lain ditampilkan sebagai "coming soon" di UI.

**Kenapa location-based, bukan `db.pisangdb.com`?**
1. **No redundancy** — `db.pisangdb.com` mengulang "db" dari PisangDB, terasa awkward
2. **Multi-region ready** — Subdomain langsung menunjukkan lokasi server, user bisa pilih region terdekat
3. **Latency transparency** — Developer tahu persis dimana database mereka berada
4. **Scalable** — Menambah region baru = menambah subdomain + deploy server baru

**DNS Setup (MVP):**
```
id.pisangdb.com  →  A record  →  IP VPS Indonesia
```

**DNS Setup (Future multi-region):**
```
id.pisangdb.com  →  A record  →  IP VPS Jakarta
sg.pisangdb.com  →  A record  →  IP VPS Singapore
*.pisangdb.com   →  CNAME     →  fallback ke id.pisangdb.com
```

Caddy reverse proxy hanya perlu meng-handle satu subdomain per server. Setiap region adalah deployment independen dengan Docker Compose-nya sendiri.

### 8.4 Deployment Architecture (Docker Compose)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [postgres, mysql, mariadb]
    environment:
      DATABASE_URL: postgresql://pisang:***@postgres:5432/pisangdb
      POSTGRES_SANDBOX_URL: postgresql://pisang:***@postgres:5432/postgres
      MYSQL_SANDBOX_URL: mysql://root:***@mysql:3306
      MARIADB_SANDBOX_URL: mysql://root:***@mariadb:3307
      # AI_API_KEY: ${AI_API_KEY}  # TBD: Gemini atau OpenRouter
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}

  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: pisangdb
      POSTGRES_USER: pisang
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    ports: ["5432:5432"]

  mysql:
    image: mysql:8-oracle
    volumes: [mysqldata:/var/lib/mysql]
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    ports: ["3306:3306"]
    command: --default-authentication-plugin=mysql_native_password

  mariadb:
    image: mariadb:11
    volumes: [mariadbdata:/var/lib/mysql]
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
    ports: ["3307:3306"]

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile]

volumes:
  pgdata:
  mysqldata:
  mariadbdata:
```

### 8.5 Background Worker Design

Ephemeral Engine berjalan sebagai **in-process scheduler** di dalam aplikasi TanStack Start (bukan sebagai service terpisah untuk simplicity pada MVP).

Worker harus mengelola cleanup **multi-engine** — routing DROP command ke container yang benar berdasarkan kolom `engine`:

```
┌────────────────────────────────────────────────────────┐
│         Ephemeral Engine (Multi-Engine)                │
│                                                        │
│  ┌───────────────┐                                     │
│  │  Scheduler    │ ◄── Runs every 30s                  │
│  │  (setInterval)│                                     │
│  └──────┬────────┘                                     │
│         │                                              │
│         ▼                                              │
│  ┌───────────────────┐                                 │
│  │ Query expired     │                                 │
│  │ sandboxes         │                                 │
│  └──────┬────────────┘                                 │
│         │                                              │
│         ├─── engine = 'postgresql' ──▶ pg.query()     │
│         ├─── engine = 'mysql'      ──▶ mysql.query()  │
│         └─── engine = 'mariadb'    ──▶ maria.query()  │
│                                                        │
│  For each expired sandbox:                             │
│  1. Set status → destroying                            │
│  2. Connect to engine container as admin               │
│  3. Kill active connections (engine-specific)          │
│  4. DROP DATABASE IF EXISTS {db_name}                  │
│  5. DROP USER IF EXISTS {db_user}                      │
│  6. Set status → expired                               │
│  7. Log cleanup event                                  │
└────────────────────────────────────────────────────────┘
```

---

## 9. Database Schema

### 9.1 Entity Relationship Diagram

```
┌──────────────┐       ┌────────────────────┐       ┌──────────────────┐
│    users     │       │     sandboxes      │       │     ai_logs      │
├──────────────┤       ├────────────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)            │──┐    │ id (PK)          │
│ email        │  │    │ user_id (FK)       │  │    │ sandbox_id (FK)  │
│ name         │  └──▶│ engine             │  └──▶│ user_id (FK)     │
│ email_verified│      │ region             │       │ prompt           │
│ image        │       │ db_name            │       │ response         │
│ role         │       │ db_user            │       │ sql_generated    │
│ created_at   │       │ db_password        │       │ executed         │
│ updated_at   │       │ connection_url     │       │ created_at       │
└──────────────┘       │ host               │       └──────────────────┘
       │               │ port               │
       │  (better-auth)│ display_name       │
       ▼               │ status             │
┌──────────────┐       │ template_id (FK)   │       ┌──────────────────┐
│   sessions   │       │ max_size_mb        │       │   templates      │
├──────────────┤       │ created_at         │       ├──────────────────┤
│ id (PK)      │       │ expired_at         │       │ id (PK)          │
│ user_id (FK) │       │ updated_at         │       │ name             │
│ token        │       └────────────────────┘       │ description      │
│ expires_at   │                                    │ engine           │
│ ...          │       ┌────────────────────┐       │ ddl_sql          │
└──────────────┘       │   query_history    │       │ seed_sql         │
                       ├────────────────────┤       │ is_builtin       │
┌──────────────┐       │ id (PK)            │       │ user_id (FK)     │
│   accounts   │       │ sandbox_id (FK)    │       │ created_at       │
├──────────────┤       │ query              │       └──────────────────┘
│ id (PK)      │       │ status             │
│ user_id (FK) │       │ execution_time_ms  │
│ provider     │       │ rows_affected      │
│ password     │       │ error_message      │
│ ...          │       │ created_at         │
└──────────────┘       └────────────────────┘

┌──────────────────┐
│  verifications   │
├──────────────────┤
│ id (PK)          │
│ identifier       │
│ value            │
│ expires_at       │
│ created_at       │
└──────────────────┘
```

### 9.2 Table Definitions

#### `users`
> Dikelola oleh **better-auth**. Kolom `password` disimpan di tabel `accounts`, bukan di sini.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `TEXT` | PK (better-auth managed) | Unique identifier |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Email login |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `email_verified` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Email verification status |
| `image` | `TEXT` | NULLABLE | Profile picture URL |
| `role` | `VARCHAR(20)` | NOT NULL, DEFAULT 'user' | `user` \| `admin` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Registration time |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Last update |

#### `sandboxes`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | `TEXT` | FK → users.id, NOT NULL | Owner |
| `engine` | `VARCHAR(20)` | NOT NULL | `postgresql` \| `mysql` \| `mariadb` |
| `region` | `VARCHAR(10)` | NOT NULL, DEFAULT 'id' | Region code: `id` \| `sg` \| `us` \| `eu` |
| `db_name` | `VARCHAR(63)` | UNIQUE, NOT NULL | Database name pada engine container |
| `db_user` | `VARCHAR(63)` | NOT NULL | Dedicated database user |
| `db_password` | `VARCHAR(255)` | NOT NULL | Encrypted password for db_user |
| `connection_url` | `TEXT` | NOT NULL | Full connection string |
| `host` | `VARCHAR(255)` | NOT NULL | Database host (e.g., id.pisangdb.com) |
| `port` | `INTEGER` | NOT NULL | Database port (5432/3306/3307) |
| `display_name` | `VARCHAR(50)` | NOT NULL | Human-readable name |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'active' | `active` \| `destroying` \| `expired` |
| `template_id` | `UUID` | FK → templates.id, NULLABLE | Template yang digunakan |
| `max_size_mb` | `INTEGER` | NOT NULL, DEFAULT 100 | Max database size in MB |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Creation time |
| `expired_at` | `TIMESTAMPTZ` | NOT NULL | Auto-destruct time |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- `idx_sandboxes_user_id` ON `user_id`
- `idx_sandboxes_engine` ON `engine`
- `idx_sandboxes_region` ON `region`
- `idx_sandboxes_status_expired` ON `(status, expired_at)` — untuk query ephemeral engine
- `idx_sandboxes_db_name` ON `db_name` (UNIQUE)

#### `ai_logs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `sandbox_id` | `UUID` | FK → sandboxes.id, NOT NULL | Target sandbox |
| `user_id` | `TEXT` | FK → users.id, NOT NULL | Requesting user |
| `prompt` | `TEXT` | NOT NULL | User's natural language prompt |
| `response` | `TEXT` | NOT NULL | Full AI response |
| `sql_generated` | `TEXT` | NULLABLE | Extracted SQL from response |
| `executed` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Whether SQL was executed |
| `tokens_used` | `INTEGER` | NULLABLE | Token usage for cost tracking |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Request time |

#### `query_history`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `sandbox_id` | `UUID` | FK → sandboxes.id, NOT NULL | Target sandbox |
| `query` | `TEXT` | NOT NULL | SQL query executed |
| `status` | `VARCHAR(20)` | NOT NULL | `success` \| `error` |
| `execution_time_ms` | `INTEGER` | NULLABLE | Query duration |
| `rows_affected` | `INTEGER` | NULLABLE | Number of affected rows |
| `error_message` | `TEXT` | NULLABLE | Error detail if failed |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Execution time |

#### `templates`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | `VARCHAR(50)` | NOT NULL | Template name |
| `description` | `TEXT` | NULLABLE | What this template includes |
| `engine` | `VARCHAR(20)` | NOT NULL | `postgresql` \| `mysql` \| `mariadb` \| `all` |
| `ddl_sql` | `TEXT` | NOT NULL | CREATE TABLE statements |
| `seed_sql` | `TEXT` | NULLABLE | INSERT statements for sample data |
| `is_builtin` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | System template vs user-created |
| `user_id` | `TEXT` | FK → users.id, NULLABLE | NULL for built-in templates |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Creation time |

---

## 10. API Design

### 10.1 Authentication Endpoints

Auth dihandle sepenuhnya oleh **better-auth** melalui catch-all route `/api/auth/*` (`src/routes/api/auth/$.ts`). Endpoint internal yang digunakan better-auth antara lain:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/sign-in/email` | Login dengan email & password | No |
| `POST` | `/api/auth/sign-up/email` | Register user baru | No |
| `POST` | `/api/auth/sign-out` | Hapus session | Yes |
| `GET` | `/api/auth/get-session` | Get current session & user | Yes |
| `GET` | `/api/auth/sign-in/google` | Initiate Google OAuth | No |
| `GET` | `/api/auth/callback/google` | Handle Google OAuth callback | No |

### 10.2 Sandbox Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sandboxes` | Create sandbox baru | Yes |
| `GET` | `/api/sandboxes` | List semua sandbox user | Yes |
| `GET` | `/api/sandboxes/:id` | Get detail sandbox | Yes |
| `PATCH` | `/api/sandboxes/:id/extend` | Perpanjang durasi | Yes |
| `DELETE` | `/api/sandboxes/:id` | Hapus sandbox | Yes |
| `GET` | `/api/sandboxes/:id/tables` | List tabel di sandbox | Yes |

### 10.3 SQL Console Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sandboxes/:id/query` | Execute SQL query | Yes |
| `GET` | `/api/sandboxes/:id/history` | Get query history | Yes |

### 10.4 AI Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sandboxes/:id/ai/generate` | Generate SQL dari prompt | Yes |
| `POST` | `/api/sandboxes/:id/ai/execute` | Execute AI-generated SQL | Yes |
| `GET` | `/api/sandboxes/:id/ai/logs` | Get AI interaction logs | Yes |

### 10.5 Template Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/templates` | List available templates | Yes |
| `POST` | `/api/templates` | Save sandbox as template | Yes |

### 10.6 System Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Health check | No |

### 10.7 Request/Response Examples

#### Create Sandbox

**Request:**
```json
POST /api/sandboxes
{
  "name": "test-migration",
  "engine": "postgresql",
  "region": "id",
  "retention_hours": 6,
  "template_id": null
}
```

**Response (201):**
```json
{
  "id": "a1b2c3d4-...",
  "display_name": "test-migration",
  "engine": "postgresql",
  "region": "id",
  "db_name": "pisang_x1y2_test-migration_k8m2n4",
  "host": "id.pisangdb.com",
  "port": 5432,
  "db_user": "sb_x1y2k8",
  "db_password": "••••••••",
  "connection_url": "postgresql://sb_x1y2k8:***@id.pisangdb.com:5432/pisang_x1y2_test-migration_k8m2n4",
  "status": "active",
  "created_at": "2026-03-11T10:00:00Z",
  "expired_at": "2026-03-11T16:00:00Z",
  "max_size_mb": 100
}
```

#### Execute AI Generate

**Request:**
```json
POST /api/sandboxes/:id/ai/generate
{
  "prompt": "Buatkan tabel users dan products untuk e-commerce sederhana, isi dengan 10 data dummy"
}
```

**Response (200):**
```json
{
  "id": "log-uuid-...",
  "sql": "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  ...\n);\n\nINSERT INTO users ...",
  "explanation": "Saya membuat 2 tabel: users (id, name, email, created_at) dan products (id, name, price, stock, user_id). Lalu mengisi masing-masing dengan 10 data dummy.",
  "tokens_used": 450
}
```

---

## 11. User Flow & Wireframes

### 11.1 Core User Flow

```
User mendaftar / login
        │
        ▼
┌────────────────────────────┐
│       DASHBOARD            │
│  "Kamu belum punya sandbox"│
│       [+ New Sandbox]      │
└───────────┬────────────────┘
            │
            ▼
┌────────────────────────────┐
│    CREATE SANDBOX MODAL    │
│                            │
│  1. Pilih Engine:          │
│     🐘 PostgreSQL          │
│     🐬 MySQL               │
│     🦭 MariaDB             │
│                            │
│  2. Pilih Region:          │
│     🇮🇩 Indonesia (default) │
│     🇸🇬 Singapore (soon)    │
│     🇺🇸 US (soon)           │
│                            │
│  3. Nama: [my-project-db]  │
│  4. Durasi: [6 jam ▾]      │
│  5. Template: [Blank ▾]    │
│                            │
│     [Buat Sandbox 🍌]      │
└───────────┬────────────────┘
            │  (System provisions database
            │   di container yang sesuai)
            ▼
┌────────────────────────────────────────┐
│      SANDBOX CREATED! 🎉               │
│                                        │
│  Engine:   🐘 PostgreSQL 16            │
│  Region:   🇮🇩 Indonesia                │
│  Host:     id.pisangdb.com             │
│  Port:     5432                        │
│  Database: pisang_a1b2_myproject_x8k2  │
│  Username: sb_a1b2x8                   │
│  Password: ●●●●●●●● [👁] [📋 Copy]     │
│                                        │
│  Connection String:                    │
│  postgresql://sb_a1b2x8:***@id....     │
│  [📋 Copy Connection String]           │
│                                        │
│  Quick Setup (.env):                   │
│  DATABASE_URL=postgresql://sb_a1b...   │
│  [📋 Copy .env]                        │
│                                        │
│  ⏱ Expires in: 5h 59m                 │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│  User pastes credentials ke project    │
│  lokal mereka:                         │
│                                        │
│  // .env                               │
│  DATABASE_URL=postgresql://sb_a1b2...  │
│                                        │
│  // prisma/schema.prisma               │
│  datasource db {                       │
│    provider = "postgresql"             │
│    url      = env("DATABASE_URL")      │
│  }                                     │
│                                        │
│  $ npx prisma migrate dev              │
│  $ npm run dev                         │
│  ✅ Connected to PisangDB sandbox!     │
└───────────┬────────────────────────────┘
            │
            ▼  (Setelah TTL habis)
┌────────────────────────────────────────┐
│  🧹 Auto-cleanup by Ephemeral Engin e  │
│  Database dihapus otomatis.            │
│  User bisa buat sandbox baru kapanpun. │
└────────────────────────────────────────┘
```

### 11.2 Key UI Components

#### Dashboard
- **Header**: Logo PisangDB 🍌, user avatar, logout button
- **Stats Bar**: Jumlah sandbox aktif, total sandbox dibuat, sisa quota
- **Sandbox Cards Grid**: Card untuk setiap sandbox aktif
  - Nama sandbox
  - Status badge (color-coded)
  - TTL countdown (real-time)
  - Quick actions: Copy URL, Extend, Delete
- **"+ New Sandbox" Card**: CTA untuk membuat sandbox baru

#### Sandbox Detail Page
- **Info Section**: Connection string (click-to-copy), status, TTL, size, created date
- **Tab Navigation**:
  - **SQL Console** — Query editor + result table
  - **AI Seeder** — Prompt input + generated SQL preview
  - **Tables** — List tabel beserta jumlah row
  - **History** — Query history log

#### Create Sandbox Modal
- **Select: Database Engine** (card selector dengan icon):
  - 🐘 **PostgreSQL 16** — Recommended for most projects
  - 🐬 **MySQL 8** — Popular choice for PHP/Laravel/WordPress
  - 🦭 **MariaDB 11** — MySQL-compatible, community-driven
- **Select: Region** (card selector dengan flag):
  - 🇮🇩 **Indonesia** — Default, lowest latency untuk user di Asia Tenggara
  - 🇸🇬 **Singapore** — Coming soon
  - 🇺🇸 **US** — Coming soon
- Input: Nama sandbox (text input dengan validasi)
- Select: Durasi (dropdown: 1h, 6h, 12h, 24h, 3d, 7d)
- Select: Template (dropdown: Blank, E-commerce, Blog, dll. — filtered by engine)
- Button: "Buat Sandbox 🍌"

---

## 12. Security & Compliance

### 12.1 Authentication Security
- Password hashing: **bcrypt** dengan cost factor ≥ 10
- Session disimpan dalam **HTTP-only, Secure, SameSite=Strict cookies** (managed by better-auth)
- CSRF protection via SameSite cookie + Origin header validation
- Rate limiting pada login: **5 attempts / 15 menit / IP**

### 12.2 Sandbox Isolation — Dedicated User per Sandbox

Setiap sandbox memiliki **1 dedicated database user** yang dibuat khusus saat sandbox di-create, dan **dihapus** saat sandbox di-delete/expire. User ini **hanya bisa mengakses database sandbox-nya sendiri**, tidak bisa melihat atau mengakses database lain di engine yang sama.

**Lifecycle:**
```
Create Sandbox → CREATE USER + CREATE DATABASE + GRANT (hanya ke DB ini)
     ↓
User Development (user connect via credentials)
     ↓
Delete/Expire → DROP DATABASE + DROP USER
```

**PostgreSQL — Create:**
```sql
-- Step 1: Buat database
CREATE DATABASE pisang_a1b2_myapp_x8k2m9;

-- Step 2: Buat user khusus untuk sandbox ini
CREATE USER sb_a1b2x8 WITH PASSWORD 'random_32_char_password';

-- Step 3: Grant akses HANYA ke database ini
GRANT ALL PRIVILEGES ON DATABASE pisang_a1b2_myapp_x8k2m9 TO sb_a1b2x8;

-- Step 4: Revoke semua yang berbahaya
ALTER USER sb_a1b2x8 NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER USER sb_a1b2x8 SET statement_timeout = '30s';
```

**PostgreSQL — Destroy:**
```sql
-- Step 1: Kill semua koneksi aktif
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'pisang_a1b2_myapp_x8k2m9';

-- Step 2: Hapus database
DROP DATABASE IF EXISTS pisang_a1b2_myapp_x8k2m9;

-- Step 3: Hapus user
DROP USER IF EXISTS sb_a1b2x8;
```

**MySQL / MariaDB — Create:**
```sql
-- Step 1: Buat database
CREATE DATABASE pisang_a1b2_myapp_x8k2m9;

-- Step 2: Buat user khusus untuk sandbox ini
CREATE USER 'sb_a1b2x8'@'%' IDENTIFIED BY 'random_32_char_password';

-- Step 3: Grant akses HANYA ke database ini (bukan database lain)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES
  ON pisang_a1b2_myapp_x8k2m9.* TO 'sb_a1b2x8'@'%';

FLUSH PRIVILEGES;
```

**MySQL / MariaDB — Destroy:**
```sql
-- Step 1: Kill semua koneksi dari user ini
-- (app level: iterate SHOW PROCESSLIST WHERE User = 'sb_a1b2x8' → KILL {id})

-- Step 2: Revoke & hapus
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'sb_a1b2x8'@'%';
DROP DATABASE IF EXISTS pisang_a1b2_myapp_x8k2m9;
DROP USER IF EXISTS 'sb_a1b2x8'@'%';
```

**Key Security Rules:**
- Sandbox user **tidak bisa** mengakses database lain pada engine yang sama
- Sandbox user **tidak bisa** melihat `SHOW DATABASES` milik user lain (MySQL: `--skip-show-database`)
- Statement timeout: **30 detik** per query (semua engine)
- Connection limit per sandbox user: **5 concurrent connections**
- User hanya di-grant ke `{sandbox_db}.*`, bukan `*.*`

### 12.3 Data Security
- Connection string di-encrypt saat disimpan di database (AES-256)
- Database password di-generate secara random (32 char, cryptographic random)
- Semua traffic via HTTPS (TLS 1.2+)
- Environment variables untuk secrets (tidak hardcoded)

### 12.4 Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Login | 5 req / 15 min / IP |
| Register | 3 req / hour / IP |
| Create Sandbox | 10 req / hour / user |
| SQL Query | 60 req / min / user |
| AI Generate | 30 req / day / user |

### 12.5 Input Validation
- Semua input di-sanitize dan di-validasi menggunakan **Zod** schema
- SQL Console: whitelist commands yang diizinkan, block system-level commands
- AI prompt: max 1000 karakter, sanitize sebelum kirim ke Gemini API

---

## 13. Risk Assessment & Mitigasi

| # | Risk | Impact | Probability | Mitigasi |
|---|------|--------|-------------|----------|
| R1 | User membuat terlalu banyak sandbox → PostgreSQL overload | High | Medium | Limit 5 sandbox aktif per user, max 100MB per sandbox |
| R2 | Sandbox tidak terhapus karena worker crash | High | Low | Idempotent cleanup, health check, restart policy di Docker |
| R3 | SQL injection via SQL Console | Critical | Low | Parameterized queries untuk metadata, dedicated user per sandbox |
| R4 | AI menghasilkan SQL berbahaya | Medium | Medium | System prompt yang ketat, SQL validation sebelum execute, preview mode |
| R5 | User menggunakan sandbox untuk menyimpan data sensitif | Medium | Medium | Clear warning bahwa sandbox bersifat temporary, no backup guarantee |
| R6 | Disk space habis karena banyak sandbox | High | Medium | Max size 100MB per sandbox, monitoring disk usage, alert threshold |
| R7 | Gemini API down / rate limited | Low | Medium | Graceful fallback, cache common templates, informasi error yang jelas |
| R8 | Brute force attack pada connection string | Medium | Low | Random password 32 char, rate limit pada database engine, monitoring |
| R9 | Docker container crash (MySQL/MariaDB) | Medium | Low | Docker restart policy `unless-stopped`, health check per container |
| R10 | Inconsistent SQL syntax antara engine | Low | High | AI system prompt menyesuaikan syntax per engine, SQL Console validates per engine |

---

## 14. Timeline & Milestones

### Phase 1 — Foundation (Week 1: 12-15 Mar)
| Task | Duration | Deliverable |
|------|----------|-------------|
| PRD finalization | 1 hari | Dokumen PRD final ✅ |
| Project setup (TanStack Start + Docker + PostgreSQL) | 1 hari | Boilerplate running |
| Database schema + Drizzle ORM setup | 1 hari | Migrations ready |
| Auth system (register, login, better-auth, middleware) | 2 hari | Auth flow working |

### Phase 2 — Core Engine (Week 2: 16-22 Mar)
| Task | Duration | Deliverable |
|------|----------|-------------|
| Sandbox CRUD API (create, list, detail, extend, delete) | 3 hari | API endpoints tested |
| Ephemeral Engine (background worker + auto-cleanup) | 2 hari | Auto-destruct working |
| SQL Console backend (query execution, history) | 2 hari | Query execution working |

### Phase 3 — Frontend & AI (Week 3: 23-26 Mar)
| Task | Duration | Deliverable |
|------|----------|-------------|
| Dashboard UI (sandbox cards, stats, create modal) | 2 hari | Dashboard functional |
| Sandbox detail page (info, SQL console, tables) | 1 hari | Detail page complete |
| AI Seeder integration (Gemini API + preview + execute) | 1 hari | AI feature working |

### Phase 4 — Polish & Deploy (27-28 Mar)
| Task | Duration | Deliverable |
|------|----------|-------------|
| Docker Compose production setup | 0.5 hari | Deployment ready |
| CI/CD pipeline (GitHub Actions) | 0.5 hari | Auto deploy working |
| End-to-end testing + bug fixing | 1 hari | Stable MVP |

### 📅 Key Dates
- **11 Maret** — PRD Final
- **22 Maret** — Backend complete
- **26 Maret** — Frontend + AI complete
- **27 Maret** — Deployment
- **28 Maret** — Deadline MVP (17:00 WIB)
- **29 Maret** — Demo Day 🎉

---

## 15. Infrastructure & Resource Planning

### 15.1 Estimasi Resource per Komponen

Berikut breakdown resource yang dibutuhkan setiap komponen PisangDB:

| Komponen | CPU | RAM (idle) | RAM (load) | Disk | Catatan |
|----------|-----|-----------|-----------|------|---------|
| **App (TanStack Start)** | 0.5 vCPU | ~100MB | ~300MB | 500MB | Node.js runtime + SSR |
| **PostgreSQL (App DB)** | 0.25 vCPU | ~50MB | ~200MB | 1GB | Metadata only, kecil |
| **PostgreSQL (Sandbox)** | 0.5 vCPU | ~80MB | ~500MB | 5GB | Tergantung jumlah sandbox aktif |
| **MySQL (Sandbox)** | 0.5 vCPU | ~200MB | ~500MB | 5GB | MySQL lebih boros RAM idle |
| **MariaDB (Sandbox)** | 0.5 vCPU | ~150MB | ~400MB | 5GB | Sedikit lebih ringan dari MySQL |
| **Caddy (Reverse Proxy)** | 0.1 vCPU | ~20MB | ~50MB | 100MB | Sangat ringan |
| **OS + Docker overhead** | 0.5 vCPU | ~300MB | ~500MB | 2GB | Ubuntu + Docker daemon |
| **Total** | **~2.85 vCPU** | **~900MB** | **~2.5GB** | **~18.6GB** | |

### 15.2 Rekomendasi VPS — 3 Tier

#### 🟢 Tier 1: MVP / Demo Day (Recommended untuk Bootcamp)

> **Budget: ~Rp 70.000 - 150.000 / bulan ($4 - $9)**

| Spec | Value |
|------|-------|
| **Provider** | Hetzner Cloud (CX22) / DigitalOcean (Basic) / IDCloudHost |
| **CPU** | 2 vCPU (shared) |
| **RAM** | 4 GB |
| **Disk** | 40 GB SSD |
| **Bandwidth** | 20 TB / bulan |
| **Max sandbox aktif** | ~30-50 bersamaan |
| **Max users** | ~20-50 concurrent |

```
Resource Allocation (4GB RAM):
┌──────────────────────────────────────────┐
│ OS + Docker        │  500 MB             │
│ App (TanStack)     │  300 MB             │
│ PostgreSQL (App)   │  200 MB             │
│ PostgreSQL (SB)    │  500 MB             │
│ MySQL (SB)         │  500 MB             │
│ MariaDB (SB)       │  400 MB             │
│ Caddy              │   50 MB             │
│ Buffer/headroom    │  550 MB             │
│────────────────────┼─────────────────────│
│ TOTAL              │ 3,000 MB / 4,096 MB │
└──────────────────────────────────────────┘
```

**Kenapa cukup untuk MVP:**
- Sandbox database kosong hanya pakai ~2-5MB per database
- Max 100MB per sandbox, tapi rata-rata usage jauh di bawah itu
- Ephemeral engine membersihkan otomatis, jadi disk tidak penuh
- Traffic untuk bootcamp demo tidak tinggi

#### 🟡 Tier 2: Small Production (Post-Launch)

> **Budget: ~Rp 200.000 - 400.000 / bulan ($12 - $24)**

| Spec | Value |
|------|-------|
| **Provider** | Hetzner (CX32) / DigitalOcean (Regular) |
| **CPU** | 4 vCPU (shared/dedicated) |
| **RAM** | 8 GB |
| **Disk** | 80 GB SSD |
| **Max sandbox aktif** | ~100 bersamaan |
| **Max users** | ~100-200 concurrent |

#### 🔴 Tier 3: Scaling (Future)

> **Budget: ~Rp 500.000+ / bulan ($30+)**

| Spec | Value |
|------|-------|
| **Provider** | Hetzner (CX42+) / DigitalOcean (CPU-Optimized) |
| **CPU** | 8 vCPU (dedicated) |
| **RAM** | 16 GB |
| **Disk** | 160 GB NVMe |
| **Max sandbox aktif** | ~300+ bersamaan |
| **Arsitektur** | Pisahkan DB engine ke server terpisah |

### 15.3 Disk Space Calculation

```
Disk Budget (40GB SSD — Tier 1):

  OS + Docker images          :  5 GB
  App code + node_modules     :  1 GB
  PostgreSQL App DB           :  1 GB (metadata, jarang besar)
  PostgreSQL Sandbox data     :  8 GB (max ~80 sandbox × ~100MB)
  MySQL Sandbox data          :  8 GB
  MariaDB Sandbox data        :  8 GB
  Logs                        :  2 GB
  Buffer                      :  7 GB
  ──────────────────────────────────
  TOTAL                       : 40 GB
```

**Catatan penting:**
- Sandbox max 100MB, tapi rata-rata hanya 5-20MB (kebanyakan tabel kecil + seed data)
- Ephemeral engine terus membersihkan sandbox expired, jadi disk reclaimable
- Monitor disk usage, set alert di **80%** (32GB)

### 15.4 Docker Resource Limits

Untuk mencegah satu container menghabiskan semua resource, set limits di `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          memory: 256M

  postgres:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 768M
        reservations:
          memory: 256M

  mysql:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 768M
        reservations:
          memory: 256M

  mariadb:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          memory: 200M
```

### 15.5 Database Engine Tuning (Low Memory)

Karena kita menjalankan 3 DB engine di 1 server, perlu tuning agar hemat RAM:

**PostgreSQL (`postgresql.conf`):**
```
shared_buffers = 128MB          # Default 128MB, cukup untuk MVP
work_mem = 4MB                  # Per-query memory
effective_cache_size = 256MB
max_connections = 100            # Cukup untuk ~50 sandbox × 2 conn
```

**MySQL (`my.cnf`):**
```
innodb_buffer_pool_size = 128M  # Default 128MB, turunkan jika perlu
max_connections = 100
key_buffer_size = 16M
table_open_cache = 200
skip-name-resolve               # Faster connections
skip-show-database              # Security: hide other databases
```

**MariaDB (`my.cnf`):**
```
innodb_buffer_pool_size = 128M
max_connections = 100
key_buffer_size = 16M
skip-name-resolve
skip-show-database
```

### 15.6 Estimasi Biaya Bulanan (Tier 1 — MVP)

| Item | Provider | Biaya / bulan |
|------|----------|---------------|
| VPS 4GB RAM | Hetzner CX22 | **€3.99** (~Rp 68.000) |
| Domain `.com` | Namecheap | **~Rp 10.000** (amortized) |
| Gemini AI API | Google (free tier) | **Rp 0** (1,500 req/day free) |
| GitHub Actions | GitHub (free tier) | **Rp 0** (2,000 min/month) |
| **TOTAL** | | **~Rp 78.000 / bulan** |

> Alternatif murah: **IDCloudHost** mulai Rp 50.000/bulan untuk 2GB RAM (cukup untuk demo, tapi tight).

### 15.7 Monitoring & Alerts

Untuk menjaga server tetap sehat, monitoring sederhana yang perlu di-setup:

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| **Disk usage** | `df -h` + cron | > 80% → warning, > 90% → critical |
| **RAM usage** | `free -m` + cron | > 85% → warning |
| **Container health** | `docker ps` + health check | Container restart > 3x/jam |
| **App health** | `GET /api/health` | Response > 5 detik atau 5xx |
| **Sandbox count** | App metrics | > 80 aktif → warning (Tier 1) |

Untuk MVP, cukup pakai **cron job + simple script** yang kirim notifikasi ke Discord/Telegram webhook jika threshold tercapai.

---

## 16. Future Roadmap (v2+)

### v1.1 — Enhanced (Post-Launch)
- [ ] GitHub OAuth login
- [ ] Database templates (built-in + custom)
- [ ] Export sandbox sebagai SQL dump
- [ ] Email/in-app notification sebelum sandbox expired

### v1.2 — Collaboration
- [ ] Share sandbox via link (read-only access untuk orang lain)
- [ ] Team workspace — sandbox yang bisa diakses bersama oleh tim
- [ ] Activity log per sandbox (siapa menjalankan query apa)

### v2.0 — Platform
- [ ] Support database engine tambahan (SQLite, Redis, MongoDB)
- [ ] REST API + API Key untuk integrasi CI/CD pipeline
- [ ] CLI tool: `pisang create --name test --ttl 1h`
- [ ] Snapshot & restore sandbox
- [ ] Paid tiers dengan quota lebih besar dan durasi lebih lama
- [ ] Multi-region expansion (sg.pisangdb.com, us.pisangdb.com, eu.pisangdb.com)
- [ ] Plugin marketplace untuk template komunitas

---

## Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| **Sandbox** | Database sementara (PostgreSQL/MySQL/MariaDB) yang dibuat dan dikelola oleh PisangDB |
| **TTL (Time-to-Live)** | Durasi hidup sandbox sebelum otomatis dihapus |
| **Ephemeral Engine** | Background worker yang mengelola lifecycle sandbox |
| **Connection String** | URL untuk mengakses database sandbox dari project lokal user |
| **Seed Data** | Data dummy yang di-generate untuk mengisi tabel |
| **Engine** | Database engine yang dipilih user (PostgreSQL, MySQL, atau MariaDB) |
| **Credentials** | Username, password, host, port, dan database name untuk mengakses sandbox |

### B. References

- [TanStack Start Documentation](https://tanstack.com/start)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PostgreSQL CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html)
- [MySQL CREATE DATABASE](https://dev.mysql.com/doc/refman/8.0/en/create-database.html)
- [MariaDB CREATE DATABASE](https://mariadb.com/kb/en/create-database/)
- [mysql2 npm package](https://www.npmjs.com/package/mysql2)
- [Google Gemini API](https://ai.google.dev)
- [shadcn/ui Components](https://ui.shadcn.com)

---

> *"Kupas, Makan, Buang Kulitnya."* 🍌
>
> — PisangDB Philosophy
