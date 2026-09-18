import React from 'react';
import { Store, GitBranch, Cloud } from 'lucide-react';

export const OnboardingSection: React.FC = () => {
  const steps = [
    { num: '01', title: 'Setup Mode', desc: 'Initialize fresh store, join branch cluster, or restore' },
    { num: '02', title: 'Store Identity', desc: 'Business name, branch address, and receipt header branding' },
    { num: '03', title: 'Cloud Supabase', desc: 'Enter private Supabase URL & Anon Key (BYOK model)' },
    { num: '04', title: 'Activate Kivo AI', desc: 'Private OpenAI / Anthropic key encrypted on local disk' },
    { num: '05', title: 'Root Credentials', desc: 'Create master admin account and initial register cash float' },
    { num: '06', title: 'Ready for Sales', desc: 'Scan first product barcode and serve checkout customers' },
  ];

  return (
    <section className="section" id="onboarding">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot" />
            INSTANT ONBOARDING
          </div>
          <h2 className="h2">From Download to First Customer Checkout in 3 Minutes.</h2>
          <p className="lead">
            Streamlined setup wizard guides store profile initialization, thermal receipt testing, and security credentials.
          </p>
        </div>

        {/* 6 Step Interactive Rail */}
        <div className="onboard-rail" data-reveal>
          {steps.map(s => (
            <div key={s.num} className="ostep">
              <span className="on-n">{s.num}</span>
              <b>{s.title}</b>
              <small>{s.desc}</small>
            </div>
          ))}
        </div>

        {/* 3 Deployment Path Cards */}
        <div className="path-cards" data-reveal style={{ marginTop: '28px' }}>
          <div className="pcard">
            <span className="f-ic" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
              <Store size={20} />
            </span>
            <div>
              <b style={{ color: 'var(--heading)', fontSize: '15px' }}>Launch New Store</b>
              <p style={{ color: 'var(--body)', fontSize: '13px', marginTop: '4px' }}>
                Start clean with an empty local SQLite database ready for instant catalog import.
              </p>
            </div>
          </div>

          <div className="pcard">
            <span className="f-ic" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
              <GitBranch size={20} />
            </span>
            <div>
              <b style={{ color: 'var(--heading)', fontSize: '15px' }}>Join Existing Branch</b>
              <p style={{ color: 'var(--body)', fontSize: '13px', marginTop: '4px' }}>
                Connect this register terminal to an existing store workspace via cloud mesh or LAN.
              </p>
            </div>
          </div>

          <div className="pcard">
            <span className="f-ic" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>
              <Cloud size={20} />
            </span>
            <div>
              <b style={{ color: 'var(--heading)', fontSize: '15px' }}>Restore from Cloud</b>
              <p style={{ color: 'var(--body)', fontSize: '13px', marginTop: '4px' }}>
                Pull full catalog, customer records, and transaction history onto a replacement machine in 1 click.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingSection;
