import { Strategy, Tactic } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StrategyCardProps {
  strategy: Strategy & { tactics?: Tactic[] };
  onClick?: () => void;
}

export function StrategyCard({ strategy, onClick }: StrategyCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'On Track';
      case 'on-hold':
        return 'At Risk';
      default:
        return status;
    }
  };

  const completedTactics = strategy.tactics?.filter(t => t.status === 'completed').length || 0;
  const totalTactics = strategy.tactics?.length || 0;
  const progress = totalTactics > 0 ? Math.round((completedTactics / totalTactics) * 100) : 0;

  return (
    <div 
      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-medium">
        Q4
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 truncate">{strategy.title}</h4>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{strategy.description}</p>
        <div className="flex items-center mt-2 space-x-4">
          <Badge className={getStatusColor(strategy.status)}>
            {getStatusText(strategy.status)}
          </Badge>
          <span className="text-xs text-gray-500">
            {totalTactics} tactics
          </span>
          <span className="text-xs text-gray-500">
            {progress}% complete
          </span>
        </div>
      </div>
      <div className="w-16">
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
