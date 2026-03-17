import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth} from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login"
import NotAccessible from "./pages/NotAccessible"

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// const LayoutWrapper = ({ children, currentPageName }) => Layout ?
//   <Layout currentPageName={currentPageName}>{children}</Layout>
//   : <>{children}</>;

const LayoutWrapper = ({ children, currentPageName }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="min-h-screen">
        {Layout ? (
          <Layout currentPageName={currentPageName}>{children}</Layout>
        ) : (
          <>{children}</>
        )}
      </div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const navigate = useNavigate();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const canAccess = (pageConfig) => {
    if(!pagesConfig.roles) return true;
    if (pagesConfig.roles.length === 0) return true;
    return pageConfig.roles.includes(user?.role);
  };

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  function ProtectedLayout() {
    const { token } = useAuth();
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    
    return <Outlet />;
  }

  const allowedPages = Object.entries(Pages).filter(([path, pageConfig]) => {
    return canAccess(pageConfig);
  });

  const MainPageComponent = Pages[mainPageKey]?.component || (() => <></>);

  // const allowedPages = Object.entries(Pages).filter(([path, pagesConfig]) => {
  //   console.log("checking visibilities .....", !pagesConfig.roles,pagesConfig, pagesConfig.roles.length)
  //   if(!pagesConfig.roles) return true;
  //   if (pagesConfig.roles.length === 0) return true;

  //   return pagesConfig.roles.includes(user?.role);
  // })

  // const isAllowed = allowedPages.some(([path]) => window.location.pathname === path);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {Pages["Register"] && (
        <Route path="/Register" element={<Pages.Register.component />} />
      )}
      {Pages["register"] && (
        <Route path="/register" element={<Pages.register.component />} />
      )}
      {/* Protected routes */}
      <Route element={<ProtectedLayout />}>
        <Route
          path="/"
          element={
            canAccess(Pages[mainPageKey]) ? (
            <LayoutWrapper currentPageName={mainPageKey}>
              {/* <MainPage /> */}
              <MainPageComponent/>
            </LayoutWrapper>
            ) : 
            (
              <NotAccessible role={user?.role === 'petani' ? 'petani' : 'admin'} />
            )
          }
        />

        {allowedPages.map(([path, Page]) => {
          const PageComponent = Page.component;
          const isAllowed = canAccess(Page.roles);
          const role = Page.roles.includes('petani') ? 'petani' : 'oaks';

          return <Route
            key={path}
            path={`/${path}`}
            element={
              path === 'login' || path === 'register' ? (
                <PageComponent />
              ) :
              isAllowed ? (
              <LayoutWrapper currentPageName={path}>
                <PageComponent/>
              </LayoutWrapper>
              ) : (
                  <NotAccessible role={role}/>
              )
            }
          />
        })}
      </Route>
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

export default App
