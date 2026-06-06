import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, UserPlus, Mail, Smartphone, Calendar, DollarSign, Activity, FileText, ChevronRight, X, Sparkles } from 'lucide-react';

interface LeadsPageProps {
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

export function LeadsPage({ leadStats, leadsList, onCreateLead, onUpdateLeadStatus }: LeadsPageProps) {
  const location = useLocation();

  // Search parameters parsing
  const searchParams = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);

  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState<'All' | 'New' | 'Contacted' | 'In Progress' | 'Converted' | 'Lost'>('All');
  const [showDrawer, setShowDrawer] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website',
    value: '',
    status: 'New',
    lastContact: ''
  });

  const [formError, setFormError] = useState('');

  // Filter leads based on tab and search query
  const filteredLeads = useMemo(() => {
    return leadsList.filter((lead) => {
      const matchSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        (lead.id && lead.id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTab = activeTab === 'All' || lead.status === activeTab;

      return matchSearch && matchTab;
    });
  }, [leadsList, searchQuery, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.value || !formData.lastContact) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const numericValue = parseFloat(formData.value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setFormError('Please enter a valid lead value.');
      return;
    }

    onCreateLead({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      source: formData.source,
      value: numericValue,
      status: formData.status,
      lastContact: formData.lastContact
    });

    // Reset Form
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'Website',
      value: '',
      status: 'New',
      lastContact: ''
    });
    setShowDrawer(false);
  };

  const formatBDT = (val: number) => {
    if (val >= 100000) {
      return `BDT ${(val / 100000).toFixed(2)}L`;
    }
    return `BDT ${val.toLocaleString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn pb-12">
      
      {/* Header telemetry metrics */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-main dark:text-white leading-tight">Acquisition Funnel</h3>
          <p className="text-[10px] font-bold text-muted dark:text-neutral-500">
            Convert leads, update pipeline steps, and log acquisition milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-755 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Lead</span>
        </button>
      </section>

      {/* Tabs list & search input */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Search */}
        <div className="relative md:col-span-1">
          <input
            type="text"
            placeholder="Search leads, sources, or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-subtle bg-primary-bg pl-10 pr-4 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted dark:text-neutral-500" strokeWidth={2.4} />
        </div>

        {/* Tab filters */}
        <div className="flex bg-neutral-100 dark:bg-white/[0.04] p-1 rounded-xl w-fit overflow-x-auto custom-scrollbar md:col-span-2 justify-self-start md:justify-self-end">
          {(['All', 'New', 'Contacted', 'In Progress', 'Converted', 'Lost'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-main shadow-xs dark:bg-neutral-800 dark:text-white'
                  : 'text-secondary hover:text-main dark:text-neutral-450 dark:hover:text-white'
              }`}
            >
              {tab} ({tab === 'All' ? leadStats.totalLeads : 
                       tab === 'New' ? leadStats.newCount :
                       tab === 'Contacted' ? leadStats.contactedCount :
                       tab === 'In Progress' ? leadStats.inProgressCount :
                       tab === 'Converted' ? leadStats.convertedCount : leadStats.lostCount})
            </button>
          ))}
        </div>
      </section>

      {/* Leads Table */}
      <section className="rounded-2xl border border-subtle bg-primary-bg shadow-xs dark:border-white/10 dark:bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle dark:border-white/5 text-[10px] font-extrabold text-muted dark:text-neutral-500 uppercase tracking-wider bg-secondary-bg/50 dark:bg-white/[0.005]">
                <th className="py-3.5 px-4">Lead ID & Name</th>
                <th className="py-3.5 px-4">Acquisition Channel</th>
                <th className="py-3.5 px-4">Contract Value</th>
                <th className="py-3.5 px-4">Date captured</th>
                <th className="py-3.5 px-4">Current Pipeline Stage</th>
                <th className="py-3.5 px-4">Activity details</th>
                <th className="py-3.5 px-4 text-right">Update stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle dark:divide-white/5 text-xs font-semibold">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((item) => (
                  <tr key={item.id} className="hover:bg-hover-surface/40 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-[9px] font-extrabold text-indigo-650 bg-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-400 px-2 py-0.5 rounded mr-2 uppercase tracking-wide">
                        {item.id}
                      </span>
                      <span className="font-extrabold text-main dark:text-white">{item.name}</span>
                      <div className="mt-1 text-[10px] text-muted dark:text-neutral-500 font-medium flex gap-2">
                        <span className="flex items-center gap-0.5"><Mail className="h-3 w-3 shrink-0" />{item.email}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-0.5"><Smartphone className="h-3 w-3 shrink-0" />{item.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md border border-subtle bg-secondary-bg text-[10px] font-bold text-secondary dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300">
                        {item.source}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-main dark:text-white font-extrabold">
                      {formatBDT(item.value)}
                    </td>
                    <td className="py-4 px-4 text-secondary dark:text-neutral-450 font-medium">
                      {item.date}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          item.status === 'Converted'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-450/15 dark:border-emerald-400/20 dark:text-emerald-400'
                            : item.status === 'Lost'
                            ? 'bg-red-500/10 border-red-500/20 text-red-655 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                            : item.status === 'In Progress'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-650 dark:bg-amber-450/15 dark:border-amber-400/20 dark:text-amber-400'
                            : item.status === 'Contacted'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-650 dark:bg-blue-450/15 dark:border-blue-400/20 dark:text-blue-400'
                            : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-600 dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-secondary dark:text-neutral-450 font-medium max-w-[180px] truncate" title={item.lastContact}>
                      {item.lastContact}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateLeadStatus(item.id, e.target.value)}
                        className="bg-primary-bg text-main border border-subtle rounded-lg px-2 py-1 text-[11px] font-bold shadow-xs outline-none focus:border-indigo-600 dark:bg-neutral-900 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Converted">Converted</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-muted dark:text-neutral-500">
                    No lead accounts match current search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Register Lead Side-drawer/overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          {/* Drawer backdrop click handler */}
          <div className="absolute inset-0" onClick={() => setShowDrawer(false)} />

          <div className="relative w-full max-w-md h-full bg-primary-bg border-l border-subtle dark:border-white/10 dark:bg-neutral-900 shadow-2xl p-6 overflow-y-auto custom-scrollbar animate-fadeIn flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-subtle pb-4 mb-6 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-650 dark:bg-indigo-400/10 dark:text-indigo-400">
                    <UserPlus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-main dark:text-white">Acquisition Lead Form</h4>
                    <p className="text-[10px] font-semibold text-muted dark:text-neutral-500">Capture new pipeline interest</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-450 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer transition-all"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-red-200/50 bg-red-50/50 p-4 text-[11px] font-bold text-red-655 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0 bg-red-600 text-white rounded-full p-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Client Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Client/Lead Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Bashundhara Logistics"
                    className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main placeholder-neutral-400 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/10 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-semibold"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Email address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. contact@domain.com"
                      className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main placeholder-neutral-400 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/10 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Phone number *</label>
                    <input
                      type="text"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 017xxxxxxxx"
                      className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main placeholder-neutral-400 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/10 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-semibold"
                    />
                  </div>
                </div>

                {/* Source & Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Lead Channel Source</label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main outline-none focus:border-indigo-650 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-bold"
                    >
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Direct">Direct</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Estimated Value (BDT) *</label>
                    <input
                      type="number"
                      name="value"
                      required
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder="e.g. 500000"
                      className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main placeholder-neutral-400 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/10 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-semibold"
                    />
                  </div>
                </div>

                {/* Initial Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Pipeline Stage</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="block h-10 w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] px-3 text-xs text-main outline-none focus:border-indigo-650 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-bold"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                {/* Last activity / contact notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted dark:text-neutral-400 uppercase tracking-wide">Latest activity log *</label>
                  <textarea
                    name="lastContact"
                    required
                    rows={3}
                    value={formData.lastContact}
                    onChange={handleInputChange}
                    placeholder="e.g. Discussed asphalt pricing specifications over phone."
                    className="block w-full rounded-lg border border-neutral-300 bg-primary-bg dark:bg-[#181f2f] p-3 text-xs text-main placeholder-neutral-400 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/10 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 font-semibold"
                  />
                </div>

              </form>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-subtle pt-4 mt-6 dark:border-white/5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="w-1/2 rounded-xl border border-neutral-200 bg-primary-bg py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleFormSubmit}
                className="w-1/2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Save Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
