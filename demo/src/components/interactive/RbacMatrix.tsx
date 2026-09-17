import React, { useState } from 'react';
import { ShieldCheck, Check, X, User } from 'lucide-react';

interface PermissionRow {
  name: string;
  category: string;
  owner: boolean;
  sysadmin: boolean;
  admin: boolean;
  manager: boolean;
  cashier: boolean;
  staff: boolean;
}

const ROLES = ['owner', 'sysadmin', 'admin', 'manager', 'cashier', 'staff'] as const;
type RoleType = typeof ROLES[number];

const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  owner: 'Owner — Memiliki kendali mutlak seluruh sistem, termasuk pembersihan cloud (nuke), pengelolaan hak akses, dan manajemen workspace.',
  sysadmin: 'Sysadmin — Mengelola infrastruktur cloud, database SQLite, hardware POS, dan integrasi API tanpa campur tangan operasional kasir harian.',
  admin: 'Admin — Menjalankan operasional penuh toko: katalog produk, kasir POS, pembelian, retur, dan laporan keuangan harian.',
  manager: 'Manager — Mengawasi stok inventaris, persetujuan purchase order, rekonsiliasi opname, dan memantau laba rugi.',
  cashier: 'Cashier — Melayani transaksi penjualan, mencetak struk, buka/tutup shift laci kasir, dan melihat histori shift pribadi.',
  staff: 'Staff — Hak akses minimal: hanya untuk pembuatan penjualan dan pengecekan harga produk.',
};

const PERMISSIONS: PermissionRow[] = [
  { name: 'Transaksi Kasir & Cetak Struk', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: true, staff: true },
  { name: 'Buka / Tutup Shift & Rekonsiliasi Kas', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: true, staff: false },
  { name: 'Retur Penjualan & Void Invoice', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Kelola Katalog Produk & Harga Grosir', category: 'Inventory', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Stock Opname & Penyesuaian Selisih', category: 'Inventory', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Pembuatan Purchase Order (PO) & Receiving', category: 'Purchasing', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Akses Laporan Laba Rugi & Neraca', category: 'Accounting', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Kelola User & Konfigurasi BYOK Cloud', category: 'Settings', owner: true, sysadmin: true, admin: false, manager: false, cashier: false, staff: false },
  { name: 'Pembersihan Data Cloud (Safe Nuke)', category: 'Settings', owner: true, sysadmin: true, admin: true, manager: false, cashier: false, staff: false },
];

export const RbacMatrix: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleType>('cashier');

  return (
    <div className="card" style={{ padding: 24, marginTop: 24 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Matriks Hak Akses &amp; Keamanan Berbasis Peran (RBAC)</span>
          <p className="panel-sub">Klik salah satu peran untuk melihat cakupan wewenang akun secara mendalam.</p>
        </div>
        <span className="pill">
          <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
          Granular Security
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
        {ROLES.map(role => (
          <button
            key={role}
            type="button"
            className={`pill ${activeRole === role ? 'ep' : ''}`}
            onClick={() => setActiveRole(role)}
            style={{
              cursor: 'pointer',
              borderColor: activeRole === role ? 'var(--primary)' : 'var(--line)',
              background: activeRole === role ? 'var(--primary-soft)' : 'transparent',
              color: activeRole === role ? 'var(--heading)' : 'var(--body)',
            }}
          >
            <User size={12} />
            <span style={{ textTransform: 'capitalize' }}>{role}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--muted)', marginBottom: 16, fontSize: 12.5, color: 'var(--heading)' }}>
        {ROLE_DESCRIPTIONS[activeRole]}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="k-table">
          <thead>
            <tr>
              <th>Fitur &amp; Modul</th>
              <th>Kategori</th>
              {ROLES.map(r => (
                <th
                  key={r}
                  style={{
                    textAlign: 'center',
                    background: activeRole === r ? 'var(--muted-h)' : 'transparent',
                    textTransform: 'capitalize',
                  }}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.name}>
                <td><b>{p.name}</b></td>
                <td><span className="chip" style={{ height: 22, fontSize: 10 }}>{p.category}</span></td>
                {ROLES.map(r => {
                  const hasAccess = p[r];
                  const isCurRole = activeRole === r;
                  return (
                    <td
                      key={r}
                      style={{
                        textAlign: 'center',
                        background: isCurRole ? 'var(--muted-h)' : 'transparent',
                      }}
                    >
                      {hasAccess ? (
                        <Check size={15} style={{ color: 'var(--success)', margin: '0 auto' }} />
                      ) : (
                        <X size={15} style={{ color: 'var(--dim)', opacity: 0.3, margin: '0 auto' }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RbacMatrix;

