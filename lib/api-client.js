const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
  }

  // Handle FormData automatically
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  // Only set Content-Type to application/json if it's NOT FormData
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

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
      const err = new Error(data.message || 'An error occurred while fetching the API');
      err.response = {
        data: data,
        status: response.status
      };
      throw err;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Streamed (PDF/XLSX) endpoints aren't JSON, so they can't go through fetchApi's
// response.json() parsing — this fetches the file with the same auth header and
// saves it via a throwaway object URL, since a plain <a href> can't carry the
// Authorization header the backend's `authenticate` middleware requires.
export async function downloadFile(endpoint, filename) {
  const url = `${API_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    throw new Error(`Failed to download file (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const apiClient = {
  get: (endpoint, options) => fetchApi(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (endpoint, body, options) => fetchApi(endpoint, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (endpoint, options) => fetchApi(endpoint, { ...options, method: 'DELETE' }),
  download: downloadFile,
};
