import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import axios from 'axios';
import {createPageUrl} from '@/utils';
import { Navigate, useLocation } from 'react-router-dom';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { 
    isAuthenticated, 
    isLoadingAuth, 
    // navigateToLogin,
    authError 
  } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();
  const loginPath = createPageUrl("Login").toLowerCase();

  const isLoginPage = currentPath === loginPath || currentPath.startsWith("/login");

  useEffect(() => {
    const syncData = async () => {
      // if (isLoginPage || !isAuthenticated || !navigator.onLine) return;

      const offlineData = JSON.parse(localStorage.getItem('pending_farming_data') || '[]');
      if (offlineData.length === 0) return;

      const token = localStorage.getItem('access_token');
      const baseUrl = import.meta.env.VITE_BASE44_API_URL.replace(/\/+$/, "");

      const remainingData = [];
      for (const data of offlineData) {
        try {
          await axios.post(`${baseUrl}/api/petani/save`, data, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          remainingData.push(data);
        }
      }
      localStorage.setItem('pending_farming_data', JSON.stringify(remainingData));
    };

    window.addEventListener('online', syncData);
    if (navigator.onLine) syncData();
    return () => window.removeEventListener('online', syncData);
  }, [isAuthenticated, isLoginPage]);
  
  // if (isLoadingAuth) {
  //   return (
  //     <div className="fixed inset-0 flex items-center justify-center bg-white">
  //       <div className="w-8 h-8 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin"></div>
  //     </div>
  //   );
  // }

  // if (!isAuthenticated && !isLoginPage) {
  //   console.log("Redirecting to login because path is:", currentPath);
  //   return (
  //     <Navigate
  //       to={createPageUrl("Login")}
  //       state={{ from: location }}
  //       replace
  //     />
  //   );
  // }


  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;