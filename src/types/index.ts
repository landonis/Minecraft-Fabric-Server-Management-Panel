export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface ServerStatus {
  running: boolean;
  pid?: number;
  uptime?: string;
  players?: number;
  memory?: string;
}

export interface Player {
  username: string;
  uuid: string;
  online: boolean;
  lastSeen?: string;
  playtime?: string;
}

export interface ModFile {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string;
  active: boolean;
}

export interface ServerLog {
  timestamp: string;
  level: string;
  message: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}