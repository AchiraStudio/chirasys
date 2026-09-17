import React from 'react';
import { Store, GitBranch, Cloud } from 'lucide-react';

export const OnboardingSection: React.FC = () => {
  const steps = [
    { num: '01', title: 'Deployment', desc: 'New store, join a workspace, or restore from cloud' },
    { num: '02', title: 'Store', desc: 'Identity, currency, and receipt profile' },
    { num: '03', title: 'Cloud', desc: 'Supabase credentials — optional, always yours' },
    { num: '04', title: 'AI', desc: 'Your OpenAI key, stored locally' },
    { num: '05', title: 'Owner', desc: 'Owner account and starting capital' },
    { num: '06', title: 'Ready', desc: 'Inventory & accounting configured — sell' },
  ];

  return (
    <section className="section tint" id="onboarding">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot"></span>ONBOARDING
          </div>
          <h2 className="h2">From download to first sale in one sitting.</h2>
          <p className="lead">
            A guided setup wizard that respects your time — choose how you want to start.
          </p>
        </div>

        <div className="onboard-rail" data-reveal>
          {steps.map(s => (
            <div key={s.num} className="ostep">
              <span className="on-n">{s.num}</span>
              <b>{s.title}</b>
              <small>{s.desc}</small>
            </div>
          ))}
        </div>

        <div className="path-cards" data-reveal>
          <div className="pcard">
            <span className="f-ic">
              <Store size={20} />
            </span>
            <div>
              <b>Create New Store</b>
              <p>Start fresh with a clean local database.</p>
            </div>
          </div>

          <div className="pcard">
            <span className="f-ic">
              <GitBranch size={20} />
            </span>
            <div>
              <b>Join Existing Workspace</b>
              <p>Connect to your business's multi-branch workspace.</p>
            </div>
          </div>

          <div className="pcard">
            <span className="f-ic">
              <Cloud size={20} />
            </span>
            <div>
              <b>Restore From Cloud</b>
              <p>Pull your existing data onto a new machine.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingSection;

