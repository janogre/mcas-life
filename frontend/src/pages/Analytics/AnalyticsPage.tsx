import React from 'react';
import { Brain, TrendingUp, Target, Clock, AlertCircle } from 'lucide-react';
import { formatPercentage } from '../../lib/utils';

export function AnalyticsPage() {
  // Mock analysis data
  const mockAnalysis = {
    confidence: 0.78,
    analysis_window: 72,
    likely_triggers: [
      {
        food_name: 'Rødvin (Red wine)',
        correlation_score: 0.89,
        time_to_symptom: 3.1,
        compatibility: 3,
        confidence: 'high'
      },
      {
        food_name: 'Blåmuggost (Blue cheese)',
        correlation_score: 0.68,
        time_to_symptom: 4.2,
        compatibility: 2,
        confidence: 'high'
      },
      {
        food_name: 'Spinat (Spinach)',
        correlation_score: 0.45,
        time_to_symptom: 1.8,
        compatibility: 1,
        confidence: 'medium'
      }
    ],
    recommendations: [
      'Strongly consider avoiding: Red wine, Blue cheese',
      'Monitor carefully: Spinach - consider elimination trial',
      'Symptoms occur most frequently in the evening',
      'Consider timing meals earlier in the day'
    ]
  };

  const getCorrelationColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 0.6) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Trigger Analysis</h1>
        <p className="text-gray-600 mt-1">Advanced 72-hour correlation analysis powered by AI</p>
      </div>

      {/* Analysis Overview */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Latest AI Analysis</h2>
              <p className="text-purple-100">Completed 2 hours ago</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatPercentage(mockAnalysis.confidence)}</div>
            <div className="text-purple-100 text-sm">Confidence Score</div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4" />
              <span>Analysis Window</span>
            </div>
            <div className="text-lg font-semibold">{mockAnalysis.analysis_window} hours</div>
          </div>
          
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="w-4 h-4" />
              <span>Triggers Found</span>
            </div>
            <div className="text-lg font-semibold">{mockAnalysis.likely_triggers.length} foods</div>
          </div>
          
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>Risk Level</span>
            </div>
            <div className="text-lg font-semibold">High</div>
          </div>
        </div>
      </div>

      {/* Trigger Analysis Results */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Identified Trigger Candidates</h2>
        
        <div className="space-y-4">
          {mockAnalysis.likely_triggers.map((trigger, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getCorrelationColor(trigger.correlation_score)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{trigger.food_name}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {formatPercentage(trigger.correlation_score)} correlation
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trigger.confidence === 'high' ? 'bg-red-100 text-red-700' :
                    trigger.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {trigger.confidence} confidence
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">SIGHI Level:</span>
                  <span className="ml-2 font-medium">
                    {trigger.compatibility} ({
                      trigger.compatibility === 0 ? 'Safe' :
                      trigger.compatibility === 1 ? 'Medium' :
                      trigger.compatibility === 2 ? 'Incompatible' : 'Severe'
                    })
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Time to symptom:</span>
                  <span className="ml-2 font-medium">{trigger.time_to_symptom} hours</span>
                </div>
                <div>
                  <span className="text-gray-600">Recommendation:</span>
                  <span className="ml-2 font-medium">
                    {trigger.correlation_score >= 0.8 ? 'Avoid' :
                     trigger.correlation_score >= 0.6 ? 'Limit' : 'Monitor'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h2>
        
        <div className="space-y-3">
          {mockAnalysis.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-900">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis History */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
          <button className="btn-primary text-sm">Run New Analysis</button>
        </div>
        
        <div className="space-y-3">
          {[
            { date: '2 hours ago', confidence: 0.78, triggers: 3, status: 'completed' },
            { date: '3 days ago', confidence: 0.65, triggers: 2, status: 'completed' },
            { date: '1 week ago', confidence: 0.82, triggers: 4, status: 'completed' },
          ].map((analysis, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Trigger Analysis</p>
                  <p className="text-sm text-gray-600">{analysis.date}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{formatPercentage(analysis.confidence)}</div>
                  <div className="text-gray-500">Confidence</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{analysis.triggers}</div>
                  <div className="text-gray-500">Triggers</div>
                </div>
                <button className="text-primary-600 hover:text-primary-700 font-medium">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm Info */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About Our AI Algorithm</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">Analysis Factors:</h4>
            <ul className="space-y-1">
              <li>• SIGHI compatibility scoring (40% weight)</li>
              <li>• Time-to-symptom correlation (30% weight)</li>
              <li>• Histamine load calculation (20% weight)</li>
              <li>• Historical pattern recognition (10% weight)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Unique Features:</h4>
            <ul className="space-y-1">
              <li>• 72-hour analysis window (3x longer than competitors)</li>
              <li>• MCAS-optimized correlation curves</li>
              <li>• Multi-factor confidence scoring</li>
              <li>• Medical-grade accuracy standards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}