import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Menu,
  X,
  BarChart3,
  Wallet,
  Building,
  Gavel,
  ScrollText,
  FileText,
  AlertTriangle,
  FlaskConical,
  Puzzle,
  GitFork,
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
  { name: 'Anomalies', path: '/portal/anomalies', icon: AlertTriangle },
  { name: 'Agent Demo', path: '/portal/agent-demo', icon: FlaskConical },
  { name: 'API Playground', path: '/portal/playground', icon: Puzzle },
];

const PortalLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-0 left-0 z-40 p-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 p-4 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center h-12 mb-4 px-2">
          <span className="text-lg font-bold text-blue-600 truncate">RWA-Sentinel</span>
        </div>

        {/* Navigation */}
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="mb-2">
                <NavLink
                  to={item.path}
                  end={item.path === '/portal'} // 'end' prop for exact match on root path
                  className={({ isActive }) =>
                    `flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 ${
                      isActive ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-600 -ml-1 pl-2' : ''
                    }`
                  }
                  onClick={() => setSidebarOpen(false)} // Close sidebar on mobile after click
                >
                  <item.icon className="mr-3" size={20} />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Wallet Connect */}
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button className="flex items-center justify-center w-full p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150">
            <Wallet className="mr-2" size={20} />
            Connect Wallet
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header (optional, can be used for page title or global actions) */}
        <header className="bg-white border-b border-gray-200 p-4 md:p-6 shadow-sm hidden md:flex items-center justify-between">
          <div className="flex items-center">
            <button className="md:hidden text-gray-600 mr-4" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} triumphkrug. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default PortalLayout;
