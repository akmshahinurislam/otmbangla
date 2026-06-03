import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TreeNode, TenderNotice } from './types';
import { getApiUrl } from '../../shared/config';
import { CATEGORY_TREE, ORGANIZATION_TREE, DISTRICT_TREE, TENDER_NOTICES_DATA } from './constants';
import { TenderCard } from './components/TenderCard';
import { NotifyMeModal } from './components/NotifyMeModal';

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
export function TenderNoticesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  // Default user email from localStorage
  const getAccountEmail = (): string => {
    try {
      const savedUserStr = localStorage.getItem('userapp-user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        return savedUser.email || '';
      }
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  // Default user phone from localStorage
  const getSignupPhone = (): string => {
    try {
      const savedUserStr = localStorage.getItem('userapp-user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        return savedUser.phone || '';
      }
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  // Notify Me Alert Preference Modal States
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyEmails, setNotifyEmails] = useState<string[]>(() => [getAccountEmail() || '']);
  const [notifyWhatsappNumbers, setNotifyWhatsappNumbers] = useState<string[]>(() => [getSignupPhone() || '']);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyValidationErr, setNotifyValidationErr] = useState('');

  // Preference alerts Categories, Orgs and Locations tree states
  const [notifyCategories, setNotifyCategories] = useState<string[]>([]);
  const [notifyOrganizations, setNotifyOrganizations] = useState<string[]>([]);
  const [notifyLocations, setNotifyLocations] = useState<string[]>([]);

  // Load existing MongoDB subscription configurations on mount
  useEffect(() => {
    const userEmail = getAccountEmail();
    if (!userEmail) return;

    async function loadActiveSubscription() {
      try {
        const response = await fetch(`${getApiUrl(3003)}/api/alerts/subscription/${encodeURIComponent(userEmail)}`);
        if (response.ok) {
          const subscription = await response.json();
          if (subscription) {
            if (subscription.emails && subscription.emails.length > 0) {
              setNotifyEmails(subscription.emails);
            }
            if (subscription.whatsappNumbers && subscription.whatsappNumbers.length > 0) {
              setNotifyWhatsappNumbers(subscription.whatsappNumbers);
            }
            if (subscription.categories) {
              setNotifyCategories(subscription.categories);
            }
            if (subscription.organizations) {
              setNotifyOrganizations(subscription.organizations);
            }
            if (subscription.locations) {
              setNotifyLocations(subscription.locations);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching active subscription preferences:', error);
      }
    }

    loadActiveSubscription();
  }, []);

  const closeNotifyModal = () => {
    setIsNotifyModalOpen(false);
    setNotifySuccess(false);
    setNotifyValidationErr('');
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeEmails = notifyEmails.map(email => email.trim()).filter(Boolean);
    if (activeEmails.length === 0) {
      setNotifyValidationErr('At least one email address is required.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of activeEmails) {
      if (!emailRegex.test(email)) {
        setNotifyValidationErr(`Please enter a valid email address: "${email}"`);
        return;
      }
    }

    const activePhones = notifyWhatsappNumbers.map(phone => phone.trim()).filter(Boolean);
    if (activePhones.length === 0) {
      setNotifyValidationErr('At least one WhatsApp number is required.');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,18}$/;
    for (const phone of activePhones) {
      if (!phoneRegex.test(phone)) {
        setNotifyValidationErr(`Please enter a valid WhatsApp number: "${phone}"`);
        return;
      }
    }

    if (notifyCategories.length === 0 && notifyOrganizations.length === 0 && notifyLocations.length === 0) {
      setNotifyValidationErr('At least one preference filter (Category, Organization, or Location) must be selected.');
      return;
    }

    try {
      setNotifyValidationErr('');
      const response = await fetch(`${getApiUrl(3003)}/api/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: activeEmails,
          whatsappNumbers: activePhones,
          categories: notifyCategories,
          organizations: notifyOrganizations,
          locations: notifyLocations
        })
      });

      if (!response.ok) {
        let errMsg = 'Failed to register alert configurations.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errMsg = errorData.error || errMsg;
          } else {
            const textData = await response.text();
            errMsg = textData.slice(0, 100) || `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (_) {
          errMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errMsg);
      }

      setNotifySuccess(true);
    } catch (error: any) {
      console.error(error);
      setNotifyValidationErr(error.message || 'Server error. Failed to setup Alert Agent.');
    }
  };

  // Dynamic live tenders loaded from webscrap-service
  const [tenders, setTenders] = useState<TenderNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchTenders() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','));
        if (selectedOrganizations.length > 0) params.append('organizations', selectedOrganizations.join(','));
        if (selectedLocations.length > 0) params.append('locations', selectedLocations.join(','));
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        const url = `${getApiUrl(3003)}/api/tenders?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch tenders');
        const data = await res.json();
        if (active) {
          setTenders(data);
        }
      } catch (error) {
        console.error('Error fetching from webscrap-service, falling back to mock data:', error);
        if (active) {
          // Fallback: apply client-side filters to TENDER_NOTICES_DATA so frontend dev is always operational
          let result = TENDER_NOTICES_DATA;
          if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(t => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
          }
          if (selectedCategories.length > 0) {
            result = result.filter(t => selectedCategories.includes(t.categoryId));
          }
          if (selectedOrganizations.length > 0) {
            result = result.filter(t => selectedOrganizations.includes(t.organizationId));
          }
          if (selectedLocations.length > 0) {
            result = result.filter(t => selectedLocations.includes(t.districtId));
          }
          if (dateFrom) {
            if (dateTo) {
              result = result.filter(t => t.publishedDate >= dateFrom && t.publishedDate <= dateTo);
            } else {
              result = result.filter(t => t.publishedDate === dateFrom);
            }
          }
          setTenders(result);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    fetchTenders();
    return () => {
      active = false;
    };
  }, [searchTerm, selectedCategories, selectedOrganizations, selectedLocations, dateFrom, dateTo]);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date('2026-05-01'));

  // Dropdown UI Active States
  const [openDropdown, setOpenDropdown] = useState<'category' | 'organization' | 'location' | 'calendar' | null>(null);

  // Search inputs inside dropdowns
  const [categorySearch, setCategorySearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');

  // Refs for closing dropdowns on click outside
  const categoryRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Calendar logic helpers
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${year}-${monthStr}-${dayStr}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }
    return days;
  }, [calendarMonth]);

  const handleDateClick = (dateStr: string) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(dateStr);
      setDateTo('');
    } else {
      if (dateStr < dateFrom) {
        setDateFrom(dateStr);
      } else {
        setDateTo(dateStr);
      }
    }
  };

  const dateDisplayString = useMemo(() => {
    if (!dateFrom) return '';
    if (!dateTo || dateFrom === dateTo) return dateFrom;
    return `${dateFrom} to ${dateTo}`;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        openDropdown === 'category' &&
        categoryRef.current &&
        !categoryRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'organization' &&
        orgRef.current &&
        !orgRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'location' &&
        locationRef.current &&
        !locationRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'calendar' &&
        calendarRef.current &&
        !calendarRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // 1. Recursive checking logic helper
  const toggleSelection = (id: string, isChecked: boolean, tree: TreeNode[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    // Find node and gather its entire children tree
    const collectAllIds = (node: TreeNode): string[] => {
      let ids = [node.id];
      if (node.children) {
        node.children.forEach(child => {
          ids = [...ids, ...collectAllIds(child)];
        });
      }
      return ids;
    };

    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = findNode(tree);
    if (!targetNode) return;

    const idsToChange = collectAllIds(targetNode);

    setSelected(prev => {
      if (isChecked) {
        // Add all these IDs without duplicate values
        const next = [...prev];
        idsToChange.forEach(i => {
          if (!next.includes(i)) next.push(i);
        });
        return next;
      } else {
        // Remove all these IDs
        return prev.filter(i => !idsToChange.includes(i));
      }
    });
  };

  const filterTreeNodes = (nodes: TreeNode[], searchString: string): TreeNode[] => {
    const term = searchString.toLowerCase().trim();
    if (!term) return nodes;

    return nodes
      .map((node): TreeNode | null => {
        const isMatched = node.text.toLowerCase().includes(term);
        const filteredChildren = node.children ? filterTreeNodes(node.children, searchString) : [];

        if (isMatched || filteredChildren.length > 0) {
          return {
            id: node.id,
            text: node.text,
            children: isMatched ? node.children : filteredChildren,
          };
        }
        return null;
      })
      .filter((n): n is TreeNode => n !== null);
  };

  const filteredCategoryTree = useMemo(() => filterTreeNodes(CATEGORY_TREE, categorySearch), [categorySearch]);
  const filteredOrganizationTree = useMemo(() => filterTreeNodes(ORGANIZATION_TREE, orgSearch), [orgSearch]);
  const filteredLocationTree = useMemo(() => filterTreeNodes(DISTRICT_TREE, locSearch), [locSearch]);

  // 3. Clear/Reset Filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedOrganizations([]);
    setSelectedLocations([]);
    setDateFrom('');
    setDateTo('');
    setCategorySearch('');
    setOrgSearch('');
    setLocSearch('');
    setOpenDropdown(null);
    setSearchParams({});
  };

  // 4. Dynamic Tender Filter Logic
  const filteredTenders = tenders;

  // Helper component to render tree lists recursively
  const RenderTreeList = ({
    nodes,
    selectedIds,
    treeRoot,
    setSelected,
  }: {
    nodes: TreeNode[];
    selectedIds: string[];
    treeRoot: TreeNode[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  }) => {
    return (
      <ul className="pl-3.5 mt-2 space-y-2 border-l border-neutral-100 dark:border-neutral-800">
        {nodes.map(node => {
          const isSelected = selectedIds.includes(node.id);
          const hasChildren = node.children && node.children.length > 0;

          return (
            <li key={node.id} className="text-sm">
              <label className="flex items-center gap-2.5 py-1.5 hover:text-main dark:hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelection(node.id, e.target.checked, treeRoot, setSelected)}
                  className="h-4.5 w-4.5 rounded border-subtle text-accent-purple focus:ring-accent-purple dark:border-white/10 dark:bg-white/[0.03]"
                />
                <span className={hasChildren ? "font-bold text-main dark:text-neutral-200" : "text-secondary dark:text-neutral-400 font-medium"}>
                  {node.text}
                </span>
              </label>
              {hasChildren && node.children && (
                <RenderTreeList
                  nodes={node.children}
                  selectedIds={selectedIds}
                  treeRoot={treeRoot}
                  setSelected={setSelected}
                />
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  // Helper for rendering chip selectors
  const renderChips = (selectedIds: string[], tree: TreeNode[], onRemove: (id: string) => void, typeLabel: string) => {
    if (selectedIds.length === 0) return null;

    const findText = (id: string, nodes: TreeNode[]): string => {
      for (const node of nodes) {
        if (node.id === id) return node.text;
        if (node.children) {
          const t = findText(id, node.children);
          if (t !== id) return t;
        }
      }
      return id;
    };

    return selectedIds.map(id => {
      const text = findText(id, tree);
      // Skip rendering parents if many items are listed, just showing nodes
      return (
        <span
          key={id}
          className="flex items-center gap-1.5 rounded-full border border-subtle bg-white px-2.5 py-0.5 text-[11px] font-medium text-secondary shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400"
        >
          <span className="text-[10px] text-muted uppercase tracking-wider mr-0.5">{typeLabel}:</span>
          <span className="truncate max-w-[120px]">{text}</span>
          <button
            onClick={() => onRemove(id)}
            className="text-muted hover:text-red-500 dark:hover:text-red-400 font-bold ml-1 cursor-pointer transition-colors"
          >
            &times;
          </button>
        </span>
      );
    });
  };

  // Calculate visual progress timeline slider values
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

  // Overview calculations
  const totalNotices = tenders.length;
  const closingSoonCount = tenders.filter(t => {
    const stats = getTimelineStats(t.publishedDate, t.closingDate);
    return stats.daysLeft <= 5;
  }).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fadeIn custom-scrollbar">
      {/* 1. Page Header with Glassmorphic Metrics Card */}
      <section className="rounded-xl border border-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-md">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-md">
            <span className="rounded-full border border-subtle bg-tertiary-surface px-2.5 py-1 text-xs font-semibold text-secondary dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              Procurement Intelligence
            </span>
            <h2 className="mt-3.5 text-2xl font-bold tracking-tight text-main dark:text-white">Tender Notices Portal</h2>
            <p className="mt-2.5 text-sm text-secondary dark:text-neutral-400 leading-relaxed">
              Explore dynamic live procurement notices. Use our multi-tree search system to filter tenders by categories, client organizations, and districts in real time.
            </p>
          </div>

          {/* Alert Me Glassmorphic Trigger Button */}
          <button
            onClick={() => {
              setIsNotifyModalOpen(true);
              setNotifySuccess(false);
              setNotifyValidationErr('');
            }}
            className="group flex shrink-0 whitespace-nowrap min-w-[140px] justify-center self-start md:self-auto items-center gap-3 rounded-xl border border-accent-purple bg-accent-purple/10 px-6 py-3.5 text-sm font-semibold text-accent-purple shadow-sm transition-all duration-300 hover:bg-accent-purple/20 hover:shadow-lg hover:shadow-accent-purple/10 active:scale-95 cursor-pointer dark:border-accent-purple/50 dark:bg-accent-purple/20 dark:text-accent-purple/90 dark:hover:bg-accent-purple/30"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <span className="absolute inline-flex h-3 w-3 rounded-full bg-accent-purple opacity-75 animate-ping"></span>
              {/* Bell Icon with Swing & Hover Shake Animation */}
              <svg
                className="relative h-5 w-5 animate-bell-swing group-hover:animate-bell-shake transition-transform text-accent-purple dark:text-accent-purple/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <span className="tracking-wide whitespace-nowrap">Alert Me</span>
          </button>
        </div>
      </section>

      {/* 2. Advanced Multi-Tree Filter Grid */}
      <section className="rounded-2xl border border-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        <h4 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Advanced BDTender Filters</h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Keyword Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Keyword or Tender ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-subtle bg-secondary-bg pl-11 pr-4 text-sm text-main placeholder-muted shadow-sm outline-none transition-all focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-semibold"
            />
            <svg className="absolute left-4 top-4 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Category Selector */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-subtle bg-secondary-bg px-4 text-left text-sm font-semibold text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            >
              <span className="truncate">
                {selectedCategories.length > 0 ? `Category (${selectedCategories.length})` : 'Category'}
              </span>
              <svg className={`h-4 w-4 text-muted transition-transform duration-200 ${openDropdown === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'category' && (
              <div className="absolute left-0 z-20 mt-2 w-80 rounded-2xl border border-subtle bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-11 w-full rounded-xl border border-subtle bg-secondary-bg pl-10 pr-3.5 text-sm text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-semibold"
                  />
                  <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 pt-1">
                  {filteredCategoryTree.length > 0 ? (
                    <RenderTreeList
                      nodes={filteredCategoryTree}
                      selectedIds={selectedCategories}
                      treeRoot={CATEGORY_TREE}
                      setSelected={setSelectedCategories}
                    />
                  ) : (
                    <p className="text-center text-sm text-muted py-4">No categories found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Organization Selector */}
          <div className="relative" ref={orgRef}>
            <button
              onClick={() => setOpenDropdown(prev => prev === 'organization' ? null : 'organization')}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-subtle bg-secondary-bg px-4 text-left text-sm font-semibold text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            >
              <span className="truncate">
                {selectedOrganizations.length > 0 ? `Organization (${selectedOrganizations.length})` : 'Organization'}
              </span>
              <svg className={`h-4 w-4 text-muted transition-transform duration-200 ${openDropdown === 'organization' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'organization' && (
              <div className="absolute left-0 z-20 mt-2 w-80 rounded-2xl border border-subtle bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search organization..."
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    className="h-11 w-full rounded-xl border border-subtle bg-secondary-bg pl-10 pr-3.5 text-sm text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-semibold"
                  />
                  <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 pt-1">
                  {filteredOrganizationTree.length > 0 ? (
                    <RenderTreeList
                      nodes={filteredOrganizationTree}
                      selectedIds={selectedOrganizations}
                      treeRoot={ORGANIZATION_TREE}
                      setSelected={setSelectedOrganizations}
                    />
                  ) : (
                    <p className="text-center text-sm text-muted py-4">No organizations found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location Selector */}
          <div className="relative" ref={locationRef}>
            <button
              onClick={() => setOpenDropdown(prev => prev === 'location' ? null : 'location')}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-subtle bg-secondary-bg px-4 text-left text-sm font-semibold text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            >
              <span className="truncate">
                {selectedLocations.length > 0 ? `Location (${selectedLocations.length})` : 'Location'}
              </span>
              <svg className={`h-4 w-4 text-muted transition-transform duration-200 ${openDropdown === 'location' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'location' && (
              <div className="absolute right-0 lg:left-0 z-20 mt-2 w-80 rounded-2xl border border-subtle bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                    className="h-11 w-full rounded-xl border border-subtle bg-secondary-bg pl-10 pr-3.5 text-sm text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white font-semibold"
                  />
                  <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 pt-1">
                  {filteredLocationTree.length > 0 ? (
                    <RenderTreeList
                      nodes={filteredLocationTree}
                      selectedIds={selectedLocations}
                      treeRoot={DISTRICT_TREE}
                      setSelected={setSelectedLocations}
                    />
                  ) : (
                    <p className="text-center text-sm text-muted py-4">No locations found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date Picker Input */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setOpenDropdown(prev => prev === 'calendar' ? null : 'calendar')}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-subtle bg-secondary-bg px-4 text-left text-sm font-semibold text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            >
              <span className="truncate">
                {dateDisplayString || 'Date from & to'}
              </span>
              <svg className="h-4 w-4 text-muted shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {openDropdown === 'calendar' && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-subtle bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn select-none">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-hover-surface rounded text-secondary dark:text-neutral-400" type="button">&larr;</button>
                  <span className="text-xs font-bold text-main dark:text-white">
                    {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-hover-surface rounded text-secondary dark:text-neutral-400" type="button">&rarr;</button>
                </div>
                
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-muted mb-1.5">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {calendarDays.map((day, idx) => {
                    if (!day.isCurrentMonth) {
                      return <div key={idx} className="h-7 w-7" />;
                    }
                    
                    const isStart = dateFrom === day.dateStr;
                    const isEnd = dateTo === day.dateStr;
                    const inRange = dateFrom && dateTo && day.dateStr > dateFrom && day.dateStr < dateTo;
                    
                    let dayClass = "h-7 w-7 text-xs flex items-center justify-center rounded-md cursor-pointer transition-all hover:bg-neutral-100 dark:hover:bg-white/10 text-secondary dark:text-neutral-300";
                    if (isStart || isEnd) {
                      dayClass = "h-7 w-7 text-xs flex items-center justify-center rounded-md cursor-pointer font-bold bg-accent-purple text-white shadow-sm dark:bg-accent-purple-hover";
                    } else if (inRange) {
                      dayClass = "h-7 w-7 text-xs flex items-center justify-center rounded-md cursor-pointer bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300";
                    }
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDateClick(day.dateStr)}
                        className={dayClass}
                      >
                        {day.dayNum}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between border-t border-subtle dark:border-white/10 mt-3 pt-2.5">
                  <button
                    onClick={() => {
                      if (dateFrom && !dateTo) {
                        setDateTo(dateFrom);
                      }
                      setOpenDropdown(null);
                    }}
                    type="button"
                    className="text-[10px] font-bold bg-accent-purple text-white px-2.5 py-1 rounded hover:bg-accent-purple-hover transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    type="button"
                    className="text-[10px] font-bold text-muted hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    type="button"
                    className="text-[10px] font-semibold text-secondary hover:text-main dark:text-neutral-400 dark:hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2.5 Active Chip Rows */}
        {(selectedCategories.length > 0 || selectedOrganizations.length > 0 || selectedLocations.length > 0 || searchTerm !== '' || dateFrom !== '' || dateTo !== '') && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-subtle pt-3 dark:border-white/10 animate-fadeIn">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">Active filters:</span>

            {searchTerm !== '' && (
              <span className="flex items-center gap-1.5 rounded-full border border-subtle bg-white px-2.5 py-0.5 text-[11px] font-medium text-secondary shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
                <span className="text-[10px] text-muted uppercase tracking-wider mr-0.5">Search:</span>
                <span>{searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="text-muted hover:text-red-500 font-bold ml-1 cursor-pointer">&times;</button>
              </span>
            )}

            {renderChips(selectedCategories, CATEGORY_TREE, (id) => toggleSelection(id, false, CATEGORY_TREE, setSelectedCategories), 'Category')}
            {renderChips(selectedOrganizations, ORGANIZATION_TREE, (id) => toggleSelection(id, false, ORGANIZATION_TREE, setSelectedOrganizations), 'Org')}
            {renderChips(selectedLocations, DISTRICT_TREE, (id) => toggleSelection(id, false, DISTRICT_TREE, setSelectedLocations), 'Loc')}

            {(dateFrom !== '' || dateTo !== '') && (
              <span className="flex items-center gap-1.5 rounded-full border border-subtle bg-white px-2.5 py-0.5 text-[11px] font-medium text-secondary shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
                <span className="text-[10px] text-muted uppercase tracking-wider mr-0.5">Dates:</span>
                <span>{dateFrom || '*'} to {dateTo || '*'}</span>
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-muted hover:text-red-500 font-bold ml-1 cursor-pointer">&times;</button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-auto cursor-pointer transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {/* 3. Cards Results Display List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Search Results</h4>
          <span className="text-xs font-semibold text-secondary dark:text-neutral-400">
            {filteredTenders.length} {filteredTenders.length === 1 ? 'tender notice' : 'tender notices'} matching
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-subtle bg-white py-14 text-center dark:border-white/10 dark:bg-white/[0.01]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-purple border-t-transparent"></div>
            <p className="mt-3 text-xs text-muted dark:text-neutral-500">Querying e-GP database...</p>
          </div>
        ) : filteredTenders.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredTenders.map(tender => (
              <TenderCard
                key={tender.id}
                tender={tender}
                formatTenderDate={formatTenderDate}
                getTimelineStats={getTimelineStats}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-subtle bg-white py-14 text-center dark:border-white/10 dark:bg-white/[0.01]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-surface dark:bg-white/[0.03] text-muted mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h5 className="text-sm font-semibold text-main dark:text-white">No Tenders Found</h5>
            <p className="mt-1 max-w-sm text-xs text-muted dark:text-neutral-500">
              We couldn't find any tender notices matching your selected criteria. Try adjusting your search query or reset dropdown filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-md bg-accent-purple px-4 py-2 text-xs font-semibold text-white shadow hover:bg-accent-purple-hover cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
      {/* 3. Notify Me Glassmorphic Modal Dialog Overlay */}
      <NotifyMeModal
        isOpen={isNotifyModalOpen}
        onClose={closeNotifyModal}
        emails={notifyEmails}
        setEmails={setNotifyEmails}
        whatsappNumbers={notifyWhatsappNumbers}
        setWhatsappNumbers={setNotifyWhatsappNumbers}
        categories={notifyCategories}
        setCategories={setNotifyCategories}
        organizations={notifyOrganizations}
        setOrganizations={setNotifyOrganizations}
        locations={notifyLocations}
        setLocations={setNotifyLocations}
        success={notifySuccess}
        validationErr={notifyValidationErr}
        onSubmit={handleNotifySubmit}
      />
    </div>
  );
}