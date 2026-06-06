import { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Award, Calendar, FileText, MapPin, Building, DollarSign, UserCheck, Loader2, AlertCircle, RefreshCw, X, Users, Globe } from 'lucide-react';

interface Shareholder {
  sNo: string;
  name: string;
  ownership: string;
  country: string;
}

interface ContractDetails {
  agency?: string;
  procuringEntityName?: string;
  procuringEntityCode?: string;
  procuringEntityDistrict?: string;
  contractAwardFor?: string;
  budgetAndSourceOfFunds?: string;
  developmentPartner?: string;
  projectName?: string;
  packageNo?: string;
  packageName?: string;
  dateOfNotificationOfAward?: string;
  proposedContractStart?: string;
  proposedContractCompletion?: string;
  contractValueTaka?: string;
  tendererId?: string;
  businessAddress?: string;
  locationOfDelivery?: string;
  authorisedOfficerName?: string;
  authorisedOfficerDesignation?: string;
  beneficialOwnership?: Shareholder[];
}

interface ContractItem {
  _id: string;
  pkgLotId: string;
  tenderId: string;
  ministry: string;
  refNo: string;
  title: string;
  advertisementDate: string;
  peAndMethod: string;
  district: string;
  signingDate: string;
  awardTo: string;
  valueCrore: string;
  detailLink: string;
  details?: ContractDetails;
}

const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const WEBSCRAP_SERVICE_URL = isProd ? ((env as any).VITE_WEBSCRAP_SERVICE_URL || 'https://otmbangla-webscrap-service.onrender.com') : 'http://localhost:3003';

