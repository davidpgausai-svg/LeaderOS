import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "wouter";
import { 
  Target, 
  ChevronRight, 
  Award, 
  CheckCircle, 
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface FrameworkCardProps {
  strategyId: string;
  title: string;
  goal: string;
  description: string;
  projects: any[];
  actions: any[];
  colorCode: string;
  icon: React.ReactNode;
  status: string;
  actualProgress?: number;
  caseForChange?: string;
  visionStatement?: string;
  successMetrics?: string;
  stakeholderMap?: string;
  readinessRating?: string;
  riskExposureRating?: string;
  changeChampionAssignment?: string;
  reinforcementPlan?: string;
  benefitsRealizationPlan?: string;
  hiddenContinuumSections?: string;
  customContinuumSections?: string;
}

export function FrameworkCard({ 
  strategyId,
  title, 
  goal, 
  description, 
  projects, 
  actions, 
  colorCode, 
  icon, 
  status,
  actualProgress = 0,
  caseForChange,
  visionStatement,
  successMetrics,
  stakeholderMap,
  readinessRating,
  riskExposureRating,
  changeChampionAssignment,
  reinforcementPlan,
  benefitsRealizationPlan,
  hiddenContinuumSections,
  customContinuumSections,
}: FrameworkCardProps) {
  const [expandedGoal, setExpandedGoal] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [expandedContinuum, setExpandedContinuum] = useState(false);
  
  // Calculate completed projects based on their actual progress (>= 100%)
  const completedProjects = projects.filter(t => (t.progress || 0) >= 100).length;
  // Calculate completed actions based on their status
  const completedActions = actions.filter(o => o.status === 'achieved').length;

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
        {/* Objective Section */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4" style={{ color: colorCode }} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">STRATEGY</span>
          </div>
          
          {/* Collapsible dropdowns with indentation and reduced spacing */}
          <div className="pl-6 space-y-1">
            <Collapsible
              open={expandedGoal}
              onOpenChange={setExpandedGoal}
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-2 py-1 h-auto"
                  data-testid="button-toggle-goal"
                >
                  <span className="text-xs font-semibold">OBJECTIVE</span>
                  {expandedGoal ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                    {goal}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible
              open={expandedDescription}
              onOpenChange={setExpandedDescription}
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-2 py-1 h-auto"
                  data-testid="button-toggle-description"
                >
                  <span className="text-xs font-semibold">OBJECTIVE DESCRIPTION</span>
                  {expandedDescription ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible
              open={expandedContinuum}
              onOpenChange={setExpandedContinuum}
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-2 py-1 h-auto"
                  data-testid="button-toggle-continuum"
                >
                  <span className="text-xs font-semibold">CHANGE CONTINUUM</span>
                  {expandedContinuum ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-2">
                {(() => {
                  const hidden: string[] = (() => { try { return JSON.parse(hiddenContinuumSections || "[]"); } catch { return []; } })();
                  const custom: {label: string; value: string}[] = (() => { try { return JSON.parse(customContinuumSections || "[]"); } catch { return []; } })();
                  const allSections = [
                    { key: "caseForChange", label: "Case for Change", value: caseForChange },
                    { key: "visionStatement", label: "Vision Statement", value: visionStatement },
                    { key: "successMetrics", label: "Success Metrics", value: successMetrics },
                    { key: "stakeholderMap", label: "Stakeholder Map", value: stakeholderMap },
                    { key: "readinessRating", label: "Readiness Rating (RAG)", value: readinessRating },
                    { key: "riskExposureRating", label: "Risk Exposure Rating", value: riskExposureRating },
                    { key: "changeChampionAssignment", label: "Change Champion Assignment", value: changeChampionAssignment },
                    { key: "reinforcementPlan", label: "Reinforcement Plan", value: reinforcementPlan },
                    { key: "benefitsRealizationPlan", label: "Benefits Realization Plan", value: benefitsRealizationPlan },
                  ].filter(s => !hidden.includes(s.key));
                  return (
                    <>
                      {allSections.map((s) => (
                        <div key={s.key} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{s.label}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{s.value || "To be defined"}</div>
                        </div>
                      ))}
                      {custom.map((s, idx) => (
                        <div key={`custom-${idx}`} className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{s.label}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{s.value || "To be defined"}</div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colorCode }}
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">PROJECTS</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedProjects}/{projects.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 3).map((project, index) => (
              <div key={index} className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {project.title}
                  </p>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {project.progress || 0}%
                </span>
              </div>
            ))}
            {projects.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                +{projects.length - 3} more projects
              </p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" style={{ color: colorCode }} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                ACTIONS
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedActions}/{actions.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {actions.slice(0, 4).map((action, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                  action.status === 'achieved' ? 'text-green-500' : 
                  action.status === 'at_risk' ? 'text-red-500' : 
                  'text-gray-400'
                }`} />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {action.title}
                </p>
              </div>
            ))}
            {actions.length > 4 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                +{actions.length - 4} more actions
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
          <Link href={`/strategies?strategyId=${strategyId}`}>
            <Button variant="outline" size="sm" className="flex-1">
              View Strategy
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}