const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'src-tauri', 'src', 'db', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let schema = '';
for (const file of files) {
  schema += fs.readFileSync(path.join(migrationsDir, file), 'utf8') + '\n';
}

const tables = {};
const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g;
let match;
while ((match = createTableRegex.exec(schema)) !== null) {
  const tableName = match[1];
  const columnsStr = match[2];
  
  const columns = [];
  const types = {};
  const lines = columnsStr.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.toUpperCase().startsWith('FOREIGN') || trimmed.toUpperCase().startsWith('PRIMARY') || trimmed.toUpperCase().startsWith('UNIQUE') || trimmed.toUpperCase().startsWith('CHECK')) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      let colName = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
      let colType = parts[1].replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
      if (colName && !['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'ON', 'REFERENCES', 'DEFAULT', 'NOT'].includes(colName.toUpperCase())) {
        if (!columns.includes(colName)) {
           columns.push(colName);
           types[colName] = colType;
        }
      }
    }
  }
  
  tables[tableName] = { columns, types };
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

for (const table of syncableTables) {
    if (!tables[table]) continue;
    if (!tables[table].columns.includes('deleted_at')) { tables[table].columns.push('deleted_at'); tables[table].types['deleted_at'] = 'TEXT'; }
    if (!tables[table].columns.includes('updated_at')) { tables[table].columns.push('updated_at'); tables[table].types['updated_at'] = 'TEXT'; }
    if (!tables[table].columns.includes('updated_by')) { tables[table].columns.push('updated_by'); tables[table].types['updated_by'] = 'TEXT'; }
}

let out = 'pub async fn apply_cloud_sync(pool: &SqlitePool, table_name: &str, payload: &serde_json::Value) -> Result<(), String> {\n';
out += '    match table_name {\n';

for (const table of syncableTables) {
    if (!tables[table]) continue;
    const { columns, types } = tables[table];
    
    out += `        "${table}" => {\n`;
    const bindVars = [];
    const valVars = [];
    const updates = [];
    
    for (const c of columns) {
        let rustExtractor = '';
        if (['REAL', 'DOUBLE', 'FLOAT'].includes(types[c])) {
            rustExtractor = `.and_then(|v| v.as_f64())`;
        } else if (['INTEGER', 'INT', 'BOOLEAN'].includes(types[c])) {
            rustExtractor = `.and_then(|v| v.as_i64())`;
        } else {
            rustExtractor = `.and_then(|v| v.as_str())`;
        }
        
        const isStr = !(['REAL', 'DOUBLE', 'FLOAT', 'INTEGER', 'INT', 'BOOLEAN'].includes(types[c]));
        
        let varName = c;
        if (c === 'type') varName = 'type_val';
        
        if (c === 'updated_by' || c === 'created_by') {
             // System overrides
        } else {
            out += `            let ${varName} = payload.get("${c}")${rustExtractor};\n`;
            bindVars.push(varName);
        }
    }
    
    const insertCols = columns.join(', ');
    const insertVals = columns.map(c => {
        if (c === 'updated_by' || c === 'created_by') return "'system_sync'";
        return '?';
    }).join(', ');
    
    for (const c of columns) {
        if (c !== 'id' && c !== 'created_at' && c !== 'created_by') {
            updates.push(`${c}=excluded.${c}`);
        }
    }
    const updateStr = updates.join(', ');
    
    out += `            let _ = sqlx::query(\n`;
    out += `                "INSERT INTO ${table} (${insertCols})\n`;
    out += `                 VALUES (${insertVals})\n`;
    out += `                 ON CONFLICT(id) DO UPDATE SET ${updateStr}"\n`;
    out += `            )\n`;
    
    for (const c of bindVars) {
        out += `            .bind(${c})\n`;
    }
    
    out += `            .execute(pool).await.map_err(|e| e.to_string())?;\n`;
    out += `        }\n`;
}

out += '        _ => {}\n    }\n    Ok(())\n}\n';

fs.writeFileSync('rust_sync_logic.txt', out);
console.log('Generated rust_sync_logic.txt');
