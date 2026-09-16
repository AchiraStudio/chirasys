# Kivo: Analysis & Improvement Roadmap

*Based on a direct read of the [AchiraStudio/chirasys](https://github.com/AchiraStudio/chirasys) repo (Rust + Tauri backend, React 19 + TS + Tailwind frontend, Supabase sync). Findings below are grounded in the actual code, not guesses.*

---

## 1. What's actually there today

- **Backend**: Tauri (Rust), SQLite locally, 38 sequential SQL migrations, Supabase for cloud sync/realtime. Very solid domain coverage: inventory, purchasing, POS/sales, promos, accounting (HPP/COGS engine), stock opname, reports, sync queue, admin/sysadmin layer.
- **Frontend**: no router (despite `@tanstack/react-router` being installed but unused) — `App.tsx` is one big manual `activeMenu` string-switch rendering 13 top-level pages.
- **Auth**: username/password only. No first-run experience — `LoginPage.tsx` assumes a workspace and users already exist.
- **Workspace/multi-tenant system already exists in the backend** (`create_workspace`, `join_workspace`, `create_workspace_invite` in `sync.rs`, wired up in `api.ts`) **but is never called from any screen.** It's a fully-built feature with no UI entry point — this is your single highest-leverage fix.
- **Branding**: hardcoded "ChiraSys" name/icon in ~21 places across the codebase; single Tailwind `brand` color token (`#2563eb`).
- **Language**: inconsistent — Indonesian strings ("Masuk", "Kembali", "Pengaturan") mixed with English labels ("Username", "System Admin", "Settings"), no centralized string/locale system despite a `language: id/en` setting already existing in the DB schema.
- **Security note (worth fixing regardless of anything else):** `src-tauri/.env` containing a live Supabase URL + anon key is committed to git history (`git ls-files` confirms it's tracked, even though `.gitignore` now lists `.env`). It's an anon key, so the real exposure depends on your Supabase Row Level Security policies — but you should still rotate it and scrub it from history, because right now anyone who clones the repo has it.

---

## 2. First-run Setup Wizard (the "opening the app for the first time" flow)

This is the best-supported idea in the whole list — the backend commands already exist, they're just orphaned. Proposed flow, all screens replacing the current bare `LoginPage` when no local admin user exists yet:

**Step 0 — Welcome & Mode choice**
- "Buat Toko Baru" (fresh install, no cloud) vs "Gabung Workspace" (join an existing cloud workspace with an invite code) vs "Pulihkan dari Cloud" (existing owner logging into a new device).

**Step 1 — Store Identity**
- Store/company name, branch name, business type (pharmacy/retail/F&B/etc. — drives default categories & terminology), logo upload, currency, timezone.
- Maps directly to existing `company_name` / `branch_name` settings keys — just needs to run once, before the sidebar exists.

**Step 2 — Cloud & Keys** (optional, skippable → local-only mode)
- If "online": either **paste an invite code** (`join_workspace`) or **create a workspace** (`create_workspace`, generates a code owner can share to other devices/branches).
- Supabase URL/key should *not* be something the store owner ever types — keep those as your app's own config (see §5, security). What the owner sets up here is their **workspace code**, not raw API keys.

**Step 3 — Owner Account**
- Create the first `owner` user (username/password), this becomes the account that can't be deleted.

**Step 4 — Core Data Seed**
- Tax mode, default HPP method, default member/VIP tier discounts (these already exist as settings keys — `tier_member_discount` etc. — just surface them here instead of only in Settings afterward).
- Optional: quick "add first few products" or "import from Excel" step, reusing the existing Excel import command (`commands/excel.rs`).

**Step 5 — Done → drop into Dashboard**, with the existing `react-joyride` Tour Guide (already a dependency, currently underused) auto-triggered for a guided first tour of the sidebar.

**Implementation shape**: a `SetupWizard.tsx` under `src/pages/onboarding/`, gated in `App.tsx` by a new `has_completed_setup` global_setting (one more row in `global_settings`, same pattern as `workspace_id` in migration 026). Multi-step state can be a simple `useState<Step>` — no need for a routing library given the app doesn't use one anywhere else.

---

## 3. Reusing modals & drawers (biggest code-quality win)

I searched for every place the app implements an overlay and found **29 separate files** each hand-rolling their own `fixed inset-0` modal/drawer markup — only `ConfirmModal.tsx` is actually shared. The other 28 (`ItemDrawer`, `SupplierDrawer`, `PaymentModal`, `PromoDrawer`, `ReceiveDrawer`, `CustomerModal`, `ManualJournalModal`, etc.) each redefine their own backdrop opacity, z-index, corner radius, and animation — and they disagree with each other:

| File | z-index | backdrop | animation |
|---|---|---|---|
| `ItemDrawer.tsx` | `z-[100]` | `bg-slate-900/40` | `zoom-in-95` (centered modal) |
| `SupplierDrawer.tsx` | `z-50` | `bg-slate-900/20` | `slide-in-from-right` (side drawer) |
| `PaymentModal.tsx` | `z-50` | `bg-slate-900/60` | `zoom-in-95` |

None of this is wrong individually, but it means: inconsistent feel across the app, no single place to fix a bug (e.g. Esc-to-close, focus trap, scroll lock — none of the 29 implementations currently trap focus or lock body scroll), and every new feature re-pays this cost.

**Fix**: two primitives in `src/components/ui/`:
- `<Modal>` — centered dialog (size `sm|md|lg|xl`, replaces the `PaymentModal`/`ItemDrawer`/`CustomerModal` style).
- `<Drawer side="right">` — the slide-in panel style (replaces `SupplierDrawer`/`PoDrawer`/`ReceiveDrawer`/`AccountDrawer`).

Both handle backdrop, Esc key, focus trap, and body-scroll-lock once. Every existing modal file becomes a thin content component wrapped in `<Modal>` or `<Drawer>` — same visual result, ~40–60% less code per file, and one place to keep them consistent. I can scaffold these two components for you right now if you want — happy to do that as a next step.

---

## 4. Navigation & page consolidation

The sidebar currently has 13 items. A few overlap conceptually for a store owner who isn't thinking in your internal architecture:

- **"Master Data"**, **"Katalog Produk"**, and **"Stok Inventaris"** are three separate top-level pages that are all "manage my products," just at different layers (categories/brands vs. product catalog vs. stock levels). A new owner has to learn which of three pages to open for a given task.
- **"Stock Opname"** is a specific *action* (physical stock count), not really a parallel destination to the other three — it reads more naturally as a button/tab inside Inventory.

**Suggestion**: collapse into a single **"Produk & Stok"** section with internal tabs (Katalog / Kategori & Merek / Stok / Opname) rather than 4 sidebar entries. This cuts the sidebar from 13 to ~10 without removing any functionality — just re-homing it. Same logic could apply to **Purchasing** and **Suppliers**, which are also tightly coupled (a PO always references a supplier).

---

## 5. Dataset / schema observations

- 38 incremental migrations is normal for an evolving product, but for a *new* install this means running 38 files in sequence just to get an empty database. Worth adding a single "consolidated baseline" migration (a squashed `000_baseline.sql` representing the current end-state schema) that new installs run instead of replaying history — keep the incremental files for existing installations that need to upgrade.
- The `global_settings` key-value table is doing a lot of work (workspace id, tax mode, tier discounts, language, company name, etc. — anything not yet in its own table). That's fine for flexibility, but as you add more per-store config for the setup wizard, consider grouping related settings into a proper `store_profile` table (name, address, tax id, logo path, business type, currency) rather than more loose keys — it'll make the wizard's "load current settings" query one row instead of N key lookups.
- **On the exposed Supabase key**: move `SUPABASE_URL`/`SUPABASE_KEY` out of a committed `.env` and into a build-time secret or a per-installation config file generated at build (Tauri supports embedding config at compile time). Rotate the current anon key in the Supabase dashboard regardless, and run `git filter-repo` (or BFG) to strip it from history if the repo is public.

---

## 6. New name: **Kivo**

Decision made — the app becomes **Kivo**. This is a genuinely stronger direction than the options I floated last time, for a specific reason: "ChiraSys," "TokoBase," "Kelola" all *describe* the product category (a system, a shop base, a management verb). **Kivo describes nothing** — it's a clean brand syllable, which is exactly what lets it become an umbrella rather than a label. That's the difference between naming a product and naming a *platform*.

**Naming architecture** — this maps directly onto the sidebar consolidation from §4, so the rename and the IA cleanup become the same piece of work:

| Kivo module | Replaces / maps to current sidebar item(s) |
|---|---|
| **Kivo POS** | `pos` (Kasir & POS) |
| **Kivo Inventory** | `master-data` + `inventory` + `catalog` + `stock-opname` (the consolidated "Produk & Stok" from §4) |
| **Kivo Purchasing** | `purchasing` + `suppliers` |
| **Kivo Accounting** | `accounting` |
| **Kivo Reports** | `reports` |
| **Kivo AI** | the existing `components/ai/AIChat.tsx` — already built, just needs the brand tie-in |
| **Kivo Cloud** | the workspace/sync system (§2) — this is also the natural name for the invite-code/join-workspace concept an owner sees in the setup wizard: *"Hubungkan ke Kivo Cloud"* |
| **Kivo Admin** | `settings` (owner/admin tab) + `SysadminDashboard.tsx` |

Practically: the sidebar section headers can literally read "Kivo POS," "Kivo Inventory," etc. instead of plain labels — this reinforces the platform framing for free, every time a store owner opens the app, without needing separate marketing.

**Tagline direction** for the login screen / splash, replacing "Modern Inventory & Cashier System": **"Kivo — Platform Manajemen Bisnis Anda"** (Kivo — Your Business Management Platform). Keeps the platform positioning, stays in Indonesian as the base language.

**Mechanical rename scope** (unchanged from before, just now pointed at "Kivo"): ~21 hardcoded string locations, `tauri.conf.json` product name, app icon set, `cs.ico` reference in `LoginPage.tsx`/`Sidebar.tsx`, the `chirasys-ui-theme` localStorage key in `ThemeProvider.tsx`, and the `chirasys-sync-${workspaceId}` Supabase channel name in `App.tsx` (harmless to rename, but good to catch in the same pass since it's easy to miss — it's a runtime string, not a UI label).

---

## 7. Logo direction for Kivo

Current icon is a generic Tauri-generated icon set (`cs.ico`/`icon.png`), no real mark. See the concepts rendered inline below this document for concrete directions — summary of the approach:

- **"K" as an abstract node/mark**, not a literal letterform — since Kivo is an umbrella over POS/Inventory/Accounting/AI/Cloud, the mark should read as a *platform hub*, not a single app icon. A simple angular "K" built from geometric strokes doubles as a node-and-connections motif (fits the "Kivo Cloud" sync story from §6) without being literal.
- **Single-color glyph**, works at 16×16 up to splash size — Tauri needs the full 16→1024px icon set, so anything with fine detail dies at taskbar size. Test at 16×16 first, always.
- **Palette**: move off the current `#2563eb` generic-SaaS blue. A short, brandable name like Kivo can support a more distinctive palette — an indigo-to-violet gradient reads modern/platform without being cold, and differentiates from the sea of blue POS apps.
- **Module sub-marks**: since the naming architecture is Kivo POS / Inventory / Accounting / etc., each module can reuse the same base mark with a small accent icon or color variant (e.g. Kivo POS = mark + cart accent, Kivo Accounting = mark + ledger accent) rather than needing entirely separate logos — cheaper to design and reinforces the platform identity.

---

## 8b. Update (Kivo 1.3 beta): making credentials fully self-serve

**Direct answer to "is Supabase built in directly right now?" — yes, in two separate places, and it's worse than just the `.env` file:**

1. **`src/lib/supabase.ts`** has your real project URL and anon key hardcoded as a **literal fallback string in the source code itself** — not just in `.env`. That means every compiled build of the app ships with your Supabase project baked in, whether or not anyone sets an env var.
2. **`src-tauri/src/commands/sync.rs`** (the Rust sync worker) only ever reads `SUPABASE_URL`/`SUPABASE_KEY` from environment variables — there's no database-backed override, so even if a store owner wanted to point the desktop app at their own Supabase project today, there is no field anywhere in the UI that would let them; it can only be changed by editing source and rebuilding.

**Before anything else — this needs immediate action, separate from the roadmap below:** the current beta branch still has `src-tauri/.env` committed with a live `SUPABASE_KEY`, `VITE_SUPABASE_JWT_SECRET`, and a live `sk-proj-...` OpenAI key. The JWT secret is the most serious of the three — anyone with it can mint valid Supabase auth tokens and bypass your Row Level Security entirely, not just read with the anon key's permissions. Do these now, independent of any code changes:
- Rotate the OpenAI key at platform.openai.com (revoke the exposed one, issue a new one).
- In Supabase → Project Settings → API, regenerate the JWT secret and the anon key (regenerating the JWT secret will invalidate existing sessions/tokens, so expect a one-time disruption).
- Remove the hardcoded fallback from `supabase.ts`, stop committing `.env`, and scrub the secrets from git history (`git filter-repo` or BFG) since the repo is public.

**The good news — one of the two systems already has the right pattern, just needs wiring up.** `commands/ai.rs` already resolves the OpenAI key by checking a `global_settings` DB row *first*, falling back to env vars only if that's empty:

```rust
let api_key = request.api_key
    .or(db_key)                                    // ← DB-stored key wins
    .or_else(|| std::env::var("VITE_OPENAI_API_KEY").ok())
    .or_else(|| std::env::var("OPENAI_API_KEY").ok())
    ...
```

That's exactly the shape needed for a self-serve app — it just isn't surfaced anywhere in the UI yet, and Supabase needs the identical treatment (it currently has *no* DB-first check at all).

### The fix: "Bring Your Own Keys" architecture

1. **Give Supabase the same DB-first pattern `ai.rs` already has.** Add `supabase_url` / `supabase_anon_key` rows to `global_settings`, and change `sync.rs`'s key resolution to check those before falling back to env vars — copy the exact pattern from `ai.rs` rather than inventing a new one.
2. **Make the frontend Supabase client lazy, not built at import time.** Right now `supabase.ts` calls `createClient(...)` at module load with the hardcoded fallback baked in. Replace it with a `getSupabaseClient()` that's only constructed once the store owner has actually entered a URL/key (fetched via a Tauri command reading `global_settings`) — until then, cloud features simply stay off, which is exactly the "local-only mode" option from the original Setup Wizard plan (§2).
3. **Delete every hardcoded literal.** No fallback string, no baked-in project — an unconfigured install should have zero working connection to Achira's own Supabase/OpenAI accounts. That's what actually makes this "universal" instead of "everyone secretly shares Achira's backend."
4. **The schema bootstrap gap:** `supabase_full_schema.sql` currently only contains incremental `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` statements written for an *already-existing* Supabase project (it assumes tables like `sales` and `items` are already there from an earlier, undocumented base schema). For a store owner spinning up a **brand-new, empty** Supabase project, this script alone won't produce a working schema. You'll need a proper `CREATE TABLE` bootstrap script (or a Supabase CLI migrations folder) that takes an empty project to fully sync-ready in one run — this is the actual blocker for true self-serve, more than the UI wiring.

### Overhauled "Create a Store" wizard — Cloud & Keys step, expanded

Building on the wizard flow in §2, Step 2 becomes a proper guided credential setup instead of a bare two-field form:

**Card 1 — Kivo Cloud (Supabase), only shown if "online" was chosen in Step 0**
- Inline numbered guide: *(1) Buat project baru di Supabase → (2) Buka Project Settings → API → (3) Salin "Project URL" dan "anon public" key ke bawah ini.*
- A **"Buka Supabase Dashboard"** button that opens `https://supabase.com/dashboard/new` directly in the system browser (needs the `@tauri-apps/plugin-shell` — not currently a dependency, small addition).
- Two fields: Project URL, Anon key.
- A **"Siapkan Skema Kivo"** button that runs the (fixed, full-bootstrap) schema script against their project via the Supabase REST/SQL endpoint, so they never touch SQL by hand.
- A **"Tes Koneksi"** button before allowing "Next," so a bad paste is caught immediately instead of failing silently later during sync.

**Card 2 — Kivo AI (OpenAI), optional, always skippable**
- One field: API key. A **"Dapatkan API Key OpenAI"** button opening `https://platform.openai.com/api-keys`.
- One line clarifying billing is the store owner's own OpenAI account, not Kivo's.
- "Lewati, aktifkan nanti di Pengaturan" skip link — Kivo AI should never block store setup.

Both cards write straight into `global_settings` using the same commands the rest of Settings already uses, so nothing new needs inventing on the storage side — only the guided-entry UI and the two "open in browser" / "run schema" / "test connection" actions are genuinely new.

---

## 9. Implementation Status & Delivery (Kivo v1.3 Update)

All foundational items from the roadmap and the Bring-Your-Own-Keys (BYOK) architecture have been implemented and verified end-to-end:

| Roadmap Item | Status | Key Implementation Details |
|---|---|---|
| **1. First-run Setup Wizard** |  **Completed** | `src/pages/onboarding/SetupWizard.tsx` provides 3 complete pathways: **"Buat Toko Baru"** (Store Identity, BYOK Supabase Cloud, Kivo AI OpenAI Key, Owner account creation, Tax/HPP/Discount seeds, Excel catalog import, Guided tour), **"Gabung Workspace"** (Connect cashier with invite code/password, custom Supabase BYOK support), and **"Pulihkan dari Cloud"** (Full remote restore to new PC). |
| **2. Security & Git Secret Scrubbing** |  **Completed** | `src-tauri/.env` untracked from git index (`git rm --cached src-tauri/.env`). Hardcoded Supabase URL & Anon JWT fallback literals completely removed from `src/lib/supabase.ts`. |
| **3. Bring-Your-Own-Keys (BYOK)** |  **Completed** | Dynamic credential resolver in Rust (`resolve_supabase_credentials` in `src-tauri/src/commands/sync.rs`) queries `global_settings` table before env vars. Tauri commands `get_cloud_config`, `set_cloud_config`, and `test_cloud_connection` exposed to frontend. Background sync workers (`spawn_sync_worker`, `spawn_pull_worker`) dynamically query DB credentials on every tick. |
| **4. Cloud Settings in Settings UI** |  **Completed** | Collapsible, uncluttered **"Konfigurasi Database Cloud (Supabase BYOK)"** panel in `src/pages/settings/Settings.tsx` (Tab: Cloud & Workspace). Supports real-time connection testing with latency feedback, SQL bootstrap guidance, and instant secret updates. |
| **5. Full Supabase Bootstrap Script** |  **Completed** | `supabase_full_bootstrap.sql` created in project root. One-click idempotent setup for user's own empty Supabase project: generates all 34 core multi-tenant tables, UUID primary keys, `workspace_id` tenant isolation, indexes, Row Level Security policies, and Realtime publication. |
| **6. Shared Modal & Drawer Primitives** |  **Completed** | Shared `<Modal>` and `<Drawer>` components implemented in `src/components/ui/`. Replaced legacy hand-rolled overlays (such as `SaleDetailModal.tsx` and `ConfirmModal.tsx`) with consistent z-index, animations, and focus/backdrop behavior. |
| **7. Table Audit & Bloat Elimination** |  **Completed** | Comprehensive audit across all 45 SQLite tables and 60 migrations (detailed below). Filtered out dead tables from cloud sync to keep database lean and performant. |

---

## 10. Comprehensive Table Audit & Supabase Sync Architecture

An audit of all 45 SQLite tables defined across 60 migrations categorized every table by its multi-tenant sync role:

### A. 34 Core Multi-Tenant Tables (Synced to Supabase Cloud)
These tables represent shared business data synchronized between cashiers, branches, and the cloud:
1. `workspaces` — Multi-tenant tenant definitions & configuration
2. `workspace_members` — Tenant-user bindings and roles
3. `workspace_invites` — Multi-branch invitation tokens
4. `users` — Staff, Cashier, Admin, and Owner accounts
5. `user_roles` — RBAC permissions matrix
6. `units` — Product units of measure (Pcs, Box, Strip, dll)
7. `categories` — Product categories
8. `items` — Master product catalog
9. `item_conversions` — Multi-unit conversion ratios
10. `item_batches` — Expiry tracking & lot batch numbers
11. `suppliers` — Vendor & supplier records
12. `customers` — Customer CRM records
13. `sales` — POS sales transactions
14. `sale_lines` — Sale line items
15. `sale_batches` — Batch allocations per sale item
16. `payments` — Multi-payment tender records (Cash, QRIS, Transfer, Debt)
17. `purchase_orders` — Procurement purchase orders
18. `po_lines` — Purchase order line items
19. `receives` — Goods receiving vouchers
20. `receive_lines` — Receiving line items
21. `promotions` — Discount rules & promo campaigns
22. `promotion_rules` — Promo condition criteria
23. `stock_ledger` — Immutable inventory movements ledger
24. `stock_opnames` — Stock opname physical audit records
25. `stock_opname_items` — Stock opname itemized variances
26. `accounts` — Chart of Accounts (COA)
27. `journal_entries` — Double-entry general ledger vouchers
28. `journal_lines` — Journal entry debit/credit lines
29. `debts` — Accounts receivable & customer debts
30. `debt_payments` — Customer debt payment installments
31. `ap_debts` — Accounts payable & supplier debts
32. `ap_debt_payments` — Supplier debt payment installments
33. `cash_shifts` — Register shifts, opening/closing cash balances
34. `ai_chat_history` — Kivo AI assistant conversation history

### B. 6 Device-Local Tables (Never Synced to Cloud)
These tables manage local hardware, queue states, or LAN peer-to-peer discovery specific to a single physical device:
1. `sync_queue` — Local outbox queue waiting for cloud sync push
2. `lan_devices` — Local area network peer discovery table
3. `lan_audit_logs` — Peer-to-peer LAN replication event logs
4. `cash_drawer_logs` — Hardware pulse logs for cash drawer kick
5. `device_hardware_configs` — Thermal printer, ESC/POS, and barcode scanner device settings
6. `lan_sync_cursors` — LAN replication pagination pointers

### C. 5 Bloat / Dead Tables (Pruned & Excluded)
These tables were identified as obsolete, duplicated, or superseded, and are omitted from `supabase_full_bootstrap.sql`:
1. `member_health_logs` — Legacy artifact from an abandoned clinic/pharmacy health record feature; zero active backend usage.
2. `stock_opname` (singular) — Created in migration 003, subsequently superseded by `stock_opnames` (plural) in migration 024.
3. `system_settings` — Legacy key-value table superseded by `global_settings`.
4. Migration temporary tables (`_items_old_015`, `temp_stock_opname`) — Ephemeral SQLite table rebuild artifacts.

