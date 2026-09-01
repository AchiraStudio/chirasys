// fallow-ignore-file unused-file
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'src-tauri', 'src', 'db', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let schema = '';
for (const file of files) {
  schema += fs.readFileSync(path.join(migrationsDir, file), 'utf8') + '\n';
}

// Very simple regex to find CREATE TABLE statements
const tables = {};
const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g;

let match;
while ((match = createTableRegex.exec(schema)) !== null) {
  const tableName = match[1];
  const columnsStr = match[2];
  
  const columns = [];
  const lines = columnsStr.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.toUpperCase().startsWith('FOREIGN') || trimmed.toUpperCase().startsWith('PRIMARY') || trimmed.toUpperCase().startsWith('UNIQUE') || trimmed.toUpperCase().startsWith('CHECK')) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      let colName = parts[0];
      if (colName.endsWith(',')) colName = colName.slice(0, -1);
      // Clean up colName
      colName = colName.replace(/[^a-zA-Z0-9_]/g, '');
      if (colName && !['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'ON', 'REFERENCES', 'DEFAULT', 'NOT'].includes(colName.toUpperCase())) {
        if (!columns.includes(colName)) {
           columns.push(colName);
        }
      }
    }
  }
  
  tables[tableName] = columns;
}

const syncableTables = [
    'customers', 'suppliers', 
    'purchase_orders', 'po_lines', 'purchases', 'purchase_lines', 'purchase_payments', 'purchase_returns', 'purchase_return_lines',
    'promos', 'promo_bogo_rules', 'promo_tiers', 'promo_bundle_items',
    'accounts', 'journal_entries', 'journal_lines',
    'sales', 'sale_lines', 'sale_payments', 'sale_returns', 'sale_return_lines',
    'stock_opname', 'stock_opname_lines',
    'stock_ledger', 'items', 'item_units', 'item_prices', 'categories', 'brands'
];

// Reconcile columns with 039 soft deletes
for (const table of syncableTables) {
    if (!tables[table]) continue;
    if (!tables[table].includes('deleted_at')) tables[table].push('deleted_at');
    if (!tables[table].includes('updated_at')) tables[table].push('updated_at');
    if (!tables[table].includes('updated_by')) tables[table].push('updated_by');
}

let out = '-- 040_full_sync_triggers.sql\n\n';

const oldTriggersToDrop = [
    'trg_sales_insert', 'trg_sales_update',
    'trg_stock_ledger_insert',
    'trg_categories_insert', 'trg_categories_update',
    'trg_brands_insert', 'trg_brands_update',
    'trg_items_insert', 'trg_items_update',
    'trg_item_units_insert', 'trg_item_units_update',
    'trg_item_prices_insert', 'trg_item_prices_update',
    'trg_sale_payments_insert'
];

for (const trg of oldTriggersToDrop) {
    out += `DROP TRIGGER IF EXISTS ${trg};\n`;
}
out += '\n';

for (const table of syncableTables) {
    if (!tables[table]) {
        console.warn('Table not found:', table);
        continue;
    }
    const cols = tables[table];
    const jsonObjArgs = cols.map(c => `'${c}', NEW.${c}`).join(', ');
    const updateJsonObjArgs = cols.map(c => `'${c}', NEW.${c}`).join(', ');

    // INSERT Trigger
    out += `CREATE TRIGGER trg_${table}_insert
AFTER INSERT ON ${table}
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), '${table}', NEW.id, 'insert', json_object(${jsonObjArgs}), 'global');
END;\n\n`;

    // UPDATE Trigger
    out += `CREATE TRIGGER trg_${table}_update
AFTER UPDATE ON ${table}
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), '${table}', NEW.id, 'update', json_object(${updateJsonObjArgs}), 'global');
END;\n\n`;

    // DELETE Trigger (Hard delete fallback)
    out += `CREATE TRIGGER trg_${table}_delete
AFTER DELETE ON ${table}
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), '${table}', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;\n\n`;
}

fs.writeFileSync(path.join(migrationsDir, '040_full_sync_triggers.sql'), out);
console.log('Done 040_full_sync_triggers.sql');

fs.writeFileSync(path.join(migrationsDir, '041_fix_delete_sync.sql'), '-- 041_fix_delete_sync.sql\n-- Handled in 040_full_sync_triggers.sql drops\n');
console.log('Done 041_fix_delete_sync.sql');
