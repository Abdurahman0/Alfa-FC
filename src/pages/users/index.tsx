// @ts-nocheck
import React from 'react';
import { Icon } from '@/shared/ui/icons';
import { SearchableGroupSelect, SearchableSelect } from '@/shared/ui/controls';
import { useT } from '@/shared/i18n/lang';
import {
  apiGetContracts,
  apiGetContract,
  apiGetContractPdf,
  apiRegenerateContractPdf,
  apiGetContractStats,
  apiTerminateContract,
  apiPatchContractMonthlyFee,
  apiPatchContractDates,
  apiPatchContractStatus,
  apiGetGateLogs,
  apiGetGroups,
  apiGetUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiUpdateUserRoles,
  apiGetRoles,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
  apiGetPermissions,
  apiGetSettings,
  apiGetSettingsRaw,
  apiUpdateSettings,
  apiGetArchiveStats,
  apiArchiveYear,
  apiUnarchiveYear,
  apiTriggerManualBackup,
  apiGetBackupStatus,
  apiImportStudents,
  apiGetTransactions,
  apiGetTransactionsWithName,
  apiGetTransaction,
  apiGetUnassignedTransactions,
  apiGetTransactionStats,
  apiCreateManualTransaction,
  apiCancelTransaction,
  apiAssignTransaction,
  apiGetReportsSummary,
  apiGetAttendanceGroupsReport,
  apiGetReportsTerminatedSummary,
  apiGetDebtors,
  apiGetFinanceReport,
  apiGetPayers,
  apiDebtorsExportUrl,
  apiDownloadDebtors,
  apiDownloadPayers,
  apiPayersExportUrl,
  apiPaymentsExcelUrl,
  apiDownloadPaymentsExcel,
  apiGetWaitingList,
  apiCreateWaitingList,
  apiUpdateWaitingList,
  apiDeleteWaitingList,
  apiGetStudent,
  apiGetStudentTransactions,
  apiDeleteUsersBulk,
  apiGetTerminatedContracts,
  apiUpdateContract,
  apiDeleteTransaction,
  apiDeleteTransactionsBulk,
  apiCreateManualTransactionWithProof,
  apiGetWaitingListNext,
  apiGetAuditLogs,
} from '@/shared/api';

import { fmt } from '@/shared/lib/format';
import { Stat } from '@/shared/ui/stat';
import { Modal } from '@/shared/ui/modal';

const ALL_PERMS = [
  { code: 'students:view', label: "O'quvchilarni ko'rish" },
  { code: 'students:edit', label: "O'quvchilarni tahrirlash" },
  { code: 'groups:view', label: "Guruhlarni ko'rish" },
  { code: 'groups:edit', label: 'Guruhlarni tahrirlash' },
  { code: 'attendance:coach:mark', label: 'Davomat belgilash' },
  { code: 'attendance:view', label: "Davomatni ko'rish" },
  { code: 'sessions:create', label: 'Sessiya yaratish' },
  { code: 'sessions:manage', label: 'Sessiyalarni boshqarish' },
  { code: 'reports:dashboard:view', label: 'Dashboard' },
  { code: 'reports:attendance:view', label: 'Davomat hisobotlari' },
  { code: 'settings:system:view', label: "Sozlamalarni ko'rish" },
  { code: 'settings:system:edit', label: 'Sozlamalarni tahrirlash' },
  { code: 'roles:manage', label: 'Rollarni boshqarish' },
  { code: 'users:manage', label: 'Foydalanuvchilarni boshqarish' },
  { code: 'gate:logs:view', label: "Darvoza loglarini ko'rish" },
  { code: 'contracts:view', label: "Shartnomalarni ko'rish" },
  { code: 'contracts:edit', label: 'Shartnomalarni tahrirlash' },
  { code: 'finance:transactions:view', label: "To'lovlarni ko'rish" },
  { code: 'finance:transactions:manual', label: "Qo'lda to'lov kiritish" },
  { code: 'finance:transactions:cancel', label: "To'lovni bekor qilish" },
  { code: 'finance:unassigned:view', label: "Biriktirilmagan to'lovlar" },
  { code: 'finance:unassigned:assign', label: "To'lovlarni biriktirish" },
];

