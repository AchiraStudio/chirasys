import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  Download,
  ChevronDown,
  Search,
  ShoppingCart,
  Boxes,
  FileText,
  Landmark,
  Users,
  Printer,
  Network,
  Wifi,
  Database,
  ShieldCheck,
  Cpu,
  Sparkles,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { BrandLogo, GithubIcon } from '../common/BrandLogo';

interface SearchItem {
  id: string;
  title: string;
  category: 'Features' | 'Architecture' | 'Interactive Demos' | 'Actions';
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  isExternal?: boolean;
  action?: () => void;
}

export const Navbar: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('kivo-theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('top');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);

  // Mobile accordion state
  const [mobileAccordion, setMobileAccordion] = useState<{ [key: string]: boolean }>({
    features: false,
    architecture: false,
    demos: false,
  });

  const navRef = useRef<HTMLElement>(null);
  const dropdownTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    const sections = [
      'top',
      'product',
      'day',
      'features',
      'pos',
      'inventory',
      'purchasing',
      'accounting',
      'customers',
      'cloud',
      'offline',
      'lan',
      'ai',
      'security',
      'hardware',
      'onboarding',
      'how',
      'download',
    ];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 130;
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

  // Global keyboard shortcuts (Cmd+K / Ctrl+K and Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (cmdOpen) setCmdOpen(false);
        if (activeDropdown) setActiveDropdown(null);
        if (mobileOpen) setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cmdOpen, activeDropdown, mobileOpen]);

  // Focus search input when command palette opens
  useEffect(() => {
    if (cmdOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
      setSelectedSearchIdx(0);
    } else {
      setSearchQuery('');
    }
  }, [cmdOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown hover timing
  const handleMouseEnter = (name: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(prev => (prev === name ? null : name));
  };

  const toggleMobileSection = (key: string) => {
    setMobileAccordion(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check which parent dropdown is active
  const isFeaturesActive = ['pos', 'inventory', 'purchasing', 'accounting', 'customers', 'hardware'].includes(activeSection);
  const isArchitectureActive = ['product', 'cloud', 'lan', 'security', 'how', 'onboarding'].includes(activeSection);
  const isDemosActive = ['offline', 'ai', 'day'].includes(activeSection);

  // Command palette search items
  const searchItems: SearchItem[] = useMemo(
    () => [
      // Features
      {
        id: 'pos',
        title: 'Point of Sale & Kasir',
        category: 'Features',
        description: 'Kasir kilat, split bill, cash shift management & thermal printing',
        href: '#pos',
        icon: ShoppingCart,
        badge: 'Offline-first',
      },
      {
        id: 'inventory',
        title: 'Inventory & Multi-Unit Batches',
        category: 'Features',
        description: 'Multi-unit conversion, batch tracking, expiry & minimum stock alerts',
        href: '#inventory',
        icon: Boxes,
      },
      {
        id: 'purchasing',
        title: 'Purchasing & Direct Receiving',
        category: 'Features',
        description: 'Supplier purchase orders, partial receiving & supplier price trends',
        href: '#purchasing',
        icon: FileText,
      },
      {
        id: 'accounting',
        title: 'Automated Double-Entry Accounting',
        category: 'Features',
        description: 'Automated journal entries, real-time balance sheet & P&L statements',
        href: '#accounting',
        icon: Landmark,
      },
      {
        id: 'customers',
        title: 'Customer Loyalty & Promos',
        category: 'Features',
        description: 'Tiered VIP memberships, dynamic promotion engine & buy-X-get-Y',
        href: '#customers',
        icon: Users,
      },
      {
        id: 'hardware',
        title: 'POS Hardware & ESC/POS',
        category: 'Features',
        description: 'Direct thermal USB/LAN receipt printers, barcode scanners & cash drawers',
        href: '#hardware',
        icon: Printer,
      },

      // Architecture
      {
        id: 'product',
        title: 'Ecosystem & Topology Map',
        category: 'Architecture',
        description: 'Unified 6-node architecture diagram connecting Cloud, POS, LAN, & AI',
        href: '#product',
        icon: Layers,
      },
      {
        id: 'offline-arch',
        title: 'Zero-Cloud SQLite WAL Engine',
        category: 'Architecture',
        description: 'Local SQLite WAL database, instant queries and zero server dependency',
        href: '#offline',
        icon: Database,
        badge: 'Zero latency',
      },
      {
        id: 'lan',
        title: 'Peer-to-Peer LAN Synchronization',
        category: 'Architecture',
        description: 'Sub-millisecond local network sync with automatic UDP discovery',
        href: '#lan',
        icon: Wifi,
      },
      {
        id: 'cloud',
        title: 'Multi-Branch Cloud Replication',
        category: 'Architecture',
        description: 'Supabase sync engine, central headquarters reporting & branch routing',
        href: '#cloud',
        icon: Network,
      },
      {
        id: 'security',
        title: '100% BYOK Security & RBAC',
        category: 'Architecture',
        description: 'Zero vendor lock-in, AES-256 client encryption & granular role matrix',
        href: '#security',
        icon: ShieldCheck,
        badge: 'Private',
      },
      {
        id: 'how',
        title: 'Rust & Tauri v2 Technology Stack',
        category: 'Architecture',
        description: 'Under the hood: native Rust performance, ultra-low memory & lightweight webview',
        href: '#how',
        icon: Cpu,
      },
      {
        id: 'onboarding',
        title: '3-Step Setup & Onboarding Wizard',
        category: 'Architecture',
        description: 'Fast onboarding from fresh installation to first checkout in one sitting',
        href: '#onboarding',
        icon: Compass,
      },

      // Interactive Demos
      {
        id: 'demo-offline',
        title: 'Offline Simulator Demo',
        category: 'Interactive Demos',
        description: 'Interactive test: toggle internet off and watch sync queues drain live',
        href: '#offline',
        icon: Database,
        badge: 'Interactive',
      },
      {
        id: 'demo-ai',
        title: 'Kivo AI Copilot Simulator',
        category: 'Interactive Demos',
        description: 'Ask business intelligence, inventory restock, and sales metrics in natural language',
        href: '#ai',
        icon: Sparkles,
        badge: 'Interactive',
      },
      {
        id: 'demo-day',
        title: 'A Day with Kivo (Operational Flow)',
        category: 'Interactive Demos',
        description: 'Interactive timeline: 08:00 store opening to 22:30 cloud consolidation',
        href: '#day',
        icon: Clock,
        badge: 'Interactive',
      },

      // Actions
      {
        id: 'action-download',
        title: 'Download Desktop App v1.3.2',
        category: 'Actions',
        description: 'Download installer for Windows (64-bit portable or setup executable)',
        href: '#download',
        icon: Download,
        badge: 'v1.3.2',
      },
      {
        id: 'action-github',
        title: 'View Source on GitHub',
        category: 'Actions',
        description: 'Explore the open source repository, star, or contribute',
        href: 'https://github.com/AchiraStudio/kivo',
        icon: ExternalLink,
        isExternal: true,
      },
      {
        id: 'action-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
        category: 'Actions',
        description: 'Toggle UI color theme between Dark Mode and Light Mode',
        href: '#',
        icon: theme === 'dark' ? Sun : Moon,
        action: toggleTheme,
      },
    ],
    [theme]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return searchItems;
    const q = searchQuery.toLowerCase();
    return searchItems.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchItems, searchQuery]);

  const handleSearchSelect = (item: SearchItem) => {
    setCmdOpen(false);
    if (item.action) {
      item.action();
      return;
    }
    if (item.isExternal) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }
    const target = document.querySelector(item.href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIdx(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIdx(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedSearchIdx]) {
        handleSearchSelect(filteredItems[selectedSearchIdx]);
      }
    }
  };

  return (
    <>
      <header className={`nav ${mobileOpen ? 'open' : ''}`} id="nav" ref={navRef}>
        <div className="nav-in">
          {/* Brand Logo with Version Pill */}
          <a className="brand" href="#top" aria-label="Kivo home">
            <BrandLogo size={28} />
            <span className="brand-badge">v1.3</span>
          </a>

          {/* Structured Primary Navigation */}
          <nav className="nav-links" aria-label="Primary navigation">
            {/* Features Dropdown */}
            <div
              className={`nav-dropdown ${activeDropdown === 'features' ? 'open' : ''}`}
              onMouseEnter={() => handleMouseEnter('features')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`nav-drop-btn ${isFeaturesActive ? 'active' : ''}`}
                onClick={() => toggleDropdown('features')}
                aria-expanded={activeDropdown === 'features'}
              >
                <span>Features</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="nav-mega-menu mega-features">
                <div className="mega-grid-2col">
                  {/* Column 1: Store Operations */}
                  <div className="mega-col">
                    <div className="mega-col-title">Operations</div>
                    <a
                      href="#pos"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-p">
                        <ShoppingCart size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">
                          POS & Kasir <span className="mini-badge">Offline-first</span>
                        </div>
                        <div className="mega-item-desc">Kasir cepat, split bill &amp; shift laci kasir</div>
                      </div>
                    </a>

                    <a
                      href="#inventory"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-b">
                        <Boxes size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Inventory & Batches</div>
                        <div className="mega-item-desc">Multi-satuan, batch expiry &amp; opname</div>
                      </div>
                    </a>

                    <a
                      href="#purchasing"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-g">
                        <FileText size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Purchasing Pipeline</div>
                        <div className="mega-item-desc">PO supplier &amp; penerimaan gudang langsung</div>
                      </div>
                    </a>
                  </div>

                  {/* Column 2: Finance & Management */}
                  <div className="mega-col">
                    <div className="mega-col-title">Finance & Growth</div>
                    <a
                      href="#accounting"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-o">
                        <Landmark size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Automated Ledger</div>
                        <div className="mega-item-desc">Jurnal otomatis, laba rugi &amp; neraca</div>
                      </div>
                    </a>

                    <a
                      href="#customers"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-p">
                        <Users size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Customers & Loyalty</div>
                        <div className="mega-item-desc">Member tier, poin loyalitas &amp; promo</div>
                      </div>
                    </a>

                    <a
                      href="#hardware"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-b">
                        <Printer size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">POS Hardware</div>
                        <div className="mega-item-desc">Thermal ESC/POS, laci kasir &amp; scanner</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="mega-footer">
                  <span>Looking for architectural foundations?</span>
                  <a
                    href="#features"
                    className="mega-footer-link"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <span>Explore 10 Core Pillars</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </div>

            {/* Architecture Dropdown */}
            <div
              className={`nav-dropdown ${activeDropdown === 'architecture' ? 'open' : ''}`}
              onMouseEnter={() => handleMouseEnter('architecture')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`nav-drop-btn ${isArchitectureActive ? 'active' : ''}`}
                onClick={() => toggleDropdown('architecture')}
                aria-expanded={activeDropdown === 'architecture'}
              >
                <span>Architecture</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="nav-mega-menu mega-architecture">
                <div className="mega-grid-2col">
                  {/* Column 1: Network & Offline */}
                  <div className="mega-col">
                    <div className="mega-col-title">Network & Sync</div>
                    <a
                      href="#offline"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-b">
                        <Database size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">
                          Offline-First WAL <span className="mini-badge">Zero Latency</span>
                        </div>
                        <div className="mega-item-desc">Database SQLite lokal, tanpa ketergantungan server</div>
                      </div>
                    </a>

                    <a
                      href="#lan"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-p">
                        <Wifi size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">P2P LAN Synchronization</div>
                        <div className="mega-item-desc">Sinkronisasi lokal real-time tanpa internet</div>
                      </div>
                    </a>

                    <a
                      href="#cloud"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-g">
                        <Network size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Hybrid Cloud Replication</div>
                        <div className="mega-item-desc">Supabase integration multi-cabang instan</div>
                      </div>
                    </a>
                  </div>

                  {/* Column 2: Privacy & Performance */}
                  <div className="mega-col">
                    <div className="mega-col-title">Privacy & Engine</div>
                    <a
                      href="#security"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-g">
                        <ShieldCheck size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">
                          100% BYOK Security <span className="mini-badge">No Lock-in</span>
                        </div>
                        <div className="mega-item-desc">Kunci API pribadi, enkripsi AES &amp; RBAC</div>
                      </div>
                    </a>

                    <a
                      href="#how"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-o">
                        <Cpu size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">Rust & Tauri v2 Core</div>
                        <div className="mega-item-desc">Binary native kencang &amp; memori ultra-ringan</div>
                      </div>
                    </a>

                    <a
                      href="#product"
                      className="mega-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <div className="mega-item-icon color-p">
                        <Layers size={17} />
                      </div>
                      <div className="mega-item-text">
                        <div className="mega-item-title">System Ecosystem Map</div>
                        <div className="mega-item-desc">Topologi visual terhubung antar 6 modul</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="mega-footer">
                  <span>Fast, frictionless deployment</span>
                  <a
                    href="#onboarding"
                    className="mega-footer-link"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <span>See 3-Step Setup Wizard</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </div>

            {/* Demos Dropdown with Pulsing Live Dot */}
            <div
              className={`nav-dropdown ${activeDropdown === 'demos' ? 'open' : ''}`}
              onMouseEnter={() => handleMouseEnter('demos')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`nav-drop-btn ${isDemosActive ? 'active' : ''}`}
                onClick={() => toggleDropdown('demos')}
                aria-expanded={activeDropdown === 'demos'}
              >
                <span className="live-indicator-dot" />
                <span>Demos</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="nav-dropdown-menu single-col">
                <a
                  href="#offline"
                  className="mega-item"
                  onClick={() => setActiveDropdown(null)}
                >
                  <div className="mega-item-icon color-b">
                    <Database size={17} />
                  </div>
                  <div className="mega-item-text">
                    <div className="mega-item-title">
                      Offline Simulator <span className="mini-badge-glow">Try Live</span>
                    </div>
                    <div className="mega-item-desc">Cut network connection & see local queue drain</div>
                  </div>
                </a>

                <a
                  href="#ai"
                  className="mega-item"
                  onClick={() => setActiveDropdown(null)}
                >
                  <div className="mega-item-icon color-p">
                    <Sparkles size={17} />
                  </div>
                  <div className="mega-item-text">
                    <div className="mega-item-title">
                      Kivo AI Copilot <span className="mini-badge">BYOK</span>
                    </div>
                    <div className="mega-item-desc">Ask sales metrics & restock queries in natural language</div>
                  </div>
                </a>

                <a
                  href="#day"
                  className="mega-item"
                  onClick={() => setActiveDropdown(null)}
                >
                  <div className="mega-item-icon color-o">
                    <Clock size={17} />
                  </div>
                  <div className="mega-item-text">
                    <div className="mega-item-title">A Day with Kivo</div>
                    <div className="mega-item-desc">Interactive retail journey from 08:00 to 22:30</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Direct Link: Pillars */}
            <a
              href="#features"
              className={`nav-link-direct ${activeSection === 'features' ? 'active' : ''}`}
            >
              Pillars
            </a>
          </nav>

          {/* Actions Suite */}
          <div className="nav-actions">
            {/* Command Palette Trigger */}
            <button
              type="button"
              className="nav-search-btn"
              onClick={() => setCmdOpen(true)}
              aria-label="Quick jump (Cmd+K)"
              title="Search sections and tools (⌘K)"
            >
              <Search size={14} className="search-icon" />
              <span className="search-label">Quick jump</span>
              <kbd className="search-kbd">⌘K</kbd>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className="icon-btn theme-toggle-btn"
              id="themeBtn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* GitHub Repo Link */}
            <a
              className="btn btn-secondary btn-sm nav-gh-btn"
              href="https://github.com/AchiraStudio/kivo"
              target="_blank"
              rel="noopener noreferrer"
              title="View source repository on GitHub"
            >
              <GithubIcon size={15} />
              <span>GitHub</span>
            </a>

            {/* Primary CTA */}
            <a className="btn btn-primary btn-sm nav-cta-btn" href="#download">
              <Download size={15} />
              <span>Download v1.3.2</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="burger"
              id="burger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Integrated Reading Scroll Progress Bar */}
          <div className="nav-progress-track">
            <div
              className="nav-progress-bar"
              style={{ width: `${scrollProgress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="nav-mobile" id="navMobile">
            {/* Quick Search in Mobile */}
            <div className="mobile-search-wrapper">
              <button
                type="button"
                className="mobile-search-btn"
                onClick={() => {
                  setMobileOpen(false);
                  setCmdOpen(true);
                }}
              >
                <Search size={16} />
                <span>Search sections, features, demos...</span>
                <kbd>⌘K</kbd>
              </button>
            </div>

            <div className="mobile-nav-list">
              {/* Features Accordion */}
              <div className="mobile-accordion-group">
                <button
                  type="button"
                  className="mobile-accordion-head"
                  onClick={() => toggleMobileSection('features')}
                >
                  <span className="mobile-head-title">Features & Modules</span>
                  <ChevronDown
                    size={16}
                    className={`mobile-chevron ${mobileAccordion.features ? 'rotate' : ''}`}
                  />
                </button>

                {mobileAccordion.features && (
                  <div className="mobile-accordion-body">
                    <a href="#pos" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <ShoppingCart size={15} className="color-p" />
                      <span>POS & Kasir</span>
                    </a>
                    <a href="#inventory" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Boxes size={15} className="color-b" />
                      <span>Inventory & Batches</span>
                    </a>
                    <a href="#purchasing" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <FileText size={15} className="color-g" />
                      <span>Purchasing Pipeline</span>
                    </a>
                    <a href="#accounting" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Landmark size={15} className="color-o" />
                      <span>Automated Accounting</span>
                    </a>
                    <a href="#customers" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Users size={15} className="color-p" />
                      <span>Customers & Loyalty</span>
                    </a>
                    <a href="#hardware" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Printer size={15} className="color-b" />
                      <span>POS Hardware Integration</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Architecture Accordion */}
              <div className="mobile-accordion-group">
                <button
                  type="button"
                  className="mobile-accordion-head"
                  onClick={() => toggleMobileSection('architecture')}
                >
                  <span className="mobile-head-title">Architecture & Engine</span>
                  <ChevronDown
                    size={16}
                    className={`mobile-chevron ${mobileAccordion.architecture ? 'rotate' : ''}`}
                  />
                </button>

                {mobileAccordion.architecture && (
                  <div className="mobile-accordion-body">
                    <a href="#offline" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Database size={15} className="color-b" />
                      <span>Offline-First WAL Engine</span>
                    </a>
                    <a href="#lan" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Wifi size={15} className="color-p" />
                      <span>Peer-to-Peer LAN Sync</span>
                    </a>
                    <a href="#cloud" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Network size={15} className="color-g" />
                      <span>Multi-Branch Cloud Replication</span>
                    </a>
                    <a href="#security" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <ShieldCheck size={15} className="color-g" />
                      <span>100% BYOK Security & RBAC</span>
                    </a>
                    <a href="#how" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Cpu size={15} className="color-o" />
                      <span>Rust & Tauri v2 Technology</span>
                    </a>
                    <a href="#product" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Layers size={15} className="color-p" />
                      <span>System Ecosystem Map</span>
                    </a>
                    <a href="#onboarding" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Compass size={15} className="color-b" />
                      <span>3-Step Onboarding Setup</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Demos Accordion */}
              <div className="mobile-accordion-group">
                <button
                  type="button"
                  className="mobile-accordion-head"
                  onClick={() => toggleMobileSection('demos')}
                >
                  <div className="flex items-center gap-2">
                    <span className="live-indicator-dot" />
                    <span className="mobile-head-title">Interactive Demos</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`mobile-chevron ${mobileAccordion.demos ? 'rotate' : ''}`}
                  />
                </button>

                {mobileAccordion.demos && (
                  <div className="mobile-accordion-body">
                    <a href="#offline" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Database size={15} className="color-b" />
                      <span>Offline Simulator</span>
                    </a>
                    <a href="#ai" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Sparkles size={15} className="color-p" />
                      <span>Kivo AI Copilot</span>
                    </a>
                    <a href="#day" onClick={() => setMobileOpen(false)} className="mobile-sublink">
                      <Clock size={15} className="color-o" />
                      <span>A Day with Kivo Flow</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Direct Link: Pillars */}
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="mobile-direct-link"
              >
                <span>10 Architectural Pillars</span>
                <ArrowRight size={14} />
              </a>
            </div>

            {/* Mobile Actions Footer */}
            <div className="mobile-footer-actions">
              <a
                className="btn btn-secondary btn-sm"
                href="https://github.com/AchiraStudio/kivo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon size={15} />
                <span>GitHub Repo</span>
              </a>

              <a
                className="btn btn-primary btn-sm"
                href="#download"
                onClick={() => setMobileOpen(false)}
              >
                <Download size={15} />
                <span>Download v1.3.2</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Command Palette (⌘K) Modal */}
      {cmdOpen && (
        <div className="cmd-backdrop" onClick={() => setCmdOpen(false)}>
          <div className="cmd-modal" onClick={e => e.stopPropagation()}>
            <div className="cmd-head">
              <Search size={18} className="cmd-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="cmd-input"
                placeholder="Jump to section, feature, demo, or action..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedSearchIdx(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              <button
                type="button"
                className="cmd-close-btn"
                onClick={() => setCmdOpen(false)}
                title="Close (Esc)"
              >
                <kbd>ESC</kbd>
              </button>
            </div>

            <div className="cmd-body">
              {filteredItems.length === 0 ? (
                <div className="cmd-empty">No results found for &ldquo;{searchQuery}&rdquo;</div>
              ) : (
                <div className="cmd-list">
                  {filteredItems.map((item, idx) => {
                    const IconComponent = item.icon;
                    const isSelected = idx === selectedSearchIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`cmd-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSearchSelect(item)}
                        onMouseEnter={() => setSelectedSearchIdx(idx)}
                      >
                        <div className="cmd-item-icon">
                          <IconComponent size={17} />
                        </div>
                        <div className="cmd-item-content">
                          <div className="cmd-item-row">
                            <span className="cmd-item-title">{item.title}</span>
                            {item.badge && <span className="cmd-item-badge">{item.badge}</span>}
                            <span className="cmd-item-cat">{item.category}</span>
                          </div>
                          <div className="cmd-item-desc">{item.description}</div>
                        </div>
                        {isSelected && <ArrowRight size={14} className="cmd-item-arrow" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cmd-foot">
              <div className="cmd-hints">
                <span>
                  <kbd>↑</kbd> <kbd>↓</kbd> to navigate
                </span>
                <span>
                  <kbd>↵</kbd> to select
                </span>
                <span>
                  <kbd>esc</kbd> to close
                </span>
              </div>
              <div className="cmd-shortcut-tag">Kivo Quick Jump</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
