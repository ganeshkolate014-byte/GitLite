export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface FileEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  type: 'file' | 'dir';
  content?: string; // base64 encoded
  encoding?: string;
}

export interface CreateRepoParams {
  name: string;
  private: boolean;
  description?: string;
  auto_init?: boolean;
}

export interface CommitParams {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string; // base64
  sha?: string; // required for update/delete
}

export interface AuthState {
  user: GitHubUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}