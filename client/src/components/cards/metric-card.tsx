import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    label: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconBgColor,
  iconColor
}: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-navy-dark rounded-lg shadow-sm border border-fog-dark dark:border-graphite-dark p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-graphite dark:text-fog-dark">{title}</p>
          <p className="text-3xl font-bold text-navy dark:text-white mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`${iconColor} text-xl`} size={20} />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${
            change.trend === 'up' ? 'text-lime-dark' : 
            change.trend === 'down' ? 'text-red-600' : 
            'text-graphite dark:text-fog-dark'
          }`}>
            {change.value}
          </span>
          <span className="text-graphite-dark dark:text-fog-dark text-sm ml-2">{change.label}</span>
        </div>
      )}
    </div>
  );
}
