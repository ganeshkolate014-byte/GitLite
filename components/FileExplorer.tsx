import React, { useState, useEffect, useRef } from 'react';
import { Repository, FileEntry } from '../types';
import { githubService } from '../services/github';
import { 
  Folder, FileCode, ArrowLeft, Upload, Trash2, 
  MoreVertical, FileText, Download, FolderPlus,
  ChevronRight, Home, RefreshCw, Check
} from 'lucide-react';

interface FileExplorerProps {
  repo: Repository;
  token: string;
  onBack: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ repo, token, onBack }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContents(currentPath);
  }, [currentPath, repo.name]);

  // Set webkitdirectory attribute for folder upload manually since React TS types might miss it
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const fetchContents = async (path: string) => {
    setLoading(true);
    setSelectedFile(null);
    setFileContent(null);
    try {
      const data = await githubService.getContents(token, repo.owner.login, repo.name, path);
      if (Array.isArray(data)) {
        // Sort folders first, then files
        const sorted = data.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
        setEntries(sorted);
      } else {
        // It's a file, shouldn't happen via this flow usually unless direct link
        setEntries([data]);
      }
    } catch (err) {
      console.error(err);
      // Empty repo or error
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = async (entry: FileEntry) => {
    if (entry.type === 'dir') {
      setCurrentPath(entry.path);
    } else {
      setSelectedFile(entry);
      setLoading(true);
      try {
        const data = await githubService.getContents(token, repo.owner.login, repo.name, entry.path) as FileEntry;
        if (data.content) {
          // Decode Base64, handling UTF-8 characters correctly
          const binaryString = atob(data.content.replace(/\n/g, ''));
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          const decoded = new TextDecoder('utf-8').decode(bytes);
          setFileContent(decoded);
        } else {
            setFileContent("File is too large to display or is binary.");
        }
      } catch (err) {
        setFileContent("Error loading content.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setIsMenuOpen(false);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading ${file.name}...`);
        
        // If directory upload, relativePath is usually available in webkitRelativePath
        // but for single file it's empty.
        // We construct path based on current directory.
        const relativePath = file.webkitRelativePath || file.name;
        const finalPath = currentPath ? `${currentPath}/${relativePath}` : relativePath;
        
        const content = await githubService.toBase64(file);
        
        await githubService.createFile(token, {
          owner: repo.owner.login,
          repo: repo.name,
          path: finalPath,
          message: `Add ${file.name} via GitLite`,
          content: content
        });
      }
      setUploadStatus('Upload complete!');
      setTimeout(() => setUploadStatus(''), 2000);
      fetchContents(currentPath);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
      setUploadStatus('');
    } finally {
      setUploading(false);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (!confirm(`Are you sure you want to delete ${selectedFile.name}?`)) return;

    setLoading(true);
    try {
      await githubService.deleteFile(
        token, 
        repo.owner.login, 
        repo.name, 
        selectedFile.path, 
        selectedFile.sha, 
        `Delete ${selectedFile.name}`
      );
      // Go back to list
      setSelectedFile(null);
      fetchContents(currentPath);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
      setLoading(false);
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="h-full flex flex-col bg-gh-bg">
      {/* Repo Header */}
      <div className="flex-none p-4 border-b border-gh-border bg-gh-card flex items-center justify-between">
        <div className="flex items-center overflow-hidden">
          <button onClick={onBack} className="mr-3 p-1 hover:bg-gh-hover rounded-md text-gh-muted hover:text-gh-text">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
             <h2 className="font-bold text-lg leading-tight truncate text-gh-text">{repo.name}</h2>
             <span className="text-xs text-gh-muted font-mono">{repo.full_name}</span>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gh-hover rounded-md text-gh-muted hover:text-gh-text"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gh-card border border-gh-border rounded-md shadow-xl z-50 overflow-hidden">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 hover:bg-gh-blue hover:text-white cursor-pointer flex items-center gap-2 text-sm text-gh-text"
              >
                <FileText className="w-4 h-4" /> Upload File
              </div>
              <div 
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-3 hover:bg-gh-blue hover:text-white cursor-pointer flex items-center gap-2 text-sm text-gh-text border-t border-gh-border"
              >
                <FolderPlus className="w-4 h-4" /> Upload Folder
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden Inputs */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
        />
        <input 
            type="file" 
            ref={folderInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
            multiple 
        />
      </div>

      {/* Breadcrumbs */}
      <div className="flex-none px-4 py-2 bg-gh-bg border-b border-gh-border flex items-center text-sm text-gh-muted overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button 
          onClick={() => {
            setCurrentPath(''); 
            setSelectedFile(null);
          }}
          className="hover:text-gh-blue flex items-center"
        >
          <Home className="w-3.5 h-3.5 mr-1" />
          root
        </button>
        {breadcrumbs.map((part, index) => {
            const path = breadcrumbs.slice(0, index + 1).join('/');
            return (
                <div key={path} className="flex items-center">
                    <ChevronRight className="w-3 h-3 mx-1 text-gh-muted" />
                    <button 
                        onClick={() => {
                            setCurrentPath(path);
                            setSelectedFile(null);
                        }}
                        className="hover:text-gh-blue font-medium"
                    >
                        {part}
                    </button>
                </div>
            )
        })}
      </div>

      {/* Progress Bar */}
      {uploading && (
         <div className="bg-blue-900/20 px-4 py-2 flex items-center justify-between border-b border-gh-border">
            <span className="text-xs text-blue-200 animate-pulse">{uploadStatus}</span>
            <div className="h-1 w-24 bg-blue-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-full animate-progress"></div>
            </div>
         </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gh-bg">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gh-muted">
             <RefreshCw className="w-6 h-6 animate-spin mr-2" />
             Loading...
          </div>
        ) : selectedFile ? (
          // File View
          <div className="p-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-mono font-bold text-gh-text break-all">{selectedFile.name}</h3>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleDelete}
                        className="p-2 bg-red-900/20 text-red-400 rounded-md hover:bg-red-900/40 transition-colors border border-red-900/30"
                        title="Delete File"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
             </div>
             <div className="bg-gh-bg border border-gh-border rounded-md p-4 overflow-x-auto">
                 <pre className="text-sm font-mono text-gh-text whitespace-pre-wrap">{fileContent}</pre>
             </div>
          </div>
        ) : entries.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-40 text-gh-muted mt-10">
             <p className="mb-2">This folder is empty.</p>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="text-gh-blue text-sm hover:underline"
             >
               Upload a file to get started
             </button>
          </div>
        ) : (
          // File List
          <div className="divide-y divide-gh-border border-t border-gh-border">
            {entries.map(entry => (
              <div 
                key={entry.sha}
                onClick={() => handleEntryClick(entry)}
                className="flex items-center px-4 py-3 hover:bg-gh-hover cursor-pointer transition-colors group"
              >
                <div className={`mr-3`}>
                  {entry.type === 'dir' ? <Folder className="w-5 h-5 text-gh-blue" fill="currentColor" fillOpacity={0.2} /> : <FileCode className="w-5 h-5 text-gh-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gh-text truncate group-hover:text-gh-blue transition-colors">
                    {entry.name}
                  </p>
                  {entry.size > 0 && (
                     <p className="text-xs text-gh-muted">{(entry.size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gh-border opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};