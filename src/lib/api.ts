import { invoke } from '@tauri-apps/api/core';

// --- Sales Types ---
export interface Sale { id: string; transaction_no: string; branch_id: string; customer_id?: string; user_id?: string; total_amount: number; discount_amount: number; tax_amount: number; grand_total: number; status: string; price_type: 'retail' | 'wholesale'; notes?: string; created_at: string; }
export interface SaleLineInput { item_id: string; unit_id: string; qty: number; price_type: string; price: number; discount_amount: number; hpp_value: number; }
export interface SalePaymentInput { amount: number; method: string; reference?: string; }
export interface CreateSaleInput { branch_id: string; customer_id?: string; user_id?: string; total_amount: number; discount_amount: number; tax_amount: number; grand_total: number; price_type: string; notes?: string; lines: SaleLineInput[]; payments: SalePaymentInput[]; }
export const createSale = async (input: CreateSaleInput): Promise<string> => invoke('create_sale', { input });
export const getNextTransactionNo = async (branchId: string): Promise<string> => invoke('get_next_transaction_no', { branchId });
export const getSales = async (branchId: string, customerId?: string): Promise<Sale[]> => invoke('get_sales', { branchId, customerId: customerId || null });

export interface SaleLine { id: string; sale_id: string; item_id: string; item_name?: string; unit_id: string; unit_name?: string; qty: number; price_type: string; price: number; discount_amount: number; subtotal: number; hpp_value: number; notes?: string; }
export interface SalePayment { id: string; sale_id: string; amount: number; method: string; reference?: string; created_at: string; }
export interface SaleDetail { sale: Sale; lines: SaleLine[]; payments: SalePayment[]; }
export const getSaleDetail = async (id: string): Promise<SaleDetail> => invoke('get_sale_detail', { id });
export const createSaleReturn = async (saleId: string, lines: SaleLineInput[], reason: string): Promise<void> => invoke('create_sale_return', { saleId, lines, reason });

// --- Promo Types ---
export interface Promo { id: string; name: string; description?: string; discount_percent: number; min_qty: number; category_id?: string; item_id?: string; member_only: number; active: number; start_date?: string; end_date?: string; created_at: string; promo_type: string; discount_value?: number; applies_to: string; max_discount_amount?: number; stack_rule: string; priority: number; member_tier?: string; }
export interface PromoBogoRule { id: string; promo_id: string; buy_qty: number; get_qty: number; free_item_id?: string; free_item_unit_id?: string; free_item_discount_percent?: number; }
export interface PromoTier { id: string; promo_id: string; min_qty: number; discount_percent: number; }
export interface PromoDetail { promo: Promo; bogo_rules: PromoBogoRule[]; tiers: PromoTier[]; }
export interface CreatePromoInput { name: string; description?: string; discount_percent: number; min_qty: number; category_id?: string; item_id?: string; member_only: number; start_date?: string; end_date?: string; promo_type: string; discount_value?: number; applies_to: string; max_discount_amount?: number; stack_rule: string; priority: number; member_tier?: string; bogo_rules: { buy_qty: number; get_qty: number; free_item_id?: string; free_item_unit_id?: string; free_item_discount_percent?: number; }[]; tiers: { min_qty: number; discount_percent: number; }[]; }
export interface CartLineForDiscount { item_id: string; unit_id: string; category_id?: string; qty: number; price: number; line_index: number; }
export interface AppliedDiscount { line_index: number; discount_amount: number; promo_id: string; promo_name: string; is_bogo_free_item: boolean; free_item_qty: number; free_item_id?: string; free_item_unit_id?: string; }
export interface DiscountResult { line_discounts: AppliedDiscount[]; cart_discount: number; cart_discount_promo_id?: string; total_discount: number; }

