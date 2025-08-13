import { Link, useLocation } from "wouter";
import { useRole } from "@/hooks/use-role";
import {
  ChartLine,
  Target,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Framework", href: "/framework", icon: Target },
  { name: "Strategies", href: "/strategies", icon: CheckSquare },
  { name: "Outcomes", href: "/outcomes", icon: TrendingUp },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentRole, currentUser } = useRole();

  return (
    <aside className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">StrategicFlow</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Strategic Planning Platform</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-white bg-primary"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            {currentUser?.initials || "JD"}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser?.name || "John Doe"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
