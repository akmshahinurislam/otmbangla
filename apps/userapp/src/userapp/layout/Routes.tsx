import { Routes, Route, Navigate } from 'react-router-dom';
import type { UserFunction } from '../functions/types';
import { TenderDetailsPage } from '../functions/tender-notices/TenderDetailsPage';

export function RoutesComponent({ functions }: { functions: UserFunction[] }) {
  return (

      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tender-notices/:id" element={<TenderDetailsPage />} />
        {functions.map((fn) => (
          <Route key={fn.id} path={`/${fn.id}`} element={<fn.Page />} />
        ))}
        {/* Fallback */}
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>

  );
}
