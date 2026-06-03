import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TenderNotice } from './types';
import { getApiUrl } from '../../shared/config';
import { TENDER_NOTICES_DATA } from './constants';

const formatTenderDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
};

const getTimelineStats = (pubDate: string, closeDate: string): {
  percent: number;
  daysLeft: number;
  level: 'new' | 'mid' | 'urgent' | 'critical';
} => {
  const start = new Date(pubDate).getTime();
  const end = new Date(closeDate).getTime();
  const now = new Date('2026-05-26').getTime(); // Using mock current local time 2026-05-26

  const totalDuration = end - start;
  const elapsed = now - start;

  if (totalDuration <= 0) return { percent: 100, daysLeft: 0, level: 'critical' };

  let percent = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  let level: 'new' | 'mid' | 'urgent' | 'critical' = 'new';
  if (daysLeft <= 2) level = 'critical';
  else if (daysLeft <= 5) level = 'urgent';
  else if (percent > 60) level = 'mid';

  return { percent, daysLeft, level };
};

export function TenderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<TenderNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let active = true;
    async function fetchTenderDetails() {
      try {
        setLoading(true);
        // Normalize dynamic URL parameters (id-1284819 to T-1284819)
        const normalizedId = id!.toUpperCase().replace(/^ID-/, 'T-');
        
        const url = `${getApiUrl(3003)}/api/tenders/${normalizedId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Not found in database');
        
        const data = await res.json();
        if (active) {
          setTender(data);
          setError('');
        }
      } catch (err) {
        console.warn('Scraper API failed to fetch details, falling back to static database matching:', err);
        // Fallback: lookup locally inside static dataset
        const normalizedId = id!.toUpperCase().replace(/^ID-/, 'T-');
        const fallbackMatch = TENDER_NOTICES_DATA.find(t => 
          t.id.toUpperCase() === normalizedId || 
          t.id.toUpperCase().replace('T-', '') === normalizedId.replace('T-', '')
        );

        if (active) {
          if (fallbackMatch) {
            setTender(fallbackMatch);
            setError('');
          } else {
            setError('The requested tender notice could not be found.');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchTenderDetails();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-subtle bg-white py-24 text-center dark:border-white/10 dark:bg-white/[0.01] animate-fadeIn">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-purple border-t-transparent"></div>
        <p className="mt-4 text-xs text-muted dark:text-neutral-500">Querying notice specifications...</p>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20 space-y-6 animate-fadeIn">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-main dark:text-white">Notice Not Found</h3>
          <p className="mt-2 text-xs text-secondary dark:text-neutral-400">
            {error || 'The requested tender notice specifications could not be loaded.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/tender-notices')}
          className="rounded-lg bg-accent-purple px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-accent-purple-hover cursor-pointer transition-all"
        >
          Return to Portal
        </button>
      </div>
    );
  }

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
    <div className="mx-auto max-w-4xl space-y-6 animate-fadeIn pb-12">
      {/* Back button and page title bar */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => navigate('/tender-notices')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-white text-muted hover:bg-hover-surface hover:text-main transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] dark:hover:text-white cursor-pointer shadow-sm"
          title="Back to Tender Portal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <span className="font-mono text-xs font-bold tracking-wider text-muted uppercase dark:text-neutral-500">
            Tender Specification View
          </span>
          <h2 className="text-xl font-extrabold text-main dark:text-white mt-1">
            {tender.id.replace('T-', 'ID-')}
          </h2>
        </div>
      </div>

      {/* Main Details Panel */}
      <section className="rounded-2xl border border-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        
        {/* Top Badges and Title */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-subtle bg-accent-purple/10 px-3.5 py-1.5 text-xs font-bold text-accent-purple dark:border-accent-purple/30 dark:bg-accent-purple/20">
              {tender.category}
            </span>
            <span className="rounded-full border border-subtle bg-tertiary-surface px-3.5 py-1.5 text-xs font-bold text-secondary dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              Method: {tender.method}
            </span>
          </div>

          <h1 className="text-lg md:text-xl font-extrabold text-main dark:text-white leading-snug">
            {tender.title}
          </h1>
        </div>

        {/* 2x3 Grid Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-subtle dark:border-white/10">
          <div className="rounded-xl border border-subtle bg-secondary-bg p-4 dark:border-white/5 dark:bg-white/[0.01]">
            <span className="text-xs text-muted uppercase tracking-wider font-bold block">Estimated Budget</span>
            <span className="text-base font-extrabold text-main dark:text-white mt-2 block">{tender.budget}</span>
          </div>

          <div className="rounded-xl border border-subtle bg-secondary-bg p-4 dark:border-white/5 dark:bg-white/[0.01]">
            <span className="text-xs text-muted uppercase tracking-wider font-bold block">Security Deposit</span>
            <span className="text-base font-extrabold text-main dark:text-white mt-2 block">{tender.securityAmount}</span>
          </div>

          <div className="rounded-xl border border-subtle bg-secondary-bg p-4 dark:border-white/5 dark:bg-white/[0.01]">
            <span className="text-xs text-muted uppercase tracking-wider font-bold block">District Area</span>
            <span className="text-base font-extrabold text-main dark:text-white mt-2 block">{tender.district} District</span>
          </div>
        </div>

        {/* Client Organization info box */}
        <div className="mt-4 rounded-xl border border-subtle bg-secondary-bg p-4 flex gap-3.5 dark:border-white/5 dark:bg-white/[0.01]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple dark:bg-accent-purple/20 shadow-xs">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <span className="text-xs text-muted uppercase tracking-wider font-bold block">Procuring Entity / Client Organization</span>
            <span className="text-sm font-bold text-main dark:text-white mt-1.5 block leading-normal">{tender.organization}</span>
          </div>
        </div>

        {/* Detailed Timeline Slider */}
        <div className="mt-8 pt-6 border-t border-subtle dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-secondary dark:text-neutral-300">Timeline Progress Stats</span>
            <span className="font-extrabold text-accent-purple">{percent}% elapsed</span>
          </div>

          <div className="relative h-3 w-full rounded-full bg-tertiary-surface dark:bg-white/[0.04] overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColors}`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <span className="text-muted block text-xs uppercase font-bold">Publish Date</span>
              <span className="font-bold text-secondary dark:text-neutral-300 mt-1.5 block">{formatTenderDate(tender.publishedDate)}</span>
            </div>

            <div className="flex items-center md:justify-center py-2 md:py-0">
              <div className={`flex items-center gap-1.5 border rounded-full px-4 py-2 text-xs font-bold ${badgeColors} shadow-xs`}>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {daysLeft === 0 ? 'Closing Today!' : daysLeft === 1 ? 'Closing Tomorrow!' : `${daysLeft} days left`}
                </span>
              </div>
            </div>

            <div className="md:text-right">
              <span className="text-muted block text-xs uppercase font-bold">Closing Deadline</span>
              <span className="font-bold text-secondary dark:text-neutral-300 mt-1.5 block">{formatTenderDate(tender.closingDate)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Work Specifications */}
        <div className="mt-8 pt-6 border-t border-subtle dark:border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-main dark:text-white uppercase tracking-wider">
            Notice Work Specifications / Description
          </h3>
          <p className="text-sm text-secondary dark:text-neutral-300 leading-relaxed bg-secondary-bg p-5 rounded-2xl border border-subtle dark:border-white/5 dark:bg-white/[0.01]">
            {tender.description}
          </p>
        </div>
      </section>
    </div>
  );
}
