import React from 'react';
import { Wifi, Server, Lock, Cloud } from 'lucide-react';

export const LanSyncSection: React.FC = () => {
  return (
    <section className="section" id="lan">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>LAN SYNC
          </div>
          <h2 className="h2">Kasir toko tersinkronisasi tanpa internet.</h2>
          <p className="lead">
            Antar kasir saling terhubung otomatis via UDP di jaringan lokal. Stok dan transaksi langsung sinkron.
          </p>
          <ul className="blist">
            <li>
              <Wifi size={16} />
              <span>
                <b>Penemuan Otomatis (UDP)</b> — kasir anak langsung mendeteksi server induk di Wi-Fi toko.
              </span>
            </li>
            <li>
              <Server size={16} />
              <span>
                <b>Sinkronisasi Peer Cepat</b> — data penjualan tersinkron antar kasir dalam hitungan milidetik.
              </span>
            </li>
            <li>
              <Lock size={16} />
              <span>
                <b>Hak Akses Per Kasir</b> — atur wewenang kasir anak dan terminal kasir utama.
              </span>
            </li>
            <li>
              <Cloud size={16} />
              <span>
                <b>Sinergi Supabase Cloud</b> — seluruh mutasi lokal langsung terunggah saat internet kembali.
              </span>
            </li>
          </ul>
        </div>

        <div className="card lanbus" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="lan-server">
            <b>Kivo Server</b>
            <div style={{ fontSize: '11px', color: 'var(--dim)' }}>
              Main terminal · holds the store database
            </div>
          </div>
          <div className="lan-rail"></div>
          <div className="lan-line">
            <span>WI-FI / LAN · UDP DISCOVERY</span>
          </div>
          <div className="lan-terms">
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 1</b>
                <small>synced 4 s ago</small>
              </div>
            </div>
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 2</b>
                <small>synced 4 s ago</small>
              </div>
            </div>
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 3</b>
                <small>synced 6 s ago</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanSyncSection;

