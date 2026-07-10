export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export const fetchApi = async (path: string, options?: RequestInit): Promise<Response> => {
  const url = getApiUrl(path);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error on ${url}:`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error(`Network or API Error fetching ${url}:`, error);
    throw error;
  }
};
