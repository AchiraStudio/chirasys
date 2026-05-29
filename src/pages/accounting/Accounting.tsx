import { useState } from 'react';
import { BookOpen, FileText, PieChart, TrendingUp, AlignLeft } from 'lucide-react';
import ChartOfAccounts from './ChartOfAccounts';
import JournalList from './JournalList';
import ReportTB from './ReportTB';
import ReportPL from './ReportPL';
import ReportBS from './ReportBS';
import CashTransactions from './CashTransactions';
import { Wallet } from 'lucide-react';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('journals');

  const tabs = [
    { id: 'journals', label: 'Journal Entries', icon: BookOpen },
    { id: 'cash', label: 'Cash Transactions', icon: Wallet },
    { id: 'coa', label: 'Chart of Accounts', icon: AlignLeft },
    { id: 'tb', label: 'Trial Balance', icon: FileText },
    { id: 'pl', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'bs', label: 'Balance Sheet', icon: PieChart },
  ];

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
           <BookOpen size={24} className="text-brand" />
           Accounting
        </h1>
        <p className="text-slate-600 text-sm mt-1">Manage general ledger, journal entries, and financial reports.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto custom-scrollbar mb-6 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-500 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-brand' : ''} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {activeTab === 'journals' && <JournalList />}
        {activeTab === 'cash' && <CashTransactions />}
        {activeTab === 'coa' && <ChartOfAccounts />}
        {activeTab === 'tb' && <ReportTB />}
        {activeTab === 'pl' && <ReportPL />}
        {activeTab === 'bs' && <ReportBS />}
      </div>
    </div>
  );
}
