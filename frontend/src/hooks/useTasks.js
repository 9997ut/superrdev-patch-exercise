import { useState, useEffect } from 'react';
import { fetchTasks } from '../api';

export function useTasks(query, status, page, pageSize) {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // BUG FIX: Use AbortController to cancel in-flight requests when params change.
    // Without this, a slow response from an older query could overwrite a newer one
    // (classic race condition / stale closure problem).
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchTasks({ query, status, page, pageSize }, controller.signal)
      .then((data) => {
        setTasks(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((err) => {
        // BUG FIX: Original code never cleared loading=true on error, leaving
        // the UI in a permanent "loading" state after any failed request.
        if (err.name === 'AbortError') return; // ignore intentional cancellations
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, status, page, pageSize]);

  return { tasks, total, loading, error };
}
