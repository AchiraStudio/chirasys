import { useState } from 'react';
import { Users, Tag } from 'lucide-react';
import CustomerList from './CustomerList';
import PromoList from '../promos/PromoList';

import TabBar, { TabItem } from '../../components/ui/TabBar';

type TabType = 'customers' | 'promos';

const tabs: TabItem<TabType>[] = [
  { id: 'customers', label: 'Data Pelanggan', icon: Users },
  { id: 'promos', label: 'Program Promosi & Diskon', icon: Tag },
];

export default function CustomerPromoPage() {
  const [activeTab, setActiveTab] = useState<TabType>('customers');

  return (
    <div className="flex flex-col h-full gap-4">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'customers' && <CustomerList />}
        {activeTab === 'promos' && <PromoList />}
      </div>
    </div>
  );
}
