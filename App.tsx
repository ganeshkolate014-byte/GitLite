import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, githubProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, AuthError, GithubAuthProvider } from 'firebase/auth';
import { Layout } from './components/Layout';
import { RepoList } from './components/RepoList';
import { FileExplorer } from './components/FileExplorer';
import { githubService } from './services/github';
import { AuthState, Repository } from './types';
import { Github, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [authData, setAuthData] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  useEffect(() => {
    // Check local storage for token persistence (simplistic approach for demo)
    const storedToken = sessionStorage.getItem('gh_token');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we have a token in session storage, use it.
        // In a real app, we might want to refresh this or handle it more securely via context.
        // For standard Firebase Github OAuth, the access token is only available 
        // immediately after sign-in credential result.
        
        if (storedToken) {
           // We have a token and a user
           // Fetch GitHub User details to confirm
           try {
             const userRepos = await githubService.getUserRepos(storedToken);
             // We just fetch repos to validate token quickly
             const ghUser = {
               login: firebaseUser.reloadUserInfo.screenName || 'User',
               id: 0,
               avatar_url: firebaseUser.photoURL || '',
               name: firebaseUser.displayName || '',
               email: firebaseUser.email || ''
             };

             setAuthData({
               user: ghUser,
               token: storedToken,
               isAuthenticated: true,
               loading: false,
             });
             setRepos(userRepos);
           } catch (e) {
             // Token invalid
             sessionStorage.removeItem('gh_token');
             setAuthData(prev => ({ ...prev, loading: false, isAuthenticated: false }));
           }
        } else {
             // User is logged in to Firebase, but we lost the GH Access Token (page refresh).
             // Since we can't get the token again without re-auth, we must force logout or re-auth.
             // For this UX, we'll ask them to sign in again to get a fresh token.
             setAuthData(prev => ({ ...prev, loading: false, isAuthenticated: false }));
        }
      } else {
        setAuthData({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
        });
        sessionStorage.removeItem('gh_token');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token && result.user) {
        sessionStorage.setItem('gh_token', token);
        
        // Fetch User Info & Repos
        setRepoLoading(true);
        const [reposData] = await Promise.all([
           githubService.getUserRepos(token)
        ]);
        
        const ghUser = {
           login: (result.user as any).reloadUserInfo.screenName,
           id: 0,
           avatar_url: result.user.photoURL || '',
           name: result.user.displayName || '',
           email: result.user.email || ''
        };

        setAuthData({
          user: ghUser,
          token: token,
          isAuthenticated: true,
          loading: false,
        });
        setRepos(reposData);
        setRepoLoading(false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Failed to sign in with GitHub.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('gh_token');
    setAuthData({
       user: null,
       token: null,
       isAuthenticated: false,
       loading: false
    });
    setSelectedRepo(null);
  };

  const handleCreateRepo = async (name: string, isPrivate: boolean) => {
    if (!authData.token) return;
    try {
      const newRepo = await githubService.createRepo(authData.token, {
        name,
        private: isPrivate,
        auto_init: true, // Create a README so we can browse immediately
        description: "Created via GitLite Mobile"
      });
      setRepos([newRepo, ...repos]);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  if (authData.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gh-bg text-gh-blue">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  // Login Screen
  if (!authData.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gh-bg text-gh-text p-4">
        <div className="z-10 flex flex-col items-center max-w-sm w-full text-center space-y-8">
          <div className="bg-gh-bg p-4 rounded-full">
            <Github className="w-16 h-16 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">GitLite Mobile</h1>
            <p className="text-gh-muted">Manage your repositories, edit code, and upload files from anywhere.</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-gh-card border border-gh-border text-gh-text px-8 py-3 rounded-md font-bold text-lg hover:bg-gh-hover hover:border-gh-muted transition-all"
          >
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </button>
          
          <p className="text-xs text-gh-muted mt-8">
            Powered by Firebase & GitHub API. 
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout auth={authData} onLogout={handleLogout}>
      {selectedRepo ? (
        <FileExplorer 
          repo={selectedRepo} 
          token={authData.token!} 
          onBack={() => setSelectedRepo(null)} 
        />
      ) : (
        <RepoList 
          repos={repos} 
          loading={repoLoading}
          onSelectRepo={setSelectedRepo} 
          onCreateRepo={handleCreateRepo}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;