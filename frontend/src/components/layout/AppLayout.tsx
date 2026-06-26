import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../ui/Toast';
import { connectSocket, disconnectSocket } from '../../socket/socket';
import { useAuthStore } from '../../store/authStore';
import { organizationsApi } from '../../api/organizations';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, setOrg } = useAuthStore();

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

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
