import React from 'react';
import { LogOut, Github, Moon, Sun } from 'lucide-react';
import { AuthState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  auth: AuthState;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, auth, onLogout }) => {
  return (
    <div className="flex flex-col h-screen bg-gh-bg text-gh-text">
      {/* Header */}
      <header className="flex-none h-16 border-b border-gh-border bg-gh-card px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Github className="w-8 h-8 text-white" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            GitLite
          </h1>
        </div>

        {auth.isAuthenticated && auth.user && (
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-gh-text">{auth.user.name || auth.user.login}</span>
                <span className="text-xs text-gh-muted">Authenticated</span>
             </div>
             <img 
               src={auth.user.avatar_url} 
               alt="Profile" 
               className="w-8 h-8 rounded-full border border-gh-border" 
             />
             <button 
               onClick={onLogout}
               className="p-2 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition-colors"
               title="Logout"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};