export function EContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('');
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limitPerPage] = useState(15);
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    totalValueCrore: '0.000',
    uniqueContractorsCount: 0
  });

  // Manual scrape trigger states
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeStartPage, setScrapeStartPage] = useState(1);
  const [scrapeLimitPages, setScrapeLimitPages] = useState(2);
  const [scrapeDeepSync, setScrapeDeepSync] = useState(false);
  const [scrapingInProgress, setScrapingInProgress] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  // Fetch eContracts
  const fetchContracts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (districtFilter) params.append('district', districtFilter);
      if (ministryFilter) params.append('ministry', ministryFilter);
      params.append('page', String(currentPage));
      params.append('limit', String(limitPerPage));

      const response = await fetch(`${WEBSCRAP_SERVICE_URL}/api/econtracts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load contract records from webscrap-service.');
      }
      const data = await response.json();
      setContracts(data.data || []);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setMetrics(data.stats);
      }
    } catch (err: any) {
      console.error('[EContractsPage] Fetch error:', err);
      setError(err.message || 'Could not connect to webscrap-service on port 3003.');
    } finally {
      setLoading(false);
    }
  };

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, districtFilter, ministryFilter]);

  useEffect(() => {
    fetchContracts();
  }, [currentPage, searchQuery, districtFilter, ministryFilter]);

  // Trigger scraper
  const handleTriggerScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapingInProgress(true);
    setScrapeResult(null);
    try {
      const response = await fetch(`${WEBSCRAP_SERVICE_URL}/api/scrape/econtracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startPage: scrapeStartPage,
          limitPages: scrapeLimitPages,
          deepSync: scrapeDeepSync
        })
      });
      if (!response.ok) {
        throw new Error('Scraping request failed.');
      }
      const data = await response.json();
      setScrapeResult(data.data);
      fetchContracts(); // refresh listings
    } catch (err: any) {
      alert(err.message || 'Failed to trigger scraper.');
    } finally {
      setScrapingInProgress(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn pb-12">
      
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-main dark:text-white leading-tight">eContracts Control Center</h3>
          <p className="text-[10px] font-bold text-muted dark:text-neutral-500">
            Monitor Notice of Award (NOA) contract releases, view beneficial ownership details, and trigger scrapers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setScrapeResult(null);
            setShowScrapeModal(true);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Trigger Scraper</span>
        </button>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-650 dark:bg-violet-400/10 dark:border-violet-400/20 dark:text-violet-400">
            <Award className="h-5 w-5" />
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Contracts Synced</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{metrics.totalCount}</p>
        </article>

        <article className="rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Total Value (Crore)</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">৳{metrics.totalValueCrore} Cr</p>
        </article>

        <article className="rounded-2xl border border-subtle bg-primary-bg p-5 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-650 dark:bg-amber-400/10 dark:border-amber-400/20 dark:text-amber-400">
            <Building className="h-5 w-5" />
          </div>
          <h5 className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Contractors</h5>
          <p className="mt-1 text-2xl font-black text-main dark:text-white leading-none">{metrics.uniqueContractorsCount}</p>
        </article>
      </section>

      {/* Search and Quick Filters */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-1">
          <input
            type="text"
            placeholder="Search by ID, Ref, Title or Contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-subtle bg-primary-bg pl-10 pr-4 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted dark:text-neutral-500" strokeWidth={2.4} />
        </div>

        <div>
          <input
            type="text"
            placeholder="Filter by district/location..."
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="h-11 w-full rounded-xl border border-subtle bg-primary-bg px-4 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold transition-all"
          />
        </div>

        <div>
          <input
            type="text"
            placeholder="Filter by ministry/division..."
            value={ministryFilter}
            onChange={(e) => setMinistryFilter(e.target.value)}
            className="h-11 w-full rounded-xl border border-subtle bg-primary-bg px-4 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold transition-all"
          />
        </div>
      </section>

      {/* Loading / Error Callouts */}
      {loading ? (
        <div className="flex flex-col h-64 items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
          <p className="text-xs font-bold text-secondary dark:text-neutral-455">Loading eContracts database...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200/50 bg-red-50/50 p-6 dark:border-red-950/20 dark:bg-red-950/20 text-center space-y-3">
          <div className="flex justify-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Connection Failed</h4>
          <p className="text-xs text-secondary dark:text-neutral-400 max-w-md mx-auto font-medium leading-relaxed">
            {error}
          </p>
          <button
            type="button"
            onClick={fetchContracts}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-655 hover:bg-red-50 dark:border-red-900/30 dark:bg-neutral-850 dark:text-red-400 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        /* Contracts Table */
        <section className="rounded-2xl border border-subtle bg-primary-bg shadow-xs dark:border-white/10 dark:bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle dark:border-white/5 text-[10px] font-extrabold text-muted dark:text-neutral-500 uppercase tracking-wider bg-secondary-bg/50 dark:bg-white/[0.005]">
                  <th className="py-3.5 px-4">Tender ID & Ref</th>
                  <th className="py-3.5 px-4">Project / Package Title</th>
                  <th className="py-3.5 px-4">Ministry & District</th>
                  <th className="py-3.5 px-4">Contract Award To</th>
                  <th className="py-3.5 px-4">Signing Date</th>
                  <th className="py-3.5 px-4">Value (Cr)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle dark:divide-white/5 text-xs font-semibold">
                {contracts.length > 0 ? (
                  contracts.map((item) => (
                    <tr key={item._id} className="hover:bg-hover-surface/40 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{item.tenderId}</span>
                        <p className="text-[10px] text-muted dark:text-neutral-500 font-medium max-w-[150px] truncate" title={item.refNo}>
                          {item.refNo}
                        </p>
                      </td>
                      <td className="py-4 px-4 max-w-[280px] truncate" title={item.title}>
                        <p className="font-extrabold text-main dark:text-white leading-tight mb-0.5">{item.title}</p>
                        <p className="text-[10px] text-muted dark:text-neutral-500 font-medium leading-none">Adv: {item.advertisementDate}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-main dark:text-white truncate max-w-[160px]">{item.ministry}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted dark:text-neutral-500 font-medium leading-none">
                          <MapPin className="h-3 w-3" /> {item.district}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-main dark:text-white font-extrabold">
                        {item.awardTo}
                      </td>
                      <td className="py-4 px-4 text-secondary dark:text-neutral-450 font-medium">
                        {item.signingDate}
                      </td>
                      <td className="py-4 px-4 text-emerald-600 dark:text-emerald-400 font-extrabold">
                        ৳{item.valueCrore} Cr
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedContract(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-primary-bg text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer shadow-xs transition-all ml-auto"
                          title="View Award & Beneficial Ownership Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-muted dark:text-neutral-500 font-bold">
                      No eContracts found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-subtle px-4 py-3.5 dark:border-white/5 bg-secondary-bg/20 dark:bg-white/[0.002]">
              <div className="text-[11px] font-bold text-muted dark:text-neutral-500">
                Showing <span className="text-main dark:text-white">{Math.min((currentPage - 1) * limitPerPage + 1, metrics.totalCount)}</span> to{' '}
                <span className="text-main dark:text-white">{Math.min(currentPage * limitPerPage, metrics.totalCount)}</span> of{' '}
                <span className="text-main dark:text-white">{metrics.totalCount}</span> entries
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 px-3 items-center justify-center rounded-lg border border-subtle bg-primary-bg text-xs font-bold text-secondary hover:bg-hover-surface disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (currentPage > 3 && totalPages > 5) {
                    if (currentPage + 2 <= totalPages) {
                      pageNum = currentPage - 3 + i + 1;
                    } else {
                      pageNum = totalPages - 5 + i + 1;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                          : 'border border-subtle bg-primary-bg text-secondary hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 px-3 items-center justify-center rounded-lg border border-subtle bg-primary-bg text-xs font-bold text-secondary hover:bg-hover-surface disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Contract Award Details Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-250 bg-primary-bg p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900/90 dark:backdrop-blur-md animate-scaleUp flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-subtle pb-4 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-main dark:text-white leading-none mb-1">Contract Award Details</h4>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-neutral-100 text-secondary dark:bg-white/[0.04] dark:text-neutral-355">
                    Tender ID: {selectedContract.tenderId} &bull; Lot ID: {selectedContract.pkgLotId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-450 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-6">
              
              {/* Main Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-subtle bg-secondary-bg/50 p-4 dark:border-white/5 dark:bg-white/[0.005]">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted dark:text-neutral-500 font-extrabold uppercase">Ministry / Agency</p>
                  <p className="text-xs text-main dark:text-white font-extrabold leading-tight">
                    {selectedContract.details?.agency || selectedContract.ministry}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted dark:text-neutral-500 font-extrabold uppercase">Procuring Entity</p>
                  <p className="text-xs text-main dark:text-white font-extrabold leading-tight">
                    {selectedContract.details?.procuringEntityName || selectedContract.peAndMethod}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted dark:text-neutral-500 font-extrabold uppercase">Contract Value (BDT)</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold leading-tight">
                    ৳{selectedContract.details?.contractValueTaka ? parseFloat(selectedContract.details.contractValueTaka).toLocaleString('en-IN') : `${selectedContract.valueCrore} Crore`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted dark:text-neutral-500 font-extrabold uppercase">Contract Award to</p>
                  <p className="text-xs text-indigo-650 dark:text-indigo-400 font-extrabold leading-tight">
                    {selectedContract.awardTo} (ID: {selectedContract.details?.tendererId || 'N/A'})
                  </p>
                </div>
              </div>

              {/* Specific Details */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Particular Information</h5>
                <div className="space-y-2.5 text-xs text-secondary dark:text-neutral-400 font-semibold">
                  <div className="flex justify-between border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Procurement Method</span>
                    <span className="text-main dark:text-white font-extrabold">{selectedContract.details?.contractAwardFor || 'Works'} via {selectedContract.peAndMethod.split(' ').pop()}</span>
                  </div>
                  <div className="flex justify-between border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Source of Funds</span>
                    <span className="text-main dark:text-white font-extrabold">{selectedContract.details?.budgetAndSourceOfFunds || 'Revenue/Government'}</span>
                  </div>
                  {selectedContract.details?.projectName && (
                    <div className="flex flex-col border-b border-subtle/40 pb-1.5 dark:border-white/5">
                      <span>Project Name</span>
                      <span className="text-main dark:text-white font-extrabold mt-0.5">{selectedContract.details.projectName}</span>
                    </div>
                  )}
                  <div className="flex flex-col border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Package Name</span>
                    <span className="text-main dark:text-white font-extrabold mt-0.5">{selectedContract.details?.packageName || selectedContract.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Business Address</span>
                    <span className="text-main dark:text-white text-right font-extrabold whitespace-pre-line max-w-[320px]">
                      {selectedContract.details?.businessAddress || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Delivery Location</span>
                    <span className="text-main dark:text-white font-extrabold">{selectedContract.details?.locationOfDelivery || selectedContract.district}</span>
                  </div>
                  <div className="flex justify-between border-b border-subtle/40 pb-1.5 dark:border-white/5">
                    <span>Authorized Officer</span>
                    <span className="text-main dark:text-white font-extrabold">
                      {selectedContract.details?.authorisedOfficerName} ({selectedContract.details?.authorisedOfficerDesignation})
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Milestone Dates</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-xl border border-subtle bg-secondary-bg/50 p-2 dark:border-white/5 dark:bg-white/[0.005]">
                    <p className="text-[9px] text-muted dark:text-neutral-500 font-extrabold">ADVERTISEMENT</p>
                    <p className="text-[11px] text-main dark:text-white font-bold mt-1">{selectedContract.advertisementDate.split(' ')[0]}</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-secondary-bg/50 p-2 dark:border-white/5 dark:bg-white/[0.005]">
                    <p className="text-[9px] text-muted dark:text-neutral-500 font-extrabold">NOA ISSUED</p>
                    <p className="text-[11px] text-main dark:text-white font-bold mt-1">{selectedContract.details?.dateOfNotificationOfAward || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-secondary-bg/50 p-2 dark:border-white/5 dark:bg-white/[0.005]">
                    <p className="text-[9px] text-muted dark:text-neutral-500 font-extrabold">SIGNING DATE</p>
                    <p className="text-[11px] text-main dark:text-white font-bold mt-1">{selectedContract.signingDate}</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-secondary-bg/50 p-2 dark:border-white/5 dark:bg-white/[0.005]">
                    <p className="text-[9px] text-muted dark:text-neutral-500 font-extrabold">COMPLETION</p>
                    <p className="text-[11px] text-main dark:text-white font-bold mt-1">{selectedContract.details?.proposedContractCompletion || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Beneficial Ownership (Shareholders) */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Beneficial Ownership Information</h5>
                {selectedContract.details?.beneficialOwnership && selectedContract.details.beneficialOwnership.length > 0 ? (
                  <div className="rounded-xl border border-subtle bg-primary-bg dark:border-white/5 dark:bg-white/[0.01] overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-subtle dark:border-white/5 text-[9px] font-bold text-muted dark:text-neutral-500 uppercase bg-secondary-bg/40 dark:bg-white/[0.003]">
                          <th className="py-2.5 px-3 w-12 text-center">S. No.</th>
                          <th className="py-2.5 px-3">Shareholder Name</th>
                          <th className="py-2.5 px-3 text-right">Ownership (%)</th>
                          <th className="py-2.5 px-3 text-right">Country</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle/50 dark:divide-white/5 font-semibold">
                        {selectedContract.details.beneficialOwnership.map((sh, idx) => (
                          <tr key={idx} className="hover:bg-hover-surface/20 dark:hover:bg-white/[0.002]">
                            <td className="py-2.5 px-3 text-center text-muted dark:text-neutral-500">{sh.sNo}</td>
                            <td className="py-2.5 px-3 text-main dark:text-white flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                              <span>{sh.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">{sh.ownership}%</td>
                            <td className="py-2.5 px-3 text-right text-secondary dark:text-neutral-400 font-medium flex justify-end gap-1 items-center">
                              <Globe className="h-3.5 w-3.5 text-neutral-400" />
                              <span>{sh.country || 'Bangladesh'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-subtle bg-secondary-bg/20 p-4 text-center text-xs text-muted dark:border-white/5 dark:bg-white/[0.005]">
                    No beneficial ownership details found for this Operator.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-subtle pt-4 mt-2 dark:border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="rounded-xl border border-neutral-200 bg-primary-bg px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-850 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Manual Scrape Dialog Modal */}
      {showScrapeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <form onSubmit={handleTriggerScrape} className="w-full max-w-md rounded-2xl border border-neutral-250 bg-primary-bg p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900/90 dark:backdrop-blur-md animate-scaleUp flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-subtle pb-4 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-extrabold text-main dark:text-white">Trigger eContracts Scraper</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowScrapeModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-450 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer transition-all"
                disabled={scrapingInProgress}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 space-y-4 text-xs font-semibold text-secondary dark:text-neutral-400">
              
              {scrapingInProgress ? (
                <div className="flex flex-col py-8 items-center justify-center text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <p className="font-extrabold text-main dark:text-white">Scraping in progress...</p>
                  <p className="text-[10px] text-muted dark:text-neutral-500 leading-normal max-w-[280px]">
                    Connecting to eprocure.gov.bd and syncing contracts. Please hold on, this can take a moment.
                  </p>
                </div>
              ) : scrapeResult ? (
                /* Success report */
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 dark:border-emerald-950/20 dark:bg-emerald-950/20 text-center space-y-2 animate-fadeIn">
                  <div className="flex justify-center text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-10 w-10" />
                  </div>
                  <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">Scrape Completed!</h4>
                  <p className="text-[11px] font-bold text-main dark:text-white">
                    Successfully synced {scrapeResult.count} contracts to MongoDB and your F:\ drive backup!
                  </p>
                </div>
              ) : (
                /* Input Form */
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Start Page</label>
                    <input
                      type="number"
                      min={1}
                      value={scrapeStartPage}
                      onChange={(e) => setScrapeStartPage(parseInt(e.target.value, 10) || 1)}
                      className="h-10 w-full rounded-xl border border-subtle bg-primary-bg px-3 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Number of Pages (100 items per page)</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={scrapeLimitPages}
                      onChange={(e) => setScrapeLimitPages(parseInt(e.target.value, 10) || 1)}
                      className="h-10 w-full rounded-xl border border-subtle bg-primary-bg px-3 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-xl border border-subtle dark:border-white/5 bg-secondary-bg/30">
                    <input
                      type="checkbox"
                      id="deepSync"
                      checked={scrapeDeepSync}
                      onChange={(e) => setScrapeDeepSync(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-subtle rounded-md focus:ring-indigo-500 dark:bg-white/[0.05] dark:border-white/10"
                    />
                    <label htmlFor="deepSync" className="flex-1 cursor-pointer">
                      <p className="text-xs font-bold text-main dark:text-white">Enable Deep Sync (Force Scrape Details)</p>
                      <p className="text-[10px] text-muted dark:text-neutral-500 font-medium">Re-fetches and overwrites full details for already existing contracts.</p>
                    </label>
                  </div>
                </>
              )}

            </div>

            {/* Footer */}
            <div className="border-t border-subtle pt-4 mt-2 dark:border-white/5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowScrapeModal(false)}
                className="rounded-xl border border-neutral-200 bg-primary-bg px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-850 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                disabled={scrapingInProgress}
              >
                {scrapeResult ? 'Close' : 'Cancel'}
              </button>

              {!scrapeResult && !scrapingInProgress && (
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4 animate-spin-hover" />
                  <span>Start Scraper</span>
                </button>
              )}
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
