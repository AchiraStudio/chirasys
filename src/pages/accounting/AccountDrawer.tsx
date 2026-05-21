import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { CreateAccountInput, getAccounts, createAccount, updateAccount, Account } from '../../lib/api';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editAccountId: string | null;
}

export default function AccountDrawer({ isOpen, onClose, onSaved, editAccountId }: AccountDrawerProps) {
  const [formData, setFormData] = useState<CreateAccountInput>({
    code: '',
    name: '',
    type: 'asset',
    normal_balance: 'debit',
  });
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSystem, setIsSystem] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      if (editAccountId) {
        loadAccount();
      } else {
        setFormData({
          code: '',
          name: '',
          type: 'asset',
          normal_balance: 'debit',
        });
        setIsSystem(false);
      }
    }
  }, [isOpen, editAccountId]);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAccount = async () => {
    try {
      const data = await getAccounts();
      const account = data.find(a => a.id === editAccountId);
      if (account) {
        setFormData({
          code: account.code,
          name: account.name,
          type: account.type,
          parent_id: account.parent_id,
          normal_balance: account.normal_balance,
        });
        setIsSystem(account.is_system === 1);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTypeChange = (newType: string) => {
    const normalBalance = (newType === 'asset' || newType === 'expense') ? 'debit' : 'credit';
    setFormData({ ...formData, type: newType, normal_balance: normalBalance });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editAccountId) {
        await updateAccount(editAccountId, formData);
      } else {
        await createAccount(formData);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save account: ' + error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editAccountId ? 'Edit Account' : 'New Account'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="accountForm" onSubmit={handleSubmit} className="space-y-4">
            
            {isSystem && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm mb-4">
                This is a system account. Type and Normal Balance cannot be changed.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Code</label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="input-field font-mono" placeholder="e.g. 1-1001" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Cash in Bank" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Type</label>
              <select 
                value={formData.type} 
                onChange={e => handleTypeChange(e.target.value)} 
                className="input-field capitalize"
                disabled={isSystem}
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Normal Balance</label>
              <select 
                value={formData.normal_balance} 
                onChange={e => setFormData({...formData, normal_balance: e.target.value})} 
                className="input-field capitalize"
                disabled={isSystem}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parent Account (Optional)</label>
              <select 
                value={formData.parent_id || ''} 
                onChange={e => setFormData({...formData, parent_id: e.target.value || undefined})} 
                className="input-field"
              >
                <option value="">None (Top Level)</option>
                {accounts.filter(a => a.id !== editAccountId).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.code} - {cat.name}</option>
                ))}
              </select>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="accountForm" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </div>
    </>
  );
}
