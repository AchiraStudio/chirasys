import React, { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Hero from './components/hero/Hero';
import FeatureGrid from './components/sections/FeatureGrid';
import OfflineSimulator from './components/interactive/OfflineSimulator';
import { HostSyncSection } from './components/sections/HostSyncSection';
import AiAssistantDemo from './components/interactive/AiAssistantDemo';
import HardwareSection from './components/sections/HardwareSection';
import SecuritySection from './components/sections/SecuritySection';
import TechArchitecture from './components/sections/TechArchitecture';
import DownloadSection from './components/sections/DownloadSection';
import Footer from './components/layout/Footer';
import { scrollToTarget } from './utils/scroll';

export const App: React.FC = () => {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = document.querySelectorAll('[data-reveal]');

    if (prefersReducedMotion) {
      revealEls.forEach(el => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Global smooth scrolling for all internal anchor links
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        scrollToTarget(href);
      }
    };

    document.addEventListener('click', handleSmoothScroll);
    return () => document.removeEventListener('click', handleSmoothScroll);
  }, []);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      {/* Primary Sticky Navigation */}
      <Navbar />

      <main id="main">
        {/* Interactive Hero with Real Kivo Application Preview & Trust Bar */}
        <Hero />

        {/* Core Pillars: Spacious Bento Grid */}
        <FeatureGrid />

        {/* Offline-First SQLite Simulator & Reconnect Draining */}
        <OfflineSimulator />

        {/* Multi-Device Host System & Instant Mobile Terminal */}
        <HostSyncSection />

        {/* In-App Conversational AI Assistant & Business Analytics */}
        <AiAssistantDemo />

        {/* POS Hardware, Thermal Printers & Cash Drawer Integration */}
        <HardwareSection />

        {/* Security, 100% BYOK Privacy Model & RBAC Matrix */}
        <SecuritySection />

        {/* Architecture: Rust, Tauri v2, SQLite WAL & Supabase */}
        <TechArchitecture />

        {/* Multi-Platform Downloads & Open Source CTA */}
        <DownloadSection />
      </main>

      {/* Site Footer */}
      <Footer />
    </>
  );
};

export default App;
