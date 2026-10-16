'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Crash en /recipes/[id]:', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#dc2626' }}>Error al cargar la receta</h2>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '0.5rem', margin: '1rem 0' }}>
        <strong>Mensaje:</strong>
        <p style={{ fontFamily: 'monospace', color: '#991b1b', wordBreak: 'break-all' }}>
          {error?.message || 'Error desconocido'}
        </p>
      </div>

      {error?.digest && (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Digest: <code>{error.digest}</code>
        </p>
      )}

      {error?.stack && (
        <details open style={{ margin: '1rem 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Stack trace completo:</summary>
          <pre style={{ background: '#1e293b', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', fontSize: '0.75rem' }}>
            {error.stack}
          </pre>
        </details>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => reset()}
          style={{ padding: '0.5rem 1rem', background: '#a86224', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Reintentar
        </button>
        <Link
          href="/recipes"
          style={{ padding: '0.5rem 1rem', background: '#e5e7eb', color: '#374151', textDecoration: 'none', borderRadius: '0.375rem', fontWeight: 'bold' }}
        >
          Volver a Recetas
        </Link>
      </div>
    </div>
  );
}
