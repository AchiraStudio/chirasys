import React from 'react';
import { WifiOff, GitBranch, KeyRound, Database, Cloud, Wifi } from 'lucide-react';
import { GithubIcon } from '../common/BrandLogo';

export const CharacteristicsStrip: React.FC = () => {
  const items = [
    { icon: WifiOff, title: 'Offline-first', desc: 'Sell without a connection', delay: '0ms' },
    { icon: GitBranch, title: 'Multi-branch', desc: 'One connected workspace', delay: '50ms' },
    { icon: KeyRound, title: 'BYOK', desc: 'Your keys, your infrastructure', delay: '100ms' },
    { icon: Database, title: 'Local database', desc: 'SQLite on your machine', delay: '150ms' },
    { icon: Cloud, title: 'Cloud sync', desc: 'Supabase, background sync', delay: '200ms' },
    { icon: Wifi, title: 'LAN sync', desc: 'Terminals over your network', delay: '250ms' },
    { icon: GithubIcon, title: 'Open source', desc: 'MIT licensed, inspectable', delay: '300ms' },
  ];

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot"></span>NILAI UTAMA
          </div>
          <h2 className="h2">Didesain untuk operasional nyata.</h2>
          <p className="lead">
            Performa native, kehandalan tanpa internet, dan data seutuhnya milik Anda.
          </p>
        </div>

        <div className="strip-grid">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="strip-item"
                data-reveal
                style={{ '--d': item.delay } as React.CSSProperties}
              >
                <Icon size={17} />
                <b>{item.title}</b>
                <small>{item.desc}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CharacteristicsStrip;

