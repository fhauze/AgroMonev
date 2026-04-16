// import { createClient } from '@base44/sdk';
// import { appParams } from '@/lib/app-params';

// const { appId, token, functionsVersion, appBaseUrl } = appParams;
// //Create a client with authentication required
// export const base44 = createClient({
//   appId,
//   token,
//   functionsVersion,
//   serverUrl: import.meta.env.VITE_BASE44_API_URL.replace(/\/api$/, ''),
//   requiresAuth: false,
//   appBaseUrl :'',
// });


import axios from "axios";

const baseURL = import.meta.env.VITE_BASE44_API_URL;

const base44 = axios.create({
  baseURL: `${baseURL}/api`,
});

// Inject token otomatis
base44.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Global 401 handler
base44.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default base44;