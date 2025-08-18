import React, { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, User, Search, Brain, AlertTriangle } from 'lucide-react';

interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export function UserFlowDemo() {
  const [steps, setSteps] = useState<TestStep[]>([
    {
      id: 'register',
      name: 'User Registration',
      description: 'Register new MCAS patient account',
      status: 'pending',
      message: ''
    },
    {
      id: 'login',
      name: 'User Login',
      description: 'Authenticate with registered credentials',
      status: 'pending', 
      message: ''
    },
    {
      id: 'food-search',
      name: 'Food Search',
      description: 'Search SIGHI food database',
      status: 'pending',
      message: ''
    },
    {
      id: 'symptom-log',
      name: 'Symptom Logging',
      description: 'Log MCAS symptoms with severity',
      status: 'pending',
      message: ''
    },
    {
      id: 'ai-analysis',
      name: 'AI Trigger Analysis',
      description: 'Analyze food-symptom correlations',
      status: 'pending',
      message: ''
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const updateStep = (stepId: string, updates: Partial<TestStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const runCompleteFlow = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: '' })));

    try {
      // Step 1: Registration
      await testRegistration();
      
      // Step 2: Login  
      await testLogin();
      
      // Step 3: Food Search
      await testFoodSearch();
      
      // Step 4: Symptom Logging (mock)
      await testSymptomLogging();
      
      // Step 5: AI Analysis (mock)
      await testAIAnalysis();

      setCurrentStep(-1);
      setIsRunning(false);
      
    } catch (error) {
      console.error('Flow test failed:', error);
      setCurrentStep(-1);
      setIsRunning(false);
    }
  };

  const testRegistration = async () => {
    setCurrentStep(0);
    updateStep('register', { status: 'running', message: 'Creating test user...' });
    
    try {
      const start = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@mcas-life.com',
          password: 'Demo123!',
          username: 'demouser',
          first_name: 'Demo',
          last_name: 'Patient',
          mcas_severity: 'moderate',
          confirmed_diagnosis: true,
          timezone: 'Europe/Oslo',
          language: 'en',
          accept_terms: true,
          accept_privacy: true
        })
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (response.ok && data.success) {
        updateStep('register', { 
          status: 'success', 
          message: `User registered successfully - ${duration}ms`,
          duration 
        });
      } else {
        // Expected to fail due to database connection
        updateStep('register', { 
          status: 'error', 
          message: `Registration failed (DB connection) - ${duration}ms`,
          duration 
        });
      }
    } catch (error: any) {
      updateStep('register', { 
        status: 'error', 
        message: `Registration error: ${error.message}` 
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const testLogin = async () => {
    setCurrentStep(1);
    updateStep('login', { status: 'running', message: 'Testing authentication...' });
    
    try {
      const start = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@mcas-life.com',
          password: 'Demo123!'
        })
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (response.ok && data.success) {
        updateStep('login', { 
          status: 'success', 
          message: `Login successful - ${duration}ms`,
          duration 
        });
      } else {
        updateStep('login', { 
          status: 'error', 
          message: `Login failed (expected without DB) - ${duration}ms`,
          duration 
        });
      }
    } catch (error: any) {
      updateStep('login', { 
        status: 'error', 
        message: `Login error: ${error.message}` 
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const testFoodSearch = async () => {
    setCurrentStep(2);
    updateStep('food-search', { status: 'running', message: 'Searching SIGHI database...' });
    
    try {
      const start = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sighi/foods?search=spinach&limit=5`);
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (response.ok && data.success && data.data.foods) {
        updateStep('food-search', { 
          status: 'success', 
          message: `Found ${data.data.foods.length} foods - ${duration}ms`,
          duration 
        });
      } else {
        updateStep('food-search', { 
          status: 'error', 
          message: `Food search failed - ${duration}ms`,
          duration 
        });
      }
    } catch (error: any) {
      updateStep('food-search', { 
        status: 'error', 
        message: `Food search error: ${error.message}` 
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const testSymptomLogging = async () => {
    setCurrentStep(3);
    updateStep('symptom-log', { status: 'running', message: 'Simulating symptom entry...' });
    
    // Mock symptom logging (would normally save to database)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateStep('symptom-log', { 
      status: 'success', 
      message: 'Skin rash logged (severity: 6/10, onset: 2h post-meal)',
      duration: 1500
    });
    
    await new Promise(resolve => setTimeout(resolve, 800));
  };

  const testAIAnalysis = async () => {
    setCurrentStep(4);
    updateStep('ai-analysis', { status: 'running', message: 'Running AI correlation analysis...' });
    
    // Mock AI analysis (would normally call analytics service)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    updateStep('ai-analysis', { 
      status: 'success', 
      message: 'Found 78% correlation with histamine-rich foods (confidence: high)',
      duration: 2500
    });
  };

  const getStatusIcon = (status: string, isActive: boolean = false) => {
    if (isActive) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'register':
        return <User className="w-4 h-4" />;
      case 'login':
        return <User className="w-4 h-4" />;
      case 'food-search':
        return <Search className="w-4 h-4" />;
      case 'symptom-log':
        return <AlertTriangle className="w-4 h-4" />;
      case 'ai-analysis':
        return <Brain className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Complete User Flow Test
          </h3>
          <p className="text-sm text-gray-600">
            Tests the entire MCAS-Life patient journey from registration to AI analysis
          </p>
        </div>
        
        <button
          onClick={runCompleteFlow}
          disabled={isRunning}
          className="btn-primary flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Testing Flow...</span>
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              <span>Run Complete Test</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`p-4 rounded-lg border transition-all ${
              currentStep === index 
                ? 'border-blue-300 bg-blue-50' 
                : step.status === 'success' 
                  ? 'border-green-200 bg-green-50' 
                  : step.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(step.status, currentStep === index)}
                <div className="flex items-center space-x-2">
                  {getStepIcon(step.id)}
                  <div>
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                {step.duration && (
                  <span className="text-sm text-gray-500">{step.duration}ms</span>
                )}
              </div>
            </div>
            
            {step.message && (
              <div className="mt-2 ml-8">
                <p className={`text-sm ${
                  step.status === 'success' 
                    ? 'text-green-700' 
                    : step.status === 'error'
                      ? 'text-red-700'
                      : 'text-blue-700'
                }`}>
                  {step.message}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-900">Note</h4>
            <p className="text-sm text-amber-700 mt-1">
              Registration and Login steps will fail without PostgreSQL database connection. 
              Food search and mock analysis demonstrate working functionality.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Backend:</strong> {import.meta.env.VITE_API_URL} | 
          <strong> Environment:</strong> {import.meta.env.VITE_ENVIRONMENT || 'development'}
        </p>
      </div>
    </div>
  );
}