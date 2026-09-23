'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';

// One request per page load — every company filter/selector shares it.
let request = null;

const loadCompanies = () => {
  if (!request) {
    request = apiClient.get('/administration/companies/options')
      .then((res) => res.data?.companies || [])
      .catch(() => {
        request = null;
        return [];
      });
  }
  return request;
};

/**
 * Companies for filters and selectors (id, code, name, short_name, is_active).
 * Backed by GET /administration/companies/options, open to any signed-in user.
 */
export function useCompanies() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let mounted = true;
    loadCompanies().then((list) => { if (mounted) setCompanies(list); });
    return () => { mounted = false; };
  }, []);

  return companies;
}

/** Called after company CRUD so the next load picks up the change. */
export function resetCompaniesCache() {
  request = null;
}
