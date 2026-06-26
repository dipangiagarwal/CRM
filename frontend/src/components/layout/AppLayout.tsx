import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../ui/Toast';
import { CommandPalette } from './CommandPalette';
import { connectSocket, disconnectSocket } from '../../socket/socket';
import { useAuthStore } from '../../store/authStore';
import { organizationsApi } from '../../api/organizations';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, setOrg } = useAuthStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
      // Fetch latest organization info to ensure store is updated
      organizationsApi.me().then(setOrg).catch(() => {});
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, setOrg]);

  // Wire up Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-bg overflow-hidden text-text-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onSearchClick={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
};

