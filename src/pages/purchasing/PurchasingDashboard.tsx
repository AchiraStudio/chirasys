// src/pages/purchasing/PurchasingDashboard.tsx
import { useState, useEffect } from 'react';
import { getPurchaseOrders, getPurchases, PurchaseOrder, Purchase, cancelPurchaseOrder, getSuppliers, Supplier } from '../../lib/api';
import { Loader2, Plus, FileText, CheckCircle2, Clock, Inbox, X } from 'lucide-react';
import PoDrawer from './PoDrawer';
import ReceiveDrawer from './ReceiveDrawer';
import PurchaseDetail from './PurchaseDetail';

export default function PurchasingDashboard() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'po' | 'purchases'>('po');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierFilter, setSupplierFilter] = useState('');

  const [isPoDrawerOpen, setIsPoDrawerOpen] = useState(false);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const DEFAULT_BRANCH_ID = 'branch_001';

  const loadPOs = () => getPurchaseOrders(DEFAULT_BRANCH_ID).then(setPos);
  const loadPurchases = () => getPurchases(DEFAULT_BRANCH_ID).then(setPurchases);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPOs(), loadPurchases(), getSuppliers().then(setSuppliers)]).finally(() => setLoading(false));
  }, []);

  const refreshAll = () => {
    loadPOs();
    loadPurchases();
  };

  const handleCancelPO = async (poId: string) => {
    if (!confirm('Are you sure you want to cancel this Purchase Order?')) return;
    try {
      await cancelPurchaseOrder(poId);
      refreshAll();
    } catch (e: any) {
      alert(e.toString());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'sent':
      case 'unpaid':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'partial':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  if (selectedPurchaseId) {
    return <PurchaseDetail purchaseId={selectedPurchaseId} onBack={() => setSelectedPurchaseId(null)} />;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchasing</h1>
          <p className="text-sm text-slate-600 mt-1">Manage supplier orders, received goods, and payments.</p>
        </div>
        {view === 'po' && (
          <button onClick={() => setIsPoDrawerOpen(true)} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-600 transition-colors">
            <Plus size={18} /> New Purchase Order
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('po')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'po' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setView('purchases')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'purchases' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          Received Goods
        </button>
      </div>

      {view === 'po' ? (
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div> : (
            <div className="flex-1 overflow-y-auto custom-scrollbar relative"><table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-600 font-semibold z-10">
                <tr>
                  <th className="py-4 px-6">PO Number</th>
                  <th className="py-4 px-6">Supplier</th>
                  <th className="py-4 px-6">Expected Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {pos.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">No Purchase Orders found. Create your first one!</td></tr>
                ) : pos.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 flex items-center gap-2">
                      <FileText size={14} className="text-slate-500" />
                      {po.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="py-4 px-6 font-bold">{po.supplier_name}</td>
                    <td className="py-4 px-6 text-slate-600 flex items-center gap-1"><Clock size={14}/> {po.expected_date || 'N/A'}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right flex justify-end gap-2">
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <>
                          <button onClick={() => handleCancelPO(po.id)} className="bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-200 transition-colors shadow-sm flex items-center gap-1.5">
                            <X size={14} /> Cancel
                          </button>
                          <button onClick={() => setReceivePoId(po.id)} className="bg-brand text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5">
                            <Inbox size={14} /> Receive Goods
                          </button>
                        </>
                      )}
                      {po.status === 'received' && (
                        <span className="text-emerald-500 flex items-center justify-end gap-1 text-xs font-bold uppercase"><CheckCircle2 size={14}/> Completed</span>
                      )}
                      {po.status === 'cancelled' && (
                        <span className="text-rose-500 flex items-center justify-end gap-1 text-xs font-bold uppercase"><X size={14}/> Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      ) : (
        /* Received Goods List */
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-brand"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div> : (
            <div className="flex-1 overflow-y-auto custom-scrollbar relative"><table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-600 font-semibold z-10">
                <tr>
                  <th className="py-4 px-6">Invoice No</th>
                  <th className="py-4 px-6">Supplier</th>
                  <th className="py-4 px-6">Total</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {purchases.filter(p => !supplierFilter || p.supplier_id === supplierFilter).length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">No received goods yet.</td></tr>
                ) : purchases.filter(p => !supplierFilter || p.supplier_id === supplierFilter).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                    <td className="py-4 px-6 font-bold flex items-center gap-2">
                      <FileText size={14} className="text-slate-500" />
                      {p.invoice_no || 'No Invoice'}
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      {suppliers.find(s => s.id === p.supplier_id)?.name || 'Unknown Supplier'}
                    </td>
                    <td className="py-4 px-6 font-mono">Rp {p.total_amount.toLocaleString('id-ID')}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedPurchaseId(p.id)}
                        className="bg-brand text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* Drawers */}
      <PoDrawer isOpen={isPoDrawerOpen} onClose={() => setIsPoDrawerOpen(false)} onSuccess={refreshAll} branchId={DEFAULT_BRANCH_ID} />
      {receivePoId && <ReceiveDrawer isOpen={!!receivePoId} poId={receivePoId} branchId={DEFAULT_BRANCH_ID} onClose={() => setReceivePoId(null)} onSuccess={refreshAll} />}
    </div>
  );
}