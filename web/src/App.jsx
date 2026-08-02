import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Workspace from './pages/Workspace.jsx';
import { useLanguage } from './context/LanguageContext.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) return (
    <div className="loading-screen">
      <div className="loader-container">
        <div className="spinner"></div>
        <div className="loading-logo">
          <div className="edara-lt1">EDARA</div>
          <div className="edara-logo-mod" style={{ marginTop: '8px' }}>Eteams</div>
        </div>
      </div>
    </div>
  );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route path="/" element={user ? <Workspace /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
