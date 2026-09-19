import React, { useState } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';

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
  owner: 'Owner — Root sovereign authority over the entire platform, including cloud credentials, role provisioning, and workspace architecture.',
  sysadmin: 'Sysadmin — Manages cloud sync topologies, local SQLite maintenance, POS hardware bindings, and API configurations.',
  admin: 'Admin — Full store operational oversight: catalog hierarchy, checkout terminal management, purchasing, and daily general ledger.',
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
          <p className="panel-sub">Select any personnel tier to inspect security boundaries and authorization scopes.</p>
        </div>
        <span className="panel-security-tag">
          <ShieldCheck size={13} className="text-success" />
          <span>Permissions</span>
        </span>
      </div>

      {/* Architectural Role Deck (No pill buttons) */}
      <div className="rbac-deck-tabs">
        {ROLES.map((role, idx) => {
          const isSelected = activeRole === role;
          return (
            <button
              key={role}
              type="button"
              className={`rbac-deck-tab ${isSelected ? 'active' : ''}`}
              onClick={() => setActiveRole(role)}
            >
              <span className="rbac-tab-num">0{idx + 1}</span>
              <span className="rbac-tab-label">{role}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '12px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--elevated) 70%, transparent)', border: '1px solid var(--line)', marginBottom: 16, fontSize: 13, color: 'var(--heading)', lineHeight: 1.5 }}>
        {ROLE_DESCRIPTIONS[activeRole]}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="k-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Category</th>
              {ROLES.map(r => (
                <th
                  key={r}
                  style={{
                    color: activeRole === r ? 'var(--primary)' : 'var(--dim)',
                    background: activeRole === r ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                    textTransform: 'capitalize',
                  }}
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => {
              return (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>
                    <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--dim)' }}>
                      {p.category}
                    </span>
                  </td>
                  {ROLES.map(r => {
                    const allowed = p[r];
                    const isSelected = activeRole === r;
                    return (
                      <td
                        key={r}
                        style={{
                          background: isSelected ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'transparent',
                        }}
                      >
                        {allowed ? (
                          <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} />
                          </span>
                        ) : (
                          <span style={{ color: 'var(--dim)', opacity: 0.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={13} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RbacMatrix;
