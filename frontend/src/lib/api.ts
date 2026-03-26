export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    
    // In development/local setup, the backend might be on a different port (8000)
    // while frontend is on 3000.
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8000';
    const domainSuffix = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'localhost';
    
    // Check if current host matches dev (localhost) or staging/prod suffixes
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const isProjectDomain = host.endsWith(`.${domainSuffix}`) || host === domainSuffix;

    if (isLocal) {
      return `http://${host.split(':')[0]}:${apiPort}/api`;
    }

    if (isProjectDomain) {
      // For Staging (harikerja.web.id) and Production (harikerja.com), use https
      // If it's a local test (harikerja.web.id:3000), we might still need http + port
      if (port === '3000' || port === '3001' || port === '8000') {
         return `http://${host}:${apiPort}/api`;
      }
      return `https://${host}/api`;
    }
    
    // Default fallback
    return `https://${host}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const isFormData = options.body instanceof FormData;

  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }
  
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers as Record<string, string>,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const csrfToken = getCookie('csrftoken');
  if (csrfToken && typeof window !== 'undefined') {
    headers['X-CSRFToken'] = csrfToken;
  }

  try {
    let response = await fetch(url, { 
      ...options, 
      headers,
      credentials: options.credentials || 'include'
    });

    // Handle Token Refresh (401 Unauthorized)
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !url.includes('/auth/token/refresh')) {
        try {
          const refreshUrl = `${baseUrl}/auth/token/refresh/`;
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('access_token', refreshData.access);
            
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.access}`;
            response = await fetch(url, { 
              ...options, 
              headers,
              credentials: options.credentials || 'include'
            });
          } else {
            // Refresh failed, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (refreshError) {
          console.error('Token Refresh Failed:', refreshError);
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

export const apiDownload = async (endpoint: string, filename: string) => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download Error: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('API Download Error:', error);
    throw error;
  }
};
