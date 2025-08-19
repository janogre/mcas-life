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

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Direct refresh call to avoid circular dependency
          const refreshResponse = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, 
            { refresh_token: refreshToken }
          );
          
          localStorage.setItem('authToken', refreshResponse.data.data.access_token);
          localStorage.setItem('refreshToken', refreshResponse.data.data.refresh_token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
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
    if (searchRequest.compatibility_filter !== undefined) params.compatibility = searchRequest.compatibility_filter;
    if (searchRequest.category_filter) params.category = searchRequest.category_filter;
    if (searchRequest.trigger_filter) params.triggers = searchRequest.trigger_filter;
    
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

// Diary API
export const diaryApi = {
  getEntries: async (params?: {
    type?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/diary/entries', { params });
    return response.data.data;
  },

  createEntry: async (entry: {
    type: 'meal' | 'symptom' | 'supplement' | 'health_metric';
    timestamp?: string;
    data: {
      foods?: Array<{
        sighi_id?: number;
        name: string;
        amount?: string;
        unit?: string;
      }>;
      symptom_type?: string;
      severity?: number;
      duration_minutes?: number;
      description?: string;
      supplement_name?: string;
      dosage?: string;
      supplement_type?: string;
      metric_type?: 'sleep' | 'energy' | 'stress' | 'mood' | 'general_wellbeing';
      value?: number;
      notes?: string;
    };
  }) => {
    const response = await api.post('/diary/entries', entry);
    return response.data.data;
  },

  getEntry: async (id: string) => {
    const response = await api.get(`/diary/entries/${id}`);
    return response.data.data;
  },

  updateEntry: async (id: string, entry: any) => {
    const response = await api.put(`/diary/entries/${id}`, entry);
    return response.data.data;
  },

  deleteEntry: async (id: string) => {
    const response = await api.delete(`/diary/entries/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/diary/statistics');
    return response.data.data;
  },
};

export default api;