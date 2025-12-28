import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Users, UserPlus, Shield, Search, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
  email_verified: boolean;
  created_at: Date;
  last_login: Date | null;
  total_logins: number;
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  byRole: Record<string, number>;
  recentSignups: number;
}

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create user form
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'patient' as 'patient' | 'expert' | 'researcher' | 'admin'
  });

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [page, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.listUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined
      });
      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminApi.getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      await adminApi.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'patient'
      });
      loadUsers();
      loadStats();
      alert('Bruker opprettet!');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(`Kunne ikke opprette bruker: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    if (!confirm(`Er du sikker på at du vil endre rollen til ${newRole}?`)) return;

    try {
      await adminApi.updateUserRole(userId, newRole as any);
      loadUsers();
      loadStats();
      alert('Rolle oppdatert!');
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Kunne ikke oppdatere rolle');
    }
  };

  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    if (!confirm(`Er du sikker på at du vil endre statusen til ${newStatus}?`)) return;

    try {
      await adminApi.updateUserStatus(userId, newStatus as any);
      loadUsers();
      loadStats();
      alert('Status oppdatert!');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Kunne ikke oppdatere status');
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Er du HELT SIKKER på at du vil slette ${email}? Dette kan ikke angres!`)) return;

    try {
      await adminApi.deleteUser(userId);
      loadUsers();
      loadStats();
      alert('Bruker slettet');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Kunne ikke slette bruker');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'researcher': return 'bg-purple-100 text-purple-800';
      case 'expert': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'researcher': return 'Superbruker';
      case 'expert': return 'Ekspert';
      case 'patient': return 'Bruker';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-purple-600 text-white p-6 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Brukeradministrasjon
              </h1>
              <p className="text-red-100">Administrer brukere for alphatesting</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Ny bruker
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Totalt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Aktive</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-600">Suspendert</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.suspended}</div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Admins</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.byRole.admin || 0}</div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-600">Siste 7d</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.recentSignups}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Søk etter email, brukernavn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Alle roller</option>
              <option value="admin">Admin</option>
              <option value="researcher">Superbruker</option>
              <option value="expert">Ekspert</option>
              <option value="patient">Bruker</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Alle statuser</option>
              <option value="active">Aktiv</option>
              <option value="suspended">Suspendert</option>
              <option value="deleted">Slettet</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bruker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rolle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opprettet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Laster brukere...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Ingen brukere funnet
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                          {user.first_name && user.last_name && (
                            <div className="text-sm text-gray-500">{user.first_name} {user.last_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)} border-0`}
                        >
                          <option value="patient">Bruker</option>
                          <option value="expert">Ekspert</option>
                          <option value="researcher">Superbruker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.account_status}
                          onChange={(e) => handleUpdateStatus(user.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                            user.account_status === 'active' ? 'bg-green-100 text-green-800' :
                            user.account_status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <option value="active">Aktiv</option>
                          <option value="suspended">Suspendert</option>
                          <option value="deleted">Slettet</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString('nb-NO')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.total_logins} innlogginger
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Slett bruker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Viser {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} av {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Forrige
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Neste
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Opprett ny bruker</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brukernavn *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passord *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 tegn</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornavn</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etternavn</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="patient">Bruker</option>
                  <option value="expert">Ekspert</option>
                  <option value="researcher">Superbruker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.email || !newUser.username || !newUser.password || newUser.password.length < 8}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Opprett bruker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
