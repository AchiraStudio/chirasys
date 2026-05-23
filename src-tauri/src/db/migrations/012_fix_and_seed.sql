-- 012_fix_and_seed.sql

-- Global settings table (for language, company info, etc.)
CREATE TABLE IF NOT EXISTS global_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL DEFAULT '',
    description TEXT
);

-- Seed UMUM walk-in customer
INSERT OR IGNORE INTO customers (id, name, phone, customer_tier, loyalty_points, credit_limit, is_active, created_at, updated_at)
VALUES ('cust_umum', 'Pelanggan Umum', '', 'regular', 0, 0, 1, datetime('now'), datetime('now'));

-- Banks table for card payment tracking
CREATE TABLE IF NOT EXISTS banks (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO banks (id, name, code) VALUES
('bank_bca',    'Bank Central Asia',      'BCA'),
('bank_mdr',    'Bank Mandiri',           'MANDIRI'),
('bank_bni',    'Bank Negara Indonesia',  'BNI'),
('bank_bri',    'Bank Rakyat Indonesia',  'BRI'),
('bank_cimb',   'CIMB Niaga',            'CIMB'),
('bank_btn',    'Bank Tabungan Negara',   'BTN'),
('bank_danamon','Bank Danamon',           'DANAMON'),
('bank_permata','Bank Permata',           'PERMATA'),
('bank_mega',   'Bank Mega',             'MEGA'),
('bank_ocbc',   'OCBC NISP',             'OCBC');

-- Seed default global settings
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES
('language',         'id',                'UI language: id or en'),
('company_name',     'ChiraSys Apotek',   'Nama apotek untuk struk'),
('company_address',  '',                  'Alamat apotek'),
('company_phone',    '',                  'Telepon apotek'),
('tax_rate',         '0',                 'PPN rate in percent (0 = no tax)'),
('receipt_header',   '',                  'Teks header struk tambahan'),
('receipt_footer',   'Terima kasih atas kunjungan Anda!', 'Teks footer struk'),
('hpp_method_default','avg',              'Default HPP method: avg, fifo, lifo'),
('fiscal_year_start','01',               'Bulan mulai tahun fiskal (01-12)');
