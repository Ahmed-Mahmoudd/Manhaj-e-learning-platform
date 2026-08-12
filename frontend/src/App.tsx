import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { AppRoutes } from '@/routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BrowserRouter>
          <AuthProvider>
            <RouteErrorBoundary>
              <AppRoutes />
            </RouteErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
