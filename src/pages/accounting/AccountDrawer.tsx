import { useState, useEffect } from 'react';
import { Save, BookOpen } from 'lucide-react';
import { CreateAccountInput, getAccounts, createAccount, updateAccount, Account } from '../../lib/api';
import Drawer from '../../components/ui/Drawer';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
      toast.error('Failed to save account: ' + error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={editAccountId ? 'Edit Akun Rekening' : 'Tambah Akun Baru'}
      subtitle="Kelola bagan akun (Chart of Accounts)"
      icon={BookOpen}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-body hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="accountForm"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Menyimpan...' : 'Simpan Akun'}
          </button>
        </div>
      }
    >
      <form id="accountForm" onSubmit={handleSubmit} className="space-y-4">
        {isSystem && (
          <div className="p-3.5 bg-warning-soft dark:bg-warning/20 border border-warning/30 dark:border-warning/40 text-warning dark:text-warning rounded-xl text-xs">
            Akun sistem bawaan. Tipe akun dan saldo normal dilindungi dan tidak dapat diubah.
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Kode Akun *</label>
          <input
            required
            type="text"
            value={formData.code}
            onChange={e => setFormData({...formData, code: e.target.value})}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm font-mono text-heading outline-none focus:ring-2 focus:ring-primary"
            placeholder="contoh: 1-1001"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Nama Akun *</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
            placeholder="contoh: Kas di Bank BCA"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Klasifikasi Tipe Akun</label>
          <Select 
            value={formData.type} 
            onChange={v => handleTypeChange(v)} 
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary capitalize disabled:opacity-50"
            disabled={isSystem}
          >
            <option value="asset">Aset (Harta)</option>
            <option value="liability">Kewajiban (Hutang)</option>
            <option value="equity">Ekuitas (Modal)</option>
            <option value="income">Pendapatan</option>
            <option value="expense">Beban / Biaya</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Saldo Normal</label>
          <Select 
            value={formData.normal_balance} 
            onChange={v => setFormData({...formData, normal_balance: v})} 
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary capitalize disabled:opacity-50"
            disabled={isSystem}
          >
            <option value="debit">Debit</option>
            <option value="credit">Kredit</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Induk Akun (Parent - Opsional)</label>
          <Select 
            value={formData.parent_id || ''} 
            onChange={v => setFormData({...formData, parent_id: v || undefined})} 
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tidak ada (Tingkat Utama / Root)</option>
            {accounts.filter(a => a.id !== editAccountId).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.code} - {cat.name}</option>
            ))}
          </Select>
        </div>
      </form>
    </Drawer>
  );
}
