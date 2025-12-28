import axios from 'axios';
import type {
  User,
  Food,
  ApprovedFood,
  PersonalFoodRating,
  SymptomEntry,
  TriggerAnalysisResult,
  FoodSearchRequest,
  FoodSearchResponse,
  RecipeSearchRequest,
  RecipeSearchResponse,
  SavedRecipe,
  SpoonacularRecipeDetails,
  UserRecipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipePortionCalculation,
  LogMealFromRecipeInput
} from '../types/shared';

// API client configuration - Use environment variable
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
console.log('🔧 API baseURL:', baseURL, '| DEV mode:', import.meta.env.DEV);
const api = axios.create({
  baseURL,
  timeout: 30000,
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

// Function to show session expired notification and redirect
const handleSessionExpired = (message: string = 'Din økt har utløpt. Vennligst logg inn på nytt.') => {
  console.warn('🔐 Session expired:', message);

  // Clear auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');

  // Show notification to user
  const event = new CustomEvent('session-expired', {
    detail: { message }
  });
  window.dispatchEvent(event);

  // Redirect to login after a short delay to allow user to see the message
  setTimeout(() => {
    window.location.href = '/login?session_expired=true';
  }, 1500);
};

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle rate limiting errors
    if (error.response?.status === 429) {
      console.error('⚠️ Rate limit exceeded:', error.response.data);
      // Don't redirect, just show error to user
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Direct refresh call to avoid circular dependency
          const refreshUrl = import.meta.env.DEV ? 'http://localhost:3001/api/auth/refresh' : `${import.meta.env.VITE_API_URL}/auth/refresh`;
          const refreshResponse = await axios.post(refreshUrl,
            { refresh_token: refreshToken }
          );

          localStorage.setItem('authToken', refreshResponse.data.data.access_token);
          localStorage.setItem('refreshToken', refreshResponse.data.data.refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('🔄 Token refresh failed:', refreshError);
          // Refresh failed, redirect to login
          handleSessionExpired('Din økt har utløpt. Vennligst logg inn på nytt.');
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        handleSessionExpired('Du er logget ut. Vennligst logg inn på nytt.');
        return Promise.reject(error);
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
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };
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
    console.log('🔐 Login attempt:', { email: credentials.email, passwordLength: credentials.password?.length });
    console.log('🌐 API Base URL:', baseURL);
    try {
      console.log('🚀 Sending POST request to /auth/login with baseURL:', baseURL);
      const response = await api.post('/auth/login', credentials);
      console.log('✅ Login success:', response.status, 'Data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Login error full:', error);
      console.error('❌ Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NO_TIMEOUT'
      });
      throw error;
    }
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

  forgotPassword: async (email: string) => {
    console.log('API URL:', import.meta.env.VITE_API_URL);
    console.log('Making forgot password request to:', `${import.meta.env.VITE_API_URL}/auth/forgot-password`);
    const response = await api.post('/auth/forgot-password', { email });
    console.log('Forgot password API response:', response);
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  validateResetToken: async (token: string) => {
    const response = await api.get(`/auth/validate-reset-token/${token}`);
    return response.data;
  },
};

// Food API
export const foodApi = {
  search: async (searchRequest: FoodSearchRequest): Promise<FoodSearchResponse> => {
    // Map search request to SIGHI endpoint parameters (using database endpoint)
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

  getBatch: async (food_ids: number[]): Promise<Food[]> => {
    const response = await api.post('/foods/batch', { food_ids });
    return response.data.data;
  },

  getByCompatibility: async (level: 0 | 1 | 2 | 3): Promise<Food[]> => {
    const response = await api.get(`/foods/compatibility/${level}`);
    return response.data.data;
  },

  getApproved: async (includeDetails: boolean = false): Promise<ApprovedFood[]> => {
    const params = includeDetails ? { include_details: 'true' } : {};
    const response = await api.get('/foods/approved', { params });
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

  deleteApproved: async (id: number): Promise<void> => {
    const response = await api.delete(`/foods/approved/${id}`);
    return response.data;
  },

  createCustom: async (customFood: {
    name_no: string;
    name_en: string;
    category: string;
    compatibility: number;
    triggers?: string[];
    remarks_no?: string;
    remarks_en?: string;
  }): Promise<Food> => {
    const response = await api.post('/foods/custom', customFood);
    return response.data.data;
  },

  getStatistics: async () => {
    const response = await api.get('/foods/statistics');
    return response.data.data;
  },
};

// Personal Food Ratings API
export const personalRatingApi = {
  getUserRatings: async (): Promise<PersonalFoodRating[]> => {
    const response = await api.get('/foods/ratings');
    return response.data.data;
  },

  getFoodRating: async (foodId: number): Promise<PersonalFoodRating | null> => {
    try {
      const response = await api.get(`/foods/ratings/${foodId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No rating found
      }
      throw error;
    }
  },

  setFoodRating: async (foodId: number, rating: number, notes?: string): Promise<PersonalFoodRating> => {
    const response = await api.post('/foods/ratings', {
      food_id: foodId,
      personal_rating: rating,
      notes: notes || ''
    });
    return response.data.data;
  },

  updateFoodRating: async (foodId: number, rating: number, notes?: string): Promise<PersonalFoodRating> => {
    const response = await api.put(`/foods/ratings/${foodId}`, {
      personal_rating: rating,
      notes: notes || ''
    });
    return response.data.data;
  },

  removeFoodRating: async (foodId: number): Promise<void> => {
    const response = await api.delete(`/foods/ratings/${foodId}`);
    return response.data;
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

  // Symptom Registration v2.0 methods
  quickCapture: async (templateId: number, severity: number) => {
    const response = await api.post('/symptoms/quick-capture', { templateId, severity });
    return response.data.data;
  },

  enrichSymptom: async (symptomId: number) => {
    const response = await api.post(`/symptoms/${symptomId}/enrich`);
    return response.data.data;
  },

  getFollowUpForm: async (symptomId: number) => {
    const response = await api.get(`/symptoms/${symptomId}/follow-up-form`);
    return response.data.data;
  },

  completeFollowUp: async (
    symptomId: number,
    answers: any,
    roomLocations?: Array<{ room_id: string; room_name: string; time_spent_minutes?: number }>
  ) => {
    const response = await api.post(`/symptoms/${symptomId}/complete-follow-up`, {
      answers,
      roomLocations,
    });
    return response.data.data;
  },

  getNeedingFollowUp: async (limit: number = 10) => {
    const response = await api.get('/symptoms/needing-follow-up', { params: { limit } });
    return response.data.data;
  },
};

// Analytics API
export const analyticsApi = {
  analyzeTriggerCorrelation: async (request: {
    symptom_entry_id: number;
    analysis_window_hours?: number;
    analysis_mode?: 'smart' | 'ai';
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

  getInsights: async (params?: {
    days?: number;
  }) => {
    const response = await api.get('/analytics/insights', { params });
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

// Weather API
export const weatherApi = {
  getCurrentWeather: async (params: { latitude: number; longitude: number; city?: string }) => {
    const response = await api.get('/weather/current', { params });
    return response.data.data;
  },

  getWeatherByCity: async (cityName: string) => {
    const response = await api.get(`/weather/city/${encodeURIComponent(cityName)}`);
    return response.data.data;
  },

  getWeatherHistory: async (params: { latitude: number; longitude: number; days?: number }) => {
    const response = await api.get('/weather/history', { params });
    return response.data.data;
  },
};

// Symptom Templates API
export const symptomTemplateApi = {
  getAll: async () => {
    const response = await api.get('/symptom-templates');
    return response.data.data;
  },

  getGrouped: async () => {
    const response = await api.get('/symptom-templates/grouped');
    return response.data.data;
  },

  getByCategory: async (category: string) => {
    const response = await api.get(`/symptom-templates/category/${category}`);
    return response.data.data;
  },

  search: async (query: string) => {
    const response = await api.get('/symptom-templates/search', { params: { q: query } });
    return response.data.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/symptom-templates/${id}`);
    return response.data.data;
  },

  getFollowUpQuestions: async (id: number) => {
    const response = await api.get(`/symptom-templates/${id}/follow-up`);
    return response.data.data;
  },

  getMetadata: async (id: number) => {
    const response = await api.get(`/symptom-templates/${id}/metadata`);
    return response.data.data;
  },
};

// Airthings API
export const airthingsApi = {
  getDevices: async () => {
    const response = await api.get('/airthings/devices');
    return response.data;
  },

  getDeviceData: async (deviceId: string) => {
    const response = await api.get(`/airthings/devices/${deviceId}`);
    return response.data;
  },

  getAllDevicesAirQuality: async () => {
    const response = await api.get('/airthings/air-quality');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/airthings/status');
    return response.data;
  },

  getAuthUrl: async () => {
    const response = await api.get('/airthings/auth-url');
    return response.data;
  },

  disconnect: async () => {
    const response = await api.post('/airthings/disconnect');
    return response.data;
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

  updateEntry: async (id: string, entry: {
    type: 'meal' | 'symptom' | 'supplement' | 'activity' | 'health_metric';
    timestamp?: string;
    data: any;
  }) => {
    const response = await api.put(`/diary/entries/${id}`, entry);
    return response.data;
  },

  deleteEntry: async (id: string, type?: string) => {
    const params = type ? { type } : {};
    const response = await api.delete(`/diary/entries/${id}`, { params });
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/diary/statistics');
    return response.data.data;
  },

  /**
   * Log a meal from a user recipe with automatic portion calculation
   */
  logMealFromRecipe: async (data: LogMealFromRecipeInput): Promise<{
    success: boolean;
    message: string;
    data: {
      meal: {
        id: number;
        user_id: number;
        meal_type: string;
        meal_time: Date;
        recipe_title: string;
        foods: Array<{
          food_id: number;
          amount: number;
          unit: string;
        }>;
      };
    };
  }> => {
    const response = await api.post('/diary/meal-from-recipe', data);
    return response.data;
  },
};

// ==================== RECIPE API ====================

export const recipeApi = {
  /**
   * Search recipes by Safe Foods ingredients
   */
  searchByIngredients: async (request: RecipeSearchRequest): Promise<RecipeSearchResponse> => {
    const response = await api.post('/recipes/search', request);
    return response.data.data;
  },

  /**
   * Get AI-powered recipe suggestions based on user's Safe Foods
   */
  getSuggestions: async (maxRecipes: number = 10): Promise<RecipeSearchResponse> => {
    const response = await api.get('/recipes/suggest', {
      params: { number: maxRecipes }
    });
    return response.data.data;
  },

  /**
   * Get detailed recipe information
   */
  getRecipeDetails: async (recipeId: number): Promise<SpoonacularRecipeDetails> => {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data.data;
  },

  /**
   * Get all saved recipes
   */
  getSavedRecipes: async (): Promise<SavedRecipe[]> => {
    const response = await api.get('/recipes/saved/all');
    return response.data.data;
  },

  /**
   * Save a recipe to user's collection
   */
  saveRecipe: async (data: {
    spoonacularRecipeId: number;
    recipeData: SpoonacularRecipeDetails;
    mcasScore: number;
    notes?: string;
  }): Promise<SavedRecipe> => {
    const response = await api.post('/recipes/saved', data);
    return response.data.data;
  },

  /**
   * Update saved recipe (notes, times made)
   */
  updateSavedRecipe: async (recipeId: number, updates: {
    notes?: string;
    timesMade?: number;
  }): Promise<SavedRecipe> => {
    const response = await api.put(`/recipes/saved/${recipeId}`, updates);
    return response.data.data;
  },

  /**
   * Delete saved recipe
   */
  deleteSavedRecipe: async (recipeId: number): Promise<void> => {
    await api.delete(`/recipes/saved/${recipeId}`);
  },

  /**
   * Increment times made counter
   */
  incrementTimesMade: async (recipeId: number): Promise<SavedRecipe> => {
    const response = await api.post(`/recipes/saved/${recipeId}/increment-made`);
    return response.data.data;
  },
};

// ==================== MEDICATIONS API ====================

export interface MedicationCatalogItem {
  id: number;
  name: string;
  active_substance: string | null;
  form: string | null;
  strength: string | null;
  prescription_required: boolean;
}

export interface UserMedication {
  id: number;
  catalog_medication_id: number | null;
  custom_name: string | null;
  medication_type: 'mcas' | 'prescription' | 'over_counter' | 'supplement';
  dosage: string | null;
  dosage_unit: string | null;
  time_taken: string;
  notes: string | null;
  created_at: string;
  // Joined catalog data
  catalog_name?: string;
  catalog_substance?: string;
  catalog_form?: string;
  catalog_strength?: string;
}

export interface ActivityEntry {
  id: number;
  user_id: number;
  activity_type: 'temperature_change' | 'social_trigger' | 'physical_activity';
  // Temperature change fields
  temperature_change_type?: 'hot_to_cold' | 'cold_to_hot' | null;
  temperature_from?: number | null;
  temperature_to?: number | null;
  // Social trigger fields
  social_trigger_type?: string | null;
  estimated_people_count?: number | null;
  noise_level?: number | null;
  // Physical activity fields
  physical_activity_type?: string | null;
  intensity?: 'light' | 'moderate' | 'intense' | null;
  duration_minutes?: number | null;
  // Common fields
  time_started: string;
  time_ended?: string | null;
  location_description?: string | null;
  notes?: string | null;
  immediate_symptoms: boolean;
  symptom_description?: string | null;
  created_at: string;
}

export interface IllnessEntry {
  id: number;
  user_id: number;
  illness_type: 'cold' | 'flu' | 'infection' | 'stomach_bug' | 'fever' | 'other';
  custom_illness_name?: string | null;
  status: 'incubating' | 'active' | 'recovering' | 'resolved';
  symptoms?: string[] | null;
  severity: number; // 1-10
  has_fever: boolean;
  temperature_celsius?: number | null;
  first_symptoms_at: string;
  became_sick_at?: string | null;
  recovered_at?: string | null;
  mcas_flare_during_illness: boolean;
  mcas_severity_increase?: number | null;
  treatments_taken?: string[] | null;
  suspected_source?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const medicationsApi = {
  /**
   * Search medications catalog
   */
  search: async (query: string): Promise<MedicationCatalogItem[]> => {
    const response = await api.get('/medications/search', {
      params: { q: query }
    });
    return response.data.data;
  },

  /**
   * Get single medication from catalog
   */
  getCatalogItem: async (id: number): Promise<MedicationCatalogItem> => {
    const response = await api.get(`/medications/catalog/${id}`);
    return response.data.data;
  },

  /**
   * Log a medication intake
   */
  logMedication: async (data: {
    catalog_medication_id?: number;
    custom_name?: string;
    medication_type?: 'mcas' | 'prescription' | 'over_counter' | 'supplement';
    dosage?: string;
    dosage_unit?: string;
    time_taken: string;
    notes?: string;
  }): Promise<UserMedication> => {
    const response = await api.post('/medications', data);
    return response.data.data;
  },

  /**
   * Get user's medication history
   */
  getMedicationHistory: async (params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<UserMedication[]> => {
    const response = await api.get('/medications', { params });
    return response.data.data;
  },

  /**
   * Delete a medication entry
   */
  deleteMedication: async (id: number): Promise<void> => {
    await api.delete(`/medications/${id}`);
  },
};

export const activitiesApi = {
  /**
   * Log a new activity entry
   */
  logActivity: async (data: {
    activity_type: 'temperature_change' | 'social_trigger' | 'physical_activity';
    temperature_change_type?: 'hot_to_cold' | 'cold_to_hot';
    temperature_from?: number;
    temperature_to?: number;
    social_trigger_type?: string;
    estimated_people_count?: number;
    noise_level?: number;
    physical_activity_type?: string;
    intensity?: 'light' | 'moderate' | 'intense';
    duration_minutes?: number;
    time_started: string;
    time_ended?: string;
    location_description?: string;
    notes?: string;
    immediate_symptoms?: boolean;
    symptom_description?: string;
  }): Promise<ActivityEntry> => {
    const response = await api.post('/activities', data);
    return response.data.data;
  },

  /**
   * Get user's activity history
   */
  getActivityHistory: async (params?: {
    limit?: number;
    offset?: number;
    activity_type?: 'temperature_change' | 'social_trigger' | 'physical_activity';
  }): Promise<ActivityEntry[]> => {
    const response = await api.get('/activities', { params });
    return response.data.data;
  },

  /**
   * Get a single activity entry
   */
  getActivity: async (id: number): Promise<ActivityEntry> => {
    const response = await api.get(`/activities/${id}`);
    return response.data.data;
  },

  /**
   * Delete an activity entry
   */
  deleteActivity: async (id: number): Promise<void> => {
    await api.delete(`/activities/${id}`);
  },
};

export const illnessApi = {
  /**
   * Log a new illness entry
   */
  logIllness: async (data: {
    illness_type: 'cold' | 'flu' | 'infection' | 'stomach_bug' | 'fever' | 'other';
    custom_illness_name?: string;
    status?: 'incubating' | 'active' | 'recovering' | 'resolved';
    symptoms?: string[];
    severity: number;
    has_fever?: boolean;
    temperature_celsius?: number;
    first_symptoms_at: string;
    became_sick_at?: string;
    recovered_at?: string;
    mcas_flare_during_illness?: boolean;
    mcas_severity_increase?: number;
    treatments_taken?: string[];
    suspected_source?: string;
    notes?: string;
  }): Promise<IllnessEntry> => {
    const response = await api.post('/illness', data);
    return response.data.data;
  },

  /**
   * Get user's illness history
   */
  getIllnessHistory: async (params?: {
    limit?: number;
    offset?: number;
    status?: 'incubating' | 'active' | 'recovering' | 'resolved';
  }): Promise<IllnessEntry[]> => {
    const response = await api.get('/illness', { params });
    return response.data.data;
  },

  /**
   * Get a single illness entry
   */
  getIllness: async (id: number): Promise<IllnessEntry> => {
    const response = await api.get(`/illness/${id}`);
    return response.data.data;
  },

  /**
   * Update an illness entry (e.g., change status)
   */
  updateIllness: async (id: number, data: Partial<IllnessEntry>): Promise<IllnessEntry> => {
    const response = await api.patch(`/illness/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete an illness entry
   */
  deleteIllness: async (id: number): Promise<void> => {
    await api.delete(`/illness/${id}`);
  },
};

// ============================================================
// Meal Tracking API
// ============================================================

export interface MealFood {
  food_id: number;
  amount: number;
  unit: string;
  custom_food_name?: string;
}

export interface MealEntry {
  id: number;
  user_id: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_time: string;
  dao_taken_before: boolean;
  dao_minutes_before?: number;
  immediate_reaction: boolean;
  delayed_reaction: boolean;
  reaction_severity?: number;
  reaction_notes?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealWithFoods extends MealEntry {
  foods: Array<{
    meal_food_id: number;
    food_id: number;
    amount: number;
    unit: string;
    custom_food_name?: string;
    food_name?: string;
    compatibility?: number;
    category?: string;
    histamine_level?: number;
  }>;
}

export const mealsApi = {
  /**
   * Log a new meal with multiple foods
   */
  logMeal: async (data: {
    meal_type: string;
    foods: MealFood[];
    meal_time: string;
    dao_taken_before?: boolean;
    dao_minutes_before?: number;
    immediate_reaction?: boolean;
    delayed_reaction?: boolean;
    reaction_severity?: number;
    reaction_notes?: string;
    location?: string;
    notes?: string;
  }): Promise<{ meal: MealEntry; foods: any[] }> => {
    const response = await api.post('/meals', data);
    return response.data.data;
  },

  /**
   * Get meal history for the authenticated user
   */
  getMealHistory: async (params?: {
    limit?: number;
    offset?: number;
    meal_type?: string;
  }): Promise<MealEntry[]> => {
    const response = await api.get('/meals', { params });
    return response.data.data;
  },

  /**
   * Get a specific meal with all its foods
   */
  getMeal: async (id: number): Promise<MealWithFoods> => {
    const response = await api.get(`/meals/${id}`);
    return response.data.data;
  },

  /**
   * Update a meal entry (e.g., add reaction information)
   */
  updateMeal: async (id: number, data: Partial<MealEntry>): Promise<MealEntry> => {
    const response = await api.patch(`/meals/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a meal entry
   */
  deleteMeal: async (id: number): Promise<void> => {
    await api.delete(`/meals/${id}`);
  },
};

// ============================================================
// User Recipes API - Custom user-created recipes
// ============================================================

export const userRecipesApi = {
  /**
   * Get all user recipes with optional sorting
   */
  getAll: async (params?: {
    sortBy?: 'created_at' | 'times_made' | 'mcas_score';
    order?: 'asc' | 'desc';
  }): Promise<{ recipes: UserRecipe[]; count: number }> => {
    const response = await api.get('/user-recipes', { params });
    return response.data;
  },

  /**
   * Get a single recipe by ID
   */
  getById: async (id: number): Promise<UserRecipe> => {
    const response = await api.get(`/user-recipes/${id}`);
    return response.data.recipe;
  },

  /**
   * Create a new user recipe with automatic MCAS calculation
   */
  create: async (data: CreateRecipeInput): Promise<{ message: string; recipe: UserRecipe }> => {
    const response = await api.post('/user-recipes', data);
    return response.data;
  },

  /**
   * Update an existing recipe (recalculates MCAS if ingredients change)
   */
  update: async (id: number, data: UpdateRecipeInput): Promise<{ message: string; recipe: UserRecipe }> => {
    const response = await api.put(`/user-recipes/${id}`, data);
    return response.data;
  },

  /**
   * Delete a recipe
   */
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/user-recipes/${id}`);
    return response.data;
  },

  /**
   * Calculate portion ingredients (preview before logging meal)
   */
  calculatePortions: async (id: number, portionsConsumed: number): Promise<RecipePortionCalculation> => {
    const response = await api.post(`/user-recipes/${id}/calculate-portions`, {
      portions_consumed: portionsConsumed
    });
    return response.data;
  },

  /**
   * Increment times_made counter
   */
  incrementTimesMade: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/user-recipes/${id}/increment-made`);
    return response.data;
  },
};

// Admin API (requires admin role)
export const adminApi = {
  /**
   * List all users with pagination and filtering
   */
  listUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  /**
   * Get user statistics
   */
  getUserStats: async () => {
    const response = await api.get('/admin/users/stats');
    return response.data.data;
  },

  /**
   * Get single user by ID
   */
  getUserById: async (id: number) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  },

  /**
   * Create new user
   */
  createUser: async (data: {
    email: string;
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    role?: 'patient' | 'expert' | 'researcher' | 'admin';
  }) => {
    const response = await api.post('/admin/users', data);
    return response.data.data;
  },

  /**
   * Update user role
   */
  updateUserRole: async (id: number, role: 'patient' | 'expert' | 'researcher' | 'admin') => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  /**
   * Update user status
   */
  updateUserStatus: async (id: number, status: 'active' | 'suspended' | 'deleted') => {
    const response = await api.put(`/admin/users/${id}/status`, { status });
    return response.data;
  },

  /**
   * Verify user email manually
   */
  verifyUserEmail: async (id: number) => {
    const response = await api.post(`/admin/users/${id}/verify-email`);
    return response.data;
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (id: number, newPassword: string) => {
    const response = await api.post(`/admin/users/${id}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  },

  /**
   * Delete user permanently
   */
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

export default api;