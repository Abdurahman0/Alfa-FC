// @ts-nocheck
import React from 'react';
import { Icon } from './icons';
import { Sidebar, Topbar, normalizeRoleName } from './shell';
import { LoginScreen, Dashboard } from './screens-1';
import { StudentsList, StudentProfile, StudentNew } from './screens-2';
import { GroupsScreen, SessionsScreen, AttendanceMark, PerformanceTable } from './screens-3';
import { ContractsScreen, ContractView, GateScreen, UsersScreen, SettingsScreen, TransactionsScreen, ReportsScreen, WaitingListScreen, AuditLogsScreen } from './screens-4';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakColor } from './tweaks-panel';
import { apiGetMe, apiLogout, getToken, setUnauthorizedHandler } from './api';
import { LangProvider, useT } from './lang';

const __TWEAK_DEFAULTS = {
  theme: 'light',
  density: 'default',
  accent: 'red',
  role: 'Super Admin',
};

export default function App() {
  const [t, setTweak] = useTweaks(__TWEAK_DEFAULTS);
  const T = { ...t, setTweak };
  const [loggedIn, setLoggedIn] = React.useState(() => !!getToken());
  const [currentUser, setCurrentUser] = React.useState(null);
  const [permissions, setPermissions] = React.useState([]);
  const [authLoading, setAuthLoading] = React.useState(() => !!getToken());
  const [route, setRoute] = React.useState(() => localStorage.getItem('alpha_route') || 'dashboard');
  const [studentId, setStudentId] = React.useState(() => localStorage.getItem('alpha_student_id'));
  const [sessionId, setSessionId] = React.useState(null);
  const [groupId, setGroupId] = React.useState(null);
  const [contractId, setContractId] = React.useState(null);
  const [navCollapsed, setNavCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      setLoggedIn(false);
      setCurrentUser(null);
      setPermissions([]);
    });
  }, []);

  React.useEffect(() => {
    if (!loggedIn) { setAuthLoading(false); return; }
    apiGetMe().then(res => {
      if (res) {
        setCurrentUser(res.user);
        setPermissions(res.permissions || []);
        let roleName;
        if (res.user?.is_super_admin) {
          roleName = 'Super Admin';
        } else {
          const rawRole = res.user?.roles?.[0]?.name;
          roleName = (rawRole ? normalizeRoleName(rawRole) : null) || rawRole || 'Coach';
        }
        setTweak('role', roleName);
      } else {
        setLoggedIn(false);
      }
    }).catch(() => setLoggedIn(false))
      .finally(() => setAuthLoading(false));
  }, [loggedIn]);

  React.useEffect(() => { localStorage.setItem('alpha_route', route); }, [route]);
  React.useEffect(() => {
    if (studentId == null) {
      localStorage.removeItem('alpha_student_id');
    } else {
      localStorage.setItem('alpha_student_id', String(studentId));
    }
  }, [studentId]);
  React.useEffect(() => { document.documentElement.setAttribute('data-theme', T.theme); }, [T.theme]);
  React.useEffect(() => { document.documentElement.setAttribute('data-density', T.density); }, [T.density]);

  React.useEffect(() => {
    if (!T.accent) return;
    const root = document.documentElement;
    const map = {
      red: '#C8202C', navy: '#0F1F4D', gold: '#F5B921', emerald: '#0E7C5E',
    };
    if (map[T.accent]) root.style.setProperty('--accent', map[T.accent]);
  }, [T.accent]);

  function navigate(r) {
    setRoute(r);
    setMobileNavOpen(false);
    setStudentId(null);
    setSessionId(null);
    setGroupId(null);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function handleSignOut() {
    apiLogout();
    setLoggedIn(false);
    setCurrentUser(null);
    setPermissions([]);
  }

  if (authLoading) {
    return (
      <LangProvider>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div style={{ fontSize: 15, color: 'var(--muted)' }}>Загрузка...</div>
        </div>
      </LangProvider>
    );
  }

  if (!loggedIn) {
    return <LangProvider><LoginScreen onLogin={() => setLoggedIn(true)}/></LangProvider>;
  }

  let crumbKeys = ['app_name'];
  let activeNav = route;
  if (route === 'dashboard') crumbKeys.push('nav_dashboard');
  if (route === 'students') crumbKeys.push('nav_students');
  if (route === 'students-profile') { crumbKeys.push('nav_students'); crumbKeys.push('crumb_profile'); activeNav = 'students'; }
  if (route === 'students-new') { crumbKeys.push('nav_students'); crumbKeys.push('crumb_new'); activeNav = 'students'; }
  if (route === 'groups') crumbKeys.push('nav_groups');
  if (route === 'sessions') crumbKeys.push('nav_sessions');
  if (route === 'attendance') crumbKeys.push('crumb_attendance');
  if (route === 'attendance-mark') { crumbKeys.push('nav_sessions'); crumbKeys.push('crumb_attendance'); activeNav = 'sessions'; }
  if (route === 'performance') crumbKeys.push('nav_performance');
  if (route === 'contracts') crumbKeys.push('nav_contracts');
  if (route === 'contracts-view') { crumbKeys.push('nav_contracts'); crumbKeys.push('crumb_view'); activeNav = 'contracts'; }
  if (route === 'transactions') crumbKeys.push('nav_transactions');
  if (route === 'gate') crumbKeys.push('nav_gate');
  if (route === 'users') crumbKeys.push('nav_users');
  if (route === 'roles') crumbKeys.push('crumb_roles');
  if (route === 'settings') crumbKeys.push('nav_settings');
  if (route === 'reports') crumbKeys.push('nav_reports');
  if (route === 'waiting-list') crumbKeys.push('nav_waiting_list');
  if (route === 'audit-logs') crumbKeys.push('nav_audit_logs');

  return (
    <LangProvider>
    <div className="app" data-nav={navCollapsed ? 'collapsed' : 'expanded'}>
      <Sidebar
        active={activeNav}
        onNav={(id) => {
          navigate(id);
        }}
        role={T.role}
        collapsed={navCollapsed}
        onToggle={() => mobileNavOpen ? setMobileNavOpen(false) : setNavCollapsed(!navCollapsed)}
        user={currentUser}
        mobileOpen={mobileNavOpen}
      />
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <div className="main">
        <Topbar
          crumbs={crumbKeys}
          role={T.role}
          onRoleSwitch={(r) => { T.setTweak('role', r); showToast(`Rol o'zgartirildi: ${r}`); }}
          canSwitchRole={!!(currentUser?.is_super_admin || currentUser?.roles?.some(r => normalizeRoleName(r.name) === 'Super Admin'))}
          theme={T.theme}
          onTheme={(th) => T.setTweak('theme', th)}
          onSignOut={handleSignOut}
          user={currentUser}
          onMenu={() => { setNavCollapsed(false); setMobileNavOpen(true); }}
          onNavigate={(type, id) => {
            if (type === 'student') { setStudentId(id); setRoute('students-profile'); }
          }}
        />
        <div className="content">
          {route === 'dashboard' && <Dashboard role={T.role} onNav={navigate} onOpenGroup={(id) => { setGroupId(id); setRoute('groups'); }}/>} 
          {route === 'students' && <StudentsList onOpen={(id) => { setStudentId(id); setRoute('students-profile'); }} onNew={() => setRoute('students-new')} onToast={showToast}/>}
          {route === 'students-profile' && <StudentProfile studentId={studentId} onBack={() => navigate('students')}/>} 
          {route === 'students-new' && <StudentNew onBack={() => navigate('students')} onCreated={() => { showToast("O'quvchi muvaffaqiyatli yaratildi"); navigate('students'); }} onViewContract={(cid) => { setContractId(cid); navigate('contracts-view'); }}/>}
          {route === 'groups' && <GroupsScreen onOpen={(id) => { setGroupId(id); }} selectedGroupId={groupId} onCloseGroup={() => setGroupId(null)} onToast={showToast} />} 
          {(route === 'sessions' || route === 'attendance') && <SessionsScreen onMark={(id) => { setSessionId(id); setRoute('attendance-mark'); }}/>} 
          {route === 'attendance-mark' && <AttendanceMark sessionId={sessionId} onBack={() => navigate('sessions')}/>} 
          {route === 'performance' && <PerformanceTable/>} 
          {route === 'contracts' && <ContractsScreen onOpenContract={(id) => { setContractId(id); setRoute('contracts-view'); }} onNavigateToStudent={(id) => { setStudentId(id); setRoute('students-profile'); }} onToast={showToast}/>}
          {route === 'contracts-view' && <ContractView contractId={contractId} onBack={() => navigate('contracts')} onToast={showToast} onNavigateToStudent={(id) => { setStudentId(id); setRoute('students-profile'); }}/>}
          {route === 'transactions' && <TransactionsScreen onToast={showToast}/>} 
          {route === 'gate' && <GateScreen/>} 
          {(route === 'users' || route === 'roles') && (
            <UsersScreen
              initialView={route === 'roles' ? 'roles' : 'users'}
              onToast={showToast}
            />
          )}
          {route === 'settings' && <SettingsScreen theme={T.theme} setTheme={(th) => T.setTweak('theme', th)}/>} 
          {route === 'reports' && <ReportsScreen/>} 
          {route === 'waiting-list' && <WaitingListScreen onToast={showToast}/>}
          {route === 'audit-logs' && <AuditLogsScreen/>}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <Icon.Check size={16} color="var(--success)"/> {toast}
        </div>
      )}

      <AlphaTweaks T={T}/>
    </div>
    </LangProvider>
  );
}

