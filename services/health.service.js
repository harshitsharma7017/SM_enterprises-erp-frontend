import { apiClient } from '../lib/api-client';

export const healthService = {
  checkHealth: async () => {
    return apiClient.get('/health');
  }
};
