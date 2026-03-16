export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // For localhost development:
    // If we are on company1.localhost:3000, we should call company1.localhost:8000
    if (host.includes('localhost')) {
      return `http://${host}:8000/api`;
    }
    // For production (e.g., company.yourhr.com)
    return `https://${host}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
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
