import { ArrowUpRight, TrendingUp, TrendingDown, Target, Zap, Sparkles, DollarSign, Users } from 'lucide-react';
import type { AdminFunction } from '../../app/AdminApp';

interface DashboardPageProps {
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
  onOpenFunction?: (id: string) => void;
}

export function DashboardPage({ leadStats, leadsList }: DashboardPageProps) {
  // Format currency into Lakhs (e.g. 450000 -> 4.5L BDT)
  const formatBDT = (val: number) => {
    if (val >= 100000) {
      return `BDT ${(val / 100000).toFixed(2)}L`;
    }
    return `BDT ${val.toLocaleString()}`;
  };

  // Calculate conversion percentage
  const conversionRate = leadStats.totalLeads > 0 
    ? ((leadStats.convertedCount / leadStats.totalLeads) * 100).toFixed(1)
    : '0';

  // Active pipelines: New + Contacted + In Progress
  const activePipelines = leadStats.newCount + leadStats.contactedCount + leadStats.inProgressCount;

  // Group leads by sources for pure CSS source distribution chart
  const sourceMetrics = useMemo(() => {
    const sources = ['Website', 'Referral', 'Direct', 'Facebook'];
    const counts: Record<string, number> = { Website: 0, Referral: 0, Direct: 0, Facebook: 0 };
    let max = 1;

    leadsList.forEach((lead) => {
      const src = lead.source || 'Website';
      if (counts[src] !== undefined) {
        counts[src]++;
      } else {
        counts['Website']++;
      }
    });

    sources.forEach((src) => {
      if (counts[src] > max) max = counts[src];
    });

    return sources.map((src) => ({
      name: src,
      count: counts[src],
      percentage: ((counts[src] / (leadsList.length || 1)) * 100).toFixed(0),
    }));
  }, [leadsList]);

  // Retrieve last 4 leads for recent activity
  const recentLeads = useMemo(() => {
    return [...leadsList].slice(0, 4);
  }, [leadsList]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn pb-12">
      
      {/* Banner */}
      <section className="rounded-2xl border border-subtle bg-primary-bg p-6 md:p-8 dark:border-white/10 dark:bg-white/[0.02] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl dark:bg-indigo-500/5" />
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/50 bg-indigo-50/50 px-3 py-1 text-[10px] font-extrabold text-indigo-650 dark:border-indigo-550/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles className="h-3 w-3" />
            <span>Admin Control Panel Active</span>
          </div>
          <h3 className="mt-4 text-2xl font-bold tracking-tight text-main dark:text-white leading-tight">
            Welcome back, Akm Shahinur Islam
          </h3>
          <p className="mt-2 text-xs md:text-sm leading-relaxed text-secondary dark:text-neutral-400 font-semibold">
            Track user registries, manage lead pipelines, and monitor conversion metrics across the OTMBangla workspace.
          </p>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Leads */}
        <article className="group rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex justify-between items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:bg-indigo-400/10 dark:border-indigo-400/20 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>+18.4%</span>
            </span>
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Total Leads</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{leadStats.totalLeads}</p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted dark:text-neutral-500 font-semibold border-t border-neutral-100 pt-2 dark:border-white/5">
            <span>Pipeline acquisition</span>
            <span className="text-main dark:text-white">{leadStats.newCount} new</span>
          </div>
        </article>

        {/* KPI 2: Total Revenue */}
        <article className="group rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex justify-between items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>+8.2%</span>
            </span>
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Converted Value</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{formatBDT(leadStats.totalValue)}</p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted dark:text-neutral-500 font-semibold border-t border-neutral-100 pt-2 dark:border-white/5">
            <span>Closed contract values</span>
            <span className="text-main dark:text-white">{leadStats.convertedCount} leads</span>
          </div>
        </article>

        {/* KPI 3: Conversion Rate */}
        <article className="group rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex justify-between items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-650 dark:bg-amber-400/10 dark:border-amber-400/20 dark:text-amber-400">
              <Target className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3" />
              <span>-1.2%</span>
            </span>
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Conversion Rate</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{conversionRate}%</p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted dark:text-neutral-500 font-semibold border-t border-neutral-100 pt-2 dark:border-white/5">
            <span>Ratio closed contracts</span>
            <span className="text-main dark:text-white">{leadStats.lostCount} lost</span>
          </div>
        </article>

        {/* KPI 4: Active Pipelines */}
        <article className="group rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex justify-between items-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-650 dark:bg-pink-400/10 dark:border-pink-400/20 dark:text-pink-400">
              <Zap className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3" />
              <span>Active</span>
            </span>
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Active Pipelines</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{activePipelines}</p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted dark:text-neutral-500 font-semibold border-t border-neutral-100 pt-2 dark:border-white/5">
            <span>In negotiations</span>
            <span className="text-main dark:text-white">{leadStats.inProgressCount} in progress</span>
          </div>
        </article>
      </section>

      {/* Main Charts & Telemetry Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Pure CSS Pipeline Column chart */}
        <div className="rounded-2xl border border-subtle bg-primary-bg p-6 shadow-xs dark:border-white/10 dark:bg-white/[0.02] lg:col-span-2">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-extrabold text-main dark:text-white">Pipeline Volumes</h4>
              <p className="text-[10px] font-semibold text-muted dark:text-neutral-500">Distribution of leads per stage</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-main dark:text-white bg-neutral-100 dark:bg-white/[0.05] px-2.5 py-1 rounded-full">
                Live Data
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="flex h-56 items-end justify-between px-2 pt-6 border-b border-subtle dark:border-white/10">
            {/* Stage: New */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="relative w-12 flex flex-col justify-end h-40">
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-850 dark:bg-neutral-800 text-white dark:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {leadStats.newCount} Leads
                </span>
                {/* Visual Bar */}
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-400 group-hover:from-indigo-600 group-hover:to-indigo-500 transition-all duration-500 shadow-md shadow-indigo-500/10"
                  style={{ height: `${(leadStats.newCount / (leadStats.totalLeads || 1)) * 100}%`, minHeight: '8px' }}
                />
              </div>
              <span className="mt-2 text-[10px] font-bold text-secondary dark:text-neutral-400 group-hover:text-main">New</span>
            </div>

            {/* Stage: Contacted */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="relative w-12 flex flex-col justify-end h-40">
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-850 dark:bg-neutral-800 text-white dark:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {leadStats.contactedCount} Leads
                </span>
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500 transition-all duration-500 shadow-md shadow-blue-500/10"
                  style={{ height: `${(leadStats.contactedCount / (leadStats.totalLeads || 1)) * 100}%`, minHeight: '8px' }}
                />
              </div>
              <span className="mt-2 text-[10px] font-bold text-secondary dark:text-neutral-400 group-hover:text-main">Contacted</span>
            </div>

            {/* Stage: In Progress */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="relative w-12 flex flex-col justify-end h-40">
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-850 dark:bg-neutral-800 text-white dark:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {leadStats.inProgressCount} Leads
                </span>
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-amber-600 group-hover:to-amber-500 transition-all duration-500 shadow-md shadow-amber-500/10"
                  style={{ height: `${(leadStats.inProgressCount / (leadStats.totalLeads || 1)) * 100}%`, minHeight: '8px' }}
                />
              </div>
              <span className="mt-2 text-[10px] font-bold text-secondary dark:text-neutral-400 group-hover:text-main">In Progress</span>
            </div>

            {/* Stage: Converted */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="relative w-12 flex flex-col justify-end h-40">
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-850 dark:bg-neutral-800 text-white dark:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {leadStats.convertedCount} Leads
                </span>
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 group-hover:from-emerald-600 group-hover:to-emerald-500 transition-all duration-500 shadow-md shadow-emerald-500/10"
                  style={{ height: `${(leadStats.convertedCount / (leadStats.totalLeads || 1)) * 100}%`, minHeight: '8px' }}
                />
              </div>
              <span className="mt-2 text-[10px] font-bold text-secondary dark:text-neutral-400 group-hover:text-main">Converted</span>
            </div>

            {/* Stage: Lost */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="relative w-12 flex flex-col justify-end h-40">
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-850 dark:bg-neutral-800 text-white dark:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {leadStats.lostCount} Leads
                </span>
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-red-500 to-red-400 group-hover:from-red-600 group-hover:to-red-500 transition-all duration-500 shadow-md shadow-red-500/10"
                  style={{ height: `${(leadStats.lostCount / (leadStats.totalLeads || 1)) * 100}%`, minHeight: '8px' }}
                />
              </div>
              <span className="mt-2 text-[10px] font-bold text-secondary dark:text-neutral-400 group-hover:text-main">Lost</span>
            </div>
          </div>
        </div>

        {/* Lead Acquisition Channels */}
        <div className="rounded-2xl border border-subtle bg-primary-bg p-6 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
          <h4 className="text-sm font-extrabold text-main dark:text-white">Acquisition Channels</h4>
          <p className="text-[10px] font-semibold text-muted dark:text-neutral-500 mb-6">Distribution of lead sources</p>

          <div className="space-y-4">
            {sourceMetrics.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-secondary dark:text-neutral-400">{item.name}</span>
                  <span className="text-main dark:text-white">
                    {item.count} leads ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Lead Pipeline Actions & Details */}
      <section className="rounded-2xl border border-subtle bg-primary-bg p-6 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-main dark:text-white">Recent Activities</h4>
            <p className="text-[10px] font-semibold text-muted dark:text-neutral-500">Most recently modified leads inside CRM</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle dark:border-white/5 text-[10px] font-extrabold text-muted dark:text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-2">Lead details</th>
                <th className="py-3 px-2">Source</th>
                <th className="py-3 px-2">Contract Value</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Latest log</th>
                <th className="py-3 px-2">Date modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle dark:divide-white/5 text-xs font-semibold">
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-hover-surface/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-2">
                    <p className="font-extrabold text-main dark:text-white leading-none mb-0.5">{lead.name}</p>
                    <span className="text-[10px] text-muted dark:text-neutral-500 font-medium">{lead.email}</span>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-md border border-subtle bg-secondary-bg text-[10px] font-bold text-secondary dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-main dark:text-white font-extrabold">
                    {formatBDT(lead.value)}
                  </td>
                  <td className="py-3.5 px-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        lead.status === 'Converted'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-450/15 dark:border-emerald-400/20 dark:text-emerald-400'
                          : lead.status === 'Lost'
                          ? 'bg-red-500/10 border-red-500/20 text-red-655 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                          : lead.status === 'In Progress'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-650 dark:bg-amber-450/15 dark:border-amber-400/20 dark:text-amber-400'
                          : lead.status === 'Contacted'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-650 dark:bg-blue-450/15 dark:border-blue-400/20 dark:text-blue-400'
                          : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-600 dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-300'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-secondary dark:text-neutral-450 font-medium max-w-[200px] truncate" title={lead.lastContact}>
                    {lead.lastContact}
                  </td>
                  <td className="py-3.5 px-2 text-muted dark:text-neutral-500 font-medium">
                    {lead.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

// React import fix helper
import { useMemo } from 'react';
