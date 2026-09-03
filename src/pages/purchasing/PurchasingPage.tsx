import { useState } from 'react';
import { PackageCheck, Truck } from 'lucide-react';
import PurchasingDashboard from './PurchasingDashboard';
import SupplierList from '../suppliers/SupplierList';

import TabBar, { TabItem } from '../../components/ui/TabBar';

type TabType = 'receive' | 'suppliers';

const tabs: TabItem<TabType>[] = [
  // { id: 'po', label: 'Purchase Orders (PO)', icon: ShoppingBag },
  { id: 'receive', label: 'Penerimaan Barang (Receive Goods)', icon: PackageCheck },
  { id: 'suppliers', label: 'Data Pemasok (Suppliers)', icon: Truck },
];

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('receive');

  return (
    <div className="flex flex-col h-full gap-4">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'receive' && <PurchasingDashboard />}
        {activeTab === 'suppliers' && <SupplierList />}
      </div>
    </div>
  );
}
