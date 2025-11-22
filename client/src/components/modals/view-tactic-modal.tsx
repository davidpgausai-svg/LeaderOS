import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Eye, 
  Target, 
  Users, 
  Calendar, 
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface ViewTacticModalProps {
  isOpen: boolean;
  onClose: () => void;
  tactic: any;
}

type User = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
};

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
};

export function ViewTacticModal({ isOpen, onClose, tactic }: ViewTacticModalProps) {
  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  if (!tactic) return null;

  const strategy = (strategies as Strategy[])?.find((s) => s.id === tactic.strategyId);

  const getAccountableLeaders = (): User[] => {
    try {
      const leaderIds = JSON.parse(tactic.accountableLeaders);
      return (users as User[])?.filter((user) => leaderIds.includes(user.id)) || [];
    } catch {
      return [];
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'C': { label: 'Completed', color: 'bg-green-500', textColor: 'text-green-700' },
      'OT': { label: 'On Track', color: 'bg-blue-500', textColor: 'text-blue-700' },
      'OH': { label: 'On Hold', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
      'B': { label: 'Behind', color: 'bg-red-500', textColor: 'text-red-700' },
      'NYS': { label: 'Not Yet Started', color: 'bg-gray-500', textColor: 'text-gray-700' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap['NYS'];
  };

  const statusInfo = getStatusDisplay(tactic.status);
  const accountableLeaders = getAccountableLeaders();

  const InfoField = ({ label, value, icon }: { label: string; value: string; icon?: any }) => (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-gray-900 dark:text-white">{value || "Not specified"}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span>View Project Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <InfoField label="Project Title" value={tactic.title} />
              </div>
              <Badge 
                className={`${statusInfo.color} text-white ml-4`}
                data-testid="view-tactic-status-badge"
              >
                {statusInfo.label}
              </Badge>
            </div>

            <InfoField label="Description" value={tactic.description} />

            {strategy && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy</div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: strategy.colorCode }}
                  />
                  <span className="text-gray-900 dark:text-white">{strategy.title}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* KPI Section */}
          <div className="space-y-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h3 className="text-lg font-semibold border-b border-blue-200 dark:border-blue-800 pb-2 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Key Performance Indicator</span>
            </h3>
            
            <InfoField label="KPI Definition" value={tactic.kpi} />
            {tactic.kpiTracking && (
              <InfoField label="Current KPI Value" value={tactic.kpiTracking} />
            )}
          </div>

          <Separator />

          {/* Accountable Leaders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Accountable Leaders</span>
            </h3>
            
            {accountableLeaders.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {accountableLeaders.map((leader) => (
                  <div 
                    key={leader.id} 
                    className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg"
                    data-testid={`view-leader-${leader.id}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-purple-500 text-white text-xs">
                        {leader.firstName?.[0]}{leader.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {leader.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {leader.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No leaders assigned</p>
            )}
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Timeline</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField 
                label="Start Date" 
                value={format(new Date(tactic.startDate), "PPP")} 
              />
              <InfoField 
                label="Due Date" 
                value={format(new Date(tactic.dueDate), "PPP")} 
              />
            </div>
          </div>

          <Separator />

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Resources</h3>
            
            <InfoField label="Resources Required" value={tactic.resourcesRequired || "Not specified"} />
            
            {tactic.documentFolderUrl && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Folder</div>
                <a 
                  href={tactic.documentFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                  data-testid="view-document-folder-link"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Document Folder</span>
                </a>
              </div>
            )}
            
            {tactic.communicationUrl && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Communication URL</div>
                <a 
                  href={tactic.communicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                  data-testid="view-communication-url-link"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Communication Material</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onClose}
            data-testid="button-close-view-tactic"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
