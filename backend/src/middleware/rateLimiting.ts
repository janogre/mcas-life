/**
 * Rate Limiting Configuration
 * 
 * Protects APIs from abuse while allowing normal usage patterns
 */

import rateLimit from 'express-rate-limit';

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per window (increased for development)
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication-specific rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 login attempts per window (increased for development)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  }
});

// Strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Rate limit exceeded for sensitive operations'
  }
});

// Analytics-specific rate limiting configurations
export const rateLimitConfig = {
  analytics: {
    // AI trigger analysis (computationally expensive)
    trigger_analysis: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 analyses per window (prevents abuse)
      message: {
        success: false,
        error: 'Too many trigger analyses requested. Please wait before requesting another analysis.'
      }
    }),
    
    // User data access (moderate usage)
    user_data: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30, // 30 requests per window
      message: {
        success: false,
        error: 'Too many data requests, please try again later'
      }
    }),
    
    // Expert/clinical data access (restricted)
    expert_data: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 requests per window
      message: {
        success: false,
        error: 'Expert data access rate limit exceeded'
      }
    }),
    
    // Bulk operations (very restricted)
    bulk_operations: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 2, // 2 bulk operations per hour
      message: {
        success: false,
        error: 'Bulk operation rate limit exceeded. Maximum 2 operations per hour.'
      }
    })
  },
  
  food: {
    // Food search (high usage expected)
    search: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 searches per window
      message: {
        success: false,
        error: 'Too many search requests, please try again later'
      }
    }),
    
    // Data import (admin only, very restricted)
    import: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 import operations per window
      message: {
        success: false,
        error: 'Data import rate limit exceeded'
      }
    })
  },
  
  diary: {
    // Symptom logging (frequent usage expected)
    logging: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 entries per window
      message: {
        success: false,
        error: 'Too many diary entries, please try again later'
      }
    })
  }
};