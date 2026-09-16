# 🚀 Kivo v1.3.2 Release Notes

**Release Date:** September 16, 2026  
**Baseline Comparison:** `main` branch ([`a194d10`](https://github.com/AchiraStudio/kivo/commit/a194d10848f499fdfc5445bbcab29fc712b9ee38)) ➔ `v1.3.2` ([`7209791`](https://github.com/AchiraStudio/kivo/commit/7209791bcb6c1590396839bbb7c3458aec81fa43))  
**Diff Summary:** 304 files changed, **+41,986 insertions**, **-7,866 deletions**  

---

## 🌟 Executive Summary

**Kivo v1.3.2** represents the monumental transformation of the system from its initial prototype stage (formerly Chirasys) into a full-fledged, enterprise-grade, **offline-first Multi-Branch POS & ERP platform**.

This release brings an end-to-end modern visual overhaul, an interactive First-Run Onboarding Wizard, an enterprise multi-branch cloud sync engine powered by Supabase, local LAN peer-to-peer sync, an intelligent AI Assistant with function calling, and a **100% Pure Bring Your Own Key (BYOK)** security architecture with zero hardcoded credentials.

---

## 🛡️ 1. Pure Bring Your Own Key (BYOK) Architecture (v1.3.2 Focus)

Kivo v1.3.2 cements a zero-trust, enterprise privacy model where **no credentials, fallbacks, or project URLs are baked into client binaries or repository source code**.

* **Zero Compile-Time Leaks:** Removed all `option_env!("VITE_OPENAI_API_KEY")` and `option_env!("OPENAI_API_KEY")` macros in the Rust backend (`src-tauri/src/commands/ai.rs`). Binaries distributed to users will never capture or expose build-machine credentials.
* **Elimination of Hardcoded Fallbacks:** Removed hardcoded `default_secret` fallbacks in `src-tauri/src/commands/auth.rs` and `src-tauri/src/commands/sync.rs`. JWT minting for cloud authentication now strictly requires user-provided secrets.
* **Dynamic Client-Side Credential Storage:** Supabase Cloud credentials (URL, Public Anon Key) and OpenAI API Keys are entered dynamically via the Onboarding Setup Wizard or the Settings UI, stored safely inside local SQLite `global_settings` and encrypted browser storage.
* **Repository Sanitization:** Stripped all active `.env` files from the codebase and hardened both root `.gitignore` and `src-tauri/.gitignore` to ignore all `.env*` variants while preserving `.env.example`.
* **Safe Cloud Wipe ("Nuke") Utility:** Built a 2-step confirmation utility (`nuke_cloud_workspace_data`) directly into the UI for administrators and owners. Allows purging test transactions, inventory movements, and catalogs from Supabase Cloud while **guaranteeing 100% preservation of users, roles, workspaces, and database schemas**.

---

## 🎨 2. Complete Brand & UI Overhaul (Chirasys ➔ Kivo)

* **Design System & Typography:** Migrated to Tailwind CSS v4 with bespoke color tokens (`primary`, `primary-hover`, `primary-soft`, `heading`, `body`, `dim`, `line`, `card`, `danger`, `warning`, `success`) and crisp typography via `@fontsource-variable/manrope`.
* **Reusable UI Primitives (`src/components/ui/`):**
  * `<Modal>`: Standardized centered dialogs with focus trapping, backdrop blur, and Esc-to-close.
  * `<Drawer>`: Smooth right-side slide-over panels for deep inspections and complex forms.
  * `<TabBar>`: Unified, responsive tab controls across all modules.
  * `<Toast>`: Lightweight notification dispatch system replacing browser alerts.
  * `<Select>`: Polished dropdown component with search and keyboard navigation.
* **Streamlined Navigation:** Compact, responsive sidebar with active indicators, notification badges, dynamic role filtering, and user session controls.

---

## 🚀 3. First-Run Setup & Onboarding Wizard

Clean installations no longer drop directly into an empty login prompt. A comprehensive, multi-step **Setup Wizard (`SetupWizard.tsx`)** guides users through:

1. **Deployment Mode Selection:**
   * *Buat Toko Baru (Fresh Install)*: Standalone offline or new cloud workspace.
   * *Gabung Workspace (Join Existing)*: Connect to an existing multi-branch organization using a shareable invite code.
   * *Pulihkan dari Cloud (Restore)*: Restore existing store data to a new cashier terminal.
2. **Store Identity:** Company name, branch name, address, business classification, currency, and logo upload.
3. **BYOK Cloud Integration:** Quick connection testing with Supabase project credentials.
4. **Kivo AI Assistant Setup:** Optional OpenAI API key configuration with one-click direct access to the OpenAI developer portal.
5. **Root Owner Initialization:** Creates the master owner account with undeletable root permissions.
6. **Core Accounting & Inventory Seeds:** Select default inventory valuation methods (FIFO / AVG / LIFO), tax calculation modes, and member loyalty tier discount structures.

---

## ☁️ 4. Multi-Branch Cloud Sync Engine (Kivo Cloud)

* **34 Synchronized Database Tables:** Complete synchronization coverage across transactions, products, batches, promotions, purchasing, customer balances, and journal entries.
* **Full Trigger Automation (`040_full_sync_triggers.sql` & `supabase_full_bootstrap.sql`):** Automatic capture of all local SQLite changes into a resilient `sync_queue`.
* **Loop-Free Syncing:** Integrated `updated_by` tagging prevents ping-pong replication loops between terminals and cloud instances.
* **Offline-First Resilience:** Fully operational offline. Changes queue locally and push automatically via background worker when internet connectivity is re-established.
* **Sync Health Dashboard:** Real-time visibility into pending upload counters, failed sync retries, manual Push/Pull triggers, and connection latency diagnostics.

---

## 🌐 5. Local Network (LAN) Peer-to-Peer Sync

* **Zero-Internet Multi-Terminal Operations (`lan.rs` & `LanSyncSettings.tsx`):** Enables cashiers on the same local Wi-Fi or Ethernet network to communicate directly.
* **UDP Discovery:** Terminals automatically broadcast and discover other active Kivo terminals on the local subnet.
* **HTTP Peer Sync:** Local server handles push/pull updates between cashiers and main server terminals without consuming external bandwidth.
* **Granular LAN Permissions:** Configurable ports and security policies for staff terminal access.

---

## 🤖 6. Kivo AI Assistant (Powered by Achira AI)

* **Native Conversational Assistant (`AIChat.tsx`):** Available throughout the app via topbar shortcut or keyboard toggle.
* **OpenAI Function Calling Engine (`aiTools.ts`):** Directly queries real-time SQLite data to answer natural language business questions:
  * *"Berapa omset toko hari ini dan metode pembayaran apa yang paling populer?"*
  * *"Barang apa saja yang stoknya di bawah batas minimum dan perlu di-reorder?"*
  * *"Siapa 5 pelanggan dengan pembelian terbanyak bulan ini?"*
  * *"Cek batch produk yang akan kadaluarsa dalam 30 hari ke depan."*
* **Model Selection:** Switch between models (e.g. `gpt-4o-mini`, `gpt-4o`, `o3-mini`) directly from settings.

---

## 🛒 7. Point of Sale (POS) & Hardware Integration

* **High-Performance Cashier Interface (`POS.tsx`):** Barcode scanner optimized with instant search, category quick-tabs, and grid/list view toggles.
* **Flexible Payments:** Multi-payment splitting across Cash, QRIS, Bank Transfer, Debit/Credit Card, and Customer Credit (Piutang).
* **Cash Shifts & Drawer Reconciliation:** Open shift with starting cash, record cash in/out, and reconcile drawer balances upon shift closing.
* **Thermal Printing & ESC/POS Engine (`escpos.ts`):** ESC/POS thermal receipt formatting with custom logo support, headers, footers, tax breakdowns, and automated paper cutting.
* **Hardware SDK Integration (`hprt-sdk`):** Native Windows DLL integration for HPRT POS thermal printers and cash drawers.
* **Sales Returns & Refunds (`SaleReturnModal.tsx`):** Search previous sales invoices, process partial or full item returns, restore inventory, and adjust sales totals.

---

## 📦 8. Inventory, Purchasing & Warehousing

* **Hierarchical Units & Conversions:** Define multiple units per product (e.g. Dus ➔ Slop ➔ Pack ➔ Pcs) with conversion multipliers and individual selling prices.
* **Batch & Expiration Tracking:** Monitor incoming supplier batches, batch serial numbers, and expiration dates with automated expiry warning reports.
* **Wholesale Quantity Price Tiers (`048_quantity_price_tiers.sql`):** Define tiered volume pricing (e.g., buy 1–10 pcs for Rp 10.000, 11+ pcs for Rp 9.000).
* **Physical Stock Opname (`StockOpname.tsx`):** Audit physical inventory, calculate positive/negative variances, and generate automated stock adjustment journal vouchers.
* **Purchase Orders & Direct Receiving:** Issue purchase orders (PO), record direct warehouse receiving, track supplier bills, and automatically update Cost of Goods Sold (HPP/COGS).

---

## 📊 9. Double-Entry Accounting Engine

* **Comprehensive Financial Suite (`Accounting.tsx`):**
  * Automated journal entry creation for every POS sale, inventory change, supplier purchase, and return.
  * Hierarchical Chart of Accounts (COA) spanning Assets, Liabilities, Equity, Revenue, and Operating Expenses.
  * Real-time financial statements: **Laba Rugi (Profit & Loss)**, **Neraca (Balance Sheet)**, and **Neraca Saldo (Trial Balance)**.
  * Configurable inventory valuation engine supporting **Average (AVG)**, **First-In First-Out (FIFO)**, and **Last-In First-Out (LIFO)**.

---

## 🎯 10. Role-Based Access Control (RBAC)

* **Permission Matrix (`permissions.ts`):** Fine-grained permission nodes (e.g. `pos.create`, `sales.history`, `inventory.edit`, `accounting.view`, `settings.general`).
* **Predefined Roles:** `owner`, `sysadmin`, `admin`, `manager`, `cashier`, and `staff`.
* **Custom Overrides:** Ability to tailor and toggle specific permissions per individual user without modifying global role templates.

---

## 📋 Commits from `main` to `v1.3.2`

| Commit | Author | Description |
| :--- | :--- | :--- |
| `7209791` | AchiraStudio | **1.3.2**: BYOK sanitization, removed compile-time macro leaks, hardened .gitignore |
| `21fe94e` | AchiraStudio | **1.3.1**: Supabase bootstrap migration, cloud sync enhancements, UI cleanup |
| `4f62c6e` | AchiraStudio | **Kivo 1.3**: Complete design overhaul, new branding, icons, and UI primitives |
| `02186f6` | AchiraStudio | Pre-overhaul checkpoint |
| `1df7cc6` | AchiraStudio | Brand transition to KIVO |
| `40719ab` | AchiraStudio | Fixes and revisions |
| `8e3a3f2` | AchiraStudio | Revision 1.2.6.3 |
| `897eaa4` | AchiraStudio | Revision 1.2.6.2 |
| `fdb5954` | AchiraStudio | Revision 1.2.6.1 |
| `1100d60` | AchiraStudio | Revision 1.2.6 |
| `534c8f7` | AchiraStudio | Revision 1.2.5 |
| `9125e1a` | AchiraStudio | Revision 1.2.4 |
| `679b630` | AchiraStudio | Revision 1.2.2 |
| `a5b7345` | AchiraStudio | Revision 1.2.1 |
| `39bdd24` | AchiraStudio | 1.2.0 initial multi-branch foundation |

---

## 🛠️ Upgrading to v1.3.2

1. **Pull the latest changes:**
   ```bash
   git checkout beta  # or main once merged
   git pull
   ```
2. **Install frontend dependencies:**
   ```bash
   npm install
   ```
3. **Run the development application:**
   ```bash
   npm run tauri dev
   ```
4. **Cloud Database Initialization:**
   If connecting a new Supabase Cloud project, execute [`supabase_full_bootstrap.sql`](file:///d:/Codes/Github/kivo/supabase_full_bootstrap.sql) in your Supabase SQL Editor.

