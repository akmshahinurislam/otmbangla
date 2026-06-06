import { Routes, Route, Navigate } from 'react-router-dom';
import type { UserFunction } from '../functions/types';
import { TenderDetailsPage } from '../functions/tender-notices/TenderDetailsPage';

export function RoutesComponent({ 
  functions,
  lang,
  onLangChange
}: { 
  functions: UserFunction[];
  lang: 'bn' | 'en';
  onLangChange: (lang: 'bn' | 'en') => void;
}) {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/tender-notices/:id" element={<TenderDetailsPage />} />
      {functions.map((fn) => {
        const PageComponent = fn.Page;
        return (
          <Route
            key={fn.id}
            path={`/${fn.id}`}
            element={<PageComponent lang={lang} onLangChange={onLangChange} />}
          />
        );
      })}
      {/* Fallback */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}
