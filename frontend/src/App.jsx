import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Umbral from './umbral/Umbral.jsx';
import Antesala from './antesala/Antesala.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Perfil from './pages/Perfil.jsx';
import Ranking from './pages/Ranking.jsx';
import BuzonDelSocio from './buzon/BuzonDelSocio.jsx';
import Config, { Guardianes, Disputas } from './socio/CuartoDelSocio.jsx';
import Torneos from './pages/Torneos.jsx';
import Pase from './pages/Pase.jsx';
import Tienda from './pages/Tienda.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Game from './pages/Game.jsx';
import Sonidos from './pages/Sonidos.jsx';
import Version from './components/Version.jsx';
import { PaginaInstalar } from './components/InstalarLaApp.jsx';
import AvisoDeTorneo from './components/notificaciones/AvisoDeTorneo.jsx';
import AvisoDeNivel from './components/notificaciones/AvisoDeNivel.jsx';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-20">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function RutaInstalar() {
  const navigate = useNavigate();
  return <PaginaInstalar onVolver={() => navigate('/')} />;
}

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Umbral />} />
      <Route path="/mesa" element={<Antesala />} />
      <Route path="/viejo" element={<Landing />} />
      {/* Instalar la app (seccion 209): la pagina suelta para pegar en el chat; /?instalar lleva aqui. */}
      <Route path="/instalar" element={<RutaInstalar />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      {/* El ranking se ve sin cuenta: el que entra de visita tiene que poder
          ver quienes son los mejores. */}
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/buzon" element={<BuzonDelSocio />} />
      {/* El cuarto del socio (seccion 201), todo con la misma llave. */}
      <Route path="/config" element={<Config />} />
      <Route path="/guardianes" element={<Guardianes />} />
      <Route path="/disputas" element={<Disputas />} />
      <Route path="/torneos" element={<Torneos />} />
      {/* El pase pide cuenta: sin cuenta no hay donde guardarle el progreso. */}
      <Route path="/pase" element={<PrivateRoute><Pase /></PrivateRoute>} />
      <Route path="/tienda" element={<PrivateRoute><Tienda /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
      <Route path="/cambiar-clave" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/game" element={<Game />} />
      <Route path="/game/:roomCode" element={<Game />} />
      {/* Solo en desarrollo: la pagina para escuchar y elegir los sonidos. */}
      {import.meta.env.DEV && <Route path="/sonidos" element={<Sonidos />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

      {/* La mesa del torneo puede tocarte en cualquier pantalla. */}
      <AvisoDeTorneo />
      {/* Subir de nivel tambien pasa en cualquier pantalla: casi siempre al
          terminar una partida, que es cuando se esta en la mesa. */}
      <AvisoDeNivel />
    <Version />
    </>
  );
}

export default App;
