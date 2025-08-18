/**
 * MCAS-Life API Types
 * 
 * Common API request/response types, error handling,
 * and standardized interfaces for client-server communication.
 */

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

// Paginated response wrapper
export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  error?: ApiError;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Response metadata
export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  version: string;
  execution_time_ms?: number;
}

// Standardized error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;               // For validation errors
  timestamp: string;
  request_id: string;
}

// Common error codes
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_TOO_LONG = 'VALUE_TOO_LONG',
  VALUE_TOO_SHORT = 'VALUE_TOO_SHORT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Permission errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PRIVILEGES = 'INSUFFICIENT_PRIVILEGES',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Business logic errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR'
}

// Request headers
export interface ApiHeaders {
  'Content-Type'?: string;
  'Authorization'?: string;
  'Accept-Language'?: string;
  'X-Request-ID'?: string;
  'X-Client-Version'?: string;
  'X-Device-ID'?: string;
}

// Common query parameters
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: string[];           // Include related resources
  fields?: string[];            // Sparse fieldsets
}

// Search query parameters
export interface SearchQueryParams extends BaseQueryParams {
  q?: string;                   // Search query
  filters?: Record<string, unknown>;
  date_from?: string;
  date_to?: string;
}

// File upload types
export interface FileUploadRequest {
  file: File | Buffer;
  filename: string;
  content_type: string;
  description?: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  url: string;
  thumbnail_url?: string;
  upload_date: string;
}

// Bulk operation types
export interface BulkOperationRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    ignore_errors?: boolean;
    batch_size?: number;
  };
}

export interface BulkOperationResponse {
  total_items: number;
  successful_items: number;
  failed_items: number;
  errors: {
    index: number;
    error: ApiError;
  }[];
}

// Real-time updates (WebSocket/SSE)
export interface RealtimeMessage<T = unknown> {
  type: string;
  event: string;
  data: T;
  timestamp: string;
  user_id?: number;
}

// AI Analysis request/response types
export interface AnalysisRequest {
  user_id: number;
  analysis_type: 'trigger_correlation' | 'pattern_recognition' | 'recommendation';
  time_window_days: number;
  include_food_data: boolean;
  include_symptom_data: boolean;
  include_supplement_data: boolean;
  include_environmental_data: boolean;
}

export interface AnalysisResponse {
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage?: number;
  estimated_completion?: string;
  results?: {
    trigger_correlations?: TriggerCorrelation[];
    patterns?: PatternInsight[];
    recommendations?: Recommendation[];
  };
  error?: string;
}

export interface TriggerCorrelation {
  trigger_type: 'food' | 'environmental' | 'stress' | 'medication';
  trigger_id?: number;
  trigger_name: string;
  correlation_score: number;     // 0-1
  confidence_level: 'low' | 'medium' | 'high';
  evidence_count: number;
  time_pattern?: string;         // e.g., "typically 2-4 hours after exposure"
}

export interface PatternInsight {
  pattern_type: 'temporal' | 'seasonal' | 'cyclical' | 'environmental';
  description: string;
  confidence_score: number;      // 0-1
  frequency: string;             // e.g., "weekly", "monthly"
  affected_symptoms: string[];
  actionable_insight: string;
}

export interface Recommendation {
  category: 'dietary' | 'lifestyle' | 'medical' | 'tracking';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  evidence_basis: string;
  estimated_impact: 'low' | 'medium' | 'high';
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
}

// Export/Import types
export interface DataExportRequest {
  user_id: number;
  format: 'json' | 'csv' | 'pdf';
  data_types: ('symptoms' | 'foods' | 'supplements' | 'metrics')[];
  date_range: {
    start: string;
    end: string;
  };
  include_analysis: boolean;
}

export interface DataExportResponse {
  export_id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  download_url?: string;
  file_size?: number;
  expires_at: string;
  created_at: string;
}

// Health report generation
export interface HealthReportRequest {
  user_id: number;
  report_type: 'summary' | 'detailed' | 'medical_professional' | 'research';
  period_months: number;
  include_charts: boolean;
  include_correlations: boolean;
  include_recommendations: boolean;
  recipient_email?: string;
}

export interface HealthReportResponse {
  report_id: string;
  status: 'generating' | 'ready' | 'failed';
  download_url?: string;
  pages: number;
  generated_at?: string;
  expires_at: string;
}

// API versioning
export interface ApiVersion {
  version: string;
  release_date: string;
  deprecated: boolean;
  sunset_date?: string;
  breaking_changes: string[];
  new_features: string[];
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      response_time_ms?: number;
      last_check: string;
      details?: string;
    };
  };
  uptime_seconds: number;
}

// Webhook types (for integrations)
export interface WebhookEvent {
  id: string;
  event_type: string;
  created_at: string;
  data: Record<string, unknown>;
  user_id?: number;
  retry_count: number;
  max_retries: number;
}

export interface WebhookDelivery {
  id: string;
  webhook_event_id: string;
  endpoint_url: string;
  http_status: number;
  response_body?: string;
  error_message?: string;
  delivered_at?: string;
  retry_after?: string;
}