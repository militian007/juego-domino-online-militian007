import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Perfil from './pages/Perfil.jsx';
import Ranking from './pages/Ranking.jsx';
import Torneos from './pages/Torneos.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Game from './pages/Game.jsx';
import Version from './components/Version.jsx';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-20">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      {/* El ranking se ve sin cuenta: el que entra de visita tiene que poder
          ver quienes son los mejores. */}
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/torneos" element={<Torneos />} />
      <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
      <Route path="/cambiar-clave" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/game" element={<Game />} />
      <Route path="/game/:roomCode" element={<Game />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Version />
    </>
  );
}

export default App;
