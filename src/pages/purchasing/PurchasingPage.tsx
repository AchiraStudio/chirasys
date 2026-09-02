import { useState } from 'react';
import { PackageCheck, Truck } from 'lucide-react';
import PurchasingDashboard from './PurchasingDashboard';
import SupplierList from '../suppliers/SupplierList';

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useState<'receive' | 'suppliers'>('receive');

  const tabs = [
    // { id: 'po', label: 'Purchase Orders (PO)', icon: ShoppingBag },
    { id: 'receive', label: 'Penerimaan Barang (Receive Goods)', icon: PackageCheck },
    { id: 'suppliers', label: 'Data Pemasok (Suppliers)', icon: Truck },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Secondary Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'receive' && <PurchasingDashboard />}
        {activeTab === 'suppliers' && <SupplierList />}
      </div>
    </div>
  );
}
