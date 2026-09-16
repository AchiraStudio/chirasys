import { useState } from 'react';
import { BookOpen, FileText, PieChart, TrendingUp, AlignLeft } from 'lucide-react';
import ChartOfAccounts from './ChartOfAccounts';
import JournalList from './JournalList';
import ReportTB from './ReportTB';
import ReportPL from './ReportPL';
import ReportBS from './ReportBS';
import CashTransactions from './CashTransactions';
import { Wallet } from 'lucide-react';

import TabBar, { TabItem } from '../../components/ui/TabBar';

type AccountingTab = 'journals' | 'cash' | 'coa' | 'tb' | 'pl' | 'bs';

const tabs: TabItem<AccountingTab>[] = [
  { id: 'journals', label: 'Jurnal Transaksi', icon: BookOpen },
  { id: 'cash', label: 'Arus Kas', icon: Wallet },
  { id: 'coa', label: 'Bagan Akun (COA)', icon: AlignLeft },
  { id: 'tb', label: 'Neraca Saldo', icon: FileText },
  { id: 'pl', label: 'Laba Rugi', icon: TrendingUp },
  { id: 'bs', label: 'Neraca Keuangan', icon: PieChart },
];

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<AccountingTab>('journals');

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto gap-4 animate-fade-in">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

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
