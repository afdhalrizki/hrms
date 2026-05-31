export const getDomainSuffix = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
      return process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'harikerja.com';
    }
    
    // Try to extract the base domain (harikerja.com, harikerja.web.id, etc)
    const match = host.match(/harikerja\.(com|web\.id|my\.id)/);
    if (match) return match[0];
  }
  return process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'harikerja.com';
};

export const getSupportEmail = () => `support@${getDomainSuffix()}`;
export const getSalesEmail = () => `sales@${getDomainSuffix()}`;

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    
    // In development/local setup, the backend might be on a different port (8000)
    // while frontend is on 3000.
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8000';
    const domainSuffix = getDomainSuffix();
    
    // Check if current host matches dev (localhost) or staging/prod suffixes
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const isProjectDomain = host.endsWith(`.${domainSuffix}`) || host === domainSuffix;

    if (isLocal) {
      return `http://${host.split(':')[0]}:${apiPort}/api`;
    }

    if (isProjectDomain) {
      // For Staging (harikerja.my.id) and Production (harikerja.com), use https
      // If it's a local test (harikerja.web.id:3000), we might still need http + port
      if (port === '3000' || port === '3001' || port === '8000') {
         return `http://${host}:${apiPort}/api`;
      }
      return `https://${host}/api`;
    }
    // Default fallback
    return `https://${host}/api`;
  }
  
  // SERVER-SIDE (SSR)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // On the server, we MUST use the internal docker network name (http://backend:8000/api)
  // to avoid networking loops or firewall issues with public IPs.
  return 'http://backend:8000/api';
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl();
  // Ensure trailing slash for Django compatibility (if no query string)
  const [pathPart, queryPart] = endpoint.split('?');
  const normalizedPath = pathPart.endsWith('/') ? pathPart : `${pathPart}/`;
  const normalizedEndpoint = queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
  const url = `${baseUrl}${normalizedEndpoint.startsWith('/') ? '' : '/'}${normalizedEndpoint}`;
  
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

  // Multi-tenant check: if on localhost/127.0.0.1, we might need X-Tenant header for E2E
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    const urlTenant = searchParams.get('test_tenant');
    const storageTenant = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('test_tenant_e2e') : null;
    const cookieTenant = getCookie('test_tenant_e2e');
    const testTenant = urlTenant || storageTenant || cookieTenant;
    
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || 
                    hostname.endsWith('.localhost') || hostname.endsWith('.127.0.0.1');
    
    if (testTenant && isLocal && !endpoint.includes('/public/')) {
      headers['X-Tenant'] = testTenant;
    }
    if (process.env.NEXT_PUBLIC_E2E_LOGGING === 'true' || process.env.NODE_ENV === 'test') {
       const authHeader = headers['Authorization'] ? 'Present' : 'Missing';
       console.log(`[API] ${options.method || 'GET'} ${url} - X-Tenant: ${headers['X-Tenant']} - Auth: ${authHeader}`);
    }
  }

  let response: Response | undefined;
  let retryCount = 0;
  const maxRetries = (process.env.NEXT_PUBLIC_E2E_TESTING === 'true' || process.env.NEXT_PUBLIC_E2E_LOGGING === 'true') ? 3 : 0;

  while (retryCount <= maxRetries) {
    try {
      const abortController = new AbortController();
      let globalTimeout: NodeJS.Timeout | undefined;
      
      // In E2E tests, add a safety timeout to prevent infinite hangs
      if (process.env.NEXT_PUBLIC_E2E_TESTING === 'true' || process.env.NEXT_PUBLIC_E2E_LOGGING === 'true' || process.env.NODE_ENV === 'test') {
        globalTimeout = setTimeout(() => {
          console.warn(`[API] Global timeout (90s) hit for ${url}`);
          abortController.abort();
        }, 90000); // 90s global safety
      }
      
      const combinedSignal = options.signal || abortController.signal;

      try {
        response = await fetch(url, { 
          ...options, 
          headers,
          credentials: options.credentials || 'include',
          signal: combinedSignal
        });
      } finally {
        if (globalTimeout) clearTimeout(globalTimeout);
      }

      // Handle Token Refresh (401 Unauthorized)
      if (response.status === 401 && !url.includes('/auth/login')) {
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
                credentials: options.credentials || 'include',
                signal: combinedSignal
              });
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          } catch (e) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      }

      // Retry on 404 (Tenant resolution race) or 502 (Backend restart/overload)
      if (maxRetries > 0 && (response.status === 404 || response.status === 502) && retryCount < maxRetries) {
        console.warn(`[API] Received ${response.status} for ${url}. Retrying (${retryCount + 1}/${maxRetries})...`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      break;
    } catch (err: any) {
      if (maxRetries > 0 && retryCount < maxRetries && err.name !== 'AbortError') {
        console.warn(`[API] Fetch error for ${url}: ${err.message}. Retrying (${retryCount + 1}/${maxRetries})...`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      throw err;
    }
  }

  if (!response || !response.ok) {
    const text = response ? await response.text().catch(() => '') : '';
    let detail = response ? `API Error: ${response.statusText}` : 'API Fetch Failed (No Response)';
    try {
      if (text) {
        const json = JSON.parse(text);
        if (json.detail) {
          detail = json.detail;
        } else {
          detail = Object.entries(json)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        }
      }
    } catch (e) {}
    if (process.env.NEXT_PUBLIC_E2E_LOGGING === 'true') {
       console.error(`[API ERROR] ${options.method || 'GET'} ${url} - Status: ${response?.status} - Detail: ${detail}`);
    }
    const error = new Error(detail);
    if (response) {
      (error as any).status = response.status;
    }
    throw error;
  }

  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  
  try {
    const data = JSON.parse(text);
    if (process.env.NODE_ENV === 'test') {
       const display = Array.isArray(data) ? `${data.length} items` : 'Object';
       console.log(`[API] Success from ${url}: ${display}`);
    }
    return data;
  } catch (e) {
    return text;
  }
};

export const apiDownload = async (endpoint: string, filename: string) => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
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
    throw error;
  }
};
