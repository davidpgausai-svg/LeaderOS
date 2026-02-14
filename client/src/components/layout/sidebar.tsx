import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartLine,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PenLine,
  CalendarDays,
  GanttChart,
  Crown,
  ClipboardList,
  Inbox,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import logoImage from "@assets/Strategy_Plan_Logo_2.0_-_dark_1764957298563.png";

const coreNavigation = [
  { name: "Priorities", href: "/strategies", icon: Target, iconColor: "#007AFF" },
];

const secondaryNavigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Timeline", href: "/timeline", icon: GanttChart },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Meeting Notes", href: "/meeting-notes", icon: PenLine },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentRole, currentUser, isSuperAdmin } = useRole();
  const { user, logout } = useAuth();

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location === href || location.startsWith(href + "/") || location.startsWith(href + "?");
  };
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside 
      className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col transition-all duration-300 border-r relative z-50`}
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header with Toggle */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <img 
            src={logoImage} 
            alt="Strategy Plan" 
            className={isCollapsed ? "h-10 w-10 object-contain" : "h-10 w-auto"} 
          />
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full transition-all duration-200 hover:bg-black/5"
          style={{ color: '#86868B' }}
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Dashboard - Top item */}
        {(() => {
          const dashboardItem = secondaryNavigation[0];
          const isActive = isActiveRoute(dashboardItem.href);
          const Icon = dashboardItem.icon;
          
          const linkContent = (
            <div
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                isActive
                  ? "shadow-sm"
                  : "hover:bg-black/5"
              }`}
              style={{
                backgroundColor: isActive ? '#007AFF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#1D1D1F',
              }}
            >
              <Icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} style={{ color: isActive ? '#FFFFFF' : '#86868B' }} />
              {!isCollapsed && dashboardItem.name}
            </div>
          );

          return (
            <Link key={dashboardItem.name} href={dashboardItem.href}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {dashboardItem.name}
                  </TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              )}
            </Link>
          );
        })()}

        {/* Core Navigation - Visual Group */}
        <div 
          className={`${isCollapsed ? 'py-2 px-1' : 'p-2'} rounded-2xl my-2`}
          style={{ backgroundColor: 'rgba(0, 122, 255, 0.08)' }}
        >
          {!isCollapsed && (
            <div className="px-2 pb-1.5 mb-1">
              <span 
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: '#007AFF' }}
              >
                Core
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {coreNavigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;
              
              const linkContent = (
                <div
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-2'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                    isActive
                      ? "shadow-sm"
                      : "hover:bg-white/60"
                  }`}
                  style={{
                    backgroundColor: isActive ? '#007AFF' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#1D1D1F',
                  }}
                >
                  <Icon 
                    className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} 
                    style={{ color: isActive ? '#FFFFFF' : item.iconColor }}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              );

              return (
                <Link key={item.name} href={item.href} className="block">
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Secondary Navigation */}
        {secondaryNavigation.slice(1).map((item) => {
          const isActive = isActiveRoute(item.href);
          const Icon = item.icon;
          
          const linkContent = (
            <div
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                isActive
                  ? "shadow-sm"
                  : "hover:bg-black/5"
              }`}
              style={{
                backgroundColor: isActive ? '#007AFF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#1D1D1F',
              }}
            >
              <Icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} style={{ color: isActive ? '#FFFFFF' : '#86868B' }} />
              {!isCollapsed && item.name}
            </div>
          );

          return (
            <Link key={item.name} href={item.href}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              )}
            </Link>
          );
        })}
        
        {/* Notifications - Special navigation item that shows dropdown */}
        <div className={`${isCollapsed ? 'flex justify-center' : ''}`}>
          <NotificationBell isCollapsed={isCollapsed} />
        </div>
        
        {/* Intake Forms - Admin only */}
        {currentRole === 'administrator' && (() => {
          const intakeItems = [
            { name: "Intake Forms", href: "/intake-forms", icon: ClipboardList },
            { name: "Submissions", href: "/intake-submissions", icon: Inbox },
          ];
          return intakeItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;
            const linkContent = (
              <div
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                  isActive ? "shadow-sm" : "hover:bg-black/5"
                }`}
                style={{
                  backgroundColor: isActive ? '#007AFF' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#1D1D1F',
                }}
              >
                <Icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} style={{ color: isActive ? '#FFFFFF' : '#86868B' }} />
                {!isCollapsed && item.name}
              </div>
            );
            return (
              <Link key={item.name} href={item.href}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                ) : linkContent}
              </Link>
            );
          });
        })()}

        {/* Submissions - Co-Lead (admin already sees it above) */}
        {currentRole === 'co_lead' && (() => {
          const isActive = isActiveRoute("/intake-submissions");
          const linkContent = (
            <div
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                isActive ? "shadow-sm" : "hover:bg-black/5"
              }`}
              style={{
                backgroundColor: isActive ? '#007AFF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#1D1D1F',
              }}
            >
              <Inbox className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} style={{ color: isActive ? '#FFFFFF' : '#86868B' }} />
              {!isCollapsed && "Submissions"}
            </div>
          );
          return (
            <Link href="/intake-submissions">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">Submissions</TooltipContent>
                </Tooltip>
              ) : linkContent}
            </Link>
          );
        })()}

        {/* Super Admin Link - Only visible to Super Admins */}
        {isSuperAdmin() && (() => {
          const isAdminActive = isActiveRoute("/super-admin");
          return (
            <Link href="/super-admin">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                        isAdminActive
                          ? "shadow-sm"
                          : "hover:bg-black/5"
                      }`}
                      style={{
                        backgroundColor: isAdminActive ? '#F59E0B' : 'transparent',
                        color: isAdminActive ? '#FFFFFF' : '#F59E0B',
                      }}
                      data-testid="link-super-admin"
                    >
                      <Crown className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Super Admin
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                    isAdminActive
                      ? "shadow-sm"
                      : "hover:bg-black/5"
                  }`}
                  style={{
                    backgroundColor: isAdminActive ? '#F59E0B' : 'transparent',
                    color: isAdminActive ? '#FFFFFF' : '#F59E0B',
                  }}
                  data-testid="link-super-admin"
                >
                  <Crown className="mr-3 h-4 w-4" />
                  Super Admin
                </div>
              )}
            </Link>
          );
        })()}

      </nav>
      
      {/* User Profile */}
      <div 
        className="p-4 border-t space-y-3"
        style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
      >
        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: '#007AFF' }}
                >
                  {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium" style={{ color: '#1D1D1F' }}>
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs capitalize" style={{ color: '#86868B' }}>{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs" style={{ color: '#86868B' }}>{user.organizationName}</p>
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 hover:bg-black/5"
                  style={{ color: '#86868B' }}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Sign Out
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: '#007AFF' }}
              >
                {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs capitalize" style={{ color: '#86868B' }}>{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>{user.organizationName}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-black/5"
              style={{ color: '#86868B' }}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
