import React, { useState } from 'react';
import { Repository } from '../types';
import { Search, Lock, Globe, Plus, Calendar, Star, GitFork } from 'lucide-react';

interface RepoListProps {
  repos: Repository[];
  onSelectRepo: (repo: Repository) => void;
  onCreateRepo: (name: string, isPrivate: boolean) => Promise<void>;
  loading: boolean;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo, onCreateRepo, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName) return;
    setCreating(true);
    try {
      await onCreateRepo(newRepoName, newRepoPrivate);
      setShowCreateModal(false);
      setNewRepoName('');
    } catch (err) {
      alert("Failed to create repository");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-gh-muted">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gh-blue mb-4"></div>
           <p>Syncing repositories...</p>
        </div>
     );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gh-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Find a repository..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-gh-bg border border-gh-border rounded-md focus:border-gh-blue outline-none text-gh-text placeholder-gh-muted transition-all"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-gh-green hover:bg-[#2da44e] text-white px-4 py-1.5 rounded-md font-medium transition-colors border border-[rgba(240,246,252,0.1)]"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
        {filteredRepos.length === 0 ? (
           <div className="text-center text-gh-muted mt-20">
              <p>No repositories found matching "{searchTerm}"</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map(repo => (
              <div 
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className="bg-gh-bg border border-gh-border rounded-md p-4 hover:border-gh-muted cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gh-blue hover:underline truncate pr-2" title={repo.name}>
                      {repo.name}
                    </h3>
                    <div className="flex-shrink-0">
                      {repo.private ? (
                        <div className="border border-gh-border p-1 rounded-md text-gh-muted" title="Private">
                           <Lock className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="border border-gh-border p-1 rounded-md text-gh-muted" title="Public">
                           <Globe className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gh-muted mb-4 line-clamp-2 h-10">
                    {repo.description || "No description provided."}
                  </p>
                </div>
                
                <div className="flex items-center text-xs text-gh-muted gap-4 mt-auto pt-2 border-t border-gh-border">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                  </div>
                  {repo.default_branch && (
                     <div className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        <span>{repo.default_branch}</span>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gh-card border border-gh-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gh-text">Create Repository</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gh-text mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value.replace(/\s+/g, '-'))}
                  className="w-full bg-gh-bg border border-gh-border rounded-md p-2 text-gh-text focus:border-gh-blue outline-none"
                  placeholder="awesome-project"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-gh-border text-gh-blue bg-gh-bg focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-gh-text">Private Repository</span>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gh-blue hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-gh-green hover:bg-[#2da44e] text-white rounded-md font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};