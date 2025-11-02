import { supabase } from "./supabase";
const API_URL = process.env.REACT_APP_API_URL || '${import.meta.env.REACT_APP_API_URL}';

// Helper function to normalize URLs and prevent double slashes
const normalizeUrl = (baseUrl, endpoint) => {
  // Remove trailing slash from base URL
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  // Remove leading slash from endpoint
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  return `${normalizedBaseUrl}/${normalizedEndpoint}`;
};

// Helper function to get the current authentication token from Supabase
const getAuthToken = async () => {
  try {
    // Get current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
    
    return session?.access_token || null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

const apiClient = {
  async get(endpoint) {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if token exists
      const token = await getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(normalizeUrl(API_URL, endpoint), { headers });
      const data = await response.json();
      return {
        success: response.ok,
        data: response.ok ? data : null,
        error: response.ok ? null : data.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message || "Network error. Please try again later.",
      };
    }
  },

  async post(endpoint, data) {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if token exists
      const token = await getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(normalizeUrl(API_URL, endpoint), {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      return {
        success: response.ok,
        data: response.ok ? responseData : null,
        error: response.ok ? null : responseData.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message || "Network error. Please try again later.",
      };
    }
  },

  async put(endpoint, data) {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if token exists
      const token = await getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(normalizeUrl(API_URL, endpoint), {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      return {
        success: response.ok,
        data: response.ok ? responseData : null,
        error: response.ok ? null : responseData.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message || "Network error. Please try again later.",
      };
    }
  },

  async delete(endpoint) {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if token exists
      const token = await getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(normalizeUrl(API_URL, endpoint), {
        method: "DELETE",
        headers,
      });
      const responseData = await response.json();
      return {
        success: response.ok,
        data: response.ok ? responseData : null,
        error: response.ok
          ? null
          : responseData.error || "Failed to delete resource",
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message || "Network error. Please try again later.",
      };
    }
  },
};

export default apiClient;
