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
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Strategy", href: "/strategies", icon: Target },
  { name: "Projects", href: "/projects", icon: CheckSquare },
  { name: "Actions", href: "/actions", icon: TrendingUp },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Graph", href: "/graph", icon: GitBranch },
  { name: "Meeting Notes", href: "/meeting-notes", icon: PenLine },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentRole, currentUser } = useRole();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Default to collapsed, but check localStorage
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
      {/* Header with Toggle */}
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-800 flex items-center justify-between`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Executive Planner</h1>
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
        {navigation.map((item) => {
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
