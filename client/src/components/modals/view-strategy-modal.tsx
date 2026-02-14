import { type Strategy } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";
import { format } from "date-fns";

interface ViewStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
}

export function ViewStrategyModal({ open, onOpenChange, strategy }: ViewStrategyModalProps) {
  if (!strategy) return null;

  const InfoField = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
      <div className="text-gray-900 dark:text-white">{value || "Not specified"}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span>View Strategy</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <InfoField label="Strategy Title" value={strategy.title} />
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: strategy.colorCode }}
                  data-testid="view-strategy-color"
                />
                <Badge 
                  variant="outline" 
                  className="text-sm"
                  data-testid="view-strategy-status"
                >
                  {strategy.status}
                </Badge>
              </div>
            </div>

            <InfoField label="Description" value={strategy.description} />
            {strategy.goal && <InfoField label="Strategic Objective" value={strategy.goal} />}
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField 
                label="Start Date" 
                value={format(new Date(strategy.startDate), "PPP")} 
              />
              <InfoField 
                label="Target Date" 
                value={format(new Date(strategy.targetDate), "PPP")} 
              />
            </div>
            {strategy.completionDate && (
              <InfoField 
                label="Completion Date" 
                value={format(new Date(strategy.completionDate), "PPP")} 
              />
            )}
          </div>

          <Separator />

          {/* Metrics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Success Metrics</h3>
            <InfoField label="Metrics" value={strategy.metrics} />
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress:</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="view-strategy-progress">
                {strategy.progress}%
              </span>
            </div>
          </div>

          <Separator />

          {/* Change Continuum */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Change Continuum</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive change management framework for this strategy
            </p>

            {(() => {
              const hiddenSections: string[] = (() => { try { return JSON.parse((strategy as any).hiddenContinuumSections || "[]"); } catch { return []; } })();
              const customSections: {label: string; value: string}[] = (() => { try { return JSON.parse((strategy as any).customContinuumSections || "[]"); } catch { return []; } })();
              const builtInSections = [
                { key: "caseForChange", label: "Case for Change" },
                { key: "visionStatement", label: "Vision Statement" },
                { key: "successMetrics", label: "Success Metrics" },
                { key: "stakeholderMap", label: "Stakeholder Map" },
                { key: "readinessRating", label: "Readiness Rating (RAG)" },
                { key: "riskExposureRating", label: "Risk Exposure Rating" },
                { key: "changeChampionAssignment", label: "Change Champion Assignment" },
                { key: "reinforcementPlan", label: "Reinforcement Plan" },
                { key: "benefitsRealizationPlan", label: "Benefits Realization Plan" },
              ];
              const visibleBuiltIn = builtInSections.filter(s => !hiddenSections.includes(s.key));
              let counter = 0;
              return (
                <div className="space-y-4">
                  {visibleBuiltIn.map((section) => {
                    counter++;
                    return (
                      <div key={section.key} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <InfoField label={`${counter}. ${section.label}`} value={(strategy as any)[section.key]} />
                      </div>
                    );
                  })}
                  {customSections.map((section, idx) => {
                    counter++;
                    return (
                      <div key={`custom-${idx}`} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <InfoField label={`${counter}. ${section.label}`} value={section.value} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => onOpenChange(false)}
            data-testid="button-close-view-strategy"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
