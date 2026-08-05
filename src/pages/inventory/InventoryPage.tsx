import { useState } from 'react';
import { Package, ClipboardList, Layers, Pill } from 'lucide-react';
import ItemList from './ItemList';
import StockOverview from './StockOverview';
import StockOpname from './StockOpname';
import MasterData from './MasterData';
import ItemDetail from './ItemDetail';

interface InventoryPageProps {
  refreshTrigger: number;
  activeSubTab?: string;
  onEditItem: (id: string) => void;
  onAddItem: () => void;
}

export default function InventoryPage({
  refreshTrigger,
  activeSubTab = 'catalog',
  onEditItem,
  onAddItem,
}: InventoryPageProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'stock' | 'opname' | 'master'>(
    (activeSubTab as any) || 'catalog'
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const tabs = [
    { id: 'catalog', label: 'Katalog Produk', icon: Pill },
    { id: 'stock', label: 'Stok & Ledger', icon: Package },
    { id: 'opname', label: 'Stock Opname', icon: ClipboardList },
    { id: 'master', label: 'Master Data', icon: Layers },
  ];

  if (activeItemId) {
    return (
      <ItemDetail
        itemId={activeItemId}
        refreshTrigger={refreshTrigger}
        onBack={() => setActiveItemId(null)}
        onEditItem={() => onEditItem(activeItemId)}
      />
    );
  }

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
        {activeTab === 'catalog' && (
          <ItemList
            refreshTrigger={refreshTrigger}
            onViewItem={(id) => setActiveItemId(id)}
            onEditItem={onEditItem}
            onAddItem={onAddItem}
          />
        )}
        {activeTab === 'stock' && (
          <StockOverview
            refreshTrigger={refreshTrigger}
            onEditItem={onEditItem}
          />
        )}
        {activeTab === 'opname' && <StockOpname />}
        {activeTab === 'master' && <MasterData />}
      </div>
    </div>
  );
}
