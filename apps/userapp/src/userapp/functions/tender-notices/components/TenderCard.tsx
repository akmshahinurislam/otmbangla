import { TenderNotice } from '../types';
import { useNavigate } from 'react-router-dom';

interface TenderCardProps {
  tender: TenderNotice;
  formatTenderDate: (dateStr: string) => string;
  getTimelineStats: (pubDate: string, closeDate: string) => {
    percent: number;
    daysLeft: number;
    level: 'new' | 'mid' | 'urgent' | 'critical';
  };
}

export function TenderCard({ tender, formatTenderDate, getTimelineStats }: TenderCardProps) {
  const navigate = useNavigate();
  const { percent, daysLeft, level } = getTimelineStats(tender.publishedDate, tender.closingDate);

  let progressColors = 'bg-accent-purple';
  let badgeColors = 'border-subtle bg-secondary-bg text-secondary';

  if (level === 'critical') {
    progressColors = 'bg-red-500 dark:bg-red-600';
    badgeColors = 'border-red-200 bg-red-50 text-red-700 dark:border-red-950/20 dark:bg-red-950/20 dark:text-red-400';
  } else if (level === 'urgent') {
    progressColors = 'bg-amber-500';
    badgeColors = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-950/20 dark:bg-amber-950/20 dark:text-amber-400';
  } else if (level === 'mid') {
    progressColors = 'bg-accent-blue';
    badgeColors = 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-950/20 dark:bg-blue-950/20 dark:text-blue-400';
  }

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-subtle bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-accent-purple/20 dark:border-white/10 dark:bg-white/[0.01] dark:hover:bg-white/[0.02] space-y-4">
      <div>
        {/* Card Header Info */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="font-mono text-xs font-bold tracking-wider text-muted uppercase dark:text-neutral-500">
              {tender.id.replace('T-', 'ID-')}
            </span>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="rounded-md bg-accent-purple/10 px-2.5 py-1 text-xs font-bold text-accent-purple dark:bg-accent-purple/20">
                {tender.category}
              </span>
              <span className="rounded-md bg-tertiary-surface px-2.5 py-1 text-xs font-bold text-secondary dark:bg-white/[0.04] dark:text-neutral-300">
                {tender.method}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted dark:text-neutral-500 block font-bold uppercase tracking-wider">Est. Budget</span>
            <span className="text-sm font-extrabold text-main dark:text-white pt-1 block">{tender.budget}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-4 text-sm md:text-base font-bold text-main dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]" title={tender.title}>
          {tender.title}
        </h3>

        {/* Short Description */}
        <p className="mt-2 text-sm text-secondary leading-relaxed dark:text-neutral-400 line-clamp-2">
          {tender.description}
        </p>

        {/* Meta Row: Client / District */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-secondary dark:text-neutral-400 pt-3 border-t border-subtle/50 dark:border-white/5 mt-3">
          <div className="flex items-center gap-1.5 truncate">
            <svg className="h-4 w-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate font-semibold" title={tender.organization}>{tender.organization}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <svg className="h-4 w-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate font-semibold">{tender.district} District</span>
          </div>
        </div>
      </div>

      {/* Dates, Visual Progress Slider, & Actions */}
      <div className="mt-4 pt-3 border-t border-subtle dark:border-white/10 space-y-4">
        {/* Visual Progress Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-secondary dark:text-neutral-400">Timeline Progress</span>
            <span className="font-bold text-main dark:text-neutral-300">{percent}% elapsed</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-tertiary-surface dark:bg-white/[0.04] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColors}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

         {/* Desktop Timeline Data Row */}
         <div className="hidden md:flex items-center justify-between text-xs font-semibold">
           <div className="text-muted dark:text-neutral-500">
             Pub: <span className="font-bold text-secondary dark:text-neutral-400">{formatTenderDate(tender.publishedDate)}</span>
           </div>

           <div className={`flex items-center gap-1 border rounded-full px-3 py-1 text-[11px] font-bold ${badgeColors}`}>
             <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <span>
               {daysLeft === 0 ? 'Closing Today!' : daysLeft === 1 ? 'Closing Tomorrow!' : `${daysLeft} days left`}
             </span>
           </div>

           <div className="text-muted dark:text-neutral-500">
             Deadline: <span className="font-bold text-secondary dark:text-neutral-400">{formatTenderDate(tender.closingDate)}</span>
           </div>
         </div>

         {/* Mobile Timeline Data Grid */}
         <div className="flex md:hidden flex-col gap-3.5 w-full animate-fadeIn">
           <div className="flex items-center justify-between text-xs font-semibold">
             <div className="text-muted dark:text-neutral-500">
               Pub: <span className="font-bold text-secondary dark:text-neutral-400">{formatTenderDate(tender.publishedDate)}</span>
             </div>
             <div className="text-muted dark:text-neutral-500">
               Deadline: <span className="font-bold text-secondary dark:text-neutral-400">{formatTenderDate(tender.closingDate)}</span>
             </div>
           </div>
           <div className="flex justify-center">
             <div className={`flex items-center gap-1.5 border rounded-full px-4 py-2 text-xs font-extrabold ${badgeColors} shadow-xs`}>
               <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span>
                 {daysLeft === 0 ? 'Closing Today!' : daysLeft === 1 ? 'Closing Tomorrow!' : `${daysLeft} days left`}
               </span>
             </div>
           </div>
         </div>

        {/* Details Action Bar */}
        <div className="flex items-center justify-between gap-2.5 pt-2">
          <span className="text-xs text-muted dark:text-neutral-500 font-mono font-semibold">
            Security: {tender.securityAmount}
          </span>

          <button
            type="button"
            className="flex h-11 items-center rounded-xl bg-accent-purple px-5 text-sm font-bold text-white shadow-md hover:bg-accent-purple-hover dark:bg-neutral-800 dark:hover:bg-neutral-700 cursor-pointer transition-all"
            onClick={() => navigate(`/tender-notices/${tender.id.toLowerCase().replace('t-', 'id-')}`)}
          >
            View Details &rarr;
          </button>
        </div>
      </div>
    </article>
  );
}
