import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (data) => api.post('/auth/change-password', data).then((r) => r.data)
};

export const perfilApi = {
  mio: () => api.get('/perfil').then((r) => r.data),
  ponerFoto: (foto) => api.put('/perfil/foto', { foto }).then((r) => r.data),
  quitarFoto: () => api.delete('/perfil/foto').then((r) => r.data),
  fotosDe: (ids) => api.get('/perfil/fotos', { params: { ids: ids.join(',') } }).then((r) => r.data)
};

export const rankingApi = {
  tabla: (vista, cuantos) => api.get('/ranking', { params: { vista, cuantos } }).then((r) => r.data),
  mio: () => api.get('/ranking/mio').then((r) => r.data)
};

export const torneosApi = {
  vitrina: () => api.get('/torneos').then((r) => r.data),
  mios: () => api.get('/torneos/mios').then((r) => r.data)
};

export const desbloqueosApi = {
  mios: () => api.get('/desbloqueos').then((r) => r.data)
};

export const monedasApi = {
  mias: () => api.get('/monedas').then((r) => r.data)
};

export const tiendaApi = {
  vitrina: () => api.get('/tienda').then((r) => r.data),
  comprar: (clave) => api.post('/tienda/comprar', { clave }).then((r) => r.data)
};

export const paseApi = {
  mio: () => api.get('/pase').then((r) => r.data),
  stickers: () => api.get('/pase/stickers').then((r) => r.data),
  elegirTitulo: (clave) => api.post('/pase/titulo', { clave }).then((r) => r.data)
};

export default api;
