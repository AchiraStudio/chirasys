import React from 'react';
import { Printer, Receipt as ReceiptIcon, ScanBarcode, Cable } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  return (
    <section className="section" id="hardware">
      <div className="wrap hw-grid">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            PERIPHERAL INTEGRATION
          </div>
          <h2 className="h2">Plug &amp; Play Hardware. Zero Driver Hassle.</h2>
          <p className="lead">
            Direct ESC/POS communication bypasses Windows print spooler queues. Receipts print instantly the second payment clears.
          </p>

          {/* Keynote Hardware Spec Badges */}
          <div className="hw-spec-cards">
            <div className="hw-card">
              <div className="hw-icon-box color-primary">
                <Printer size={18} />
              </div>
              <div>
                <h4 className="hw-title">58mm &amp; 80mm ESC/POS Thermal</h4>
                <p className="hw-desc">Sub-millisecond raw printer output with crisp logos and QR codes</p>
              </div>
            </div>

            <div className="hw-card">
              <div className="hw-icon-box color-warning">
                <ReceiptIcon size={18} />
              </div>
              <div>
                <h4 className="hw-title">24V Auto Cash Drawer Kick</h4>
                <p className="hw-desc">Automatic RJ-11 drawer release trigger on tender completion</p>
              </div>
            </div>

            <div className="hw-card">
              <div className="hw-icon-box color-accent">
                <ScanBarcode size={18} />
              </div>
              <div>
                <h4 className="hw-title">Barcode &amp; 2D QR Scanners</h4>
                <p className="hw-desc">Instant HID keyboard wedge &amp; COM virtual serial compatibility</p>
              </div>
            </div>

            <div className="hw-card">
              <div className="hw-icon-box color-success">
                <Cable size={18} />
              </div>
              <div>
                <h4 className="hw-title">Universal Interface Protocol</h4>
                <p className="hw-desc">Seamless communication across USB, Network LAN/Wi-Fi &amp; Bluetooth</p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentic Live Thermal Receipt Visual */}
        <div className="receipt-wrap" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div>
            <div className="receipt">
              <div className="ctr b" style={{ fontSize: '13px' }}>
                KIVO FLAGSHIP STORE
              </div>
              <div className="ctr">742 Market Street, Suite 400</div>
              <div className="sep" />
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
              <div className="sep" />
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
              <div className="sep" />
              <div className="ctr">#001284 · 14:32 · Register #01</div>
              <div className="ctr">Shift #47 · 80mm · ESC/POS Raw</div>
              <div className="rc-code" />
              <div className="ctr">Thank you for your visit!</div>
            </div>
            <div className="receipt-tear" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HardwareSection;
