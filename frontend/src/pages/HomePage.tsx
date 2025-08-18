import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Brain, 
  Shield, 
  TrendingUp,
  ChevronRight,
  Activity,
  Users,
  Star
} from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Smart <span className="text-gradient">MCAS</span> Symptom Tracking
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              AI-powered trigger correlation for Mast Cell Activation Syndrome patients. 
              Discover food triggers, track patterns, and take control of your health.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Start Tracking Free
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/login"
                className="btn-secondary text-lg px-8 py-4 rounded-xl hover:shadow-md transition-all"
              >
                Sign In
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                HIPAA Compliant
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Trusted by Patients
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-yellow-400" />
                Medical Grade
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why MCAS-Life is Different
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              First AI-powered MCAS app with 72-hour trigger correlation and 1370+ SIGHI foods
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Correlation */}
            <div className="group p-6 bg-gradient-to-br from-primary-50 to-white rounded-2xl border border-primary-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <Brain className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Trigger Analysis
              </h3>
              <p className="text-gray-600 mb-4">
                72-hour correlation analysis with 8-factor algorithm. First-to-market AI specifically designed for MCAS patients.
              </p>
              <div className="text-sm text-primary-600 font-medium">
                3x longer analysis window than competitors →
              </div>
            </div>

            {/* SIGHI Database */}
            <div className="group p-6 bg-gradient-to-br from-sighi-safe/10 to-white rounded-2xl border border-green-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Complete SIGHI Database
              </h3>
              <p className="text-gray-600 mb-4">
                1370+ verified foods with official SIGHI compatibility ratings (0-3 scale). Most comprehensive MCAS food database.
              </p>
              <div className="text-sm text-green-600 font-medium">
                Medical-grade accuracy →
              </div>
            </div>

            {/* Pattern Recognition */}
            <div className="group p-6 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pattern Recognition
              </h3>
              <p className="text-gray-600 mb-4">
                Identify personal trigger patterns, time-based correlations, and get predictive insights for symptom prevention.
              </p>
              <div className="text-sm text-purple-600 font-medium">
                Personalized insights →
              </div>
            </div>

            {/* Offline PWA */}
            <div className="group p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Offline-First PWA
              </h3>
              <p className="text-gray-600 mb-4">
                Log symptoms anywhere, anytime. Progressive Web App works offline and syncs when connected.
              </p>
              <div className="text-sm text-blue-600 font-medium">
                Always available →
              </div>
            </div>

            {/* Clinical Ready */}
            <div className="group p-6 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Clinical Integration
              </h3>
              <p className="text-gray-600 mb-4">
                Generate HIPAA-compliant reports for your MCAS specialist. Research-grade data for medical consultations.
              </p>
              <div className="text-sm text-orange-600 font-medium">
                Doctor-approved →
              </div>
            </div>

            {/* Community */}
            <div className="group p-6 bg-gradient-to-br from-pink-50 to-white rounded-2xl border border-pink-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                MCAS Community
              </h3>
              <p className="text-gray-600 mb-4">
                Connect with verified MCAS patients and experts. Share safe foods and insights while maintaining privacy.
              </p>
              <div className="text-sm text-pink-600 font-medium">
                Join the community →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-primary-500 to-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Take Control of Your MCAS?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of MCAS patients already using AI-powered trigger analysis to improve their quality of life.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-white text-primary-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
          >
            Start Your Free Trial
            <ChevronRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MCAS-Life</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 MCAS-Life. Medical-grade symptom tracking for MCAS patients.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}