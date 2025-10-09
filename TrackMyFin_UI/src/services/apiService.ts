// API configuration and utility functions for authentication
const API_BASE_URL = 'http://localhost:8080/api';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// Helper function to create API errors
const createApiError = (message: string, status: number, errors?: Record<string, string[]>): ApiError => {
  const error = new Error(message) as Error & ApiError;
  error.status = status;
  if (errors) error.errors = errors;
  return error;
};

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log('Making API request:', {
      url,
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body
    });

    try {
      const response = await fetch(url, config);
      
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.log('📋 Parsed error data:', errorData);
        } catch {
          console.log('⚠️ Could not parse error response as JSON');
          errorData = { 
            message: errorText || `HTTP Error ${response.status}: ${response.statusText}` 
          };
        }
        
        const error: ApiError = {
          message: errorData.message || `Request failed with status ${response.status}`,
          status: response.status,
          errors: errorData.errors || errorData.details,
        };
        
        console.error('🚨 Final API Error:', error);
        throw error;
      }

      // Handle empty responses (like DELETE operations)
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      // If response is empty or has no JSON content, return appropriate value
      if (contentLength === '0' || 
          (!contentType?.includes('application/json') && !response.body)) {
        console.log('✅ Empty response (e.g., DELETE operation)');
        return {} as T; // Return empty object for successful operations with no content
      }
      
      // Try to parse JSON response
      try {
        const responseData = await response.json();
        console.log('Success response:', responseData);
        return responseData;
      } catch (jsonError) {
        // If JSON parsing fails but status is successful, return empty object
        console.log('⚠️ Could not parse successful response as JSON, returning empty object');
        return {} as T;
      }
    } catch (error) {
      console.error('Request failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw createApiError('Network error. Please check your connection and ensure the server is running.', 0);
      }
      throw error;
    }
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Validate the data before sending
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      throw createApiError('Email, password, first name, and last name are required', 400);
    }

    // Ensure data is properly formatted
    const cleanData = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phoneNumber: data.phoneNumber?.trim() || '',
    };

    console.log('Sending registration data:', {
      email: cleanData.email,
      firstName: cleanData.firstName,
      lastName: cleanData.lastName,
      phoneNumber: cleanData.phoneNumber,
      passwordLength: cleanData.password.length
    });

    return this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Validate the data before sending
    if (!data.email || !data.password) {
      throw createApiError('Email and password are required', 400);
    }

    const cleanData = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    console.log('Sending login data:', {
      email: cleanData.email,
      passwordLength: cleanData.password.length
    });

    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  }

  // Add authorization header for authenticated requests
  private defaultHeaders: Record<string, string> = {};

  setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`,
    };
  }

  removeAuthToken(): void {
    if (this.defaultHeaders['Authorization']) {
      delete this.defaultHeaders['Authorization'];
    }
  }

  // Make authenticated requests with JWT token
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = tokenService.getToken();
    console.log('🔐 Authentication check:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      endpoint: endpoint
    });
    
    if (!token) {
      console.error('❌ No authentication token found');
      throw createApiError('Authentication required', 401);
    }

    return this.makeRequest<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Dashboard API methods
  async getSalaries(): Promise<any[]> {
    return this.makeAuthenticatedRequest<any[]>('/salaries');
  }

  async addSalary(data: { amount: number; date: string; description: string }): Promise<any> {
    console.log('🔄 Adding salary with data:', data);
    
    // Ensure the date is in ISO LocalDateTime format for backend
    const isoDate = new Date(data.date).toISOString().slice(0, -1); // Remove 'Z' to get LocalDateTime format
    
    const requestData = {
      amount: data.amount,
      description: data.description, // Required by backend
      date: isoDate // ISO LocalDateTime format: "2025-09-21T10:30:00"
    };
    
    console.log('📤 Request details:', {
      url: `${this.baseURL}/salaries`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header will be added by makeAuthenticatedRequest
      },
      body: JSON.stringify(requestData)
    });
    
    return this.makeAuthenticatedRequest<any>('/salaries', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async deleteSalary(id: string): Promise<void> {
    return this.makeAuthenticatedRequest<void>(`/salaries/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<any[]> {
    // Since your backend doesn't require authentication for categories,
    // let's try without authentication first
    try {
      return this.makeRequest<any[]>('/categories');
    } catch (error: any) {
      console.log('Request without auth failed, trying with auth...');
      // If that fails, try with authentication
      return this.makeAuthenticatedRequest<any[]>('/categories');
    }
  }

  async addCategory(data: { name: string; description?: string; type: string }): Promise<any> {
    return this.makeAuthenticatedRequest<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: number, data: { name: string; description?: string; type: string }): Promise<any> {
    return this.makeAuthenticatedRequest<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number): Promise<void> {
    return this.makeAuthenticatedRequest<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactions(): Promise<any[]> {
    try {
      const [transactions, categories] = await Promise.all([
        this.makeAuthenticatedRequest<any[]>('/transactions'),
        this.getCategories()
      ]);
      
      console.log('🔍 Raw transaction data from backend:', transactions);
      console.log('🏷️ Categories data:', categories);
      
      // Create a category lookup map
      const categoryMap = new Map();
      categories.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });
      
      console.log('📋 Category map:', categoryMap);
      
      // Map backend field names to frontend expected field names
      const mappedTransactions = transactions.map(transaction => {
        console.log('🔄 Mapping transaction:', transaction);
        
        // Handle date mapping with multiple fallbacks
        let mappedDate = transaction.transactionDate || transaction.date;
        
        // If date is still missing, use createdAt or current date as fallback
        if (!mappedDate) {
          mappedDate = transaction.createdAt || new Date().toISOString();
          console.log('⚠️ Date missing, using fallback:', mappedDate);
        }
        
        // Get category name from the lookup map
        const categoryName = categoryMap.get(transaction.categoryId) || 'Unknown';
        console.log('🏷️ Category mapping:', transaction.categoryId, '→', categoryName);
        
        const mapped = {
          ...transaction,
          date: mappedDate,
          categoryName: categoryName
        };
        
        console.log('✅ Mapped transaction:', mapped);
        return mapped;
      });
      
      console.log('📋 Final mapped transactions:', mappedTransactions);
      return mappedTransactions;
    } catch (error: any) {
      console.error('❌ Error fetching transactions:', error);
      
      // Check if it's the Hibernate session error
      if (error.message && error.message.includes('could not initialize proxy')) {
        console.log('🔧 Detected Hibernate session error - backend restart may be needed');
        throw createApiError('Database session error. Please restart the backend server.', 500);
      }
      
      // For other errors, rethrow
      throw error;
    }
  }

  async addTransaction(data: { 
    description: string; 
    amount: number; 
    type: 'INCOME' | 'EXPENSE'; 
    categoryId: number; 
    date: string 
  }): Promise<any> {
    console.log('🔄 Adding transaction with data:', data);
    
    // Convert date to LocalDateTime format for backend
    const isoDateTime = data.date.includes('T') 
      ? data.date 
      : `${data.date}T00:00:00`;
    
    const requestData = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      transactionDate: isoDateTime, // Backend expects 'transactionDate', not 'date'
      notes: null // Backend expects notes field
    };
    
    const response = await this.makeAuthenticatedRequest<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
    
    // Map response to expected frontend format
    return {
      ...response,
      date: response.transactionDate || response.date,
      categoryName: response.categoryName || response.category?.name || 'Unknown'
    };
  }

  async updateTransaction(id: number, data: { 
    description: string; 
    amount: number; 
    type: 'INCOME' | 'EXPENSE'; 
    categoryId: number; 
    date: string 
  }): Promise<any> {
    console.log('🔄 Updating transaction', id, 'with data:', data);
    
    // Convert date to LocalDateTime format for backend
    // Backend expects transactionDate as LocalDateTime (ISO format)
    const isoDateTime = data.date.includes('T') 
      ? data.date 
      : `${data.date}T00:00:00`;
    
    const requestData = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      transactionDate: isoDateTime, // Backend expects 'transactionDate', not 'date'
      notes: null // Backend expects notes field
    };
    
    console.log('📤 Sending update request with formatted data:', requestData);
    
    const response = await this.makeAuthenticatedRequest<any>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
    
    // Map response to expected frontend format
    return {
      ...response,
      date: response.transactionDate || response.date,
      categoryName: response.categoryName || response.category?.name || 'Unknown'
    };
  }

  async deleteTransaction(id: number): Promise<void> {
    return this.makeAuthenticatedRequest<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getDashboardStats(): Promise<any> {
    console.log('🔄 Fetching dashboard stats...');
    try {
      const result = await this.makeAuthenticatedRequest<any>('/dashboard/stats');
      console.log('✅ Dashboard stats loaded successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  async getExpenseChart(timeRange: '6m' | '12m' | 'ytd' = '6m'): Promise<any> {
    return this.makeAuthenticatedRequest<any>(`/dashboard/expenses-chart?range=${timeRange}`);
  }

  // Profile management methods
  async getProfile(): Promise<any> {
    try {
      console.log('🔄 Loading user profile...');
      const result = await this.makeAuthenticatedRequest<any>('/profile');
      console.log('✅ Profile loaded successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      throw error;
    }
  }

  async updateProfile(profileData: any): Promise<any> {
    try {
      console.log('🔄 Updating user profile...', profileData);
      const result = await this.makeAuthenticatedRequest<any>('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      console.log('✅ Profile updated successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      throw error;
    }
  }
}

// Create and export the API service instance
export const apiService = new ApiService(API_BASE_URL);

// Token management utilities
export const tokenService = {
  getToken(): string | null {
    // Check multiple possible token keys
    return localStorage.getItem('jwt_token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('access_token');
  },

  setToken(token: string): void {
    localStorage.setItem('jwt_token', token);
    // Also set with common alternative keys for compatibility
    localStorage.setItem('authToken', token);
    apiService.setAuthToken(token);
  },

  removeToken(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    apiService.removeAuthToken();
  },

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Add 5 minute buffer before expiration
      return payload.exp > (currentTime + 300);
    } catch {
      return false;
    }
  },
};

// Initialize auth token if it exists in localStorage
const existingToken = tokenService.getToken();
if (existingToken && tokenService.isTokenValid()) {
  apiService.setAuthToken(existingToken);
}