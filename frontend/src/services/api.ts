import axios from 'axios';
import type { UserSearchResult } from '../types/user';
import type { Notification, UnreadCountResponse } from '../types/notification';

const apiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on login endpoint - let the login component handle the error
      if (error.config?.url !== '/login') {
        // Clear all auth-related storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        // Use window.location to force full page reload and clear React state
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  const response = await api.get<UserSearchResult[]>('/users/search', {
    params: { query },
  });
  return response.data;
};

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/notifications');
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data.count;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await api.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete('/notifications');
};

export const getAdminAvailability = async (): Promise<{ isOnline: boolean }> => {
  const response = await api.get('/admin/availability');
  return response.data;
};

export const updateAdminAvailability = async (isOnline: boolean): Promise<void> => {
  await api.patch('/admin/availability', { isOnline });
};

export { api };
