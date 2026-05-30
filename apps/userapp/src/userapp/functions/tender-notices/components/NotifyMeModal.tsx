import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TreeNode } from '../types';
import { CATEGORY_TREE, ORGANIZATION_TREE, DISTRICT_TREE } from '../constants';

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: string[];
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
  whatsappNumbers: string[];
  setWhatsappNumbers: React.Dispatch<React.SetStateAction<string[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  organizations: string[];
  setOrganizations: React.Dispatch<React.SetStateAction<string[]>>;
  locations: string[];
  setLocations: React.Dispatch<React.SetStateAction<string[]>>;
  success: boolean;
  validationErr: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function NotifyMeModal({
  isOpen,
  onClose,
  emails,
  setEmails,
  whatsappNumbers,
  setWhatsappNumbers,
  categories,
  setCategories,
  organizations,
  setOrganizations,
  locations,
  setLocations,
  success,
  validationErr,
  onSubmit,
}: NotifyMeModalProps) {
  const [openDropdown, setOpenDropdown] = useState<'category' | 'organization' | 'location' | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');

  const categoryRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on mousedown outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (openDropdown === 'category' && categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (openDropdown === 'organization' && orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (openDropdown === 'location' && locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openDropdown]);

  // Recursively toggle tree collection
  const toggleSelection = (
    id: string,
    checked: boolean,
    treeRoot: TreeNode[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const getChildIds = (nodeId: string, nodes: TreeNode[]): string[] => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          const ids = [node.id];
          const collect = (n: TreeNode) => {
            if (n.children) {
              for (const c of n.children) {
                ids.push(c.id);
                collect(c);
              }
            }
          };
          collect(node);
          return ids;
        }
        if (node.children) {
          const res = getChildIds(nodeId, node.children);
          if (res.length > 0) return res;
        }
      }
      return [];
    };

    const idsToToggle = getChildIds(id, treeRoot);
    if (checked) {
      setSelected((prev) => Array.from(new Set([...prev, ...idsToToggle])));
    } else {
      setSelected((prev) => prev.filter((x) => !idsToToggle.includes(x)));
    }
  };

  // Helper component to render nested tree lists recursively
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
      <ul className="pl-3 mt-1.5 space-y-1.5 border-l border-neutral-100 dark:border-neutral-800">
        {nodes.map((node) => {
          const isSelected = selectedIds.includes(node.id);
          const hasChildren = node.children && node.children.length > 0;

          return (
            <li key={node.id} className="text-xs">
              <label className="flex items-center gap-2 py-0.5 hover:text-accent-purple cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelection(node.id, e.target.checked, treeRoot, setSelected)}
                  className="h-3.5 w-3.5 rounded border-subtle text-accent-purple focus:ring-accent-purple dark:border-white/10 dark:bg-white/[0.03]"
                />
                <span className={hasChildren ? 'font-semibold text-main dark:text-neutral-200' : 'text-secondary dark:text-neutral-400'}>
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

  // Search Filter Tree logics
  const filteredCategoryTree = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return CATEGORY_TREE;
    
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node): TreeNode | null => {
          const isMatched = node.text.toLowerCase().includes(term);
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          
          if (isMatched || filteredChildren.length > 0) {
            return {
              id: node.id,
              text: node.text,
              children: isMatched ? node.children : filteredChildren
            };
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(CATEGORY_TREE);
  }, [categorySearch]);

  const filteredOrganizationTree = useMemo(() => {
    const term = orgSearch.trim().toLowerCase();
    if (!term) return ORGANIZATION_TREE;
    
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node): TreeNode | null => {
          const isMatched = node.text.toLowerCase().includes(term);
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          
          if (isMatched || filteredChildren.length > 0) {
            return {
              id: node.id,
              text: node.text,
              children: isMatched ? node.children : filteredChildren
            };
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(ORGANIZATION_TREE);
  }, [orgSearch]);

  const filteredLocationTree = useMemo(() => {
    const term = locSearch.trim().toLowerCase();
    if (!term) return DISTRICT_TREE;
    
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node): TreeNode | null => {
          const isMatched = node.text.toLowerCase().includes(term);
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          
          if (isMatched || filteredChildren.length > 0) {
            return {
              id: node.id,
              text: node.text,
              children: isMatched ? node.children : filteredChildren
            };
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(DISTRICT_TREE);
  }, [locSearch]);

  // Helper for rendering chip selectors
  const renderChips = (selectedIds: string[], tree: TreeNode[], onRemove: (id: string) => void) => {
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

    return (
      <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto custom-scrollbar">
        {selectedIds.map(id => {
          const text = findText(id, tree);
          return (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full border border-subtle bg-white px-2 py-0.5 text-[10px] font-medium text-secondary shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400"
            >
              <span className="truncate max-w-[100px]">{text}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-muted hover:text-red-500 dark:hover:text-red-400 font-bold ml-0.5 cursor-pointer transition-colors"
              >
                &times;
              </button>
            </span>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-subtle bg-white p-6 shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 animate-modal-content custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Header / Close button */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple animate-pulse">
              <svg className="h-5 w-5 animate-bell-swing text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-main dark:text-white">Tender Alerts Setup</h3>
              <p className="text-[11px] text-secondary dark:text-neutral-400">Configure real-time matching notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-hover-surface hover:text-main dark:hover:bg-white/[0.05] dark:hover:text-white cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state vs Form */}
        {success ? (
          <div className="mt-6 text-center space-y-4 animate-fadeIn relative z-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-main dark:text-white">Alerts Active!</h4>
              <p className="mt-1 text-xs text-secondary dark:text-neutral-400">
                You will be notified immediately when matching notices are crawled.
              </p>
            </div>

            <div className="rounded-xl border border-subtle bg-secondary-bg p-4 text-left text-xs space-y-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex flex-col gap-1">
                <span className="text-muted font-semibold text-[10px] uppercase tracking-wider">Alert Emails:</span>
                <div className="flex flex-col pl-2 border-l border-accent-purple/20 space-y-0.5">
                  {emails.map((e, idx) => e.trim() && (
                    <span key={idx} className="font-medium text-main dark:text-white truncate max-w-[280px]" title={e}>{e}</span>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-muted font-semibold text-[10px] uppercase tracking-wider">WhatsApp Numbers:</span>
                <div className="flex flex-col pl-2 border-l border-accent-purple/20 space-y-0.5">
                  {whatsappNumbers.map((w, idx) => w.trim() && (
                    <span key={idx} className="font-medium text-main dark:text-white truncate max-w-[280px]" title={w}>{w}</span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-t border-subtle pt-2 dark:border-white/10">
                <span className="text-muted font-medium">Categories:</span>
                <span className="font-semibold text-main dark:text-white truncate max-w-[180px]">
                  {categories.length > 0 ? `${categories.length} Selected` : 'All Categories'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Organizations:</span>
                <span className="font-semibold text-main dark:text-white truncate max-w-[180px]">
                  {organizations.length > 0 ? `${organizations.length} Selected` : 'All Organizations'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Locations:</span>
                <span className="font-semibold text-main dark:text-white truncate max-w-[180px]">
                  {locations.length > 0 ? `${locations.length} Selected` : 'All Locations'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-accent-purple py-3 text-xs font-bold text-white shadow-md hover:bg-accent-purple-hover cursor-pointer transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4 relative z-10">
            {/* Email Addresses */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-neutral-400 block">
                Where you will receive Alerts <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {emails.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder={idx === 0 ? "Your email address" : `Additional email address #${idx + 1}`}
                      value={val}
                      onChange={(e) => {
                        const newEmails = [...emails];
                        newEmails[idx] = e.target.value;
                        setEmails(newEmails);
                      }}
                      className="h-10 flex-1 rounded-lg border border-subtle bg-secondary-bg px-3.5 text-xs text-main placeholder-muted shadow-sm outline-none transition-all focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    />
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newEmails = emails.filter((_, i) => i !== idx);
                          setEmails(newEmails);
                        }}
                        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border border-red-200/50 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                        title="Remove email"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {emails.length < 4 && (
                <button
                  type="button"
                  onClick={() => setEmails([...emails, ''])}
                  className="flex items-center gap-1 text-[11px] font-bold text-accent-purple hover:text-accent-purple-hover cursor-pointer transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another email
                </button>
              )}
            </div>

            {/* WhatsApp Numbers */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-neutral-400 block">
                WhatsApp Numbers for Alerts <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {whatsappNumbers.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder={idx === 0 ? "Your WhatsApp number" : `Additional WhatsApp number #${idx + 1}`}
                      value={val}
                      onChange={(e) => {
                        const newNumbers = [...whatsappNumbers];
                        newNumbers[idx] = e.target.value;
                        setWhatsappNumbers(newNumbers);
                      }}
                      className="h-10 flex-1 rounded-lg border border-subtle bg-secondary-bg px-3.5 text-xs text-main placeholder-muted shadow-sm outline-none transition-all focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    />
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newNumbers = whatsappNumbers.filter((_, i) => i !== idx);
                          setWhatsappNumbers(newNumbers);
                        }}
                        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border border-red-200/50 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                        title="Remove WhatsApp number"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {whatsappNumbers.length < 4 && (
                <button
                  type="button"
                  onClick={() => setWhatsappNumbers([...whatsappNumbers, ''])}
                  className="flex items-center gap-1 text-[11px] font-bold text-accent-purple hover:text-accent-purple-hover cursor-pointer transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another WhatsApp number
                </button>
              )}
            </div>

            {/* Preferred Categories Dropdown */}
            <div className="space-y-1.5 relative" ref={categoryRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-neutral-400 block">
                Preferred Categories
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-subtle bg-secondary-bg px-3.5 text-left text-xs text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
              >
                <span className="truncate">
                  {categories.length > 0 ? `Selected Categories (${categories.length})` : 'All Categories'}
                </span>
                <svg className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${openDropdown === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === 'category' && (
                <div className="absolute left-0 z-30 mt-1.5 w-full rounded-lg border border-subtle bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="h-8 w-full rounded border border-subtle bg-secondary-bg pl-8 pr-2.5 text-xs text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    />
                    <svg className="absolute left-2.5 top-2.5 h-3 w-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar pr-1 pt-1">
                    {filteredCategoryTree.length > 0 ? (
                      <RenderTreeList
                        nodes={filteredCategoryTree}
                        selectedIds={categories}
                        treeRoot={CATEGORY_TREE}
                        setSelected={setCategories}
                      />
                    ) : (
                      <p className="text-center text-[10px] text-muted py-2">No categories found</p>
                    )}
                  </div>
                </div>
              )}
              {renderChips(categories, CATEGORY_TREE, (id) => toggleSelection(id, false, CATEGORY_TREE, setCategories))}
            </div>

            {/* Preferred Organizations Dropdown */}
            <div className="space-y-1.5 relative" ref={orgRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-neutral-400 block">
                Preferred Organizations
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'organization' ? null : 'organization')}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-subtle bg-secondary-bg px-3.5 text-left text-xs text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
              >
                <span className="truncate">
                  {organizations.length > 0 ? `Selected Organizations (${organizations.length})` : 'All Organizations'}
                </span>
                <svg className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${openDropdown === 'organization' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === 'organization' && (
                <div className="absolute left-0 z-30 mt-1.5 w-full rounded-lg border border-subtle bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="h-8 w-full rounded border border-subtle bg-secondary-bg pl-8 pr-2.5 text-xs text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    />
                    <svg className="absolute left-2.5 top-2.5 h-3 w-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar pr-1 pt-1">
                    {filteredOrganizationTree.length > 0 ? (
                      <RenderTreeList
                        nodes={filteredOrganizationTree}
                        selectedIds={organizations}
                        treeRoot={ORGANIZATION_TREE}
                        setSelected={setOrganizations}
                      />
                    ) : (
                      <p className="text-center text-[10px] text-muted py-2">No organizations found</p>
                    )}
                  </div>
                </div>
              )}
              {renderChips(organizations, ORGANIZATION_TREE, (id) => toggleSelection(id, false, ORGANIZATION_TREE, setOrganizations))}
            </div>

            {/* Preferred Locations Dropdown */}
            <div className="space-y-1.5 relative" ref={locationRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-neutral-400 block">
                Preferred Locations
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'location' ? null : 'location')}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-subtle bg-secondary-bg px-3.5 text-left text-xs text-secondary shadow-sm transition-all hover:bg-hover-surface dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
              >
                <span className="truncate">
                  {locations.length > 0 ? `Selected Locations (${locations.length})` : 'All Locations'}
                </span>
                <svg className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${openDropdown === 'location' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === 'location' && (
                <div className="absolute left-0 z-30 mt-1.5 w-full rounded-lg border border-subtle bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={locSearch}
                      onChange={(e) => setLocSearch(e.target.value)}
                      className="h-8 w-full rounded border border-subtle bg-secondary-bg pl-8 pr-2.5 text-xs text-main outline-none focus:border-accent-purple dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    />
                    <svg className="absolute left-2.5 top-2.5 h-3 w-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar pr-1 pt-1">
                    {filteredLocationTree.length > 0 ? (
                      <RenderTreeList
                        nodes={filteredLocationTree}
                        selectedIds={locations}
                        treeRoot={DISTRICT_TREE}
                        setSelected={setLocations}
                      />
                    ) : (
                      <p className="text-center text-[10px] text-muted py-2">No locations found</p>
                    )}
                  </div>
                </div>
              )}
              {renderChips(locations, DISTRICT_TREE, (id) => toggleSelection(id, false, DISTRICT_TREE, setLocations))}
            </div>

            {/* Error Banner */}
            {validationErr && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 text-xs text-red-600 dark:text-red-400 animate-fadeIn">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{validationErr}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full rounded-xl bg-accent-purple py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-accent-purple-hover cursor-pointer transition-all active:scale-[0.98]"
            >
              Activate Alert Agent
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