export const getPromos = async (activeOnly: boolean): Promise<Promo[]> => invoke('get_promos', { activeOnly });
export const getPromoDetail = async (id: string): Promise<PromoDetail> => invoke('get_promo_detail', { id });
export const createPromo = async (input: CreatePromoInput): Promise<Promo> => invoke('create_promo', { input });
export const updatePromo = async (id: string, input: CreatePromoInput): Promise<Promo> => invoke('update_promo', { id, input });
export const deletePromo = async (id: string): Promise<void> => invoke('delete_promo', { id });
export const togglePromoActive = async (id: string): Promise<void> => invoke('toggle_promo_active', { id });
export const calculateDiscounts = async (lines: CartLineForDiscount[], customerTier?: string): Promise<DiscountResult> => invoke('calculate_discounts', { lines, customerTier });

// --- Types ---
export interface Brand { id: string; name: string; logo_blob?: number[]; created_at: string; }
export interface Category { id: string; parent_id?: string; name: string; description?: string; color?: string; created_at: string; }
export interface Item { id: string; sku: string; barcode?: string; name: string; generic_name?: string; category_id?: string; brand_id?: string; hpp_method: string; min_stock: number; has_expiry: number; requires_prescription: number; notes?: string; is_active: number; created_at: string; wholesale_price: number; price?: number; base_unit_id?: string; base_unit_name?: string; avg_hpp?: number; }
export interface ItemUnit { id: string; item_id: string; unit_name: string; conversion: number; is_base: number; barcode?: string; created_at: string; }
export interface ItemPrice { id: string; item_id: string; unit_id: string; customer_tier: string; price: number; }
export interface PaginatedItems { items: Item[]; total: number; page: number; per_page: number; }
export interface ItemDetailData { item: Item; units: ItemUnit[]; prices: ItemPrice[]; }
export interface Supplier { id: string; name: string; contact_person?: string; phone?: string; email?: string; address?: string; payment_terms?: string; notes?: string; is_active: number; created_at: string; updated_at: string; }
export interface Customer { id: string; name: string; phone?: string; email?: string; address?: string; region?: string; customer_tier: string; loyalty_points: number; credit_limit: number; notes?: string; is_active: number; created_at: string; updated_at: string; }
export interface StockLedgerRow { id: string; item_id: string; unit_id: string; branch_id: string; qty_change: number; direction: 'in' | 'out'; source_type: string; source_id?: string; hpp_value?: number; expiry_date?: string; batch_no?: string; notes?: string; created_by?: string; created_at: string; }
export interface StockOverviewRow { item_id: string; item_name: string; sku: string; min_stock: number; has_expiry: number; hpp_method: string; category_name: string | null; unit_id: string | null; unit_name: string | null; current_qty: number; is_low_stock: boolean; has_ledger_entries: boolean; }
export interface StockMovementRow { id: string; direction: string; qty_change: number; source_type: string; hpp_value?: number; expiry_date?: string; batch_no?: string; notes?: string; created_by_name?: string; created_at: string; running_total: number; }
export interface LowStockAlert { item_id: string; item_name: string; sku: string; current_qty: number; min_stock: number; unit_name: string; }

// Phase 4 Types
export interface PurchaseOrder { id: string; branch_id: string; supplier_id: string; supplier_name?: string; status: string; expected_date?: string; notes?: string; created_by?: string; created_at: string; }
// Update this specific interface in api.ts
export interface PoLine { 
    id: string; 
    po_id: string; 
    item_id: string; 
    item_name?: string; 
    unit_id: string; 
    unit_name?: string; 
    qty_ordered: number; 
    qty_received: number;
    price_estimate: number; 
}
export interface PoLineInput { item_id: string; unit_id: string; qty: number; price: number; }
export interface ReceiveLineInput { po_line_id: string; item_id: string; unit_id: string; qty_received: number; price_per_unit: number; expiry_date?: string; batch_no?: string; }
export const cancelPurchaseOrder = async (id: string): Promise<void> => invoke('cancel_purchase_order', { id });

