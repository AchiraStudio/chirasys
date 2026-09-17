import React from 'react';
import { Printer, Receipt as ReceiptIcon, ScanBarcode, Wifi } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  return (
    <section className="section" id="hardware">
      <div className="wrap hw-grid">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>HARDWARE
          </div>
          <h2 className="h2">Plugs into the equipment you already own.</h2>
          <p className="lead">
            Thermal receipt printers, cash drawers, and barcode scanners — connected the way real stores connect them.
          </p>
          <ul className="blist">
            <li>
              <Printer size={16} />
              <span>
                <b>Thermal printing</b> via ESC/POS or the HPRT Windows SDK.
              </span>
            </li>
            <li>
              <ReceiptIcon size={16} />
              <span>
                <b>58 mm and 80 mm</b> receipts, formatted properly for both.
              </span>
            </li>
            <li>
              <ScanBarcode size={16} />
              <span>
                <b>Barcode scanners</b> and <b>cash drawers</b>, ready at the register.
              </span>
            </li>
            <li>
              <Wifi size={16} />
              <span>
                <b>USB, network, or Bluetooth</b> connections.
              </span>
            </li>
          </ul>
        </div>

        <div className="receipt-wrap" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div>
            <div className="receipt">
              <div className="ctr b" style={{ fontSize: '13px' }}>
                TOKO MAJU JAYA
              </div>
              <div className="ctr">Jl. Merdeka No. 48, Bandung</div>
              <div className="sep"></div>
              <div className="rc">
                <span>Kopi Susu Botol x2</span>
                <span>17.000</span>
              </div>
              <div className="rc">
                <span>Roti Coklat x1</span>
                <span>12.500</span>
              </div>
              <div className="rc">
                <span>Snack Kentang x1</span>
                <span>9.000</span>
              </div>
              <div className="sep"></div>
              <div className="rc">
                <span>Subtotal</span>
                <span>38.500</span>
              </div>
              <div className="rc">
                <span>Member 5%</span>
                <span>-1.925</span>
              </div>
              <div className="rc b">
                <span>TOTAL</span>
                <span>36.575</span>
              </div>
              <div className="rc">
                <span>QRIS</span>
                <span>36.575</span>
              </div>
              <div className="sep"></div>
              <div className="ctr">#001284 · 14:32 · Andini</div>
              <div className="ctr">Shift #47 · 80mm · ESC/POS</div>
              <div className="rc-code"></div>
              <div className="ctr">Thank you — Terima kasih</div>
            </div>
            <div className="receipt-tear"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HardwareSection;