const PERM_CATS = {
  students:   "O'quvchilar",
  groups:     'Guruhlar',
  attendance: 'Davomat',
  sessions:   'Sessiyalar',
  reports:    'Hisobotlar',
  settings:   'Sozlamalar',
  roles:      'Rollar',
  users:      'Foydalanuvchilar',
  gate:       'Darvoza',
  contracts:  'Shartnomalar',
  finance:    'Moliya',
};

function getPermGroups(perms) {
  const map = {};
  perms.forEach(p => {
    const cat = p.code.split(':')[0];
    if (!map[cat]) map[cat] = { label: PERM_CATS[cat] || cat, items: [] };
    map[cat].items.push(p);
  });
  return Object.values(map);
}

function PermSelector({ ids, onChange, permissions }) {
  const groups = getPermGroups(permissions);
  return (
    <div style={{ maxHeight: 270, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {groups.map(g => {
        const groupIds = g.items.map(p => p.id);
        const allChecked = groupIds.length > 0 && groupIds.every(id => ids.includes(id));
        const someChecked = groupIds.some(id => ids.includes(id));
        function toggleGroup(e) {
          onChange(e.target.checked ? [...new Set([...ids, ...groupIds])] : ids.filter(id => !groupIds.includes(id)));
        }
        return (
          <div key={g.label}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, padding: '7px 0 3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={toggleGroup} />
              {g.label}
            </label>
            {g.items.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, paddingLeft: 20, paddingBottom: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={ids.includes(p.id)} onChange={e => {
                  onChange(e.target.checked ? [...ids, p.id] : ids.filter(x => x !== p.id));
                }} />
                <span>{p.description}</span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function UsersScreen({ initialView = 'users', onToast } = {}) {
  const I = Icon;
  const { t } = useT();
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [permissions, setPermissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState(initialView);

  // Role form
  const [newRole, setNewRole] = React.useState({ name: '', description: '', permission_ids: [] });
  const [editingRole, setEditingRole] = React.useState(null);

  // User create modal
  const [showCreateUser, setShowCreateUser] = React.useState(false);
  const [userForm, setUserForm] = React.useState({ full_name: '', phone: '', email: '', password: '', status: 'active', is_super_admin: false, role_ids: [] });
  const [savingUser, setSavingUser] = React.useState(false);

  // User edit modal
  const [editingUser, setEditingUser] = React.useState(null);
  const [editUserForm, setEditUserForm] = React.useState({ full_name: '', phone: '', email: '', password: '', status: 'active', role_ids: [] });
  const [savingEditUser, setSavingEditUser] = React.useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  // Menus
  const [openMenuUserId, setOpenMenuUserId] = React.useState(null);
  const [deletingUserId, setDeletingUserId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });

  // Per-user permissions. The backend only knows roles, so each user's extra
  // permissions live in a hidden auto-managed role named "__user_<id>" that is
  // created/updated/deleted here and filtered out of every role list in the UI.
  const PERSONAL_PREFIX = '__user_';
  const isPersonalRole = (r) => (r?.name || '').startsWith(PERSONAL_PREFIX);
  const visibleRoles = roles.filter(r => !isPersonalRole(r));
  const regularRolesOf = (u) => (u.roles || []).filter(r => !isPersonalRole(r));
  const personalRoleOf = (u) => {
    const attached = (u.roles || []).find(isPersonalRole);
    // resolve through the full roles list so we get its permissions
    return roles.find(r => r.name === PERSONAL_PREFIX + u.id) ||
      (attached ? roles.find(r => r.id === attached.id) : null) || attached || null;
  };
  const [permUser, setPermUser] = React.useState(null);
  const [permExtraIds, setPermExtraIds] = React.useState([]);
  const [savingPerms, setSavingPerms] = React.useState(false);

  function rolePermIds(u) {
    const ids = new Set();
    regularRolesOf(u).forEach(ur => {
      const full = roles.find(r => r.id === ur.id);
      (full?.permissions || []).forEach(p => ids.add(p.id));
    });
    return ids;
  }

  function openUserPerms(u) {
    const personal = personalRoleOf(u);
    setPermExtraIds((personal?.permissions || []).map(p => p.id));
    setPermUser(u);
    setOpenMenuUserId(null);
  }

  async function saveUserPerms() {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      const name = PERSONAL_PREFIX + permUser.id;
      const base = rolePermIds(permUser);
      const extras = permExtraIds.filter(id => !base.has(id));
      const regularIds = regularRolesOf(permUser).map(r => r.id);
      const existing = roles.find(r => r.name === name);
      if (extras.length === 0) {
        if (existing) {
          await apiUpdateUserRoles(permUser.id, regularIds);
          await apiDeleteRole(existing.id);
        }
      } else {
        let personalId = existing?.id;
        const description = `Shaxsiy ruxsatlar: ${permUser.full_name || permUser.id}`;
        if (existing) {
          await apiUpdateRole(existing.id, { name, description, permission_ids: extras });
        } else {
          const res = await apiCreateRole({ name, description, permission_ids: extras });
          personalId = res?.data?.id;
          if (!personalId) {
            const rr = await apiGetRoles();
            personalId = (rr?.data || []).find(r => r.name === name)?.id;
          }
        }
        if (!personalId) throw new Error('Personal role not created');
        await apiUpdateUserRoles(permUser.id, [...regularIds, personalId]);
      }
      setPermUser(null);
      onToast?.(t('toast_perms_saved'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSavingPerms(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.allSettled([
        apiGetUsers({ page_size: 200 }),
        apiGetRoles(),
        apiGetPermissions(),
      ]);
      setUsers(uRes.status === 'fulfilled' ? (uRes.value?.data || []) : []);
      setRoles(rRes.status === 'fulfilled' ? (rRes.value?.data || []) : []);
      setPermissions(pRes.status === 'fulfilled' ? (pRes.value?.data || []) : []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    const closeMenu = () => setOpenMenuUserId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Role CRUD
  async function createRole() {
    if (!newRole.name.trim()) { onToast?.(t('toast_role_name_required')); return; }
    try {
      await apiCreateRole({ name: newRole.name, description: newRole.description, permission_ids: newRole.permission_ids });
      setNewRole({ name: '', description: '', permission_ids: [] });
      onToast?.(t('toast_role_created'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  function openEditRole(role) {
    setEditingRole({
      ...role,
      permission_ids: (role.permissions || []).map(p => p.id),
    });
  }

  async function saveEditRole() {
    if (!editingRole) return;
    try {
      await apiUpdateRole(editingRole.id, { name: editingRole.name, description: editingRole.description, permission_ids: editingRole.permission_ids });
      setEditingRole(null);
      onToast?.(t('toast_role_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  async function removeRole(roleId) {
    if (!confirm(t('delete') + '?')) return;
    try {
      await apiDeleteRole(roleId);
      onToast?.(t('toast_role_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    }
  }

  // User CRUD
  async function deleteUser(userId) {
    if (!confirm(t('delete') + '?')) return;
    setDeletingUserId(userId);
    try {
      await apiDeleteUser(userId);
      setOpenMenuUserId(null);
      setSelectedIds(prev => prev.filter(id => id !== userId));
      onToast?.(t('toast_user_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setDeletingUserId(null);
    }
  }

  async function bulkDeleteUsers() {
    if (selectedIds.length === 0) return;
    if (!confirm(selectedIds.length + ' ' + t('delete') + '?')) return;
    setBulkDeleting(true);
    try {
      await apiDeleteUsersBulk(selectedIds);
      setSelectedIds([]);
      onToast?.(t('toast_user_deleted'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  function openEditUser(u) {
    setEditingUser(u);
    setEditUserForm({
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      password: '',
      status: u.status || 'active',
      role_ids: regularRolesOf(u).map(r => r.id),
    });
    setOpenMenuUserId(null);
  }

  async function saveEditUser() {
    if (!editUserForm.full_name || !editUserForm.phone) { onToast?.(t('toast_required_fields')); return; }
    setSavingEditUser(true);
    try {
      const payload = {
        full_name: editUserForm.full_name,
        phone: editUserForm.phone,
        email: editUserForm.email || undefined,
        status: editUserForm.status,
      };
      if (editUserForm.password) payload.password = editUserForm.password;
      await apiUpdateUser(editingUser.id, payload);
      // keep the hidden personal-permissions role attached across role edits
      const personal = personalRoleOf(editingUser);
      const ids = editUserForm.role_ids.map(Number);
      if (personal?.id && !ids.includes(personal.id)) ids.push(personal.id);
      await apiUpdateUserRoles(editingUser.id, ids);
      setEditingUser(null);
      onToast?.(t('toast_user_updated'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSavingEditUser(false);
    }
  }

  async function createUser() {
    if (!userForm.full_name || !userForm.phone || !userForm.password) { onToast?.(t('toast_required_fields')); return; }
    setSavingUser(true);
    try {
      const res = await apiCreateUser({
        full_name: userForm.full_name,
        phone: userForm.phone,
        email: userForm.email || undefined,
        password: userForm.password,
        status: userForm.status,
        is_super_admin: userForm.is_super_admin,
      });
      const newUserId = res?.data?.id;
      if (newUserId && userForm.role_ids.length > 0) {
        await apiUpdateUserRoles(newUserId, userForm.role_ids.map(Number));
      }
      setShowCreateUser(false);
      setUserForm({ full_name: '', phone: '', email: '', password: '', status: 'active', is_super_admin: false, role_ids: [] });
      onToast?.(t('toast_user_created'));
      load();
    } catch (e) {
      onToast?.(e.message);
    } finally {
      setSavingUser(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const selectableUsers = users.filter(u => !u.is_super_admin);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedIds.includes(u.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableUsers.map(u => u.id));
    }
  }

  if (loading) return <div className="empty" style={{ padding: 48 }}>{t('loading')}</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('users_heading')}</h1>
          <div className="page-sub">{users.length} {t('users_tab_users').toLowerCase()} · {roles.length} {t('users_tab_roles').toLowerCase()}</div>
        </div>
        {tab === 'users' && (
          <div className="page-actions">
            {selectedIds.length > 0 && (
              <button className="btn danger" onClick={bulkDeleteUsers} disabled={bulkDeleting}>
                <I.Trash2 size={14} /> {bulkDeleting ? t('deleting') : `${selectedIds.length} ${t('delete')}`}
              </button>
            )}
            <button className="btn primary" onClick={() => setShowCreateUser(true)}><I.UserPlus size={15} /> {t('users_new')}</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="tabs">
          <div className={'tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>{t('users_tab_users')}</div>
          <div className={'tab' + (tab === 'roles' ? ' active' : '')} onClick={() => setTab('roles')}>{t('users_tab_roles')}</div>
        </div>
      </div>

      {tab === 'users' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title={t('all')} />
                </th>
                <th>{t('users_fio_label')}</th>
                <th>{t('users_phone_email_label')}</th>
                <th>{t('users_col_role')}</th>
                <th>{t('users_col_status')}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={6} style={{ padding: 18, color: 'var(--muted)' }}>{t('users_not_found')}</td></tr>}
              {users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr key={u.id} className={isSelected ? 'selected' : undefined}>
                    <td>
                      {!u.is_super_admin && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u.id)} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      <div>{u.phone || '—'}</div>
                      {u.email && <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{u.email}</div>}
                    </td>
                    <td>
                      {u.is_super_admin
                        ? <span className="chip navy">Super Admin</span>
                        : (regularRolesOf(u).length > 0 || personalRoleOf(u))
                          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {regularRolesOf(u).map(r => <span key={r.id} className="chip navy">{r.name}</span>)}
                              {personalRoleOf(u) && <span className="chip accent" title={t('users_perms_menu')}>+{(personalRoleOf(u)?.permissions || []).length}</span>}
                            </div>
                          : <span className="chip">—</span>
                      }
                    </td>
                    <td>{u.status === 'active' ? <span className="chip success">{t('users_active_chip')}</span> : <span className="chip">{t('users_inactive_chip')}</span>}</td>
                    <td style={{ position: 'relative', overflow: 'visible' }}>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuUserId === u.id) {
                          setOpenMenuUserId(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
                          setOpenMenuUserId(u.id);
                        }
                      }}><I.More size={15} /></button>
                      {openMenuUserId === u.id && (
                        <div className="menu" style={{ position: 'fixed', minWidth: 160, top: menuPos.y, left: menuPos.x }} onClick={e => e.stopPropagation()}>
                          <button className="menu-item" onClick={() => openEditUser(u)}>
                            <I.Edit size={14} /> {t('edit')}
                          </button>
                          {!u.is_super_admin && (
                            <button className="menu-item" onClick={() => openUserPerms(u)}>
                              <I.Shield size={14} /> {t('users_perms_menu')}
                            </button>
                          )}
                          {!u.is_super_admin && (
                            <button className="menu-item danger" onClick={() => deleteUser(u.id)} disabled={deletingUserId === u.id}>
                              <I.Trash2 size={14} /> {deletingUserId === u.id ? t('deleting') : t('delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('users_role_name_col')}</th><th>{t('users_perms_col')}</th><th style={{ width: 72 }}></th></tr></thead>
              <tbody>
                {visibleRoles.length === 0 && <tr><td colSpan={3} style={{ padding: 18, color: 'var(--muted)' }}>{t('users_role_no_found')}</td></tr>}
                {visibleRoles.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 1 }}>{r.description}</div>}
                    </td>
                    <td>
                      {(r.permissions || []).length === 0
                        ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(r.permissions || []).slice(0, 5).map(p => (
                              <span key={p.id} style={{ fontSize: 10.5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{p.description}</span>
                            ))}
                            {(r.permissions || []).length > 5 && (
                              <span style={{ fontSize: 10.5, color: 'var(--muted)', padding: '1px 2px', alignSelf: 'center' }}>+{(r.permissions || []).length - 5} ta</span>
                            )}
                          </div>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEditRole(r)}><I.Edit size={14} /></button>
                        <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => removeRole(r.id)}><I.Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>{t('users_new_role_card')}</div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_name_req')}</label>
              <input value={newRole.name} onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))} placeholder="" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>{t('users_role_desc')}</label>
              <input value={newRole.description} onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))} placeholder="" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('users_perms_label')}</div>
            <PermSelector
              ids={newRole.permission_ids}
              onChange={ids => setNewRole(p => ({ ...p, permission_ids: ids }))}
              permissions={permissions}
            />
            <button className="btn primary" style={{ marginTop: 12 }} onClick={createRole}><I.Check size={14} /> {t('save')}</button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <Modal
          onClose={() => setShowCreateUser(false)}
          title={t('users_create_user_modal')}
          footer={
            <>
              <button className="btn ghost" onClick={() => setShowCreateUser(false)}>{t('cancel')}</button>
              <button className="btn primary" onClick={createUser} disabled={savingUser}>
                {savingUser ? t('saving') : t('users_create_action')}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="field col-span-2">
              <label>{t('users_fio_label')} *</label>
              <input value={userForm.full_name} onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))} placeholder="" />
            </div>
            <div className="field">
              <label>{t('profile_phone')} *</label>
              <input value={userForm.phone} onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="+998901234567" />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="field">
              <label>{t('users_pwd_label')}</label>
              <input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>{t('users_col_status')}</label>
              <SearchableSelect
                value={userForm.status}
                onChange={v => setUserForm(p => ({ ...p, status: v }))}
                options={[{ value: 'active', label: t('users_active_chip') }, { value: 'inactive', label: t('users_inactive_chip') }]}
              />
            </div>
            <div className="field col-span-2">
              <label>{t('users_role_select_label')}</label>
              <select multiple value={userForm.role_ids} onChange={e => {
                const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                setUserForm(p => ({ ...p, role_ids: vals }));
              }} style={{ height: 100 }}>
                {visibleRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="hint">{t('users_ctrl_hint')}</div>
            </div>
            <div className="field col-span-2">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={userForm.is_super_admin} onChange={e => setUserForm(p => ({ ...p, is_super_admin: e.target.checked }))} />
                Super Admin
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          onClose={() => setEditingUser(null)}
          title={t('users_edit_user_modal')}
          footer={
            <>
              <button className="btn ghost" onClick={() => setEditingUser(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveEditUser} disabled={savingEditUser}>
                {savingEditUser ? t('saving') : t('save')}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="field col-span-2">
              <label>{t('users_fio_label')} *</label>
              <input value={editUserForm.full_name} onChange={e => setEditUserForm(p => ({ ...p, full_name: e.target.value }))} placeholder="" />
            </div>
            <div className="field">
              <label>{t('profile_phone')} *</label>
              <input value={editUserForm.phone} onChange={e => setEditUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="+998901234567" />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={editUserForm.email} onChange={e => setEditUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="field">
              <label>{t('users_new_pwd_label')}</label>
              <input type="password" value={editUserForm.password} onChange={e => setEditUserForm(p => ({ ...p, password: e.target.value }))} placeholder="" />
            </div>
            <div className="field">
              <label>{t('users_col_status')}</label>
              <SearchableSelect
                value={editUserForm.status}
                onChange={v => setEditUserForm(p => ({ ...p, status: v }))}
                options={[{ value: 'active', label: t('users_active_chip') }, { value: 'inactive', label: t('users_inactive_chip') }]}
              />
            </div>
            {!editingUser.is_super_admin && (
              <div className="field col-span-2">
                <label>{t('users_tab_roles')}</label>
                <select multiple value={editUserForm.role_ids} onChange={e => {
                  const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                  setEditUserForm(p => ({ ...p, role_ids: vals }));
                }} style={{ height: 100 }}>
                  {visibleRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="hint">{t('users_ctrl_hint')}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Per-user permissions modal */}
      {permUser && (
        <Modal
          onClose={() => setPermUser(null)}
          title={t('users_perms_title')}
          subtitle={permUser.full_name}
          footer={
            <>
              <button className="btn ghost" onClick={() => setPermUser(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveUserPerms} disabled={savingPerms}>
                {savingPerms ? t('saving') : t('save')}
              </button>
            </>
          }
        >
          {(() => {
            const base = rolePermIds(permUser);
            const basePerms = permissions.filter(p => base.has(p.id));
            const extraCandidates = permissions.filter(p => !base.has(p.id));
            return (
              <>
                {basePerms.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      {t('users_perms_from_roles')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {basePerms.map(p => (
                        <span key={p.id} className="chip navy" style={{ fontSize: 10.5 }}>{p.description}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {t('users_perms_extra')}
                </div>
                <div className="hint" style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>{t('users_perms_hint')}</div>
                <PermSelector
                  ids={permExtraIds}
                  onChange={setPermExtraIds}
                  permissions={extraCandidates}
                />
              </>
            );
          })()}
        </Modal>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <Modal
          onClose={() => setEditingRole(null)}
          title={t('users_edit_role_modal')}
          footer={
            <>
              <button className="btn ghost" onClick={() => setEditingRole(null)}>{t('cancel')}</button>
              <button className="btn primary" onClick={saveEditRole}><I.Check size={14} /> {t('save')}</button>
            </>
          }
        >
          <div className="field" style={{ marginBottom: 10 }}>
            <label>{t('users_role_name_req')}</label>
            <input value={editingRole.name} onChange={e => setEditingRole(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>{t('users_role_desc')}</label>
            <input value={editingRole.description || ''} onChange={e => setEditingRole(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('users_perms_label')}</div>
          <PermSelector
            ids={editingRole.permission_ids}
            onChange={ids => setEditingRole(p => ({ ...p, permission_ids: ids }))}
            permissions={permissions}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