export interface Purchase {
  id: string;
  po_id?: string;
  branch_id: string;
  supplier_id: string;
  invoice_no?: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface PurchaseLine {
  id: string;
  purchase_id: string;
  item_id: string;
  item_name?: string;
  unit_id: string;
  unit_name?: string;
  qty_received: number;
  price_per_unit: number;
  expiry_date?: string;
  batch_no?: string;
}

export interface PurchasePayment {
  id: string;
  purchase_id: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseReturn {
  id: string;
  purchase_id: string;
  supplier_id: string;
  branch_id: string;
  reason: string;
  created_at: string;
}

export interface PurchaseDetail {
  purchase: Purchase;
  lines: PurchaseLine[];
  payments: PurchasePayment[];
  returns: PurchaseReturn[];
}

// --- Invokes ---
export const getBrands = async (): Promise<Brand[]> => invoke('get_brands');
export const addBrand = async (name: string): Promise<Brand> => invoke('add_brand', { name });
export const updateBrand = async (id: string, name: string): Promise<Brand> => invoke('update_brand', { id, name });
export const deleteBrand = async (id: string): Promise<void> => invoke('delete_brand', { id });
export const getCategories = async (): Promise<Category[]> => invoke('get_categories');
export const addCategory = async (name: string, description?: string, color?: string, parentId?: string): Promise<Category> => invoke('add_category', { name, description: description || null, color: color || null, parentId: parentId || null });
export const updateCategory = async (id: string, name: string): Promise<Category> => invoke('update_category', { id, name });
export const deleteCategory = async (id: string): Promise<void> => invoke('delete_category', { id });

export const getItemsFiltered = async (search: string = '', categoryId: string = '', brandId: string = '', activeOnly: boolean = false, page: number = 1, perPage: number = 20): Promise<PaginatedItems> => invoke('get_items_filtered', { search: search.trim() || null, categoryId: categoryId || null, brandId: brandId || null, activeOnly, page, perPage });
export const getItem = async (id: string): Promise<ItemDetailData> => invoke('get_item', { id });
export const addItem = async (payload: Omit<Item, 'id' | 'created_at' | 'is_active'>): Promise<Item> => invoke('add_item', { sku: payload.sku, barcode: payload.barcode, name: payload.name, genericName: payload.generic_name, categoryId: payload.category_id, brandId: payload.brand_id, hppMethod: payload.hpp_method, minStock: payload.min_stock, hasExpiry: payload.has_expiry, requiresPrescription: payload.requires_prescription, notes: payload.notes });
export const updateItem = async (id: string, payload: Omit<Item, 'id' | 'created_at' | 'is_active'>): Promise<Item> => invoke('update_item', { id, sku: payload.sku, barcode: payload.barcode, name: payload.name, genericName: payload.generic_name, categoryId: payload.category_id, brandId: payload.brand_id, hppMethod: payload.hpp_method, minStock: payload.min_stock, hasExpiry: payload.has_expiry, requiresPrescription: payload.requires_prescription, notes: payload.notes });
export const toggleItemActive = async (id: string): Promise<void> => invoke('toggle_item_active', { id });
export const deleteItem = async (id: string): Promise<void> => invoke('delete_item', { id });
export const addItemUnit = async (itemId: string, unitName: string, conversion: number, isBase: number, barcode?: string): Promise<ItemUnit> => invoke('add_item_unit', { itemId, unitName, conversion, isBase, barcode: barcode || null });
export const updateItemUnit = async (id: string, unitName: string, conversion: number, isBase: number, barcode?: string): Promise<ItemUnit> => invoke('update_item_unit', { id, unitName, conversion, isBase, barcode: barcode || null });
export const deleteItemUnit = async (id: string): Promise<void> => invoke('delete_item_unit', { id });
export const setItemPrice = async (itemId: string, unitId: string, customerTier: 'regular' | 'member' | 'vip', price: number): Promise<ItemPrice> => invoke('set_item_price', { itemId, unitId, customerTier, price });

export const getStockOverview = async (branchId: string): Promise<StockOverviewRow[]> => invoke('get_stock_overview', { branchId });
export const getLowStockAlerts = async (branchId: string): Promise<LowStockAlert[]> => invoke('get_low_stock_alerts', { branchId });
export const getStockMovements = async (itemId: string, branchId: string, limit: number = 50): Promise<StockMovementRow[]> => invoke('get_stock_movements', { itemId, branchId, limit });
export const adjustStock = async (itemId: string, unitId: string, branchId: string, qty: number, direction: 'in' | 'out', notes?: string, createdBy?: string): Promise<StockLedgerRow> => invoke('adjust_stock', { itemId, unitId, branchId, qty, direction, notes: notes || null, createdBy: createdBy || null });
export const setInitialStock = async (itemId: string, unitId: string, branchId: string, qty: number, hppValue?: number, notes?: string): Promise<StockLedgerRow> => invoke('set_initial_stock', { itemId, unitId, branchId, qty, hppValue: hppValue || null, notes: notes || null });

// Opname
export interface OpnameLineInput { item_id: string; unit_id: string; actual_qty: number; notes: string; }
export const createOpnameSession = async (branchId: string, createdBy?: string, notes?: string): Promise<string> => invoke('create_opname_session', { branchId, createdBy: createdBy || null, notes: notes || null });
export const submitOpnameLines = async (opnameId: string, lines: OpnameLineInput[]): Promise<void> => invoke('submit_opname_lines', { opnameId, lines });
export const finalizeOpname = async (opnameId: string): Promise<void> => invoke('finalize_opname', { opnameId });

export const getSuppliers = async (search: string = '', activeOnly: boolean = false): Promise<Supplier[]> => invoke('get_suppliers', { search: search || null, activeOnly });
export const addSupplier = async (name: string, contactPerson?: string, phone?: string, email?: string, address?: string, paymentTerms?: string, notes?: string): Promise<Supplier> => invoke('add_supplier', { name, contactPerson: contactPerson || null, phone: phone || null, email: email || null, address: address || null, paymentTerms: paymentTerms || null, notes: notes || null });
export const updateSupplier = async (id: string, name: string, contactPerson?: string, phone?: string, email?: string, address?: string, paymentTerms?: string, notes?: string): Promise<Supplier> => invoke('update_supplier', { id, name, contactPerson: contactPerson || null, phone: phone || null, email: email || null, address: address || null, paymentTerms: paymentTerms || null, notes: notes || null });
export const toggleSupplierActive = async (id: string): Promise<void> => invoke('toggle_supplier_active', { id });

export const getCustomers = async (search: string = '', tier: string = '', activeOnly: boolean = false): Promise<Customer[]> => invoke('get_customers', { search: search || null, tier: tier || null, activeOnly });
export const addCustomer = async (name: string, phone?: string, email?: string, address?: string, region?: string, customerTier: string = 'regular', creditLimit: number = 0, notes?: string): Promise<Customer> => invoke('add_customer', { name, phone: phone || null, email: email || null, address: address || null, region: region || null, customerTier, creditLimit, notes: notes || null });
export const updateCustomer = async (id: string, name: string, phone?: string, email?: string, address?: string, region?: string, customerTier: string = 'regular', creditLimit: number = 0, notes?: string): Promise<Customer> => invoke('update_customer', { id, name, phone: phone || null, email: email || null, address: address || null, region: region || null, customerTier, creditLimit, notes: notes || null });
export const toggleCustomerActive = async (id: string): Promise<void> => invoke('toggle_customer_active', { id });

// --- Phase 4 ---
export const getPurchaseOrders = async (branchId: string): Promise<PurchaseOrder[]> => invoke('get_purchase_orders', { branchId });
export const getPoLines = async (poId: string): Promise<PoLine[]> => invoke('get_po_lines', { poId });
export const createPurchaseOrder = async (branchId: string, supplierId: string, expectedDate: string | null, notes: string | null, lines: PoLineInput[]): Promise<string> => invoke('create_purchase_order', { branchId, supplierId, expectedDate, notes, lines });
export const receiveGoods = async (poId: string, branchId: string, supplierId: string, invoiceNo: string | null, lines: ReceiveLineInput[]): Promise<string> => invoke('receive_goods', { poId, branchId, supplierId, invoiceNo, lines });

export const getPurchases = async (branchId: string, supplierId?: string, status?: string): Promise<Purchase[]> =>
  invoke('get_purchases', { branchId, supplierId: supplierId || null, status: status || null });

export const getPurchaseDetail = async (id: string): Promise<PurchaseDetail> =>
  invoke('get_purchase_detail', { id });

export const addPurchasePayment = async (purchaseId: string, amount: number, method: string, reference?: string): Promise<void> =>
  invoke('add_purchase_payment', { purchaseId, amount, method, reference: reference || null });

export const createPurchaseReturn = async (purchaseId: string, lines: ReceiveLineInput[], reason: string): Promise<void> =>
  invoke('create_purchase_return', { purchaseId, lines, reason });

// --- Phase 7 Accounting Types ---
export interface Account { id: string; code: string; name: string; type: string; parent_id?: string; normal_balance: string; is_system: number; is_active: number; }
export interface CreateAccountInput { code: string; name: string; type: string; parent_id?: string; normal_balance: string; }
export interface JournalEntry { id: string; entry_no: string; date: string; description?: string; source_type: string; source_id: string; branch_id?: string; created_at: string; }
export interface JournalLine { id: string; journal_entry_id: string; account_id: string; debit: number; credit: number; notes?: string; account_code?: string; account_name?: string; }
export interface JournalEntryWithLines { entry: JournalEntry; lines: JournalLine[]; }
export interface ManualJournalInput { description?: string; branch_id?: string; lines: { account_id: string; debit: number; credit: number; notes?: string; }[]; }
export interface TrialBalanceRow { account_id: string; code: string; name: string; type: string; total_debit: number; total_credit: number; balance: number; }
export interface PLRow { account_code: string; account_name: string; amount: number; }
export interface ProfitLossGroup { group_name: string; rows: PLRow[]; total: number; }
export interface ProfitLossReport { revenue: ProfitLossGroup; cogs: ProfitLossGroup; gross_profit: number; expenses: ProfitLossGroup; net_profit: number; }
export interface BSRow { account_code: string; account_name: string; amount: number; }
export interface BalanceSheet { assets: BSRow[]; total_assets: number; liabilities: BSRow[]; equity: BSRow[]; total_liabilities_equity: number; }

// --- Accounting Invokes ---
export const getAccounts = async (): Promise<Account[]> => invoke('get_accounts');
export const createAccount = async (input: CreateAccountInput): Promise<Account> => invoke('create_account', { input });
export const updateAccount = async (id: string, input: CreateAccountInput): Promise<Account> => invoke('update_account', { id, input });
export const deleteAccount = async (id: string): Promise<void> => invoke('delete_account', { id });

export const getJournalEntries = async (): Promise<JournalEntry[]> => invoke('get_journal_entries');
export const getJournalDetail = async (id: string): Promise<JournalEntryWithLines> => invoke('get_journal_detail', { id });
export const createManualJournal = async (input: ManualJournalInput): Promise<string> => invoke('create_manual_journal', { input });

export const getTrialBalance = async (asOfDate: string): Promise<TrialBalanceRow[]> => invoke('get_trial_balance', { asOfDate });
export const getProfitLoss = async (startDate: string, endDate: string): Promise<ProfitLossReport> => invoke('get_profit_loss', { startDate, endDate });
export const getBalanceSheet = async (asOfDate: string): Promise<BalanceSheet> => invoke('get_balance_sheet', { asOfDate });

export const cashIn = async (accountId: string, cashAccountId: string, amount: number, description: string, branchId?: string): Promise<string> =>
  invoke('cash_in', { accountId, cashAccountId, amount, description, branchId: branchId || null });
export const cashOut = async (accountId: string, cashAccountId: string, amount: number, description: string, branchId?: string): Promise<string> =>
  invoke('cash_out', { accountId, cashAccountId, amount, description, branchId: branchId || null });
// --- Phase 8 Banks & Settings ---
export interface Bank { id: string; name: string; code: string; is_active: number; }
export const getBanks = async (): Promise<Bank[]> => invoke('get_banks');
export const getSettings = async (): Promise<{ key: string; value: string; description?: string }[]> => invoke('get_settings');
export const setSetting = async (key: string, value: string): Promise<void> => invoke('set_setting', { key, value });

// --- Phase 10: Excel Exports & Maintenance ---
export const exportItemsExcel = async (filePath: string): Promise<string> => invoke('export_items_excel', { filePath });
export const exportSalesExcel = async (filePath: string): Promise<string> => invoke('export_sales_excel', { filePath });
export const optimizeDatabase = async (): Promise<string> => invoke('optimize_database');

// --- Phase 8 Report Types ---
export interface SalesSummaryRow { period_label: string; transaction_count: number; total_revenue: number; total_discount: number; total_cogs: number; gross_profit: number; }
export interface TopItemRow { item_name: string; sku: string; category_name?: string; qty_sold: number; total_revenue: number; total_cogs: number; gross_margin: number; }
export interface PaymentMethodRow { method: string; transaction_count: number; total_amount: number; }
export interface StockValuationRow { item_name: string; sku: string; category_name?: string; unit_name?: string; current_qty: number; avg_hpp: number; total_value: number; }
export interface ExpiringItemRow { item_name: string; sku: string; batch_no?: string; expiry_date: string; qty: number; days_left: number; }
export interface OutstandingPayableRow { purchase_id: string; supplier_name: string; invoice_no?: string; total_amount: number; paid_amount: number; balance: number; created_at: string; }
export interface PurchaseSummaryRow { supplier_name: string; purchase_count: number; total_amount: number; paid_amount: number; }
export interface CustomerReportRow { customer_name: string; customer_tier: string; transaction_count: number; total_spent: number; }

// --- Phase 8 Report Invokes ---
export const getSalesSummary = async (branchId: string, dateFrom: string, dateTo: string): Promise<SalesSummaryRow[]> =>
  invoke('get_sales_summary', { branchId, dateFrom, dateTo });
export const getTopSellingItems = async (branchId: string, dateFrom: string, dateTo: string, limit: number = 20): Promise<TopItemRow[]> =>
  invoke('get_top_selling_items', { branchId, dateFrom, dateTo, limit });
export const getSalesByPaymentMethod = async (branchId: string, dateFrom: string, dateTo: string): Promise<PaymentMethodRow[]> =>
  invoke('get_sales_by_payment_method', { branchId, dateFrom, dateTo });
export const getStockValuation = async (branchId: string): Promise<StockValuationRow[]> =>
  invoke('get_stock_valuation', { branchId });
export const getExpiringItems = async (branchId: string, daysAhead: number = 30): Promise<ExpiringItemRow[]> =>
  invoke('get_expiring_items', { branchId, daysAhead });
export const getOutstandingPayables = async (branchId: string): Promise<OutstandingPayableRow[]> =>
  invoke('get_outstanding_payables', { branchId });
export const getPurchaseSummary = async (branchId: string, dateFrom: string, dateTo: string): Promise<PurchaseSummaryRow[]> =>
  invoke('get_purchase_summary', { branchId, dateFrom, dateTo });
export const getCustomerReport = async (branchId: string, dateFrom: string, dateTo: string, limit: number = 20): Promise<CustomerReportRow[]> =>
  invoke('get_customer_report', { branchId, dateFrom, dateTo, limit });

// --- Phase 9 Excel Import ---
export interface ImportResult { success: boolean; rows_imported: number; errors: string[]; }
export const importItemsExcel = async (filePath: string): Promise<ImportResult> => invoke('import_items_excel', { filePath });

// --- Phase 9 Auth ---
import { UserInfo } from '../store/AuthStore';
export const loginUser = async (username: string, passwordGuess: string): Promise<{ token: string, user: UserInfo }> => 
  invoke('login', { username, passwordGuess });
export const getCurrentUser = async (token: string): Promise<UserInfo> => 
  invoke('get_current_user', { token });
export const logoutUser = async (token: string): Promise<void> => 
  invoke('logout', { token });