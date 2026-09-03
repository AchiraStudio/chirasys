import { useState } from 'react';
import { Package, ClipboardList, Layers, Pill } from 'lucide-react';
import ItemList from './ItemList';
import StockOverview from './StockOverview';
import StockOpname from './StockOpname';
import MasterData from './MasterData';
import ItemDetail from './ItemDetail';

import TabBar, { TabItem } from '../../components/ui/TabBar';

interface InventoryPageProps {
  refreshTrigger: number;
  activeSubTab?: string;
  onEditItem: (id: string) => void;
  onAddItem: () => void;
}

type TabType = 'catalog' | 'stock' | 'opname' | 'master';

const tabs: TabItem<TabType>[] = [
  { id: 'catalog', label: 'Katalog Produk', icon: Pill },
  { id: 'stock', label: 'Stok & Ledger', icon: Package },
  { id: 'opname', label: 'Stock Opname', icon: ClipboardList },
  { id: 'master', label: 'Master Data', icon: Layers },
];

export default function InventoryPage({
  refreshTrigger,
  activeSubTab = 'catalog',
  onEditItem,
  onAddItem,
}: InventoryPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    (activeSubTab as TabType) || 'catalog'
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

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
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

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
