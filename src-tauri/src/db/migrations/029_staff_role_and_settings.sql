-- 029: Merge kasir + gudang into unified 'staff' role
-- Also seed company_name and branch_name into global_settings

UPDATE users SET role = 'staff' WHERE role IN ('kasir', 'gudang');

INSERT OR IGNORE INTO global_settings (key, value, description) VALUES
  ('company_name', 'ChiraSys HQ', 'Nama perusahaan yang tampil di sidebar (hanya bisa diubah oleh Owner)'),
  ('branch_name',  'Cabang Utama', 'Nama cabang yang tampil di sidebar (dapat diubah oleh Admin dan Owner)');
