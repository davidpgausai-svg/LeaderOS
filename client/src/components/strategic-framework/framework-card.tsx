import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Target, 
  ChevronRight, 
  Award, 
  CheckCircle, 
  TrendingUp,
  Star
} from "lucide-react";

interface FrameworkCardProps {
  title: string;
  goal: string;
  description: string;
  tactics: any[];
  outcomes: any[];
  colorCode: string;
  icon: React.ReactNode;
  status: string;
  actualProgress?: number;
}

export function FrameworkCard({ 
  title, 
  goal, 
  description, 
  tactics, 
  outcomes, 
  colorCode, 
  icon, 
  status,
  actualProgress = 0
}: FrameworkCardProps) {
  // Calculate completed tactics based on their actual progress (>= 100%)
  const completedTactics = tactics.filter(t => (t.progress || 0) >= 100).length;
  // Calculate completed outcomes based on their status
  const completedOutcomes = outcomes.filter(o => o.status === 'achieved').length;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader 
        className="pb-4"
        style={{ borderTop: `4px solid ${colorCode}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: colorCode }}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </CardTitle>
              <Badge 
                variant="outline" 
                className="mt-1"
                style={{ color: colorCode, borderColor: colorCode }}
              >
                {status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4" style={{ color: colorCode }} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">GOAL</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
            {goal}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Tactics Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colorCode }}
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">STRATEGIES</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedTactics}/{tactics.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {tactics.slice(0, 3).map((tactic, index) => (
              <div key={index} className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {tactic.title}
                  </p>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {tactic.progress || 0}%
                </span>
              </div>
            ))}
            {tactics.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                +{tactics.length - 3} more tactics
              </p>
            )}
          </div>
        </div>

        {/* Outcomes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" style={{ color: colorCode }} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                OUTCOMES
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedOutcomes}/{outcomes.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {outcomes.slice(0, 4).map((outcome, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                  outcome.status === 'achieved' ? 'text-green-500' : 
                  outcome.status === 'at_risk' ? 'text-red-500' : 
                  'text-gray-400'
                }`} />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {outcome.title}
                </p>
              </div>
            ))}
            {outcomes.length > 4 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                +{outcomes.length - 4} more outcomes
              </p>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mb-2">
            <span>Overall Progress</span>
            <span>{actualProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: colorCode,
                width: `${actualProgress}%`
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Link href="/strategies">
            <Button variant="outline" size="sm" className="flex-1">
              View Strategies
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
          <Link href="/outcomes">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              style={{ color: colorCode, borderColor: colorCode }}
            >
              Track Outcomes
              <TrendingUp className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}