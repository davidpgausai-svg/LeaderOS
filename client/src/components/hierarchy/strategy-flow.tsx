import { Strategy, Tactic } from "@shared/schema";
import { CheckCircle, Clock, Circle } from "lucide-react";

interface StrategyFlowProps {
  strategies: (Strategy & { tactics: Tactic[] })[];
}

export function StrategyFlow({ strategies }: StrategyFlowProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStrategyColor = (index: number) => {
    const colors = ['border-blue-500', 'border-purple-500', 'border-green-500', 'border-orange-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {strategies.slice(0, 3).map((strategy, index) => (
        <div key={strategy.id} className={`border-l-4 ${getStrategyColor(index)} pl-4`}>
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{strategy.title}</h4>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              Strategy
            </span>
          </div>
          <div className="mt-3 ml-4 space-y-2">
            {strategy.tactics.slice(0, 3).map((tactic) => (
              <div key={tactic.id} className="flex items-center text-sm text-gray-600">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {getStatusIcon(tactic.status)}
                </div>
                <span className="flex-1">{tactic.title}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
