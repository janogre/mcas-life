import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { authApi, foodApi } from '../../lib/api';

export function ApiTest() {
  const [tests, setTests] = useState({
    health: { status: 'pending', message: '', duration: 0 },
    foods: { status: 'pending', message: '', duration: 0 },
    auth: { status: 'pending', message: '', duration: 0 }
  });
  const [isRunning, setIsRunning] = useState(false);

  const runApiTests = async () => {
    setIsRunning(true);
    const newTests = { ...tests };

    // Test 1: Health Check (direct API call)
    try {
      const start = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`);
      const data = await response.json();
      const duration = Date.now() - start;
      
      if (response.ok && data.success) {
        newTests.health = { 
          status: 'success', 
          message: `Backend healthy - ${duration}ms`, 
          duration 
        };
      } else {
        newTests.health = { 
          status: 'error', 
          message: 'Backend returned error', 
          duration 
        };
      }
    } catch (error) {
      newTests.health = { 
        status: 'error', 
        message: `Connection failed: ${error}`, 
        duration: 0 
      };
    }

    // Test 2: Foods API
    try {
      const start = Date.now();
      const result = await foodApi.search({ query: 'spinach', limit: 5 });
      const duration = Date.now() - start;
      
      if (result && result.foods) {
        newTests.foods = { 
          status: 'success', 
          message: `Found ${result.foods.length} foods - ${duration}ms`, 
          duration 
        };
      } else {
        newTests.foods = { 
          status: 'error', 
          message: 'No foods returned', 
          duration 
        };
      }
    } catch (error) {
      newTests.foods = { 
        status: 'error', 
        message: `Food API failed: ${error}`, 
        duration: 0 
      };
    }

    // Test 3: Auth API (test invalid credentials)
    try {
      const start = Date.now();
      await authApi.login({ email: 'test@test.com', password: 'wrong' });
      const duration = Date.now() - start;
      
      // Should fail with 401
      newTests.auth = { 
        status: 'error', 
        message: 'Auth should have failed but succeeded', 
        duration 
      };
    } catch (error: any) {
      const duration = Date.now() - Date.now();
      if (error.response?.status === 401 || error.message.includes('401')) {
        newTests.auth = { 
          status: 'success', 
          message: 'Auth correctly rejected invalid credentials', 
          duration 
        };
      } else {
        newTests.auth = { 
          status: 'error', 
          message: `Auth API error: ${error.message}`, 
          duration 
        };
      }
    }

    setTests(newTests);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          API Integration Test
        </h3>
        <button
          onClick={runApiTests}
          disabled={isRunning}
          className="btn-primary flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              <span>Run Tests</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(tests.health.status)}
            <div>
              <span className="font-medium">Backend Health Check</span>
              <p className="text-sm text-gray-600">{tests.health.message || 'Not tested'}</p>
            </div>
          </div>
          {tests.health.duration > 0 && (
            <span className="text-sm text-gray-500">{tests.health.duration}ms</span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(tests.foods.status)}
            <div>
              <span className="font-medium">Food Search API</span>
              <p className="text-sm text-gray-600">{tests.foods.message || 'Not tested'}</p>
            </div>
          </div>
          {tests.foods.duration > 0 && (
            <span className="text-sm text-gray-500">{tests.foods.duration}ms</span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(tests.auth.status)}
            <div>
              <span className="font-medium">Authentication API</span>
              <p className="text-sm text-gray-600">{tests.auth.message || 'Not tested'}</p>
            </div>
          </div>
          {tests.auth.duration > 0 && (
            <span className="text-sm text-gray-500">{tests.auth.duration}ms</span>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Backend URL:</strong> {import.meta.env.VITE_API_URL}
        </p>
        <p className="text-sm text-blue-800">
          <strong>Environment:</strong> {import.meta.env.VITE_ENVIRONMENT || 'development'}
        </p>
      </div>
    </div>
  );
}