import { Activity, User } from "@shared/schema";
import { CheckCircle, Plus, AlertTriangle, Clock } from "lucide-react";

interface ActivityFeedProps {
  activities: (Activity & { user?: User })[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tactic_completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'strategy_created':
      case 'tactic_created':
        return <Plus className="w-4 h-4" />;
      case 'tactic_overdue':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'tactic_completed':
        return 'bg-green-500';
      case 'strategy_created':
      case 'tactic_created':
        return 'bg-blue-500';
      case 'tactic_overdue':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date: Date | undefined) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours === 0) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  return (
    <div className="space-y-4">
      {activities.slice(0, 10).map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className={`w-8 h-8 ${getActivityBgColor(activity.type)} rounded-full flex items-center justify-center text-white text-xs`}>
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{activity.user?.name || 'Unknown user'}</span>{' '}
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatTimeAgo(activity.createdAt || undefined)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
