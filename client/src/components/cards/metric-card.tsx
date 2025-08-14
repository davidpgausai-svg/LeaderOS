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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`${iconColor} text-xl`} size={20} />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center">
          
          <span className="text-gray-500 text-sm ml-2">{change.label}</span>
        </div>
      )}
    </div>
  );
}
