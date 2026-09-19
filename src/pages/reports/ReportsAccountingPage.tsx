import { useState, useEffect } from 'react';
import { FileText, BookOpen } from 'lucide-react';
import Reports from './Reports';
import Accounting from '../accounting/Accounting';
import TabBar, { TabItem } from '../../components/ui/TabBar';

export type ReportsAccountingTab = 'reports' | 'accounting';

const tabs: TabItem<ReportsAccountingTab>[] = [
  { id: 'reports', label: 'Laporan', icon: FileText },
  { id: 'accounting', label: 'Akuntansi & Buku Besar', icon: BookOpen },
];

interface ReportsAccountingPageProps {
  initialTab?: ReportsAccountingTab;
}

export default function ReportsAccountingPage({ initialTab = 'reports' }: ReportsAccountingPageProps) {
  const [activeTab, setActiveTab] = useState<ReportsAccountingTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="flex flex-col h-full gap-4">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'accounting' && <Accounting />}
      </div>
    </div>
  );
}
