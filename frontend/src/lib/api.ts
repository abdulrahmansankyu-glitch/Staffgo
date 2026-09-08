import axios from 'axios';

// VITE_API_URL points at the Render backend when the frontend is hosted
// separately (Netlify); unset it (or leave blank) when both are served from
// the same origin, and requests fall back to a same-origin relative path.
export const apiOrigin: string = import.meta.env.VITE_API_URL || '';
const apiBaseUrl = apiOrigin ? `${apiOrigin}/api/v1` : '/api/v1';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// On a 401 from an expired access token, try a silent refresh once, then retry the original request.
let isRefreshing = false;
let queue: Array<() => void> = [];

const AUTH_EXCLUDED = ['/auth/login', '/auth/refresh', '/auth/me'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isExcluded = AUTH_EXCLUDED.some((p) => original.url?.includes(p));
    if (error.response?.status === 401 && !original._retry && !isExcluded) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(original)));
        });
      }
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        queue.forEach((cb) => cb());
        queue = [];
        return api(original);
      } catch (refreshErr) {
        queue = [];
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
