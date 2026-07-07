import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import WalletStatus from './WalletStatus';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  BarChart3,
  Building,
  Gavel,
  ScrollText,
  FileText,
  AlertTriangle,
  FlaskConical,
  Puzzle,
  GitFork,
  Link2,
  Database,
  Shield,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/portal', icon: BarChart3 },
  { name: 'Assets', path: '/portal/assets', icon: Building },
  { name: 'Oracles', path: '/portal/oracles', icon: GitFork },
  { name: 'Governance', path: '/portal/governance', icon: Gavel },
  { name: 'SBTs', path: '/portal/sbt', icon: ScrollText },
  { name: 'Contracts', path: '/portal/contracts', icon: FileText },
  { name: 'Chain Explorer', path: '/portal/chain', icon: Link2 },
  { name: 'Data Adapters', path: '/portal/data', icon: Database },
  { name: 'KYC Gate', path: '/portal/kyc', icon: Shield },
  { name: 'Anomalies', path: '/portal/anomalies', icon: AlertTriangle },
  { name: 'Agent Demo', path: '/portal/agent-demo', icon: FlaskConical },
  { name: 'API Playground', path: '/portal/playground', icon: Puzzle },
];

const PortalLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-gray-100 shrink-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="/images/logo.png" alt="RWA-Sentinel" className="h-7 w-7 shrink-0 object-contain" />
            {!collapsed && <span className="font-bold text-sm text-gray-900 truncate">RWA-Sentinel</span>}
          </Link>
        </div>

        {/* Home link */}
        <div className="px-2 pt-2 shrink-0">
          <Link
            to="/"
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Back to Landing"
          >
            <Home className="shrink-0" size={18} />
            {!collapsed && <span>Landing Page</span>}
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-3 my-1 border-t border-gray-100" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  end={item.path === '/portal'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors duration-150 ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="shrink-0" size={18} />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 py-2 border-t border-gray-100 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Wallet Connect */}
        <div className={`px-2 pb-3 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <WalletStatus compact />
          ) : (
            <WalletStatus />
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
