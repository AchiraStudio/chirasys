import { useEffect, useState } from 'react';
import { getAccounts, deleteAccount, Account } from '../../lib/api';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import AccountDrawer from './AccountDrawer';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string, isSystem: number) => {
    if (isSystem === 1) {
      alert("System accounts cannot be deactivated or deleted.");
      return;
    }
    if (confirm('Are you sure you want to toggle active status for this account?')) {
      try {
        await deleteAccount(id);
        fetchAccounts();
      } catch (e: any) {
        alert(e.toString());
      }
    }
  };

  const getTypeColor = (type: string) => {
      switch(type) {
          case 'asset': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'liability': return 'bg-red-100 text-red-700 border-red-200';
          case 'equity': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'income': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case 'expense': return 'bg-amber-100 text-amber-700 border-amber-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Chart of Accounts</h2>
          <p className="text-slate-600 text-sm mt-1">Manage standard accounting ledgers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditAccountId(null); setIsDrawerOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Account
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 bg-slate-50/50 dark:bg-slate-800/50 uppercase font-semibold sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Code</th>
                <th className="px-6 py-4">Account Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Normal Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-600">Loading accounts...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-600">No accounts found.</td></tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${acc.is_active === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-3 font-mono font-medium text-slate-900 dark:text-white">
                      {acc.code}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {acc.is_system === 1 && <Lock size={14} className="text-amber-500" />}
                        {acc.name}
                    </td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded border text-xs font-semibold capitalize ${getTypeColor(acc.type)}`}>
                            {acc.type}
                        </span>
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-600 dark:text-slate-400">{acc.normal_balance}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${acc.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => { setEditAccountId(acc.id); setIsDrawerOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                      <button 
                        onClick={() => handleDelete(acc.id, acc.is_system)} 
                        className={`p-1.5 ml-1 transition-colors ${acc.is_system === 1 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-500 hover:text-amber-600'}`}
                        disabled={acc.is_system === 1}
                        title={acc.is_system === 1 ? 'System account' : 'Toggle Active'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AccountDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSaved={fetchAccounts} 
        editAccountId={editAccountId} 
      />
    </div>
  );
}
