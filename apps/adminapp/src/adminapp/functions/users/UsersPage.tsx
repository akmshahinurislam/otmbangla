import { useState, useMemo, useEffect } from 'react';
import { Search, Eye, UserX, UserCheck, Shield, Award, Calendar, Smartphone, Mail, Activity, X, Loader2, AlertCircle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Contractor' | 'Developer' | 'General';
  joinedDate: string;
  status: 'Active' | 'Pending' | 'Suspended';
  loginCount: number;
  lastActiveIp: string;
  activities: string[];
}

const isProd = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production';
const AUTH_SERVICE_URL = isProd ? 'https://otmbangla-auth-service.onrender.com' : 'http://localhost:3001';

export function UsersPage() {
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Pending' | 'Suspended'>('All');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Fetch users from MongoDB via auth-service
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/users`);
      if (!response.ok) {
        throw new Error('Failed to load user registries from auth-service.');
      }
      const data = await response.json();
      
      // Map MongoDB documents to local UserItem structure
      const mapped: UserItem[] = (data.users || []).map((u: any) => ({
        id: u.id,
        name: u.name || 'Anonymous',
        email: u.email || 'N/A',
        phone: u.phone || 'N/A',
        role: u.role || 'Contractor',
        joinedDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
        status: u.status || 'Active',
        loginCount: u.loginCount || 0,
        lastActiveIp: u.lastActiveIp || 'N/A',
        activities: u.activities || ['Registered user account.']
      }));
      
      setUsersList(mapped);
    } catch (err: any) {
      console.error('[UsersPage] MongoDB fetch error:', err);
      setError(err.message || 'Could not connect to the auth-service. Please check if it is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter and Search logic
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery);

      const matchTab = activeTab === 'All' || u.status === activeTab;

      return matchSearch && matchTab;
    });
  }, [usersList, searchQuery, activeTab]);

  // Update status in MongoDB
  const updateStatusInDb = async (userId: string, newStatus: 'Active' | 'Suspended', activities: string[]) => {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, activities })
      });
      if (!response.ok) {
        throw new Error('Could not persist status change to MongoDB.');
      }
      return true;
    } catch (err: any) {
      alert(err.message || 'Error updating status in database.');
      return false;
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const userToUpdate = usersList.find(u => u.id === userId);
    if (!userToUpdate) return;

    const nextStatus: 'Active' | 'Suspended' = userToUpdate.status === 'Suspended' ? 'Active' : 'Suspended';
    const logMsg = `Administrator modified status to ${nextStatus}`;
    const newActivities = [logMsg, ...userToUpdate.activities];

    const success = await updateStatusInDb(userId, nextStatus, newActivities);
    if (success) {
      const updatedList = usersList.map((u) => {
        if (u.id === userId) {
          const updatedUser = {
            ...u,
            status: nextStatus,
            activities: newActivities
          };
          if (selectedUser && selectedUser.id === userId) {
            setSelectedUser(updatedUser);
          }
          return updatedUser;
        }
        return u;
      });
      setUsersList(updatedList);
    }
  };

  const handleApprovePending = async (userId: string) => {
    const userToUpdate = usersList.find(u => u.id === userId);
    if (!userToUpdate) return;

    const logMsg = 'Administrator approved account registration request';
    const newActivities = [logMsg, ...userToUpdate.activities];

    const success = await updateStatusInDb(userId, 'Active', newActivities);
    if (success) {
      const updatedList = usersList.map((u) => {
        if (u.id === userId) {
          const updatedUser: UserItem = {
            ...u,
            status: 'Active',
            activities: newActivities
          };
          if (selectedUser && selectedUser.id === userId) {
            setSelectedUser(updatedUser);
          }
          return updatedUser;
        }
        return u;
      });
      setUsersList(updatedList);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn pb-12">
      
      {/* Header section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-main dark:text-white leading-tight">User Registries</h3>
          <p className="text-[10px] font-bold text-muted dark:text-neutral-500">
            View profiles, activity logs, and account statuses fetched live from MongoDB.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-neutral-100 dark:bg-white/[0.04] p-1 rounded-xl w-fit self-start">
          {(['All', 'Active', 'Pending', 'Suspended'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-main shadow-xs dark:bg-neutral-800 dark:text-white'
                  : 'text-secondary hover:text-main dark:text-neutral-450 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Search Input */}
      <section className="relative">
        <input
          type="text"
          placeholder="Search by name, email, or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 w-full rounded-xl border border-subtle bg-primary-bg pl-10 pr-4 text-xs text-main placeholder-muted shadow-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold transition-all duration-300"
        />
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted dark:text-neutral-500" strokeWidth={2.4} />
      </section>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col h-64 items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
          <p className="text-xs font-bold text-secondary dark:text-neutral-450">Querying MongoDB registries...</p>
        </div>
      ) : error ? (
        /* Error Callout */
        <div className="rounded-2xl border border-red-200/50 bg-red-50/50 p-6 dark:border-red-950/20 dark:bg-red-950/20 text-center space-y-3">
          <div className="flex justify-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Database Connection Issue</h4>
          <p className="text-xs text-secondary dark:text-neutral-400 max-w-md mx-auto font-medium leading-relaxed">
            {error}
          </p>
          <button
            type="button"
            onClick={fetchUsers}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-655 hover:bg-red-50 dark:border-red-900/30 dark:bg-neutral-850 dark:text-red-400 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        /* Users Grid/Table */
        <section className="rounded-2xl border border-subtle bg-primary-bg shadow-xs dark:border-white/10 dark:bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle dark:border-white/5 text-[10px] font-extrabold text-muted dark:text-neutral-500 uppercase tracking-wider bg-secondary-bg/50 dark:bg-white/[0.005]">
                  <th className="py-3.5 px-4">User profile</th>
                  <th className="py-3.5 px-4">Access Role</th>
                  <th className="py-3.5 px-4">Registration date</th>
                  <th className="py-3.5 px-4">Logins</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle dark:divide-white/5 text-xs font-semibold">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-hover-surface/40 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          {item.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-main dark:text-white leading-tight mb-0.5">{item.name}</p>
                          <p className="text-[10px] text-muted dark:text-neutral-500 font-medium leading-none">{item.email} &bull; {item.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold">
                          {item.role === 'Admin' || item.role === 'Developer' ? (
                            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Award className="h-3.5 w-3.5 text-muted dark:text-neutral-500" />
                          )}
                          <span>{item.role}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-secondary dark:text-neutral-450 font-medium">
                        {item.joinedDate}
                      </td>
                      <td className="py-4 px-4 text-main dark:text-white font-extrabold">
                        {item.loginCount}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            item.status === 'Active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-450/15 dark:border-emerald-400/20 dark:text-emerald-400'
                              : item.status === 'Suspended'
                              ? 'bg-red-500/10 border-red-500/20 text-red-655 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-650 dark:bg-amber-450/15 dark:border-amber-400/20 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-primary-bg text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer shadow-xs transition-all"
                            title="View user details & activity logs"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {item.status === 'Pending' ? (
                            <button
                              type="button"
                              onClick={() => handleApprovePending(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-250 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 cursor-pointer shadow-xs transition-all"
                              title="Approve user registration"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item.id)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border cursor-pointer shadow-xs transition-all ${
                                item.status === 'Suspended'
                                  ? 'border-emerald-250 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                                  : 'border-red-250 bg-red-50/50 text-red-655 hover:bg-red-50 hover:text-red-700 dark:border-red-950/20 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30'
                              }`}
                              title={item.status === 'Suspended' ? 'Re-activate account' : 'Suspend account'}
                            >
                              {item.status === 'Suspended' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-muted dark:text-neutral-500">
                      No user accounts found in MongoDB matching active query constraints.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* User Details & Logs modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-250 bg-primary-bg p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900/90 dark:backdrop-blur-md animate-scaleUp flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-subtle pb-4 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {selectedUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-main dark:text-white leading-none mb-1">{selectedUser.name}</h4>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-neutral-100 text-secondary dark:bg-white/[0.04] dark:text-neutral-355">
                    {selectedUser.id} &bull; {selectedUser.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-450 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-5">
              
              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-subtle bg-secondary-bg/50 p-4 dark:border-white/5 dark:bg-white/[0.005]">
                <div className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-neutral-400 font-bold">
                  <Mail className="h-4 w-4 text-muted shrink-0" />
                  <span className="truncate">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-neutral-400 font-bold">
                  <Smartphone className="h-4 w-4 text-muted shrink-0" />
                  <span>{selectedUser.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-neutral-400 font-bold">
                  <Calendar className="h-4 w-4 text-muted shrink-0" />
                  <span>Joined: {selectedUser.joinedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-neutral-400 font-bold">
                  <Activity className="h-4 w-4 text-muted shrink-0" />
                  <span>Logins: {selectedUser.loginCount} (IP: {selectedUser.lastActiveIp})</span>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex items-center justify-between border-t border-subtle pt-4 dark:border-white/5">
                <span className="text-xs font-bold text-secondary dark:text-neutral-455">Account Status</span>
                <span
                  className={`inline-flex px-3 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedUser.status === 'Active'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-450/15 dark:border-emerald-400/20 dark:text-emerald-400'
                      : selectedUser.status === 'Suspended'
                      ? 'bg-red-500/10 border-red-500/20 text-red-655 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-650 dark:bg-amber-450/15 dark:border-amber-400/20 dark:text-amber-400'
                  }`}
                >
                  {selectedUser.status}
                </span>
              </div>

              {/* Activity Logs */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-muted dark:text-neutral-500">Security Audit Logs</h5>
                <div className="space-y-2">
                  {selectedUser.activities.map((act, idx) => (
                    <div key={idx} className="flex gap-2.5 text-[11px] font-semibold text-secondary dark:text-neutral-400 bg-secondary-bg dark:bg-white/[0.01] px-3 py-2.5 rounded-lg border border-subtle/50 dark:border-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="border-t border-subtle pt-4 mt-2 dark:border-white/5 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-neutral-200 bg-primary-bg px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-850 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Close Logs
              </button>

              {selectedUser.status === 'Pending' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleApprovePending(selectedUser.id);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Approve Registration</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleStatus(selectedUser.id);
                  }}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedUser.status === 'Suspended'
                      ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                      : 'bg-red-650 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                  }`}
                >
                  {selectedUser.status === 'Suspended' ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Activate Account</span>
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4" />
                      <span>Suspend Account</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
