import axios from 'axios';
import type { 
  User, 
  Food, 
  ApprovedFood,
  SymptomEntry,
  TriggerAnalysisResult,
  FoodSearchRequest,
  FoodSearchResponse 
} from '../types/shared';

// API client configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  mcas_severity: 'mild' | 'moderate' | 'severe';
  confirmed_diagnosis: boolean;
}

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<{ data: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Food API
export const foodApi = {
  search: async (searchRequest: FoodSearchRequest): Promise<FoodSearchResponse> => {
    // Map search request to SIGHI endpoint parameters
    const params: any = {};
    if (searchRequest.limit) params.limit = searchRequest.limit;
    if (searchRequest.offset) params.offset = searchRequest.offset;
    if (searchRequest.query) params.search = searchRequest.query;
    
    const response = await api.get('/sighi/foods', { params });
    return response.data.data;
  },

  getById: async (id: number): Promise<Food> => {
    const response = await api.get(`/foods/${id}`);
    return response.data.data;
  },

  getByCompatibility: async (level: 0 | 1 | 2 | 3): Promise<Food[]> => {
    const response = await api.get(`/foods/compatibility/${level}`);
    return response.data.data;
  },

  getApproved: async (): Promise<ApprovedFood[]> => {
    const response = await api.get('/foods/approved');
    return response.data.data;
  },

  addApproved: async (approvedFood: {
    food_id: number;
    personal_compatibility: number;
    notes?: string;
  }): Promise<ApprovedFood> => {
    const response = await api.post('/foods/approved', approvedFood);
    return response.data.data;
  },

  updateApproved: async (
    id: number, 
    updates: {
      personal_compatibility?: number;
      notes?: string;
      reaction_score?: number;
    }
  ): Promise<ApprovedFood> => {
    const response = await api.put(`/foods/approved/${id}`, updates);
    return response.data.data;
  },

  getStatistics: async () => {
    const response = await api.get('/foods/statistics');
    return response.data.data;
  },
};

// Symptoms API
export const symptomsApi = {
  create: async (symptom: Omit<SymptomEntry, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post('/symptoms', symptom);
    return response.data.data;
  },

  getRecent: async (days: number = 30): Promise<SymptomEntry[]> => {
    const response = await api.get(`/symptoms/recent?days=${days}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<SymptomEntry> => {
    const response = await api.get(`/symptoms/${id}`);
    return response.data.data;
  },

  update: async (id: number, updates: Partial<SymptomEntry>) => {
    const response = await api.put(`/symptoms/${id}`, updates);
    return response.data.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/symptoms/${id}`);
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  analyzeTriggerCorrelation: async (request: {
    symptom_entry_id: number;
    analysis_window_hours?: number;
  }): Promise<TriggerAnalysisResult> => {
    const response = await api.post('/analytics/trigger-correlation', request);
    return response.data.data;
  },

  getUserAnalyses: async (params?: {
    limit?: number;
    confidence_threshold?: number;
  }) => {
    const response = await api.get('/analytics/user-analyses', { params });
    return response.data.data;
  },

  getTriggerPatterns: async (userId: number) => {
    const response = await api.get(`/analytics/trigger-patterns/${userId}`);
    return response.data.data;
  },
};

// Health Metrics API
export const healthApi = {
  getDailyMetrics: async (date: string) => {
    const response = await api.get(`/health/metrics/${date}`);
    return response.data.data;
  },

  updateDailyMetrics: async (date: string, metrics: any) => {
    const response = await api.put(`/health/metrics/${date}`, metrics);
    return response.data.data;
  },

  getWeeklyReport: async (startDate: string) => {
    const response = await api.get(`/health/report/weekly?start=${startDate}`);
    return response.data.data;
  },
};

export default api;