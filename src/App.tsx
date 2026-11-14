import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { ToastProvider } from './providers/ToastProvider';
import { SiteSettingsProvider } from './providers/SiteSettingsProvider';
import { AuthProvider } from './providers/AuthProvider';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SiteSettingsProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </SiteSettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