function AlphaTweaks({ T }) {
  return (
    <TweaksPanel title="Tweaks · Alpha CIMS">
      <TweakSection label="Tema">
        <TweakRadio label="Rejim" value={T.theme} options={[{ label: 'Yorugʼ', value: 'light' }, { label: "Qorong'i", value: 'dark' }]} onChange={v => T.setTweak('theme', v)}/>
        <TweakRadio label="Zichlik" value={T.density} options={[{ label: 'Compact', value: 'compact' }, { label: 'Default', value: 'default' }, { label: 'Roomy', value: 'comfortable' }]} onChange={v => T.setTweak('density', v)}/>
      </TweakSection>
      <TweakSection label="Rang">
        <TweakColor label="Aksent" value={T.accent} options={['red', 'navy', 'gold', 'emerald']} onChange={v => T.setTweak('accent', v)}/>
      </TweakSection>
      <TweakSection label="Foydalanuvchi roli">
        <TweakSelect label="Rol" value={T.role}
          options={[
            { label: 'Super Admin (barchasi)', value: 'Super Admin' },
            { label: "Admin (o'quvchilar, guruh)", value: 'Admin' },
            { label: "Director (faqat ko'rish)", value: 'Director' },
            { label: 'Head Coach (sessiya, davomat)', value: 'Head Coach' },
            { label: "Coach (o'z guruhi)", value: 'Coach' },
            { label: 'Accountant (moliya)', value: 'Accountant' },
          ]}
          onChange={v => T.setTweak('role', v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}
