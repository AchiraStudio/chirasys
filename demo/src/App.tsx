import React, { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Hero from './components/hero/Hero';
import EcosystemSection from './components/sections/EcosystemSection';
import DayWithKivo from './components/interactive/DayWithKivo';
import FeatureGrid from './components/sections/FeatureGrid';
import PosDeepDive from './components/sections/PosDeepDive';
import InventoryDeepDive from './components/sections/InventoryDeepDive';
import PurchasingDeepDive from './components/sections/PurchasingDeepDive';
import AccountingDeepDive from './components/sections/AccountingDeepDive';
import CustomersPromosSection from './components/sections/CustomersPromosSection';
import CloudSection from './components/sections/CloudSection';
import OfflineSimulator from './components/interactive/OfflineSimulator';
import LanSyncSection from './components/sections/LanSyncSection';
import AiAssistantDemo from './components/interactive/AiAssistantDemo';
import SecuritySection from './components/sections/SecuritySection';
import HardwareSection from './components/sections/HardwareSection';
import OnboardingSection from './components/sections/OnboardingSection';
import TechArchitecture from './components/sections/TechArchitecture';
import CharacteristicsStrip from './components/sections/CharacteristicsStrip';
import DownloadSection from './components/sections/DownloadSection';
import Footer from './components/layout/Footer';

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

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      {/* Primary Sticky Blur Navigation */}
      <Navbar />

      <main id="main">
        {/* Interactive Hero with Real Kivo Application Preview */}
        <Hero />

        {/* The System / Ecosystem Diagram */}
        <EcosystemSection />

        {/* A Day with Kivo (Interactive operational flow) */}
        <DayWithKivo />

        {/* 10 Architectural Pillars & Modules */}
        <FeatureGrid />

        {/* Deep Dive: Point of Sale & Cash Shifts */}
        <PosDeepDive />

        {/* Deep Dive: Multi-unit Inventory, Batches & Expiry */}
        <InventoryDeepDive />

        {/* Deep Dive: Purchasing & Direct Receiving Pipeline */}
        <PurchasingDeepDive />

        {/* Deep Dive: Automated Double-Entry Accounting */}
        <AccountingDeepDive />

        {/* Customers, Memberships & Promotion Engine */}
        <CustomersPromosSection />

        {/* Multi-Branch Cloud Sync & Real-time Network */}
        <CloudSection />

        {/* Offline-First SQLite Simulator & Reconnect Draining */}
        <OfflineSimulator />

        {/* Peer-to-Peer LAN Synchronization & UDP Discovery */}
        <LanSyncSection />

        {/* In-App Conversational AI Assistant & Data Exploration */}
        <AiAssistantDemo />

        {/* Security, 100% BYOK Privacy Model & RBAC Matrix */}
        <SecuritySection />

        {/* POS Hardware, Thermal Printers & Cash Drawer Integration */}
        <HardwareSection />

        {/* Guided First-Run Setup & Onboarding Wizard */}
        <OnboardingSection />

        {/* Architecture: Rust, Tauri v2, SQLite WAL & Supabase */}
        <TechArchitecture />

        {/* Operational Characteristics Strip */}
        <CharacteristicsStrip />

        {/* Multi-Platform Downloads & Open Source CTA */}
        <DownloadSection />
      </main>

      {/* Comprehensive Site Footer */}
      <Footer />
    </>
  );
};

export default App;
