import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { AlertProvider } from './context/AlertContext.jsx';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <AlertProvider>
            <ConfirmProvider>
              <LanguageProvider>
                <AuthProvider>
                  <SocketProvider>
                    <WorkspaceProvider>
                      <App />
                    </WorkspaceProvider>
                  </SocketProvider>
                </AuthProvider>
              </LanguageProvider>
            </ConfirmProvider>
          </AlertProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
