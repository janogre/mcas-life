import { useState, useCallback, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: (...args: any[]) => Promise<T | void>;
  reset: () => void;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = true
): UseAsyncReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await asyncFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.message || 
                           'An unexpected error occurred';
        setState({ data: null, loading: false, error: errorMessage });
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute, reset };
}

// Specialized hook for API calls with retry functionality
export function useApiCall<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: {
    immediate?: boolean;
    retries?: number;
    retryDelay?: number;
  } = {}
): UseAsyncReturn<T> & { retry: () => void } {
  const { immediate = false, retries = 3, retryDelay = 1000 } = options;
  const [retryCount, setRetryCount] = useState(0);

  const asyncWrapper = useCallback(
    async (...args: any[]): Promise<T> => {
      let lastError: any;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await apiFunction(...args);
          setRetryCount(0);
          return result;
        } catch (error: any) {
          lastError = error;
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          }
        }
      }

      setRetryCount(prev => prev + 1);
      throw lastError;
    },
    [apiFunction, retries, retryDelay]
  );

  const { execute, ...rest } = useAsync(asyncWrapper, immediate);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  return { ...rest, execute, retry };
}