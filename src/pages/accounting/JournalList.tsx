// Force HMR reload
import { useEffect, useState } from 'react';
import { getJournalEntries, JournalEntry } from '../../lib/api';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import JournalVoucher from './JournalVoucher';
import ManualJournalModal from './ManualJournalModal';
import { invoke } from '@tauri-apps/api/core';

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSale = async (entry: JournalEntry) => {
    setDeleting(true);
    try {
      // Delete the underlying sale — this will also cascade-delete the journal entry
      await invoke('delete_sale', { id: entry.source_id });
      setDeleteConfirmEntry(null);
      fetchEntries();
    } catch (e: any) {
      alert('Gagal menghapus: ' + (e?.message || String(e)));
    } finally {
      setDeleting(false);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await getJournalEntries();
      setEntries(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = entries.filter(e => {
    const d = new Date(e.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && d < start) return false;
    if (end && d > new Date(new Date(endDate).getTime() + 86400000)) return false; // add 1 day to include end date entirely

    return (
      (e.entry_no?.toLowerCase().includes(search.toLowerCase())) ||
      (e.description?.toLowerCase().includes(search.toLowerCase())) ||
      (e.source_id?.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
             Journal Entries
          </h2>
          <p className="text-slate-600 text-sm mt-1">Review all automated and manual ledger postings.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setPage(1); }} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-brand"
            />
            <span className="self-center text-slate-500 text-sm">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setPage(1); }} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-brand"
            />
          </div>
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
             <input 
                 type="text" 
                 value={search}
                 onChange={e => { setSearch(e.target.value); setPage(1); }}
                 placeholder="Search journals..." 
                 className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none"
             />
          </div>
          <button onClick={() => setIsManualModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Manual Journal
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 bg-slate-50/50 dark:bg-slate-800/50 uppercase font-semibold sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Date</th>
                <th className="px-6 py-4">Entry No</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-600">Loading journals...</td></tr>
              ) : paginatedEntries.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-600">No journal entries found.</td></tr>
              ) : (
                paginatedEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{entry.entry_no}</td>
                    <td className="px-6 py-3 capitalize text-slate-600 dark:text-slate-400">{entry.source_type.replace('_', ' ')}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 truncate max-w-xs">{entry.description || '-'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedEntryId(entry.id); setIsVoucherOpen(true); }} 
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <FileText size={14} /> View
                        </button>
                        {entry.source_type === 'sale' && (
                          <button
                            onClick={() => setDeleteConfirmEntry(entry)}
                            title="Hapus transaksi penjualan ini"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Previous
              </button>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <JournalVoucher 
         isOpen={isVoucherOpen}
         onClose={() => setIsVoucherOpen(false)}
         entryId={selectedEntryId}
      />

      <ManualJournalModal
         isOpen={isManualModalOpen}
         onClose={() => setIsManualModalOpen(false)}
         onSaved={fetchEntries}
      />

      {/* Delete Sale Confirmation */}
      {deleteConfirmEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmEntry(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Hapus Transaksi Penjualan?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Journal: <span className="font-mono font-bold">{deleteConfirmEntry.entry_no}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Penjualan: <span className="font-mono font-bold">{deleteConfirmEntry.description}</span>
            </p>
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-2.5 rounded-lg mb-4">
              ⚠ Tindakan ini akan menghapus transaksi penjualan beserta jurnal terkait. Tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmEntry(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteSale(deleteConfirmEntry)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
