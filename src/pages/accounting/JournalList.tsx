import { useEffect, useState } from 'react';
import { getJournalEntries, JournalEntry } from '../../lib/api';
import { FileText, Plus, Search } from 'lucide-react';
import JournalVoucher from './JournalVoucher';
import ManualJournalModal from './ManualJournalModal';

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

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

  const filteredEntries = entries.filter(e => 
    (e.entry_no?.toLowerCase().includes(search.toLowerCase())) ||
    (e.description?.toLowerCase().includes(search.toLowerCase())) ||
    (e.source_id?.toLowerCase().includes(search.toLowerCase()))
  );

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
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
             <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
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
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-600">No journal entries found.</td></tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{entry.entry_no}</td>
                    <td className="px-6 py-3 capitalize text-slate-600 dark:text-slate-400">{entry.source_type.replace('_', ' ')}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 truncate max-w-xs">{entry.description || '-'}</td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => { setSelectedEntryId(entry.id); setIsVoucherOpen(true); }} 
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <FileText size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
