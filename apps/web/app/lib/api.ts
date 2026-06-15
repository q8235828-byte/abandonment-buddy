import axios from 'axios';
import type {
  ApiError,
  CampaignPayload,
} from './types';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (
    typeof window !== 'undefined'
  ) {
    const token =
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }
  }

  return config;
});

export function getApiErrorMessage(
  err: unknown,
  fallback: string,
) {
  const message =
    (err as ApiError).response?.data
      ?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message || fallback;
}

export async function saveCampaign(
  storeId: string,
  payload: CampaignPayload,
) {
  const response =
    await api.post(
      `/campaigns/${storeId}`,
      payload,
    );

  return response.data;
}
