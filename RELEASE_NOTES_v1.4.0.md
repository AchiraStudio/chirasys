# 🚀 Kivo v1.4.0 Release Notes

**Release Date:** September 19, 2026  
**Baseline Comparison:** `v1.3.2` ([`99f9a3b`](https://github.com/AchiraStudio/kivo/commit/99f9a3b2bbc2fa2865bc2d5e393352dad06ceaf7)) ➔ `v1.4.0` (HEAD [`3cd064b`](https://github.com/AchiraStudio/kivo/commit/3cd064b))  
**Diff Summary:** 109 files changed, **+17,232 insertions**, **-938 deletions**  

---

## 🌟 Executive Summary

**Kivo v1.4.0** marks a quantum leap in accessibility, mobility, and multi-device store operations. 

While v1.3.2 established our enterprise offline-first foundation and BYOK cloud architecture, **v1.4.0 transforms every tablet and smartphone into a full-featured POS terminal without requiring any software installation**. By pairing a high-speed embedded Rust LAN HTTP/WebSocket server with dynamic Host QR pairing, instant cross-device payment broadcasts, a complete mobile and tablet UX overhaul, and an upgraded showcase landing page, Kivo v1.4.0 delivers a frictionless, multi-device retail experience.

---

## 📱 1. Zero-Install Multi-Device Web Terminal (LAN Host Engine)

The headline feature of v1.4.0 empowers store owners and cashiers to open additional checkout stations on any device connected to the store's Wi-Fi network:

* **Embedded Rust LAN Web Server (`src-tauri/src/commands/lan.rs`):**
  * Tauri backend natively hosts a lightweight, multi-threaded HTTP/RPC server (default port `3699`) directly on the main desktop cashier.
  * Completely offline: does not consume external cloud bandwidth or depend on internet connectivity.
* **Instant QR Code Pairing (`HostQrModal.tsx`):**
  * Cashiers can click **Host QR v1.4** in the topbar to display an animated QR code and LAN URL (e.g. `http://192.168.1.7:3699`).
  * Waiters and secondary cashiers scan the QR code with their smartphone or iPad camera to instantly open Kivo in their mobile browser.
* **Seamless Host Session Inheritance:**
  * Web clients automatically inherit the host's active workspace, branch ID, and authorized session upon connecting.
  * Remote web terminals gracefully bypass desktop-only initial setup wizards.
* **Bidirectional LAN RPC Gateway (`api.ts` & `lan.rs`):**
  * Web runtime transparently routes native Tauri commands (`get_items`, `checkout_sale`, `get_sync_status`, `get_categories`, `assign_user_workspace`, etc.) over HTTP POST RPC to the host terminal.
* **Real-Time Cross-Device Payment Broadcasts (`useRealtimeSync.ts`):**
  * Sales recorded on a mobile web client instantly emit `chirasys:payment_success` to the host and all connected terminals via Server-Sent Events / LAN polling.
  * Product inventory counters update instantaneously across all screens with zero manual refresh.

---

## 🎨 2. Mobile & Tablet UI/UX Overhaul ("Compact & Space-Efficient")

Every view and interaction was audited and rebuilt to maximize usable screen real estate on mobile phones and tablets:

* **Adaptive Shell & Navigation (`MobileNav.tsx`, `MobileMenuDrawer.tsx`, `Sidebar.tsx`):**
  * **Bottom Navigation Bar**: Ergonomic thumb-friendly navigation bar on mobile with quick access to *Kasir*, *Ringkasan*, *Produk*, *Laporan*, and *Menu*.
  * **Slide-Over Drawer**: Clean sliding drawer containing deep links (Accounting, Purchasing, Suppliers, Hardware Settings) with animated backdrop blur.
  * **Full-Width Workspace**: Desktop sidebar hidden on screens `< 768px` (`hidden md:flex`), liberating 100% of the screen for cashier operations.
  * **Streamlined Topbar**: Topbar height slimmed down to `h-12 sm:h-13 lg:h-14`; desktop zoom buttons auto-hidden on screens `< 1024px`.
* **Mobile-First POS Experience (`POS.tsx`):**
  * **Balanced 50/50 View Switcher**: Symmetrical 2-column segmented control grid (`grid grid-cols-2 gap-1.5`) between *Katalog Produk* and *Keranjang*. Eliminated awkward text wrapping, icon collision, and duplicate counters.
  * **Keyboard Bar Suppression**: Desktop `F1`–`F8` shortcut hint bar hidden on screens `< 1024px`, regaining ~50px of vertical space.
  * **Floating Cart Capsule**: An interactive floating cart bar appears at the bottom of the catalog when items are selected, showing total items and real-time rupiah calculation with 1-tap checkout.
  * **Touch-Optimized Payment Modal (`PaymentModal.tsx`):** Responsive grid switching from `md:grid-cols-12` to a clean single-column stack on smartphones with oversized numeric numpads and quick payment method chips.
* **Touch-Safe & Viewport-Adaptive Modals (`Modal.tsx`):**
  * Modals capped at `max-h-[90dvh]` to account for dynamic mobile browser address bars and software keyboards.
  * Flexible width (`w-[calc(100vw-1.5rem)] sm:w-full`) preventing horizontal edge clipping.
* **Card-Based Mobile Analytics (`Dashboard.tsx`):**
  * Recent transactions transform from wide desktop tables into touchable mobile transaction cards with 1-tap drill-down.

---

## 💊 3. Standout Product Item Cards & Catalog Experience

Product cards on the POS terminal received a comprehensive visual redesign:

* **Category Visual Avatars (`getCategoryAvatar`):**
  * Products now feature distinct, category-themed visual avatars with soft ambient backgrounds and custom iconography:
    * **ALKES / Medical**: Sky-blue theme with `<Activity />`.
    * **Obat / Antibiotik / Oral / Sirup**: Lavender-purple theme with `<Pill />`.
    * **Baby / Perawatan / Beauty**: Rose-pink theme with `<Sparkles />`.
    * **Herbal / Vitamin / Suplemen**: Emerald-green theme with `<Pill />`.
    * **General Retail**: Violet-indigo theme with `<Package />`.
* **Color-Coded Status Dots for Stock Levels:**
  * **In Stock (> 5)**: Green badge with status dot `● {stock}`.
  * **Low Stock (1–5)**: Amber badge with pulsing urgency dot `● Sisa {stock}`.
  * **Out of Stock (0)**: Rose badge with status dot `● Habis` and soft opacity card dimming.
* **Instant In-Cart Visual Feedback:**
  * Selecting an item activates a primary border and ring glow (`border-primary ring-2 ring-primary/25 bg-primary/[0.04]`).
  * A floating pill badge `✓ {inCartQty}` appears in the top-right corner of the card.
  * The bottom-right `+` button lights up in solid primary purple.
* **Pharmaceutical & Retail Metadata:**
  * High-contrast bold typography for product names.
  * Automated **`Rx`** prescription badges for prescription-only medicines.
  * Prominent font-mono price paired cleanly with base unit (`/ PCS`, `/ BOX`).

---

## 🌐 4. Demo Landing Page Upgrade to v1.4.0 (`demo/`)

The marketing showcase at `/demo` was synchronized with all v1.4.0 capabilities:

* **Interactive App Simulator Window (`InteractiveAppWindow.tsx`):**
  * Added **Host QR v1.4** button to the simulated desktop topbar.
  * Interactive modal simulation displaying the LAN host URL, QR code, and connected live terminal indicators (e.g. iPad Kasir 2, iPhone Waiter).
  * Smooth branch switcher pill with automatic text truncation.
* **Mobile Landing Page Optimization (`demo.css` & `Navbar.tsx`):**
  * Header actions (GitHub & Get Kivo) hidden on small screens in favor of the mobile drawer, preventing header squishing.
  * Horizontal touch momentum scroll on navigation tabs (`scrollbar-width: none`).
  * 3-column segmented grid for financial report periods.
  * Section overflow clipping (`overflow: hidden`) preventing unwanted horizontal page wobble caused by ambient glow effects.

---

## 🧹 5. Authoritative Cloud Workspace Synchronization & Bug Fixes

* **Authoritative Supabase Workspace Verification (`sync.rs`):**
  * When fetching workspace lists, Supabase Cloud is now the authoritative source of truth when online.
  * If an active workspace configured in `global_settings` was deleted on the cloud, the local client automatically clears `workspace_id`, `workspace_name`, and `workspace_code` from `global_settings`, sets user associations to `NULL`, and purges pending sync queue records.
* **Elimination of Phantom Workspaces (`UserManagement.tsx` & `Settings.tsx`):**
  * Removed legacy code that artificially re-injected deleted workspaces into dropdowns.
  * Users assigned to deleted workspaces are cleanly marked as unassigned.
* **LAN Workspace Management RPCs:**
  * Registered missing RPC commands (`get_available_workspaces`, `sysadmin_get_workspaces`, `sysadmin_delete_workspace`, `assign_user_workspace`, `leave_workspace`) on the LAN server so web clients stay synchronized with host workspace state.

---

## 🗄️ 6. Database Migrations & Enhancements (`043` – `060`)

1. **`048_quantity_price_tiers.sql`**: Schema support for multi-unit quantity-based wholesale price tiering.
2. **`051_role_permissions.sql` & `055_sync_users_and_permissions.sql`**: Granular role-based access control synchronized across local and cloud instances.
3. **`053_sync_items_and_tiers_triggers.sql`**: Automated SQLite triggers for capturing price tier modifications into the sync queue.
4. **`054_lan_sync_config.sql` & `058_staff_lan_permission.sql`**: Network configuration tables and staff permissions for local LAN terminal hosting.
5. **`057_deduplicate_categories_and_brands.sql`**: Automatic cleanup and case-insensitive deduplication of category and brand master data.
6. **`060_disable_network_sync_defaults.sql`**: Hardened network defaults to prevent unwanted background sync attempts on unconfigured offline terminals.

---

## 📊 Summary of Modified Files & Components

| Component | Scope | Key Contributions |
| :--- | :--- | :--- |
| **`src-tauri/src/commands/lan.rs`** | Backend | Embedded HTTP/RPC server, static web file hosting, multi-threaded RPC handlers. |
| **`src-tauri/src/commands/sync.rs`** | Backend | Authoritative cloud workspace validation, sync queue purge for deleted stores. |
| **`src/pages/pos/`** | POS Frontend | Symmetrical mobile tab bar, standout product cards, stock dots, live cart badges. |
| **`src/components/layout/`** | UI Shell | `MobileNav.tsx`, `MobileMenuDrawer.tsx`, streamlined Topbar and Sidebar. |
| **`src/hooks/useRealtimeSync.ts`** | State Sync | LAN polling engine, multi-device cross-tab payment event listeners. |
| **`src/lib/api.ts`** | Data Layer | Universal RPC fallback router dispatching native commands to LAN host. |
| **`demo/`** | Showcase | v1.4.0 Interactive Window, Host QR simulator, mobile responsive stylesheet overhaul. |

---

## 🎯 Verification & Build Metrics

* **Core Application Build (`npm run build`):** **PASSED** (1932 modules compiled in 8.81s, 0 errors).
* **Demo Application Build (`demo/npm run build`):** **PASSED** (1890 modules compiled in 1.42s, 0 errors).
* **Rust Backend Compilation (`cargo check`):** **PASSED** (Checked `chirasys v1.4.0` in `src-tauri`, 0 errors).

