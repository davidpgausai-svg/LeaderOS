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
  { name: "Strategy", href: "/strategies", icon: Target, iconColor: "text-navy dark:text-teal" },
  { name: "Projects", href: "/projects", icon: CheckSquare, iconColor: "text-teal dark:text-teal-light" },
  { name: "Actions", href: "/actions", icon: TrendingUp, iconColor: "text-lime-dark dark:text-lime" },
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-fog dark:bg-navy-dark border-r border-fog-dark dark:border-graphite-dark flex flex-col transition-all duration-300`}>
      {/* Header with Toggle */}
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-fog-dark dark:border-graphite-dark flex items-center justify-between`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-navy dark:text-white">Executive Planner</h1>
          </div>
        )}
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="sm"
          className="text-graphite hover:text-navy dark:text-fog-dark dark:hover:text-white"
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
                  ? "text-white bg-navy dark:bg-teal dark:text-navy"
                  : "text-graphite dark:text-fog-dark hover:bg-fog-dark dark:hover:bg-graphite-dark"
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
        <div className={`${isCollapsed ? 'py-2 px-1' : 'p-2'} bg-gradient-to-r from-fog to-fog-dark dark:from-navy dark:to-navy-dark rounded-lg border border-fog-dark dark:border-graphite-dark`}>
          {!isCollapsed && (
            <div className="px-2 pb-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-graphite dark:text-fog-dark">
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
                      ? "bg-white dark:bg-graphite shadow-md ring-2 ring-teal dark:ring-teal ring-offset-2 ring-offset-fog dark:ring-offset-navy"
                      : "text-graphite dark:text-fog hover:bg-white dark:hover:bg-graphite-dark hover:shadow-sm"
                  }`}
                >
                  <Icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 ${item.iconColor}`} />
                  {!isCollapsed && <span className={`font-semibold ${isActive ? 'text-navy dark:text-white' : ''}`}>{item.name}</span>}
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
                  ? "text-white bg-navy dark:bg-teal dark:text-navy"
                  : "text-graphite dark:text-fog-dark hover:bg-fog-dark dark:hover:bg-graphite-dark"
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
                      ? "text-white bg-navy dark:bg-teal dark:text-navy"
                      : "text-graphite dark:text-fog-dark hover:bg-fog-dark dark:hover:bg-graphite-dark"
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
                  ? "text-white bg-navy dark:bg-teal dark:text-navy"
                  : "text-graphite dark:text-fog-dark hover:bg-fog-dark dark:hover:bg-graphite-dark"
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
      <div className="p-4 border-t border-fog-dark dark:border-graphite-dark space-y-3">
        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 mx-auto bg-navy dark:bg-teal rounded-full flex items-center justify-center text-white dark:text-navy text-sm font-medium cursor-pointer">
                  {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs capitalize">{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs text-fog-dark">{user.organizationName}</p>
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-graphite dark:text-fog-dark hover:text-navy dark:hover:text-white"
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
              <div className="w-8 h-8 bg-navy dark:bg-teal rounded-full flex items-center justify-center text-white dark:text-navy text-sm font-medium">
                {user?.firstName?.[0] || user?.lastName?.[0] || "U"}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-navy dark:text-white">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
                </p>
                <p className="text-xs text-graphite dark:text-fog-dark capitalize">{user?.role || currentRole}</p>
                {user?.organizationName && (
                  <p className="text-xs text-graphite-dark dark:text-fog-dark mt-0.5">{user.organizationName}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full justify-start text-graphite dark:text-fog-dark hover:text-navy dark:hover:text-white"
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
