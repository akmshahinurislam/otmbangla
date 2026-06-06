import { Routes, Route, Navigate } from 'react-router-dom';
import type { AdminFunction } from '../app/AdminApp';

interface RoutesComponentProps {
  functions: AdminFunction[];
  leadStats: {
    totalLeads: number;
    convertedCount: number;
    lostCount: number;
    inProgressCount: number;
    newCount: number;
    contactedCount: number;
    totalValue: number;
  };
  leadsList: any[];
  onCreateLead: (lead: any) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: string) => void;
}

export function RoutesComponent({
  functions,
  leadStats,
  leadsList,
  onCreateLead,
  onUpdateLeadStatus,
}: RoutesComponentProps) {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {functions.map((fn) => {
        const PageComponent = fn.Page;
        return (
          <Route
            key={fn.id}
            path={`/${fn.id}`}
            element={
              <PageComponent
                functions={functions}
                leadStats={leadStats}
                leadsList={leadsList}
                onCreateLead={onCreateLead}
                onUpdateLeadStatus={onUpdateLeadStatus}
              />
            }
          />
        );
      })}
      {/* Fallback */}
      <Route
        path="*"
        element={
          <div className="flex h-64 flex-col items-center justify-center text-center animate-fadeIn">
            <h3 className="text-lg font-bold text-main dark:text-white">Page Not Found</h3>
            <p className="mt-2 text-xs text-muted dark:text-neutral-500">
              The administrative view you are looking for does not exist.
            </p>
          </div>
        }
      />
    </Routes>
  );
}
