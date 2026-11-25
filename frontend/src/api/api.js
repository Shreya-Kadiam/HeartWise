const TOKEN_KEY = 'heartwise_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (payload) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demoLogin: () =>
    request('/api/auth/demo', {
      method: 'POST',
    }),

  me: () => request('/api/auth/me'),

  getDashboard: () => request('/api/dashboard'),

  predict: (healthPayload) =>
    request('/api/predict', {
      method: 'POST',
      body: JSON.stringify(healthPayload),
    }),

  getAssessment: (id) => request(`/api/assessments/${id}`),

  deleteAssessment: (id) =>
    request(`/api/assessments/${id}`, {
      method: 'DELETE',
    }),

  getModelInfo: () => request('/api/model-info'),

  getAdminModels: () => request('/api/admin/models'),

  getAdminReports: () => request('/api/admin/reports'),

  selectActiveModel: (modelName) =>
    request('/api/admin/select-model', {
      method: 'POST',
      body: JSON.stringify({ model_name: modelName }),
    }),

  retrainModels: () =>
    request('/api/admin/retrain', {
      method: 'POST',
    }),
};
