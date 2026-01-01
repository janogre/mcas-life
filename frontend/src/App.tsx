import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/UI/Toast';
import { PWAPrompt } from './components/PWA/PWAPrompt';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { AirthingsCallbackPage } from './pages/Auth/AirthingsCallbackPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SymptomLogPage } from './pages/Symptoms/SymptomLogPage';
import { SymptomRegistrationPage } from './pages/Symptoms/SymptomRegistrationPage';
import { SymptomAddPage } from './pages/Symptoms/SymptomAddPage';
import { SymptomDetailPage } from './pages/Symptoms/SymptomDetailPage';
import { FoodSearchPage } from './pages/Foods/FoodSearchPage';
import { ApprovedFoodsPage } from './pages/Foods/ApprovedFoodsPage';
import { RecipeSearchPage } from './pages/Recipes/RecipeSearchPage';
import { SavedRecipesPage } from './pages/Recipes/SavedRecipesPage';
import { UserRecipesPage } from './pages/Recipes/UserRecipesPage';
import { RecipeCreatePage } from './pages/Recipes/RecipeCreatePage';
import { RecipeEditPage } from './pages/Recipes/RecipeEditPage';
import { RecipeDetailPage } from './pages/Recipes/RecipeDetailPage';
import { UserRecipeProfilePage } from './pages/Recipes/UserRecipeProfilePage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { DiaryPage } from './pages/Diary/DiaryPage';
import { IndoorClimatePage } from './pages/Environment/IndoorClimatePage';
import { LogPage } from './pages/Log/LogPage';
import { MedicationAddPage } from './pages/Medications/MedicationAddPage';
import { ActivityAddPage } from './pages/Activities/ActivityAddPage';
import { IllnessAddPage } from './pages/Illness/IllnessAddPage';
import { MealAddPage } from './pages/Meals/MealAddPage';
import { AdminPage } from './pages/Admin/AdminPage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  React.useEffect(() => {
    // Listen for session expired events from API
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || 'Din økt har utløpt';

      // Show a modal/alert to user
      const confirmed = confirm(
        `${message}\n\nDu vil bli sendt til innloggingssiden.`
      );

      if (confirmed) {
        // User acknowledged, speed up the redirect
        window.location.href = '/login?session_expired=true';
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <Router>
            <div className="min-h-screen bg-gray-50">
              <PWAPrompt />
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* OAuth callback routes */}
              <Route
                path="/callback"
                element={
                  <ProtectedRoute>
                    <AirthingsCallbackPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes with layout */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/symptoms"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SymptomLogPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/symptoms/register"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SymptomRegistrationPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/symptoms/add"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SymptomAddPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/symptoms/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SymptomDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/food"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <FoodSearchPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/safe-foods"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ApprovedFoodsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipes/search"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RecipeSearchPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipes/saved"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SavedRecipesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mine-oppskrifter"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UserRecipesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mine-oppskrifter/ny"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RecipeCreatePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mine-oppskrifter/:id/rediger"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RecipeEditPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mine-oppskrifter/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RecipeDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:userId/recipes"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UserRecipeProfilePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diary"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DiaryPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AnalyticsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/indoor-climate"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IndoorClimatePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/log"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LogPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/medications/add"
                element={
                  <ProtectedRoute>
                    <MedicationAddPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities/add"
                element={
                  <ProtectedRoute>
                    <ActivityAddPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/illness/add"
                element={
                  <ProtectedRoute>
                    <IllnessAddPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meals/add"
                element={
                  <ProtectedRoute>
                    <MealAddPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes (requires admin role) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AdminPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* 404 fallback */}
              <Route path="*" element={<div className="p-8 text-center">Page not found</div>} />
            </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;