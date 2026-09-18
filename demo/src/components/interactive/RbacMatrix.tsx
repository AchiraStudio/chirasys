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
  owner: 'Owner — Holds root sovereign authority over the entire platform, including database purging (nuke), role assignment, and workspace configuration.',
  sysadmin: 'Sysadmin — Manages cloud sync topologies, local SQLite maintenance, POS hardware bindings, and API integrations without daily cashier operational noise.',
  admin: 'Admin — Full store operational oversight: product catalogs, POS cashiering, purchasing, customer returns, and daily financial statements.',
  manager: 'Manager — Supervises inventory movements, purchase order approvals, stock opname variances, and gross margin analytics.',
  cashier: 'Cashier — Operates checkout POS, prints customer receipts, opens/closes register shifts, and inspects personal shift cash totals.',
  staff: 'Staff — Read-mostly frontline permissions: barcode product lookup, price checks, and assisted checkout order draft creation.',
};

const PERMISSIONS: PermissionRow[] = [
  { name: 'Cashier Checkout & Thermal Printing', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: true, staff: true },
  { name: 'Open / Close Shift & Cash Reconciliation', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: true, staff: false },
  { name: 'Sales Returns & Invoice Voids', category: 'POS', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Product Catalog & Tiered Pricing', category: 'Inventory', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Stock Opname & Variance Adjustments', category: 'Inventory', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Purchase Orders (PO) & Goods Receiving', category: 'Purchasing', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'Profit & Loss (P&L) and Balance Sheet', category: 'Accounting', owner: true, sysadmin: false, admin: true, manager: true, cashier: false, staff: false },
  { name: 'User Management & Cloud BYOK Settings', category: 'Settings', owner: true, sysadmin: true, admin: false, manager: false, cashier: false, staff: false },
  { name: 'Cloud Data Flush (Safe Nuke)', category: 'Settings', owner: true, sysadmin: true, admin: true, manager: false, cashier: false, staff: false },
];

export const RbacMatrix: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleType>('cashier');

  return (
    <div className="card" style={{ padding: 24, marginTop: 24 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Role-Based Access Control (RBAC) Matrix</span>
          <p className="panel-sub">Select any personnel role to inspect account permissions and security boundaries.</p>
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
              <th>Feature / Capability</th>
              <th>Category</th>
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

