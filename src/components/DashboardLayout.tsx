import { ReactNode, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNotifications } from '@/contexts/ChatNotificationContext';
import { isChatApiEnabled } from '@/lib/api/chat';
import { Activity, LogOut, Home, Menu, Search, Bell, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SupportButton from '@/components/workflow/SupportButton';
import logo from '@/assets/GFA-health.png';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  group?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  /** Replaces the header patient search. Other departments keep the placeholder. */
  searchSlot?: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'gfa_sidebar_collapsed';

const DashboardLayout = ({ children, navItems, title, searchSlot }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const { totalUnread, commsPath } = useChatNotifications();
  const chatEnabled = isChatApiEnabled();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch { /* noop */ }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarWidth = sidebarCollapsed ? 'md:w-[4.5rem]' : 'md:w-64';
  const mainOffset = sidebarCollapsed ? 'md:ml-[4.5rem]' : 'md:ml-64';

  return (
    <div className="min-h-screen flex bg-subtle-gradient">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} w-64 bg-sidebar text-sidebar-foreground transform transition-all duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`h-16 flex items-center border-b border-sidebar-border ${sidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
          <img src={logo} alt="GFA HMS" className="h-10 w-10 object-contain bg-white rounded-full p-0.5 shrink-0" />
          {!sidebarCollapsed && (
            <div className="leading-tight min-w-0">
              <div className="font-display font-bold text-xs text-sidebar-foreground truncate">GFA HMS</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">GFA Demo Hospital</div>
            </div>
          )}
        </div>
        <SidebarNav items={navItems} collapsed={sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} />

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg bg-sidebar-accent/40">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sidebar-primary to-[hsl(250_73%_60%)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="text-xs leading-tight min-w-0">
                <div className="font-medium text-sidebar-foreground truncate">{user?.name}</div>
                <div className="text-sidebar-foreground/60 capitalize truncate">{user?.role}</div>
                {user?.department && <div className="text-sidebar-foreground/50 truncate">{user.department}</div>}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-red-500/15 hover:text-red-300 w-full transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ${mainOffset}`}>
        <header className="h-16 bg-card/80 backdrop-blur-md border-b flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
              onClick={toggleCollapsed}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <h1 className="font-display font-semibold text-foreground truncate">{title}</h1>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide capitalize">{user?.role}</span>
          </div>
          <div className={`${searchSlot ? 'hidden sm:flex' : 'hidden md:flex'} items-center flex-1 max-w-sm mx-4`}>
            {searchSlot ?? (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search patient by name, NIN, hospital ID…" className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-card" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chatEnabled && (
              <button
                type="button"
                aria-label="Staff messages"
                onClick={() => navigate(commsPath)}
                className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <Bell className="h-4 w-4 text-foreground/70" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            )}
            <Link to="/"><Button variant="ghost" size="sm"><Home className="h-4 w-4 mr-1" /> Home</Button></Link>
            <SupportButton />
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 animate-fade-in overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

function isNavActive(items: NavItem[], pathname: string, search: string, itemPath: string) {
  const splitAt = itemPath.indexOf('?');
  const path = splitAt === -1 ? itemPath : itemPath.slice(0, splitAt);
  const query = splitAt === -1 ? '' : itemPath.slice(splitAt + 1);
  if (pathname !== path) return false;
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const expected = new URLSearchParams(query);
  if ([...expected.keys()].length > 0) {
    return [...expected.entries()].every(([key, value]) => current.get(key) === value);
  }
  const siblingKeys = new Set<string>();
  items.forEach((other) => {
    const otherSplit = other.path.indexOf('?');
    if (otherSplit === -1) return;
    if (other.path.slice(0, otherSplit) !== path) return;
    new URLSearchParams(other.path.slice(otherSplit + 1)).forEach((_value, key) => siblingKeys.add(key));
  });
  for (const key of siblingKeys) {
    if (current.has(key)) return false;
  }
  return true;
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative ${collapsed ? 'justify-center px-2' : ''} ${active ? 'bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/5 text-sidebar-foreground font-semibold' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}
    >
      {active && !collapsed && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-sidebar-primary" />}
      <span className={active ? 'text-sidebar-primary shrink-0' : 'shrink-0'}>{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarNav({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const location = useLocation();
  const hasGroups = items.some(i => i.group);

  const groups = useMemo(() => {
    if (!hasGroups) return [] as { name: string; items: NavItem[] }[];
    const order: string[] = [];
    const map = new Map<string, NavItem[]>();
    items.forEach(i => {
      const g = i.group || 'Other';
      if (!map.has(g)) { map.set(g, []); order.push(g); }
      map.get(g)!.push(i);
    });
    return order.map(name => ({ name, items: map.get(name)! }));
  }, [items, hasGroups]);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach(g => { init[g.name] = true; });
    return init;
  });

  const navHeight = collapsed ? 'calc(100vh - 8rem - 3.5rem)' : 'calc(100vh - 8rem - 4rem)';

  if (!hasGroups) {
    return (
      <nav className="p-2 sm:p-3 space-y-1 overflow-y-auto overscroll-contain" style={{ maxHeight: navHeight }}>
        {items.map(item => (
          <SidebarLink
            key={item.path}
            item={item}
            active={isNavActive(items, location.pathname, location.search, item.path)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav className="p-2 sm:p-3 space-y-1 overflow-y-auto overscroll-contain" style={{ maxHeight: navHeight }}>
      {groups.map(g => {
        const isOpen = open[g.name] ?? true;
        return (
          <div key={g.name} className="mb-1">
            {!collapsed && (
              <button
                type="button"
                onClick={() => setOpen(s => ({ ...s, [g.name]: !isOpen }))}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <span>{g.name}</span>
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {(collapsed || isOpen) && (
              <div className="space-y-0.5">
                {g.items.map(item => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    active={isNavActive(items, location.pathname, location.search, item.path)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default DashboardLayout;
