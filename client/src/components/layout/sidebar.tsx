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
  CheckSquare,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PenLine,
  BookOpen,
  GitBranch,
  LayoutTemplate,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

const coreNavigation = [
  { name: "Strategy", href: "/strategies", icon: Target, iconColor: "text-indigo-500" },
  { name: "Projects", href: "/projects", icon: CheckSquare, iconColor: "text-emerald-500" },
  { name: "Actions", href: "/actions", icon: TrendingUp, iconColor: "text-amber-500" },
];

const secondaryNavigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Graph", href: "/graph", icon: GitBranch },
  { name: "Meeting Notes", href: "/meeting-notes", icon: PenLine },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentRole, currentUser } = useRole();
  const { user, logout } = useAuth();
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
      {/* Header with Toggle */}
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-800 flex items-center justify-between`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">StrategyPlan</h1>
          </div>
        )}
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Dashboard - Top item */}
        {(() => {
          const dashboardItem = secondaryNavigation[0];
          const isActive = location === dashboardItem.href;
          const Icon = dashboardItem.icon;
          
          const linkContent = (
            <div
              className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "text-white bg-primary"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} />
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
        <div className={`${isCollapsed ? 'py-2 px-1' : 'p-2'} bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700`}>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Core
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {coreNavigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              const linkContent = (
                <div
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-2'} py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-white dark:bg-slate-700 shadow-md ring-2 ring-amber-400 dark:ring-amber-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800"
                      : "text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm"
                  }`}
                >
                  <Icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 ${item.iconColor}`} />
                  {!isCollapsed && <span className={`font-semibold ${isActive ? 'text-gray-900 dark:text-white' : ''}`}>{item.name}</span>}
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
          const isActive = location === item.href;
          const Icon = item.icon;
          
          const linkContent = (
            <div
              className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "text-white bg-primary"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4`} />
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
        
        {/* Documentation Link */}
        <Link href="/documentation">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location === "/documentation"
                      ? "text-white bg-primary"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  data-testid="link-documentation"
                >
                  <BookOpen className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                Documentation
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location === "/documentation"
                  ? "text-white bg-primary"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="link-documentation"
            >
              <BookOpen className="mr-3 h-4 w-4" />
              Documentation
            </div>
          )}
        </Link>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 mx-auto bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer">
                  {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs capitalize">{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs text-gray-400">{user.organizationName}</p>
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Sign Out
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user.organizationName}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
