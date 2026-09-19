import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  Download,
} from 'lucide-react';
import { BrandLogo, GithubIcon } from '../common/BrandLogo';
import { scrollToTarget } from '../../utils/scroll';

interface NavLinkItem {
  label: string;
  href: string;
  isLive?: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Showcase', href: '#features' },
  { label: 'Live App', href: '#appWin', isLive: true },
  { label: 'Offline Engine', href: '#offline' },
  { label: 'Host System', href: '#host' },
  { label: 'AI Intelligence', href: '#ai' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'Architecture', href: '#how' },
];

export const Navbar: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('kivo-theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('top');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('kivo-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Scroll spy & reading progress
  useEffect(() => {
    const sections = ['top', 'features', 'appWin', 'offline', 'host', 'ai', 'hardware', 'how', 'download'];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }

      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / totalScroll) * 100)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    scrollToTarget(href);
  };

  return (
    <>
      <header className="nav-header">
        {/* Ambient Top Reading Progress Bar */}
        <div className="nav-progress-bar" style={{ width: `${scrollProgress}%` }} />

        <div className="nav-container">
          {/* Brand Logo & Technical Monospace Tag */}
          <div className="nav-brand-group">
            <a
              href="#top"
              className="nav-brand-link"
              onClick={e => handleNavClick(e, '#top')}
            >
              <BrandLogo size={28} />
            </a>
            <span className="nav-version-tag">v1.4.0</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="nav-menu" aria-label="Main Navigation">
            {NAV_LINKS.map(item => {
              const targetId = item.href.replace('#', '');
              const isActive = activeSection === targetId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={e => handleNavClick(e, item.href)}
                >
                  {item.label}
                  {item.isLive && <span className="nav-live-dot" title="Live Interactive Simulator" />}
                </a>
              );
            })}
          </nav>

          {/* Action CTAs & Controls */}
          <div className="nav-actions">
            {/* GitHub Repo Link */}
            <a
              href="https://github.com/AchiraStudio/kivo"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-btn"
              title="View on GitHub"
              aria-label="GitHub Repository"
            >
              <GithubIcon size={18} />
            </a>

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              className="nav-icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Color Theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Primary Download CTA */}
            <a
              href="#download"
              className="nav-cta-btn"
              onClick={e => handleNavClick(e, '#download')}
            >
              <Download size={14} />
              <span>Get Kivo</span>
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="nav-mobile-toggle"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle Mobile Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="nav-mobile-drawer">
          <nav className="nav-mobile-links">
            {NAV_LINKS.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="nav-mobile-link"
                onClick={e => handleNavClick(e, item.href)}
              >
                <span>{item.label}</span>
                {item.isLive && <span className="nav-live-dot" />}
              </a>
            ))}
            <div className="nav-mobile-divider" />
            <a
              href="#download"
              className="nav-mobile-cta"
              onClick={e => handleNavClick(e, '#download')}
            >
              <Download size={16} />
              <span>Download Desktop Installer</span>
            </a>
          </nav>
        </div>
      )}
    </>
  );
};

export default Navbar;
