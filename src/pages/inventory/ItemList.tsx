import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Eye, Trash2, Edit } from 'lucide-react';
import { getItemsFiltered, deleteItem, Item } from '../../lib/api';

interface ItemListProps {
  onViewItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onAddItem: () => void;
  refreshTrigger: number;
}

export default function ItemList({ onViewItem, onEditItem, onAddItem, refreshTrigger }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [page, _setPage] = useState(1); // Underscore to ignore TS warning until we build pagination
  const [total, setTotal] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getItemsFiltered(search, '', '', false, page, 20);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(delay);
  }, [search, page, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to deactivate this item?")) {
      await deleteItem(id);
      loadData();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Medicines & Items</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your complete product catalog. Total records: {total}</p>
        </div>
        <button onClick={onAddItem} className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98]">
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or barcode..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
              <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">Item Name</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${item.is_active === 0 ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.generic_name && <p className="text-xs text-slate-600 mt-0.5">{item.generic_name}</p>}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{item.sku}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-400/20'} ring-1 ring-inset`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right relative">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onViewItem(item.id)} className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-lg" title="View Details">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => onEditItem(item.id)} className="p-2 text-slate-500 hover:text-amber-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Edit Item">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Deactivate">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}