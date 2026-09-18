import React from 'react';
import { Printer, Receipt as ReceiptIcon, ScanBarcode, Wifi } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  return (
    <section className="section" id="hardware">
      <div className="wrap hw-grid">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>HARDWARE INTEGRATION
          </div>
          <h2 className="h2">Native compatibility with modern POS retail hardware.</h2>
          <p className="lead">
            Connect thermal receipt printers, electronic cash drawers, and barcode scanners with zero-configuration plug &amp; play.
          </p>
          <ul className="blist">
            <li>
              <Printer size={16} />
              <span>
                <b>Ultra-Fast Thermal Output</b> — instantaneous receipt printing via raw ESC/POS and native printer drivers.
              </span>
            </li>
            <li>
              <ReceiptIcon size={16} />
              <span>
                <b>58 mm &amp; 80 mm Formats</b> — crisp layouts with high-contrast logos, QR payment codes, and barcodes.
              </span>
            </li>
            <li>
              <ScanBarcode size={16} />
              <span>
                <b>Cash Drawers &amp; Barcode Scanners</b> — auto-fire 24V pulse drawer kick upon tender completion.
              </span>
            </li>
            <li>
              <Wifi size={16} />
              <span>
                <b>Universal Connectivity</b> — works out of the box via USB, Ethernet LAN / Wi-Fi, or Bluetooth.
              </span>
            </li>
          </ul>
        </div>

        <div className="receipt-wrap" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div>
            <div className="receipt">
              <div className="ctr b" style={{ fontSize: '13px' }}>
                KIVO FLAGSHIP STORE
              </div>
              <div className="ctr">742 Market Street, Suite 400</div>
              <div className="sep"></div>
              <div className="rc">
                <span>Cold Brew Coffee x2</span>
                <span>$7.00</span>
              </div>
              <div className="rc">
                <span>Artisan Croissant x1</span>
                <span>$4.50</span>
              </div>
              <div className="rc">
                <span>BBQ Potato Crisps x1</span>
                <span>$2.50</span>
              </div>
              <div className="sep"></div>
              <div className="rc">
                <span>Subtotal</span>
                <span>$14.00</span>
              </div>
              <div className="rc">
                <span>Member VIP 10%</span>
                <span>-$1.40</span>
              </div>
              <div className="rc b">
                <span>TOTAL</span>
                <span>$12.60</span>
              </div>
              <div className="rc">
                <span>Contactless / Card</span>
                <span>$12.60</span>
              </div>
              <div className="sep"></div>
              <div className="ctr">#001284 · 14:32 · Register #01</div>
              <div className="ctr">Shift #47 · 80mm · ESC/POS Raw</div>
              <div className="rc-code"></div>
              <div className="ctr">Thank you for your visit!</div>
            </div>
            <div className="receipt-tear"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HardwareSection;

