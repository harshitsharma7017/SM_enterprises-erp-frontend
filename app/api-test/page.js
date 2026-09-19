'use client';

import { useEffect, useState } from 'react';
import { healthService } from '../../services/health.service';

export default function ApiTestPage() {
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const response = await healthService.checkHealth();
        setData(response);
        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    }
    
    checkApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Backend Connection Test</h1>
        
        {status === 'loading' && (
          <div className="flex items-center text-blue-600">
            <span className="animate-pulse">Testing connection to backend...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <h3 className="font-semibold flex items-center">
              <span className="mr-2">❌</span> API Connection Failed
            </h3>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {status === 'success' && data && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md">
              <h3 className="font-semibold flex items-center text-lg">
                <span className="mr-2">✓</span> API Connected
              </h3>
            </div>
            
            <div className="bg-gray-50 rounded p-4 border border-gray-200">
              <p className="font-medium text-gray-700">{data.message}</p>
              <p className="text-sm text-gray-500 mt-1">Database: {data.database}</p>
            </div>
            
            <div className="mt-6 text-xs text-gray-400 font-mono bg-gray-50 p-3 rounded">
              Raw Response: {JSON.stringify(data, null, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
