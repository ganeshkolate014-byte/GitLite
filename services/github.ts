import { Repository, FileEntry, CreateRepoParams, CommitParams } from '../types';

const BASE_URL = 'https://api.github.com';

/**
 * Helper to handle fetch requests with auth headers.
 * In a production environment with strict security requirements, 
 * these calls would be proxied through Firebase Functions to hide headers/logic.
 */
async function githubFetch(endpoint: string, token: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API Error: ${response.status}`);
  }

  // Handle empty responses (e.g. 204 No Content)
  if (response.status === 204) return null;

  return response.json();
}

export const githubService = {
  async getUserRepos(token: string): Promise<Repository[]> {
    // Sort by updated descending
    return githubFetch('/user/repos?sort=updated&per_page=100', token);
  },

  async createRepo(token: string, params: CreateRepoParams): Promise<Repository> {
    return githubFetch('/user/repos', token, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getContents(token: string, owner: string, repo: string, path: string = ''): Promise<FileEntry[] | FileEntry> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return githubFetch(`/repos/${owner}/${repo}/contents/${cleanPath}`, token);
  },

  async createFile(token: string, params: CommitParams): Promise<any> {
    const { owner, repo, path, message, content, sha } = params;
    const body: any = {
      message,
      content,
    };
    if (sha) {
      body.sha = sha;
    }

    return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteFile(token: string, owner: string, repo: string, path: string, sha: string, message: string): Promise<any> {
    return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha,
      }),
    });
  },
  
  // Helper to convert File object to Base64
  toBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  }
};