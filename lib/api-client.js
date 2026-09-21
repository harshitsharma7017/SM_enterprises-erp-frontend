const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch (e) {
      if (!response.ok) throw new Error(response.statusText);
      return {};
    }

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred while fetching the API');
    }

    return data;
  } catch (error) {
    console.error('[API Client Error]:', error.message);
    throw error;
  }
}

export const apiClient = {
  get: (endpoint, options) => fetchApi(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => fetchApi(endpoint, { ...options, method: 'DELETE' }),
};
