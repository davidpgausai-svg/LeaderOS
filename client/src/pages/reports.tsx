import { useState, useRef, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReactToPrint } from "react-to-print";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Target,
  Users,
  Check,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  FileDown,
  FileText,
  Calendar,
  TrendingUp,
  BarChart3,
  Tag,
  Award,
  Briefcase,
  ListChecks,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Link2,
  Archive,
  RotateCcw,
  Copy,
  Bell,
  User as UserIcon,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, differenceInDays, isPast, isBefore } from "date-fns";

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
  status: string;
  progress: number;
  startDate: string;
  targetDate: string;
  dueDate: string;
  completionDate?: string;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
  progress: number;
  status: string;
  startDate: string;
  dueDate: string;
  completionDate?: string;
  isArchived?: string;
  accountableLeaders: string; // JSON array of user IDs
};

type Action = {
  id: string;
  title: string;
  projectId: string;
  strategyId: string;
  status: string;
  targetDate: string;
  achievedDate?: string;
  isArchived?: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  fte?: string;
  salary?: number;
  serviceDeliveryHours?: string;
};

type ResourceAssignment = {
  id: string;
  projectId: string;
  userId: string;
  hoursPerWeek: string;
  organizationId: string;
};

type ExecutiveGoal = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: string;
};

type StrategyExecutiveGoal = {
  id: string;
  strategyId: string;
  executiveGoalId: string;
  organizationId: string;
};

type TeamTag = {
  id: string;
  name: string;
  colorHex: string;
  organizationId: string;
};

type ProjectTeamTag = {
  id: string;
  projectId: string;
  teamTagId: string;
  organizationId: string;
};

type Dependency = {
  id: string;
  sourceType: "project" | "action";
  sourceId: string;
  targetType: "project" | "action";
  targetId: string;
};

interface ReportWorkstream {
  id: string; name: string; lead: string | null; sortOrder: number;
}
interface ReportPhase {
  id: string; name: string; sequence: number; plannedStart: string | null; plannedEnd: string | null;
}
interface ReportTask {
  id: string; workstreamId: string; phaseId: string; name: string;
  isMilestone: string; milestoneType: string | null; percentComplete: number; status: string;
}
interface ReportCalculationDataRaw {
  taskRag: Record<string, string>;
  workstreamGateRag: Record<string, Record<string, string>>;
  programGateRag: Record<string, string>;
  criticalPath: Record<string, { isCritical: boolean; totalFloat: number }>;
}
interface ReportCalculationData {
  taskRags: Record<string, string>;
  workstreamGateRags: Record<string, string>;
  programGateRags: Record<string, string>;
}

const ERP_RAG_COLORS: Record<string, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

function ErpRagDot({ status }: { status?: string }) {
  if (!status) return <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />;
  if (status === "COMPLETE") return <CheckCircle className="w-3.5 h-3.5 text-green-600 inline-block" />;
  return <span className={`w-3 h-3 rounded-full inline-block ${ERP_RAG_COLORS[status] || "bg-gray-300"}`} />;
}

function ErpRagLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
      <span className="font-semibold text-gray-700 mr-1">Status Key:</span>
      <span className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        <span>Complete</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
        <span>On Track</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
        <span>At Risk (within 5-day buffer)</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
        <span>Behind Schedule / Blocked / Unmet Criteria</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />
        <span>No Data</span>
      </span>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'administrator';
  
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || "capacity";
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const [erpSelectedStrategyId, setErpSelectedStrategyId] = useState<string>("");

  const { data: erpWorkstreams = [] } = useQuery<ReportWorkstream[]>({
    queryKey: [`/api/workstreams?strategyId=${erpSelectedStrategyId}`],
    enabled: !!erpSelectedStrategyId,
  });

  const { data: erpPhases = [] } = useQuery<ReportPhase[]>({
    queryKey: [`/api/phases?strategyId=${erpSelectedStrategyId}`],
    enabled: !!erpSelectedStrategyId,
  });

  const { data: erpTasks = [] } = useQuery<ReportTask[]>({
    queryKey: [`/api/workstream-tasks?strategyId=${erpSelectedStrategyId}`],
    enabled: !!erpSelectedStrategyId,
  });

  const { data: erpCalculations } = useQuery<ReportCalculationDataRaw, Error, ReportCalculationData>({
    queryKey: [`/api/workstream-calculations?strategyId=${erpSelectedStrategyId}`],
    enabled: !!erpSelectedStrategyId,
    select: (raw: ReportCalculationDataRaw): ReportCalculationData => {
      const workstreamGateRags: Record<string, string> = {};
      if (raw.workstreamGateRag) {
        for (const [wsId, phaseMap] of Object.entries(raw.workstreamGateRag)) {
          for (const [phId, rag] of Object.entries(phaseMap)) {
            workstreamGateRags[`${wsId}_${phId}`] = rag;
          }
        }
      }
      return {
        taskRags: raw.taskRag || {},
        workstreamGateRags,
        programGateRags: raw.programGateRag || {},
      };
    },
  });

  const sortedErpPhases = useMemo(() => [...erpPhases].sort((a, b) => a.sequence - b.sequence), [erpPhases]);
  const sortedErpWorkstreams = useMemo(() => [...erpWorkstreams].sort((a, b) => a.sortOrder - b.sortOrder), [erpWorkstreams]);
  const erpProgramGateTasks = useMemo(() => erpTasks.filter(t => t.isMilestone === "true" && t.milestoneType === "program_gate"), [erpTasks]);
  const erpWorkstreamGateTasks = useMemo(() => erpTasks.filter(t => t.isMilestone === "true" && t.milestoneType === "workstream_gate"), [erpTasks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get('tab');
    if (currentTab !== activeTab) {
      const newUrl = activeTab === 'capacity' 
        ? '/reports' 
        : `/reports?tab=${activeTab}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeTab]);

  const { data: strategies = [], isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions = [], isLoading: actionsLoading } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: executiveGoals = [] } = useQuery<ExecutiveGoal[]>({
    queryKey: ["/api/executive-goals"],
  });

  const { data: strategyExecutiveGoalMappings = [] } = useQuery<StrategyExecutiveGoal[]>({
    queryKey: ["/api/strategy-executive-goals"],
  });

  const { data: teamTags = [] } = useQuery<TeamTag[]>({
    queryKey: ["/api/team-tags"],
  });

  const { data: projectTeamTags = [] } = useQuery<ProjectTeamTag[]>({
    queryKey: ["/api/project-team-tags"],
  });

  const { data: userTeamTags = [] } = useQuery<any[]>({
    queryKey: ["/api/user-team-tags"],
  });

  const { data: resourceAssignments = [] } = useQuery<ResourceAssignment[]>({
    queryKey: ["/api/resource-assignments"],
  });

  const { data: dependencies = [] } = useQuery<Dependency[]>({
    queryKey: ["/api/dependencies"],
    queryFn: async () => {
      const response = await fetch("/api/dependencies", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch dependencies");
      return response.json();
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Strategic Report - ${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const flattenValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const escapeCSV = (value: any): string => {
    const str = flattenValue(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const convertToCSV = (data: any[], defaultHeaders?: string[]): string => {
    const headers = data.length > 0 ? Object.keys(data[0]) : (defaultHeaders || []);
    if (headers.length === 0) return '';
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => escapeCSV(row[header])).join(','))
    ];
    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getReportName = (tab: string): string => {
    const names: Record<string, string> = {
      'capacity': 'Capacity Report',
      'team-tags': 'Team Capacity Report',
      'executive-goals': 'Executive Goals Report',
      'health': 'Strategy Health Report',
      'timeline': 'Timeline Risk Report',
      'ownership': 'Ownership Report',
      'graph': 'Dependencies Graph Report',
      'archived': 'Archived Projects Report'
    };
    return names[tab] || 'Report';
  };

  const handleExportCSV = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    const reportName = getReportName(activeTab).replace(/\s+/g, '-').toLowerCase();
    let csvData: any[] = [];
    
    switch (activeTab) {
      case 'capacity':
        csvData = users.filter(u => u.role !== 'sme').map(u => {
          const userAssignments = resourceAssignments.filter(ra => ra.userId === u.id);
          const totalHours = userAssignments.reduce((sum, ra) => sum + parseFloat(ra.hoursPerWeek || '0'), 0);
          const fte = parseFloat(u.fte || '1') * 40;
          return {
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            role: u.role,
            fte: u.fte || '1',
            weeklyCapacityHours: fte,
            assignedHours: totalHours,
            availableHours: Math.max(0, fte - totalHours),
            utilizationPercent: fte > 0 ? Math.round((totalHours / fte) * 100) : 0,
            projectCount: userAssignments.length
          };
        });
        break;
      case 'team-tags':
        csvData = teamTags.map(tag => {
          const tagProjects = projectTeamTags.filter(pt => pt.teamTagId === tag.id);
          return {
            tagName: tag.name,
            color: tag.colorHex,
            projectCount: tagProjects.length,
            projects: tagProjects.map(pt => {
              const p = projects.find(proj => proj.id === pt.projectId);
              return p?.title || '';
            }).filter(Boolean).join('; ')
          };
        });
        break;
      case 'executive-goals':
        csvData = executiveGoals.map(goal => {
          const goalStrategies = strategyExecutiveGoalMappings
            .filter(m => m.executiveGoalId === goal.id)
            .map(m => strategies.find(s => s.id === m.strategyId))
            .filter(Boolean);
          return {
            goalName: goal.name,
            description: goal.description || '',
            strategyCount: goalStrategies.length,
            strategies: goalStrategies.map(s => s?.title || '').join('; '),
            avgProgress: goalStrategies.length > 0 
              ? Math.round(goalStrategies.reduce((sum, s) => sum + (s?.progress || 0), 0) / goalStrategies.length) 
              : 0
          };
        });
        break;
      case 'health':
        csvData = strategies.map(s => {
          const stratProjects = projects.filter(p => p.strategyId === s.id && p.isArchived !== 'true');
          const riskLevel = getRiskLevel(s, 'strategy', stratProjects);
          return {
            strategyName: s.title,
            status: s.status,
            progress: s.progress,
            riskLevel,
            startDate: s.startDate,
            dueDate: s.dueDate,
            projectCount: stratProjects.length,
            completedProjects: stratProjects.filter(p => p.status === 'C').length
          };
        });
        break;
      case 'timeline':
        csvData = projects.filter(p => p.isArchived !== 'true').map(p => {
          const strategy = strategies.find(s => s.id === p.strategyId);
          const riskLevel = getRiskLevel(p, 'project');
          const dueDate = safeDate(p.dueDate);
          const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
          return {
            projectName: p.title,
            strategyName: strategy?.title || '',
            status: p.status,
            progress: p.progress,
            riskLevel,
            startDate: p.startDate,
            dueDate: p.dueDate,
            daysUntilDue,
            isOverdue: dueDate ? isPast(dueDate) : false
          };
        });
        break;
      case 'ownership':
        csvData = projects.filter(p => p.isArchived !== 'true').map(p => {
          const strategy = strategies.find(s => s.id === p.strategyId);
          let leaders: string[] = [];
          try {
            leaders = JSON.parse(p.accountableLeaders || '[]');
          } catch { leaders = []; }
          const leaderNames = leaders.map(lid => {
            const u = users.find(usr => usr.id === lid);
            return u ? `${u.firstName} ${u.lastName}` : '';
          }).filter(Boolean);
          return {
            projectName: p.title,
            strategyName: strategy?.title || '',
            status: p.status,
            progress: p.progress,
            accountableLeaders: leaderNames.join('; '),
            leaderCount: leaderNames.length
          };
        });
        break;
      case 'graph':
        csvData = dependencies.map(d => {
          const sourceItem = d.sourceType === 'project' 
            ? projects.find(p => p.id === d.sourceId)
            : actions.find(a => a.id === d.sourceId);
          const targetItem = d.targetType === 'project'
            ? projects.find(p => p.id === d.targetId)
            : actions.find(a => a.id === d.targetId);
          return {
            sourceType: d.sourceType,
            sourceName: sourceItem?.title || d.sourceId,
            targetType: d.targetType,
            targetName: targetItem?.title || d.targetId,
            relationship: 'depends on'
          };
        });
        break;
      case 'archived':
        csvData = projects.filter(p => p.isArchived === 'true').map(p => {
          const strategy = strategies.find(s => s.id === p.strategyId);
          return {
            projectName: p.title,
            strategyName: strategy?.title || '',
            status: p.status,
            progress: p.progress,
            startDate: p.startDate,
            dueDate: p.dueDate,
            completionDate: p.completionDate || ''
          };
        });
        break;
    }
    
    if (csvData.length === 0) {
      toast({
        title: "No data",
        description: "There is no data to export for this report.",
        variant: "destructive"
      });
      return;
    }
    
    const csv = convertToCSV(csvData);
    downloadCSV(csv, `${reportName}-${timestamp}.csv`);
    toast({
      title: "Success",
      description: `Exported ${csvData.length} rows to CSV`
    });
  };

  // Safe date parsing helper
  const safeDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Helper function to determine risk level
  const getRiskLevel = (item: any, type: 'strategy' | 'project' | 'action', strategyProjects?: any[]): 'on-track' | 'at-risk' | 'critical' | 'blocked' => {
    const today = new Date();
    
    if (type === 'action') {
      if (item.status === 'achieved') return 'on-track';
      if (item.status === 'blocked') return 'blocked';
      const targetDate = safeDate(item.targetDate);
      if (!targetDate) return 'on-track';
      if (isPast(targetDate)) return 'critical';
      const daysUntilDue = differenceInDays(targetDate, today);
      if (daysUntilDue <= 7) return 'at-risk';
      return 'on-track';
    }

    if (type === 'strategy') {
      // Strategy risk is based on its projects' risk levels
      if (!strategyProjects || strategyProjects.length === 0) return 'on-track';
      
      const projectRisks = strategyProjects.map(p => getRiskLevel(p, 'project'));
      
      // If any project is critical, strategy is critical
      if (projectRisks.includes('critical')) return 'critical';
      // If any project is at-risk, strategy is at-risk
      if (projectRisks.includes('at-risk')) return 'at-risk';
      // If any project is blocked, strategy is at-risk (not critical)
      if (projectRisks.includes('blocked')) return 'at-risk';
      
      return 'on-track';
    }

    if (type === 'project') {
      const progress = item.progress || 0;
      const dueDate = safeDate(item.dueDate);
      
      if (!dueDate) return 'on-track';
      if (progress >= 100) return 'on-track';
      if (isPast(dueDate)) return 'critical';
      
      const startDate = safeDate(item.startDate);
      if (!startDate) return 'on-track';
      
      const totalDays = differenceInDays(dueDate, startDate);
      const elapsed = differenceInDays(today, startDate);
      
      // Don't penalize early-stage projects
      if (elapsed <= 0 || totalDays <= 0) return 'on-track';
      
      const expectedProgress = (elapsed / totalDays) * 100;
      
      // Only flag as at-risk if we're past 10% of timeline
      if (expectedProgress < 10) return 'on-track';
      
      if (progress < expectedProgress - 20) return 'critical';
      if (progress < expectedProgress - 10) return 'at-risk';
      return 'on-track';
    }

    return 'on-track';
  };

  const getRiskBadge = (riskLevel: string) => {
    const styles = {
      'on-track': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'at-risk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'critical': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'blocked': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    const labels = {
      'on-track': 'On Track',
      'at-risk': 'At Risk',
      'critical': 'Critical',
      'blocked': 'Blocked',
    };

    return (
      <Badge className={styles[riskLevel as keyof typeof styles]}>
        {labels[riskLevel as keyof typeof labels]}
      </Badge>
    );
  };

  // Calculate metrics - exclude archived items from all counts (case-insensitive status comparison)
  const nonArchivedStrategies = strategies.filter(s => s.status?.toLowerCase() !== 'archived');
  const nonArchivedProjects = projects.filter(p => p.isArchived !== 'true');
  const nonArchivedActions = actions.filter(a => a.isArchived !== 'true');

  const totalStrategies = nonArchivedStrategies.length;
  const activeStrategiesList = nonArchivedStrategies.filter(s => s.status?.toLowerCase() === 'active');
  const activeStrategies = activeStrategiesList.length;
  const atRiskStrategiesList = nonArchivedStrategies.filter(s => {
    if (s.status?.toLowerCase() !== 'active') return false;
    const strategyProjects = nonArchivedProjects.filter((t: any) => t.strategyId === s.id);
    const risk = getRiskLevel(s, 'strategy', strategyProjects);
    return risk === 'at-risk' || risk === 'critical';
  });
  const atRiskStrategies = atRiskStrategiesList.length;

  const totalProjects = nonArchivedProjects.length;
  const overdueProjectsList = nonArchivedProjects.filter(t => {
    const dueDate = safeDate(t.dueDate);
    return dueDate && isPast(dueDate) && t.progress < 100;
  });
  const overdueProjects = overdueProjectsList.length;

  const totalActions = nonArchivedActions.length;
  const achievedActionsList = nonArchivedActions.filter(o => o.status === 'achieved');
  const achievedActions = achievedActionsList.length;

  if (strategiesLoading || projectsLoading || actionsLoading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto animate-pulse">
            <div className="h-8 bg-gray-200 rounded-xl w-1/4 mb-6"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)' }}></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Glassmorphism Header */}
        <header 
          className="sticky top-0 z-10 px-8 py-6 border-b print:border-0"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#007AFF' }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: '#1D1D1F' }}
                  data-testid="text-reports-header"
                >
                  Reports & Analytics
                </h1>
                <p style={{ color: '#86868B' }} className="mt-0.5">
                  Strategic planning insights and performance tracking
                </p>
              </div>
            </div>
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="print:hidden rounded-full px-5"
                    style={{ backgroundColor: '#007AFF', color: '#FFFFFF' }}
                    data-testid="button-export-dropdown"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePrint()} data-testid="menu-export-pdf">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV} data-testid="menu-export-csv">
                    <FileText className="w-4 h-4 mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={handlePrint} 
                className="print:hidden rounded-full px-5"
                style={{ backgroundColor: '#007AFF', color: '#FFFFFF' }}
                data-testid="button-export-pdf"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export to PDF
              </Button>
            )}
          </div>
        </header>

        <div ref={reportRef} className="p-8">
          <div className="max-w-6xl mx-auto">
          {/* Summary Metrics - Apple HIG Cards with Hover Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)' }}
                    data-testid="card-active-strategies"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5" style={{ color: '#007AFF' }} />
                      <span className="text-sm font-medium" style={{ color: '#86868B' }}>Active Priorities</span>
                    </div>
                    <div className="text-3xl font-bold" style={{ color: '#1D1D1F' }} data-testid="text-active-strategies">
                      {activeStrategies}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#86868B' }}>
                      of {totalStrategies} total
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3">
                  <p className="font-semibold mb-2">Active Priorities</p>
                  {activeStrategiesList.length === 0 ? (
                    <p className="text-sm text-gray-500">No active priorities</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {activeStrategiesList.slice(0, 5).map(s => (
                        <li key={s.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colorCode || '#007AFF' }} />
                          {s.title}
                        </li>
                      ))}
                      {activeStrategiesList.length > 5 && (
                        <li className="text-gray-500">+{activeStrategiesList.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)' }}
                    data-testid="card-at-risk"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5" style={{ color: '#FF9500' }} />
                      <span className="text-sm font-medium" style={{ color: '#86868B' }}>At Risk</span>
                    </div>
                    <div className="text-3xl font-bold" style={{ color: '#FF9500' }} data-testid="text-at-risk">
                      {atRiskStrategies}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#FF9500' }}>
                      priorities need attention
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3">
                  <p className="font-semibold mb-2">At Risk Priorities</p>
                  {atRiskStrategiesList.length === 0 ? (
                    <p className="text-sm text-gray-500">No priorities at risk</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {atRiskStrategiesList.slice(0, 5).map(s => (
                        <li key={s.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colorCode || '#FF9500' }} />
                          {s.title}
                        </li>
                      ))}
                      {atRiskStrategiesList.length > 5 && (
                        <li className="text-gray-500">+{atRiskStrategiesList.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)' }}
                    data-testid="card-overdue-projects"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5" style={{ color: '#FF3B30' }} />
                      <span className="text-sm font-medium" style={{ color: '#86868B' }}>Overdue Projects</span>
                    </div>
                    <div className="text-3xl font-bold" style={{ color: '#FF3B30' }} data-testid="text-overdue-projects">
                      {overdueProjects}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#FF3B30' }}>
                      past due date
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3">
                  <p className="font-semibold mb-2">Overdue Projects</p>
                  {overdueProjectsList.length === 0 ? (
                    <p className="text-sm text-gray-500">No overdue projects</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {overdueProjectsList.slice(0, 5).map(p => {
                        const strategy = strategies.find(s => s.id === p.strategyId);
                        return (
                          <li key={p.id} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strategy?.colorCode || '#FF3B30' }} />
                            {p.title}
                          </li>
                        );
                      })}
                      {overdueProjectsList.length > 5 && (
                        <li className="text-gray-500">+{overdueProjectsList.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)' }}
                    data-testid="card-completion-rate"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5" style={{ color: '#34C759' }} />
                      <span className="text-sm font-medium" style={{ color: '#86868B' }}>Actions Complete</span>
                    </div>
                    <div className="text-3xl font-bold" style={{ color: '#34C759' }} data-testid="text-completion-rate">
                      {totalActions > 0 ? Math.round((achievedActions / totalActions) * 100) : 0}%
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#86868B' }}>
                      {achievedActions} of {totalActions}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3">
                  <p className="font-semibold mb-2">Recently Completed Actions</p>
                  {achievedActionsList.length === 0 ? (
                    <p className="text-sm text-gray-500">No completed actions yet</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {achievedActionsList.slice(0, 5).map(a => {
                        const strategy = strategies.find(s => s.id === a.strategyId);
                        return (
                          <li key={a.id} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strategy?.colorCode || '#34C759' }} />
                            {a.title}
                          </li>
                        );
                      })}
                      {achievedActionsList.length > 5 && (
                        <li className="text-gray-500">+{achievedActionsList.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Tabbed Reports - Apple HIG Pill Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
            <div 
              className="flex flex-wrap gap-2 mb-6 p-2 rounded-2xl"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            >
              {[
                { value: 'capacity', icon: Users, label: 'Capacity' },
                { value: 'team-tags', icon: Hash, label: 'Team Capacity' },
                { value: 'executive-goals', icon: Tag, label: 'Executive Goals' },
                { value: 'health', icon: Target, label: 'Strategy Health' },
                { value: 'timeline', icon: Calendar, label: 'Timeline Risk' },
                { value: 'ownership', icon: Users, label: 'Ownership' },
                { value: 'graph', icon: GitBranch, label: 'Graph' },
                { value: 'archived', icon: Archive, label: 'Archived Projects' },
                { value: 'erp-matrix', icon: LayoutGrid, label: 'ERP Matrix' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
                      transition-all duration-200 ease-out
                      ${isActive ? 'shadow-sm' : 'hover:bg-white/50'}
                    `}
                    style={{
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? '#007AFF' : '#86868B',
                    }}
                    data-testid={`tab-${tab.value}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Strategy Health Overview */}
            <TabsContent value="health" className="space-y-4">
              <StrategyHealthReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Timeline Risk Report */}
            <TabsContent value="timeline" className="space-y-4">
              <TimelineRiskReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Ownership Report */}
            <TabsContent value="ownership" className="space-y-4">
              <OwnershipReport
                projects={projects}
                actions={actions}
                users={users}
                strategies={strategies}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Executive Goals Report */}
            <TabsContent value="executive-goals" className="space-y-4">
              <ExecutiveGoalsReport
                executiveGoals={executiveGoals}
                strategyExecutiveGoalMappings={strategyExecutiveGoalMappings}
                strategies={strategies}
                projects={projects}
                actions={actions}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Team Tags Report */}
            <TabsContent value="team-tags" className="space-y-4">
              <TeamTagsReport
                teamTags={teamTags}
                userTeamTags={userTeamTags}
                projects={projects}
                strategies={strategies}
                users={users}
                resourceAssignments={resourceAssignments}
              />
            </TabsContent>

            {/* Capacity Report */}
            <TabsContent value="capacity" className="space-y-4">
              <CapacityReport
                users={users}
                projects={projects}
                strategies={strategies}
                resourceAssignments={resourceAssignments}
              />
            </TabsContent>

            {/* Graph Report */}
            <TabsContent value="graph" className="space-y-4">
              <GraphReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                dependencies={dependencies}
              />
            </TabsContent>

            {/* Archived Projects Report */}
            <TabsContent value="archived" className="space-y-4">
              <ArchivedProjectsReport
                strategies={strategies}
                users={users}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* ERP Matrix Report */}
            <TabsContent value="erp-matrix" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5" style={{ color: '#5856D6' }} />
                      ERP Workstream Matrix
                    </CardTitle>
                    <Select value={erpSelectedStrategyId} onValueChange={setErpSelectedStrategyId}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!erpSelectedStrategyId ? (
                    <div className="py-12 text-center">
                      <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Strategy</h3>
                      <p className="text-gray-600">Choose a strategy above to view its workstream × phase matrix.</p>
                    </div>
                  ) : sortedErpWorkstreams.length === 0 || sortedErpPhases.length === 0 ? (
                    <div className="py-12 text-center">
                      <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No workstreams configured</h3>
                      <p className="text-gray-600">Configure workstreams and phases in Settings first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ErpRagLegend />
                      <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-3 bg-gray-100 border border-gray-200 font-semibold text-sm min-w-[200px]">
                              Workstream
                            </th>
                            {sortedErpPhases.map((ph) => (
                              <th key={ph.id} className="text-center p-3 bg-gray-100 border border-gray-200 font-semibold text-sm min-w-[150px]">
                                {ph.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedErpWorkstreams.map((ws) => (
                            <tr key={ws.id}>
                              <td className="p-3 border border-gray-200 bg-white font-medium text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{ws.name}</span>
                                  {ws.lead && <Badge variant="outline" className="text-xs">{ws.lead}</Badge>}
                                </div>
                              </td>
                              {sortedErpPhases.map((ph) => {
                                const cellTaskCount = erpTasks.filter(t => t.workstreamId === ws.id && t.phaseId === ph.id).length;
                                const gateKey = `${ws.id}_${ph.id}`;
                                const gateRag = erpCalculations?.workstreamGateRags?.[gateKey];
                                return (
                                  <td key={ph.id} className="p-3 border border-gray-200 text-center bg-white">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="text-sm font-medium">{cellTaskCount}</span>
                                      {cellTaskCount > 0 && <span className="text-xs text-gray-500">tasks</span>}
                                    </div>
                                    {gateRag && (
                                      <div className="flex items-center justify-center gap-1 mt-1">
                                        <ErpRagDot status={gateRag} />
                                        <span className="text-xs text-gray-500">Gate</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr>
                            <td className="p-3 border border-gray-200 bg-gray-50 font-semibold text-sm">
                              Program Gates
                            </td>
                            {sortedErpPhases.map((ph) => {
                              const programRag = erpCalculations?.programGateRags?.[ph.id];
                              const gate = erpProgramGateTasks.find(t => t.phaseId === ph.id);
                              return (
                                <td key={ph.id} className="p-3 border border-gray-200 bg-gray-50 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <ErpRagDot status={programRag} />
                                    {gate && <span className="text-xs text-gray-600 truncate">{gate.name}</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
          </div>

          {/* Print view - show all reports */}
          <div className="hidden print:block space-y-8 max-w-6xl mx-auto">
            <div>
              <h2 className="text-xl font-bold mb-4">Strategy Health Overview</h2>
              <StrategyHealthReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Timeline Risk</h2>
              <TimelineRiskReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Resource & Ownership</h2>
              <OwnershipReport
                projects={projects}
                actions={actions}
                users={users}
                strategies={strategies}
                safeDate={safeDate}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Executive Goals Briefing</h2>
              <ExecutiveGoalsReport
                executiveGoals={executiveGoals}
                strategyExecutiveGoalMappings={strategyExecutiveGoalMappings}
                strategies={strategies}
                projects={projects}
                actions={actions}
                safeDate={safeDate}
                isPrintView={true}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Team Capacity Report</h2>
              <TeamTagsReport
                teamTags={teamTags}
                userTeamTags={userTeamTags}
                projects={projects}
                strategies={strategies}
                users={users}
                resourceAssignments={resourceAssignments}
                isPrintView={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Strategy Health Report Component
function StrategyHealthReport({ strategies, projects, actions, getRiskLevel, getRiskBadge, safeDate }: any) {
  const [openStrategies, setOpenStrategies] = useState<Set<string>>(new Set());
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  const toggleStrategy = (id: string) => {
    const newSet = new Set(openStrategies);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenStrategies(newSet);
  };

  const toggleProject = (id: string) => {
    const newSet = new Set(openProjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenProjects(newSet);
  };

  return (
    <Card data-testid="card-strategy-health">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Hierarchical Strategy View
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Complete hierarchy: Strategies → Projects → Actions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...strategies].sort((a, b) => {
          const aArchived = a.status?.toLowerCase() === 'archived';
          const bArchived = b.status?.toLowerCase() === 'archived';
          if (aArchived && !bArchived) return 1;
          if (!aArchived && bArchived) return -1;
          return 0;
        }).map((strategy: any) => {
          const strategyProjects = projects.filter((t: any) => t.strategyId === strategy.id);
          const strategyRisk = getRiskLevel(strategy, 'strategy', strategyProjects);
          const isOpen = openStrategies.has(strategy.id);
          const isArchived = strategy.status?.toLowerCase() === 'archived';

          return (
            <div key={strategy.id} className={`border rounded-lg ${isArchived ? 'border-gray-300 dark:border-gray-600 opacity-60' : 'border-gray-200 dark:border-gray-700'}`} data-testid={`strategy-${strategy.id}`}>
              <Collapsible open={isOpen} onOpenChange={() => toggleStrategy(strategy.id)}>
                <CollapsibleTrigger className="w-full">
                  <div className={`flex items-center justify-between p-4 transition-colors ${isArchived ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${isArchived ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: strategy.colorCode }}
                      />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isArchived ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{strategy.title}</h3>
                          {isArchived && (
                            <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-300 border-gray-400 bg-white dark:bg-gray-700 opacity-100 relative z-10">Archived</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{strategyProjects.length} projects</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right mr-4">
                        <Progress value={strategy.progress || 0} className={`w-32 h-2 ${isArchived ? 'opacity-50' : ''}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 block">
                          {strategy.progress || 0}%
                        </span>
                      </div>
                      {getRiskBadge(strategyRisk)}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-8 pr-4 pb-4 space-y-2">
                    {strategyProjects.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-2">No projects defined</p>
                    ) : (
                      strategyProjects.map((project: any) => {
                        const projectActions = actions.filter((o: any) => o.projectId === project.id);
                        const projectRisk = getRiskLevel(project, 'project');
                        const isProjectOpen = openProjects.has(project.id);

                        return (
                          <div key={project.id} className="border-l-2 border-gray-300 dark:border-gray-600 ml-2" data-testid={`project-${project.id}`}>
                            <Collapsible open={isProjectOpen} onOpenChange={() => toggleProject(project.id)}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <div className="flex items-center space-x-2 flex-1">
                                    {isProjectOpen ? (
                                      <ChevronDown className="w-3 h-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-500" />
                                    )}
                                    <div className="text-left flex-1">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">{project.title}</h4>
                                      <p className="text-xs text-gray-500">{projectActions.length} actions</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Progress value={project.progress || 0} className="w-24 h-2" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-10">
                                      {project.progress || 0}%
                                    </span>
                                    {getRiskBadge(projectRisk)}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="pl-6 pr-3 pb-2 space-y-1">
                                  {projectActions.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-1">No actions defined</p>
                                  ) : (
                                    projectActions.map((action: any) => {
                                      const actionRisk = getRiskLevel(action, 'action');
                                      const targetDate = safeDate(action.targetDate);
                                      const isOverdue = targetDate && isPast(targetDate) && action.status !== 'achieved';

                                      return (
                                        <div
                                          key={action.id}
                                          className="flex items-center justify-between p-2 text-sm"
                                          data-testid={`action-${action.id}`}
                                        >
                                          <div className="flex items-center space-x-2 flex-1">
                                            {action.status === 'achieved' ? (
                                              <CheckCircle className="w-3 h-3 text-green-600" />
                                            ) : (
                                              <Clock className="w-3 h-3 text-gray-400" />
                                            )}
                                            <span className={action.status === 'achieved' ? 'text-gray-500 line-through' : ''}>
                                              {action.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {targetDate && (
                                              <span className="text-xs text-gray-500">
                                                {format(targetDate, 'MMM dd')}
                                              </span>
                                            )}
                                            {isOverdue && (
                                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">
                                                Overdue
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
        {strategies.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No strategies to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Timeline Risk Report Component
function TimelineRiskReport({ strategies, projects, actions, getRiskLevel, getRiskBadge, safeDate }: any) {
  const overdueProjects = projects.filter((t: any) => {
    const dueDate = safeDate(t.dueDate);
    return dueDate && isPast(dueDate) && t.progress < 100;
  });

  const upcomingProjects = projects.filter((t: any) => {
    const dueDate = safeDate(t.dueDate);
    if (!dueDate) return false;
    const daysUntilDue = differenceInDays(dueDate, new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 30 && t.progress < 100;
  }).sort((a: any, b: any) => {
    const dateA = safeDate(a.dueDate);
    const dateB = safeDate(b.dueDate);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Overdue Projects */}
      <Card data-testid="card-overdue-timeline">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            Overdue Projects ({overdueProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueProjects.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No overdue projects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueProjects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const daysOverdue = dueDate ? differenceInDays(new Date(), dueDate) : 0;

                return (
                  <div
                    key={project.id}
                    className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20"
                    data-testid={`overdue-${project.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                      </div>
                      <Badge className="bg-red-600 text-white">
                        {daysOverdue} days overdue
                      </Badge>
                    </div>
                    {strategy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Strategy: {strategy.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {dueDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Due: {format(dueDate, 'MMM dd, yyyy')}
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Progress value={project.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card data-testid="card-upcoming-timeline">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Upcoming Deadlines (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingProjects.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming deadlines in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingProjects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : 0;
                const projectRisk = getRiskLevel(project, 'project');

                return (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    data-testid={`upcoming-${project.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                      </div>
                      {getRiskBadge(projectRisk)}
                    </div>
                    {strategy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Strategy: {strategy.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {dueDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Due in {daysUntilDue} days ({format(dueDate, 'MMM dd, yyyy')})
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Progress value={project.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ownership Report Component
function OwnershipReport({ projects, actions, users, strategies, safeDate }: any) {
  const userPerformance = users.map((user: any) => {
    // Parse accountableLeaders JSON and filter projects assigned to this user
    const userProjects = projects.filter((t: any) => {
      try {
        const leaders = JSON.parse(t.accountableLeaders || '[]');
        return leaders.includes(user.id);
      } catch {
        return false;
      }
    });
    
    const completedProjects = userProjects.filter((t: any) => t.progress >= 100).length;
    const inProgressProjects = userProjects.filter((t: any) => t.progress > 0 && t.progress < 100).length;
    const overdueProjects = userProjects.filter((t: any) => {
      const dueDate = safeDate(t.dueDate);
      return dueDate && isPast(dueDate) && t.progress < 100;
    }).length;

    const avgProgress = userProjects.length > 0
      ? Math.round(userProjects.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / userProjects.length)
      : 0;

    return {
      user,
      totalProjects: userProjects.length,
      completedProjects: completedProjects,
      inProgressProjects: inProgressProjects,
      overdueProjects: overdueProjects,
      avgProgress,
      projects: userProjects,
    };
  }).filter((up: any) => up.totalProjects > 0);

  return (
    <div className="space-y-6">
      {userPerformance.map((perf: any) => (
        <Card key={perf.user.id} data-testid={`user-performance-${perf.user.id}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {perf.user.firstName[0]}{perf.user.lastName[0]}
                </div>
                <div>
                  <CardTitle>{perf.user.firstName} {perf.user.lastName}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{perf.user.role}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{perf.avgProgress}%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{perf.totalProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Projects</div>
              </div>
              <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{perf.completedProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{perf.inProgressProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Progress</div>
              </div>
              <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{perf.overdueProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Overdue</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Assigned Projects</h4>
              {perf.projects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const isOverdue = dueDate && isPast(dueDate) && project.progress < 100;

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded"
                    data-testid={`user-project-${project.id}`}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      {strategy && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{project.title}</p>
                        {dueDate && (
                          <p className="text-xs text-gray-500">
                            Due: {format(dueDate, 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Progress value={project.progress || 0} className="w-24 h-2" />
                      <span className="text-sm font-medium w-12">{project.progress || 0}%</span>
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {userPerformance.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No project assignments found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Executive Goals Report Component - 18-Month Completions Table
function ExecutiveGoalsReport({ 
  executiveGoals, 
  strategyExecutiveGoalMappings, 
  strategies, 
  projects, 
  actions, 
  safeDate,
  isPrintView = false 
}: any) {
  const today = new Date();
  const lookbackDate = new Date(today);
  lookbackDate.setMonth(lookbackDate.getMonth() - 18);

  const isWithinLookback = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = safeDate(dateStr);
    if (!date) return false;
    return date >= lookbackDate && date <= today;
  };

  const formatCompletionDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date not recorded';
    const date = safeDate(dateStr);
    if (!date) return 'Date not recorded';
    return format(date, 'MMM dd, yyyy');
  };

  type CompletionItem = {
    id: string;
    type: 'strategy' | 'project' | 'action';
    title: string;
    completionDate: Date | null;
    completionDateStr: string | null;
    strategyId: string;
    strategyTitle: string;
    strategyColor: string;
    projectTitle?: string;
    isArchived?: boolean;
  };

  const buildCompletionData = () => {
    const completionsByGoal: Record<string, { goal: any; items: CompletionItem[] }> = {};

    executiveGoals.forEach((goal: any) => {
      completionsByGoal[goal.id] = { goal, items: [] };
    });

    strategyExecutiveGoalMappings.forEach((mapping: any) => {
      const goalId = mapping.executiveGoalId;
      if (!completionsByGoal[goalId]) return;

      const strategy = strategies.find((s: any) => s.id === mapping.strategyId);
      if (!strategy) return;

      const strategyStatus = strategy.status?.toLowerCase();
      if (strategyStatus === 'completed' || strategyStatus === 'archived') {
        const hasDateInRange = strategy.completionDate && isWithinLookback(strategy.completionDate);
        const hasNoDateButCompleted = !strategy.completionDate;
        if (hasDateInRange || hasNoDateButCompleted) {
          completionsByGoal[goalId].items.push({
            id: strategy.id,
            type: 'strategy',
            title: strategy.title,
            completionDate: strategy.completionDate ? safeDate(strategy.completionDate) : null,
            completionDateStr: strategy.completionDate || null,
            strategyId: strategy.id,
            strategyTitle: strategy.title,
            strategyColor: strategy.colorCode,
            isArchived: strategyStatus === 'archived',
          });
        }
      }

      const strategyProjects = projects.filter((p: any) => p.strategyId === strategy.id);
      strategyProjects.forEach((project: any) => {
        if (project.status === 'C') {
          const hasDateInRange = project.completionDate && isWithinLookback(project.completionDate);
          const hasNoDateButCompleted = !project.completionDate;
          if (hasDateInRange || hasNoDateButCompleted) {
            completionsByGoal[goalId].items.push({
              id: project.id,
              type: 'project',
              title: project.title,
              completionDate: project.completionDate ? safeDate(project.completionDate) : null,
              completionDateStr: project.completionDate || null,
              strategyId: strategy.id,
              strategyTitle: strategy.title,
              strategyColor: strategy.colorCode,
              isArchived: project.isArchived === 'true',
            });
          }
        }
      });

      const strategyActions = actions.filter((a: any) => a.strategyId === strategy.id);
      strategyActions.forEach((action: any) => {
        if (action.status?.toLowerCase() === 'achieved') {
          const hasDateInRange = action.achievedDate && isWithinLookback(action.achievedDate);
          const hasNoDateButAchieved = !action.achievedDate;
          if (hasDateInRange || hasNoDateButAchieved) {
            const project = projects.find((p: any) => p.id === action.projectId);
            completionsByGoal[goalId].items.push({
              id: action.id,
              type: 'action',
              title: action.title,
              completionDate: action.achievedDate ? safeDate(action.achievedDate) : null,
              completionDateStr: action.achievedDate || null,
              strategyId: strategy.id,
              strategyTitle: strategy.title,
              strategyColor: strategy.colorCode,
              projectTitle: project?.title,
              isArchived: action.isArchived === 'true',
            });
          }
        }
      });

      completionsByGoal[goalId].items.sort((a, b) => {
        if (!a.completionDate || !b.completionDate) return 0;
        return b.completionDate.getTime() - a.completionDate.getTime();
      });
    });

    return Object.values(completionsByGoal).filter(entry => entry.items.length > 0);
  };

  const completionData = buildCompletionData();
  const totalCompletions = completionData.reduce((sum, entry) => sum + entry.items.length, 0);

  const getTypeBadge = (type: 'strategy' | 'project' | 'action') => {
    switch (type) {
      case 'strategy':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">Priority</Badge>;
      case 'project':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">Project</Badge>;
      case 'action':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Action</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="executive-goals-report">
      {isPrintView ? (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Executive Goals - Completions Report</h3>
              <p className="text-sm text-gray-600">Rolling 18-Month Lookback</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Generated: {format(today, 'MMM dd, yyyy')}</p>
              <p>Period: {format(lookbackDate, 'MMM yyyy')} - {format(today, 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-primary" />
                  Executive Goals - Completions Report
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Completed Strategic Priorities, Projects, and Actions (18-month rolling lookback)
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p className="font-medium">{totalCompletions} total completions</p>
                <p>{format(lookbackDate, 'MMM yyyy')} - {format(today, 'MMM yyyy')}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {executiveGoals.map((goal: any) => (
          <Badge key={goal.id} variant="outline" className="px-3 py-1">
            <Tag className="w-3 h-3 mr-1" />
            {goal.name}
          </Badge>
        ))}
      </div>

      {completionData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Completions in the Last 18 Months</p>
            <p className="text-sm text-gray-400">
              Completed strategies, projects, and actions will appear here once items are marked complete
            </p>
          </CardContent>
        </Card>
      ) : (
        completionData.map(({ goal, items }) => (
          <Card key={goal.id} className="print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {goal.name}
                <Badge variant="secondary" className="ml-2">{items.length} completion{items.length !== 1 ? 's' : ''}</Badge>
              </CardTitle>
              {goal.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Title</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Strategic Priority</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Project</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            {getTypeBadge(item.type)}
                            {item.isArchived && (
                              <Badge variant="outline" className="text-xs text-gray-500">Archived</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-medium">{item.title}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: item.strategyColor }} 
                            />
                            <span className="text-gray-600 dark:text-gray-400">{item.strategyTitle}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-500">
                          {item.projectTitle || (item.type === 'project' ? item.title : '-')}
                        </td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatCompletionDate(item.completionDateStr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {executiveGoals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Executive Goals Defined</p>
            <p className="text-sm text-gray-400">Create executive goals in Settings to see the completions report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Team Capacity Report Component - Shows team capacity with rolling 12-month view
// Hierarchy: Team (by primary user tag) → Users → Projects
function TeamTagsReport({ 
  teamTags, 
  userTeamTags,
  projects, 
  strategies,
  users,
  resourceAssignments,
  isPrintView = false 
}: any) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Generate rolling 12 months starting from current month
  const getMonthColumns = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM'),
        year: format(date, 'yyyy'),
        quarter: `Q${Math.floor(date.getMonth() / 3) + 1}`,
        date
      });
    }
    return months;
  };

  const months = getMonthColumns();

  // Group months by quarter for header display
  const getQuarterGroups = () => {
    const groups: { label: string; months: typeof months }[] = [];
    let currentQuarter = '';
    let currentGroup: typeof months = [];
    
    months.forEach(month => {
      const quarterLabel = `${month.quarter} - ${month.year}`;
      if (quarterLabel !== currentQuarter) {
        if (currentGroup.length > 0) {
          groups.push({ label: currentQuarter, months: currentGroup });
        }
        currentQuarter = quarterLabel;
        currentGroup = [month];
      } else {
        currentGroup.push(month);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ label: currentQuarter, months: currentGroup });
    }
    return groups;
  };

  const quarterGroups = getQuarterGroups();

  // Get users whose PRIMARY team is this tag (using isPrimary field)
  const getUsersForTagByPrimary = (tagId: string): any[] => {
    const primaryMappings = userTeamTags.filter((m: any) => m.teamTagId === tagId && m.isPrimary === true);
    const userIds = primaryMappings.map((m: any) => m.userId);
    return users.filter((u: any) => userIds.includes(u.id) && u.role !== 'sme');
  };

  // Get projects a user is assigned to (from resource assignments, exclude archived/completed)
  const getProjectsForUser = (userId: string): any[] => {
    const userAssignments = resourceAssignments.filter((ra: any) => ra.userId === userId);
    const projectIds = Array.from(new Set(userAssignments.map((ra: any) => ra.projectId)));
    return projects.filter((p: any) => {
      if (!projectIds.includes(p.id)) return false;
      // Exclude archived or completed projects
      if (p.status === 'A' || p.status === 'C') return false;
      // Exclude projects from archived or completed strategies (case-insensitive)
      const strategy = strategies.find((s: any) => s.id === p.strategyId);
      const strategyStatus = strategy?.status?.toLowerCase();
      if (strategyStatus === 'archived' || strategyStatus === 'completed') return false;
      return true;
    });
  };

  // Get user's allocation for a specific project
  const getUserProjectAllocation = (userId: string, projectId: string): number => {
    const assignment = resourceAssignments.find((ra: any) => ra.userId === userId && ra.projectId === projectId);
    return assignment ? parseFloat(assignment.hoursPerWeek || '0') : 0;
  };

  // Calculate user capacity for a specific month
  const getUserMonthlyCapacity = (userId: string, monthKey: string) => {
    const user = users.find((u: any) => u.id === userId);
    if (!user) return { available: 0, allocated: 0, net: 0 };

    const fte = parseFloat(user.fte || '1');
    const maxHoursPerWeek = fte * 40;
    const maxHoursPerMonth = maxHoursPerWeek * 4.33; // Average weeks per month
    
    // Get service delivery hours (constant per month)
    const serviceDeliveryPerWeek = parseFloat(user.serviceDeliveryHours || '0');
    const serviceDeliveryPerMonth = serviceDeliveryPerWeek * 4.33;

    // Get project allocations for active projects in this month
    const monthDate = new Date(monthKey + '-01');
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const userAssignments = resourceAssignments.filter((ra: any) => {
      if (ra.userId !== userId) return false;
      const project = projects.find((p: any) => p.id === ra.projectId);
      if (!project) return false;
      // Check if project is active during this month (not completed, not archived)
      if (project.status === 'C' || project.status === 'A') return false;
      // Check project date range if available
      const startDate = project.startDate ? new Date(project.startDate) : null;
      const dueDate = project.dueDate ? new Date(project.dueDate) : null;
      if (startDate && startDate > monthEnd) return false;
      if (dueDate && dueDate < monthDate) return false;
      return true;
    });

    const projectHoursPerWeek = userAssignments.reduce((sum: number, ra: any) => 
      sum + parseFloat(ra.hoursPerWeek || '0'), 0
    );
    const projectHoursPerMonth = projectHoursPerWeek * 4.33;

    const totalAllocated = projectHoursPerMonth + serviceDeliveryPerMonth;
    const net = maxHoursPerMonth - totalAllocated;

    return {
      available: Math.round(maxHoursPerMonth),
      allocated: Math.round(totalAllocated),
      net: Math.round(net)
    };
  };

  // Get project allocation for a specific user in a specific month
  const getUserProjectMonthlyHours = (userId: string, projectId: string, monthKey: string) => {
    const project = projects.find((p: any) => p.id === projectId);
    if (!project) return 0;

    const monthDate = new Date(monthKey + '-01');
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    // Check if project is active during this month
    if (project.status === 'C' || project.status === 'A') return 0;
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const dueDate = project.dueDate ? new Date(project.dueDate) : null;
    if (startDate && startDate > monthEnd) return 0;
    if (dueDate && dueDate < monthDate) return 0;

    const hoursPerWeek = getUserProjectAllocation(userId, projectId);
    return Math.round(hoursPerWeek * 4.33);
  };

  // Calculate team tag capacity for a month (aggregate of all users with PRIMARY team = this tag)
  const getTagMonthlyCapacity = (tagId: string, monthKey: string) => {
    const tagUsers = getUsersForTagByPrimary(tagId);
    
    let totalAvailable = 0;
    let totalAllocated = 0;
    
    tagUsers.forEach((user: any) => {
      const capacity = getUserMonthlyCapacity(user.id, monthKey);
      totalAvailable += capacity.available;
      totalAllocated += capacity.allocated;
    });

    return {
      available: totalAvailable,
      allocated: totalAllocated,
      net: totalAvailable - totalAllocated,
      userCount: tagUsers.length
    };
  };

  // Get capacity cell color based on net value
  const getCapacityColor = (net: number, total: number) => {
    if (total === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
    const ratio = net / total;
    if (net < 0) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    if (ratio < 0.15) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  };

  const toggleTag = (tagId: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Sort tags by name
  const sortedTags = [...teamTags].sort((a: any, b: any) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-4" data-testid="team-tags-report">
      {isPrintView && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6" />
            <h2 className="text-xl font-bold">Team Capacity Report</h2>
          </div>
          <p className="text-sm text-gray-500">Rolling 12-month capacity view by team</p>
        </div>
      )}

      {teamTags.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Team Tags Defined</p>
            <p className="text-sm text-gray-400">Create team tags in Settings and assign users to see capacity reports</p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-team-capacity">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Capacity (Hours/Month)
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Green = available capacity, Red = over-allocated. Click to expand team details.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Quarter header row */}
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400 min-w-[200px]">
                      Team / User / Project
                    </th>
                    {quarterGroups.map((group, idx) => (
                      <th 
                        key={idx} 
                        colSpan={group.months.length}
                        className="text-center py-1 px-1 font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-600"
                      >
                        {group.label}
                      </th>
                    ))}
                  </tr>
                  {/* Month header row */}
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800"></th>
                    {months.map(month => (
                      <th 
                        key={month.key} 
                        className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 min-w-[60px] border-l border-gray-100 dark:border-gray-700"
                      >
                        {month.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTags.map((tag: any) => {
                    const isTagExpanded = expandedTags.has(tag.id) || isPrintView;
                    const tagUsers = getUsersForTagByPrimary(tag.id);
                    
                    return (
                      <Fragment key={tag.id}>
                        {/* Team Tag Row */}
                        <tr 
                          className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => !isPrintView && toggleTag(tag.id)}
                          data-testid={`team-tag-row-${tag.id}`}
                        >
                          <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 py-2 px-3 font-medium">
                            <div className="flex items-center gap-2">
                              {!isPrintView && (
                                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isTagExpanded ? 'rotate-90' : ''}`} />
                              )}
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: tag.colorHex }}
                              />
                              <span>#{tag.name}</span>
                              <Badge variant="secondary" className="text-xs ml-1">
                                {tagUsers.length} user{tagUsers.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </td>
                          {months.map(month => {
                            const capacity = getTagMonthlyCapacity(tag.id, month.key);
                            return (
                              <td 
                                key={month.key}
                                className={`text-center py-2 px-1 font-medium border-l border-gray-100 dark:border-gray-700 ${getCapacityColor(capacity.net, capacity.available)}`}
                              >
                                {capacity.userCount > 0 ? capacity.net : '-'}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Expanded User Rows */}
                        {isTagExpanded && tagUsers.map((user: any) => {
                          const isUserExpanded = expandedUsers.has(user.id) || isPrintView;
                          const userProjects = getProjectsForUser(user.id);
                          
                          return (
                            <Fragment key={user.id}>
                              {/* User Row */}
                              <tr 
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); !isPrintView && toggleUser(user.id); }}
                                data-testid={`user-row-${user.id}`}
                              >
                                <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 py-2 px-3 pl-8">
                                  <div className="flex items-center gap-2">
                                    {!isPrintView && userProjects.length > 0 && (
                                      <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isUserExpanded ? 'rotate-90' : ''}`} />
                                    )}
                                    <UserIcon className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {user.firstName} {user.lastName}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      ({user.fte || 1} FTE)
                                    </span>
                                    {userProjects.length === 0 && (
                                      <Badge variant="outline" className="text-xs text-gray-400">No projects</Badge>
                                    )}
                                  </div>
                                </td>
                                {months.map(month => {
                                  const capacity = getUserMonthlyCapacity(user.id, month.key);
                                  return (
                                    <td 
                                      key={month.key}
                                      className={`text-center py-2 px-1 font-medium border-l border-gray-100 dark:border-gray-700 ${getCapacityColor(capacity.net, capacity.available)}`}
                                    >
                                      {capacity.net}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Expanded Project Rows */}
                              {isUserExpanded && userProjects.map((project: any) => {
                                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                                
                                return (
                                  <tr 
                                    key={`${user.id}-${project.id}`}
                                    className="border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30"
                                    data-testid={`project-row-${project.id}`}
                                  >
                                    <td className="sticky left-0 z-10 bg-gray-50/50 dark:bg-gray-800/30 py-1.5 px-3 pl-14">
                                      <div className="flex items-center gap-2">
                                        {strategy && (
                                          <div 
                                            className="w-2 h-2 rounded-full flex-shrink-0" 
                                            style={{ backgroundColor: strategy.colorCode }}
                                          />
                                        )}
                                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={project.title}>
                                          {project.title}
                                        </span>
                                      </div>
                                    </td>
                                    {months.map(month => {
                                      const hours = getUserProjectMonthlyHours(user.id, project.id, month.key);
                                      return (
                                        <td 
                                          key={month.key}
                                          className="text-center py-1.5 px-1 text-xs text-gray-500 dark:text-gray-400 border-l border-gray-50 dark:border-gray-800"
                                        >
                                          {hours > 0 ? hours : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </Fragment>
                          );
                        })}

                        {/* Show message if no users with this primary team */}
                        {isTagExpanded && tagUsers.length === 0 && (
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td colSpan={months.length + 1} className="py-3 px-3 pl-8 text-sm text-gray-500 italic">
                              No users have this as their primary team
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CapacityReport({ 
  users, 
  projects, 
  strategies,
  resourceAssignments 
}: {
  users: User[];
  projects: Project[];
  strategies: Strategy[];
  resourceAssignments: ResourceAssignment[];
}) {
  const [viewMode, setViewMode] = useState<'current' | 'forecast'>('current');

  const getRelevantProjects = () => {
    if (viewMode === 'current') {
      return projects.filter(p => 
        p.status === 'OT' || 
        p.status === 'B'
      );
    } else {
      return projects.filter(p => 
        p.status === 'NYS'
      );
    }
  };

  const relevantProjects = getRelevantProjects();
  const relevantProjectIds = relevantProjects.map(p => p.id);

  const getUserCapacity = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const userAssignments = resourceAssignments.filter(
      ra => ra.userId === userId && relevantProjectIds.includes(ra.projectId)
    );

    // Filter to only non-zero hour assignments for capacity calculation
    const nonZeroAssignments = userAssignments.filter(
      ra => parseFloat(ra.hoursPerWeek || '0') > 0
    );

    const projectHours = nonZeroAssignments.reduce((sum, ra) => sum + parseFloat(ra.hoursPerWeek || '0'), 0);
    const serviceDeliveryHours = parseFloat(user.serviceDeliveryHours || '0');
    const totalHours = projectHours + serviceDeliveryHours;
    const maxHours = parseFloat(user.fte || '1') * 40;
    const capacityPercent = maxHours > 0 ? (totalHours / maxHours) * 100 : 0;

    // Only include non-zero assignments in project details for capacity chart
    const projectDetails = nonZeroAssignments.map(ra => {
      const project = projects.find(p => p.id === ra.projectId);
      const strategy = project ? strategies.find(s => s.id === project.strategyId) : null;
      return {
        assignment: ra,
        project,
        strategy,
        hours: parseFloat(ra.hoursPerWeek || '0')
      };
    });

    return {
      user,
      totalHours,
      maxHours,
      capacityPercent,
      projectDetails,
      serviceDeliveryHours,
      assignmentCount: nonZeroAssignments.length, // Only count assignments with hours > 0
      hasWorkload: totalHours > 0 // User has actual workload (project hours or service delivery)
    };
  };

  const usersWithCapacity = users
    .filter(u => u.role !== 'sme')
    .map(u => getUserCapacity(u.id))
    .filter(Boolean)
    .sort((a, b) => (b?.capacityPercent || 0) - (a?.capacityPercent || 0));

  const overCapacityUsers = usersWithCapacity.filter(u => u && u.totalHours > 40);
  const healthyUsers = usersWithCapacity.filter(u => u && u.totalHours >= 32 && u.totalHours <= 40);
  const underUtilizedUsers = usersWithCapacity.filter(u => u && u.totalHours < 32 && u.hasWorkload);

  const getStatusBadge = (totalHours: number) => {
    if (totalHours > 40) {
      return <Badge variant="destructive" className="text-xs">Over Capacity</Badge>;
    } else if (totalHours >= 32) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Healthy</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Under Utilized</Badge>;
    }
  };

  const projectColorMap = new Map<string, { title: string; color: string }>();
  usersWithCapacity.forEach(userCap => {
    if (!userCap) return;
    userCap.projectDetails.forEach(({ project, strategy }) => {
      if (project && !projectColorMap.has(project.id)) {
        projectColorMap.set(project.id, {
          title: project.title,
          color: strategy?.colorCode || '#6b7280'
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Weekly Capacity Chart</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">View:</span>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'current' | 'forecast')}>
            <SelectTrigger className="w-32" data-testid="select-capacity-view-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="forecast">Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-assigned">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              People Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithCapacity.filter(u => u && u.hasWorkload).length}</div>
            <div className="text-xs text-gray-500">of {users.filter(u => u.role !== 'sme').length} total</div>
          </CardContent>
        </Card>

        <Card data-testid="card-over-capacity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Over Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overCapacityUsers.length}</div>
            <div className="text-xs text-gray-500">&gt;40h allocated</div>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyUsers.length}</div>
            <div className="text-xs text-gray-500">32-40h allocated</div>
          </CardContent>
        </Card>

        <Card data-testid="card-under-utilized">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              <ArrowDownRight className="w-4 h-4 inline mr-1" />
              Under Utilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{underUtilizedUsers.length}</div>
            <div className="text-xs text-gray-500">&lt;32h allocated</div>
          </CardContent>
        </Card>
      </div>

      {usersWithCapacity.filter(u => u && u.hasWorkload).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No resource assignments found</p>
            <p className="text-sm text-gray-400">Assign people to projects to see capacity utilization</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {usersWithCapacity
            .filter(u => u && u.hasWorkload)
            .map(userCap => {
              if (!userCap) return null;
              const { user, totalHours, maxHours, projectDetails, serviceDeliveryHours } = userCap;
              const availableHours = Math.max(0, 40 - totalHours);

              return (
                <div key={user.id} className="space-y-2" data-testid={`capacity-user-${user.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-gray-500">
                          {user.fte || '1'} FTE • {maxHours}h capacity
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(totalHours)}
                      <span className="text-sm font-medium">{Math.round(totalHours)}h / {maxHours}h</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex text-[10px] text-gray-400 mb-1">
                      <span className="absolute left-0">0</span>
                      <span className="absolute left-1/4 -translate-x-1/2">10</span>
                      <span className="absolute left-1/2 -translate-x-1/2">20</span>
                      <span className="absolute left-3/4 -translate-x-1/2">30</span>
                      <span className="absolute right-0">40</span>
                    </div>
                    <div className="h-8 mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex relative">
                      {serviceDeliveryHours > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ 
                            width: `${(serviceDeliveryHours / 40) * 100}%`, 
                            backgroundColor: '#D4A84B',
                            minWidth: '30px'
                          }}
                          title={`Service Delivery: ${serviceDeliveryHours}h`}
                          data-testid="capacity-bar-service-delivery"
                        >
                          {(serviceDeliveryHours / 40) * 100 >= 10 && <span>{Math.round(serviceDeliveryHours)}h</span>}
                        </div>
                      )}
                      {projectDetails.map(({ project, strategy, hours }, index) => {
                        const widthPercent = (hours / 40) * 100;
                        const color = strategy?.colorCode || '#6b7280';
                        return (
                          <div
                            key={project?.id || index}
                            className="h-full flex items-center justify-center text-white text-xs font-medium relative group"
                            style={{ 
                              width: `${widthPercent}%`, 
                              backgroundColor: color,
                              minWidth: hours > 0 ? '30px' : '0'
                            }}
                            title={`${project?.title || 'Unknown'}: ${hours}h`}
                            data-testid={`capacity-bar-${project?.id}`}
                          >
                            {widthPercent >= 10 && <span>{Math.round(hours)}h</span>}
                          </div>
                        );
                      })}
                      {availableHours > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-gray-500 text-xs"
                          style={{ width: `${(availableHours / 40) * 100}%` }}
                        >
                          {availableHours >= 4 && <span>{Math.round(availableHours)}h</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-center text-[10px] text-gray-400 mt-1">Hours per Week</div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    {serviceDeliveryHours > 0 && (
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: '#D4A84B' }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">Service Delivery</span>
                      </div>
                    )}
                    {projectDetails.map(({ project, strategy }) => (
                      <div key={project?.id} className="flex items-center gap-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: strategy?.colorCode || '#6b7280' }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={project?.title}>
                          {project?.title || 'Unknown'}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
                      <span className="text-gray-500">Available Capacity</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="py-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">All Projects in View</div>
          <div className="flex flex-wrap gap-4">
            {Array.from(projectColorMap.entries()).map(([projectId, { title, color }]) => (
              <div key={projectId} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[180px]" title={title}>
                  {title}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500">Available Capacity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Graph Report Component - Dependency visualization
const COLUMN_WIDTH = 280;
const NODE_HEIGHT = 75;
const NODE_PADDING = 12;
const COLUMN_PADDING = 40;
const HEADER_HEIGHT = 80;

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

function GraphReport({ strategies, projects, actions, dependencies }: {
  strategies: Strategy[];
  projects: Project[];
  actions: Action[];
  dependencies: Dependency[];
}) {
  const [hoveredItem, setHoveredItem] = useState<{ type: string; id: string } | null>(null);
  const [lockedItem, setLockedItem] = useState<{ type: string; id: string } | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [scale, setScale] = useState(1);
  const [showDependencies, setShowDependencies] = useState(false);
  
  const activeItem = lockedItem || hoveredItem;

  const filteredStrategies = useMemo(() => {
    return strategies
      .filter((s) => s.status !== "Archived")
      .filter((s) => strategyFilter === "all" || s.id === strategyFilter)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [strategies, strategyFilter]);

  const filteredProjects = useMemo(() => {
    const strategyIds = new Set(filteredStrategies.map((s) => s.id));
    const strategyOrder = new Map(filteredStrategies.map((s, i) => [s.id, i]));
    return projects
      .filter((p) => strategyIds.has(p.strategyId))
      .filter((p) => p.isArchived !== "true")
      .sort((a, b) => {
        const orderA = strategyOrder.get(a.strategyId) ?? 999;
        const orderB = strategyOrder.get(b.strategyId) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
  }, [projects, filteredStrategies]);

  const filteredActions = useMemo(() => {
    const strategyIds = new Set(filteredStrategies.map((s) => s.id));
    const strategyOrder = new Map(filteredStrategies.map((s, i) => [s.id, i]));
    return actions
      .filter((a) => strategyIds.has(a.strategyId))
      .filter((a) => a.isArchived !== "true")
      .sort((a, b) => {
        const orderA = strategyOrder.get(a.strategyId) ?? 999;
        const orderB = strategyOrder.get(b.strategyId) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
  }, [actions, filteredStrategies]);

  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};
    let strategyY = HEADER_HEIGHT;
    let projectY = HEADER_HEIGHT;
    let actionY = HEADER_HEIGHT;

    filteredStrategies.forEach((strategy) => {
      positions[`strategy-${strategy.id}`] = {
        x: COLUMN_PADDING,
        y: strategyY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      strategyY += NODE_HEIGHT + NODE_PADDING;
    });

    filteredProjects.forEach((project) => {
      positions[`project-${project.id}`] = {
        x: COLUMN_WIDTH + COLUMN_PADDING,
        y: projectY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      projectY += NODE_HEIGHT + NODE_PADDING;
    });

    filteredActions.forEach((action) => {
      positions[`action-${action.id}`] = {
        x: COLUMN_WIDTH * 2 + COLUMN_PADDING,
        y: actionY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      actionY += NODE_HEIGHT + NODE_PADDING;
    });

    return positions;
  }, [filteredStrategies, filteredProjects, filteredActions]);

  const svgHeight = useMemo(() => {
    const strategyHeight = HEADER_HEIGHT + filteredStrategies.length * (NODE_HEIGHT + NODE_PADDING);
    const projectHeight = HEADER_HEIGHT + filteredProjects.length * (NODE_HEIGHT + NODE_PADDING);
    const actionHeight = HEADER_HEIGHT + filteredActions.length * (NODE_HEIGHT + NODE_PADDING);
    return Math.max(strategyHeight, projectHeight, actionHeight, 400);
  }, [filteredStrategies, filteredProjects, filteredActions]);

  const getStrategyColor = (strategyId: string) => {
    const strategy = strategies.find((s) => s.id === strategyId);
    return strategy?.colorCode || "#6B7280";
  };

  const getProjectForAction = (action: Action) => {
    return projects.find((p) => p.id === action.projectId);
  };

  const isInHierarchy = (type: string, id: string, itemStrategyId?: string, itemProjectId?: string | null) => {
    if (!activeItem) return true;
    if (activeItem.type === type && activeItem.id === id) return true;
    
    if (activeItem.type === "strategy") {
      if (type === "strategy") return activeItem.id === id;
      if (type === "project") return itemStrategyId === activeItem.id;
      if (type === "action") return itemStrategyId === activeItem.id;
    }
    
    if (activeItem.type === "project") {
      const activeProject = filteredProjects.find(p => p.id === activeItem.id);
      if (type === "strategy") return id === activeProject?.strategyId;
      if (type === "project") return activeItem.id === id;
      if (type === "action") return itemProjectId === activeItem.id || itemStrategyId === activeProject?.strategyId;
    }
    
    if (activeItem.type === "action") {
      const activeAction = filteredActions.find(a => a.id === activeItem.id);
      if (type === "strategy") return id === activeAction?.strategyId;
      if (type === "project") return id === activeAction?.projectId;
      if (type === "action") return activeItem.id === id;
    }
    
    return false;
  };
  
  const handleCardClick = (type: string, id: string) => {
    if (lockedItem?.type === type && lockedItem?.id === id) {
      setLockedItem(null);
    } else {
      setLockedItem({ type, id });
    }
  };
  
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "achieved" || s === "c" || s === "completed" || s === "done") return "#22C55E";
    if (s === "in_progress" || s === "ot" || s === "on track") return "#3B82F6";
    if (s === "behind" || s === "b" || s === "at risk" || s === "blocked") return "#EF4444";
    if (s === "on_hold") return "#F97316";
    return "#9CA3AF";
  };
  
  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "achieved" || s === "c" || s === "completed" || s === "done") return "DONE";
    if (s === "in_progress" || s === "ot") return "ON TRACK";
    if (s === "behind" || s === "b") return "BEHIND";
    if (s === "at risk") return "AT RISK";
    if (s === "blocked") return "BLOCKED";
    if (s === "on_hold") return "ON HOLD";
    if (s === "not_started" || s === "nys") return "NOT STARTED";
    return status?.toUpperCase() || "";
  };

  const renderHierarchyLines = () => {
    const lines: JSX.Element[] = [];

    filteredProjects.forEach((project) => {
      const strategyPos = nodePositions[`strategy-${project.strategyId}`];
      const projectPos = nodePositions[`project-${project.id}`];

      if (strategyPos && projectPos) {
        const startX = strategyPos.x + strategyPos.width;
        const startY = strategyPos.y + strategyPos.height / 2;
        const endX = projectPos.x;
        const endY = projectPos.y + projectPos.height / 2;
        const midX = (startX + endX) / 2;

        const isHighlighted =
          (activeItem?.type === "strategy" && activeItem?.id === project.strategyId) ||
          (activeItem?.type === "project" && activeItem?.id === project.id);

        lines.push(
          <path
            key={`h-sp-${project.id}`}
            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke={getStrategyColor(project.strategyId)}
            strokeWidth={isHighlighted ? 2 : 1}
            strokeOpacity={isHighlighted ? 0.8 : 0.3}
            strokeDasharray="4,4"
          />
        );
      }
    });

    filteredActions.forEach((action) => {
      if (action.projectId) {
        const projectPos = nodePositions[`project-${action.projectId}`];
        const actionPos = nodePositions[`action-${action.id}`];

        if (projectPos && actionPos) {
          const startX = projectPos.x + projectPos.width;
          const startY = projectPos.y + projectPos.height / 2;
          const endX = actionPos.x;
          const endY = actionPos.y + actionPos.height / 2;
          const midX = (startX + endX) / 2;

          const isHighlighted =
            (activeItem?.type === "strategy" && activeItem?.id === action.strategyId) ||
            (activeItem?.type === "project" && activeItem?.id === action.projectId) ||
            (activeItem?.type === "action" && activeItem?.id === action.id);

          lines.push(
            <path
              key={`h-pa-${action.id}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke={getStrategyColor(action.strategyId)}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={isHighlighted ? 0.6 : 0.2}
              strokeDasharray="4,4"
            />
          );
        }
      } else {
        const strategyPos = nodePositions[`strategy-${action.strategyId}`];
        const actionPos = nodePositions[`action-${action.id}`];

        if (strategyPos && actionPos) {
          const startX = strategyPos.x + strategyPos.width;
          const startY = strategyPos.y + strategyPos.height / 2;
          const endX = actionPos.x;
          const endY = actionPos.y + actionPos.height / 2;
          const midX = startX + COLUMN_WIDTH;

          const isHighlighted =
            (activeItem?.type === "strategy" && activeItem?.id === action.strategyId) ||
            (activeItem?.type === "action" && activeItem?.id === action.id);

          lines.push(
            <path
              key={`h-sa-${action.id}`}
              d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
              fill="none"
              stroke={getStrategyColor(action.strategyId)}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={isHighlighted ? 0.5 : 0.15}
              strokeDasharray="2,2"
            />
          );
        }
      }
    });

    return lines;
  };

  const renderDependencyLines = () => {
    return dependencies.map((dep) => {
      const sourcePos = nodePositions[`${dep.sourceType}-${dep.sourceId}`];
      const targetPos = nodePositions[`${dep.targetType}-${dep.targetId}`];

      if (!sourcePos || !targetPos) return null;

      const sourceItem = dep.sourceType === "project"
        ? projects.find((p) => p.id === dep.sourceId)
        : actions.find((a) => a.id === dep.sourceId);
      const targetItem = dep.targetType === "project"
        ? projects.find((p) => p.id === dep.targetId)
        : actions.find((a) => a.id === dep.targetId);

      const isSourceActive = activeItem?.type === dep.sourceType && activeItem?.id === dep.sourceId;
      const isTargetActive = activeItem?.type === dep.targetType && activeItem?.id === dep.targetId;
      const isStrategyActive = activeItem?.type === "strategy" && 
        (sourceItem?.strategyId === activeItem?.id || targetItem?.strategyId === activeItem?.id);
      const isHighlighted = isSourceActive || isTargetActive || isStrategyActive;

      const sourceStrategy = dep.sourceType === "project"
        ? projects.find((p) => p.id === dep.sourceId)?.strategyId
        : actions.find((a) => a.id === dep.sourceId)?.strategyId;

      const sameColumn = Math.abs(sourcePos.x - targetPos.x) < 50;
      
      let path: string;
      if (sameColumn) {
        const startX = sourcePos.x + sourcePos.width;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x + targetPos.width;
        const endY = targetPos.y + targetPos.height / 2;
        const curveOffset = 40;
        path = `M ${startX} ${startY} Q ${startX + curveOffset} ${(startY + endY) / 2}, ${endX} ${endY}`;
      } else if (sourcePos.x < targetPos.x) {
        const startX = sourcePos.x + sourcePos.width;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x;
        const endY = targetPos.y + targetPos.height / 2;
        const controlOffset = 50;
        path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
      } else {
        const startX = sourcePos.x;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x + targetPos.width;
        const endY = targetPos.y + targetPos.height / 2;
        const curveOffset = 40;
        path = `M ${startX} ${startY} Q ${startX - curveOffset} ${(startY + endY) / 2}, ${endX} ${endY}`;
      }

      const color = getStrategyColor(sourceStrategy || "");
      
      let arrowEndX: number, arrowEndY: number, arrowAngle: number;
      if (sameColumn) {
        arrowEndX = targetPos.x + targetPos.width;
        arrowEndY = targetPos.y + targetPos.height / 2;
        arrowAngle = 0;
      } else if (sourcePos.x < targetPos.x) {
        arrowEndX = targetPos.x;
        arrowEndY = targetPos.y + targetPos.height / 2;
        arrowAngle = 180;
      } else {
        arrowEndX = targetPos.x + targetPos.width;
        arrowEndY = targetPos.y + targetPos.height / 2;
        arrowAngle = 0;
      }
      
      const arrowSize = 6;
      const arrowPath = `M ${arrowEndX} ${arrowEndY} l ${arrowAngle === 180 ? arrowSize : -arrowSize} ${-arrowSize/2} l 0 ${arrowSize} z`;

      return (
        <g key={`dep-${dep.id}`}>
          {isHighlighted && (
            <path d={path} fill="none" stroke={color} strokeWidth={6} strokeOpacity={0.2} />
          )}
          <path d={path} fill="none" stroke={color} strokeWidth={isHighlighted ? 2.5 : 1.5} strokeOpacity={isHighlighted ? 1 : 0.7} />
          <path d={arrowPath} fill={color} fillOpacity={isHighlighted ? 1 : 0.7} />
        </g>
      );
    });
  };

  return (
    <Card data-testid="card-graph-report">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center">
              <GitBranch className="w-5 h-5 mr-2" />
              Dependency Graph
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Visualize relationships between strategies, projects, and actions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-56" data-testid="select-graph-strategy-filter">
                <Target className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {strategies
                  .filter((s) => s.status !== "Archived")
                  .map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: strategy.colorCode }} />
                        <span className="truncate">{strategy.title}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.max(s - 0.2, 0.4))} data-testid="button-zoom-out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.min(s + 0.2, 2))} data-testid="button-zoom-in">
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Dependencies</span>
              <Switch checked={showDependencies} onCheckedChange={setShowDependencies} data-testid="switch-show-dependencies" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm mt-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Hierarchy (parent-child)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Dependency (depends on)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto border rounded-lg bg-gray-50 dark:bg-gray-900" style={{ maxHeight: '600px' }}>
          <svg
            width={COLUMN_WIDTH * 3 + COLUMN_PADDING * 2}
            height={svgHeight + 50}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              minWidth: `${(COLUMN_WIDTH * 3 + COLUMN_PADDING * 2) * scale}px`,
              minHeight: `${(svgHeight + 50) * scale}px`,
            }}
          >
            <text x={COLUMN_PADDING} y={40} className="text-lg font-bold fill-gray-700 dark:fill-gray-300">Strategies</text>
            <text x={COLUMN_WIDTH + COLUMN_PADDING} y={40} className="text-lg font-bold fill-gray-700 dark:fill-gray-300">Projects</text>
            <text x={COLUMN_WIDTH * 2 + COLUMN_PADDING} y={40} className="text-lg font-bold fill-gray-700 dark:fill-gray-300">Actions</text>

            <line x1={COLUMN_WIDTH} y1={0} x2={COLUMN_WIDTH} y2={svgHeight} stroke="#E5E7EB" strokeWidth="1" />
            <line x1={COLUMN_WIDTH * 2} y1={0} x2={COLUMN_WIDTH * 2} y2={svgHeight} stroke="#E5E7EB" strokeWidth="1" />

            {renderHierarchyLines()}
            {showDependencies && renderDependencyLines()}

            <TooltipProvider>
              {filteredStrategies.map((strategy) => {
                const pos = nodePositions[`strategy-${strategy.id}`];
                if (!pos) return null;
                const isActive = activeItem?.type === "strategy" && activeItem?.id === strategy.id;
                const isLocked = lockedItem?.type === "strategy" && lockedItem?.id === strategy.id;
                const inHierarchy = isInHierarchy("strategy", strategy.id);
                const dimmed = activeItem && !inHierarchy;

                return (
                  <Tooltip key={strategy.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "strategy", id: strategy.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("strategy", strategy.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={8} fill={isActive ? "#FFFBEB" : "white"} stroke={strategy.colorCode} strokeWidth={isActive ? 3 : 2} />
                        <rect x={pos.x} y={pos.y} width={6} height={pos.height} rx={3} fill={strategy.colorCode} />
                        {isLocked && <circle cx={pos.x + pos.width - 12} cy={pos.y + 12} r={6} fill={strategy.colorCode} />}
                        <text x={pos.x + 16} y={pos.y + 18} fill="#6B7280" style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}>STRATEGY</text>
                        <rect x={pos.x + 75} y={pos.y + 8} width={getStatusLabel(strategy.status).length * 6 + 12} height={16} rx={4} fill={getStatusColor(strategy.status)} fillOpacity={0.15} />
                        <text x={pos.x + 81} y={pos.y + 19} fill={getStatusColor(strategy.status)} style={{ fontSize: "8px", fontWeight: 600 }}>{getStatusLabel(strategy.status)}</text>
                        <text x={pos.x + 16} y={pos.y + 38} fill="#111827" style={{ fontSize: "13px", fontWeight: 600 }}>{strategy.title.length > 22 ? strategy.title.slice(0, 22) + "..." : strategy.title}</text>
                        <text x={pos.x + 16} y={pos.y + 56} fill="#9CA3AF" style={{ fontSize: "10px" }}>{strategy.progress}% complete</text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{strategy.title}</p>
                      <p className="text-xs text-gray-400">{strategy.status}</p>
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {filteredProjects.map((project) => {
                const pos = nodePositions[`project-${project.id}`];
                if (!pos) return null;
                const isActive = activeItem?.type === "project" && activeItem?.id === project.id;
                const isLocked = lockedItem?.type === "project" && lockedItem?.id === project.id;
                const inHierarchy = isInHierarchy("project", project.id, project.strategyId);
                const dimmed = activeItem && !inHierarchy;

                return (
                  <Tooltip key={project.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "project", id: project.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("project", project.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={8} fill={isActive ? "#F0F9FF" : "white"} stroke={isActive ? getStrategyColor(project.strategyId) : "#D1D5DB"} strokeWidth={isActive ? 3 : 1} />
                        <circle cx={pos.x + 12} cy={pos.y + 14} r={4} fill={getStrategyColor(project.strategyId)} />
                        {isLocked && <circle cx={pos.x + pos.width - 12} cy={pos.y + 12} r={6} fill={getStrategyColor(project.strategyId)} />}
                        <text x={pos.x + 22} y={pos.y + 18} fill="#6B7280" style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}>PROJECT</text>
                        <rect x={pos.x + 75} y={pos.y + 8} width={getStatusLabel(project.status).length * 6 + 12} height={16} rx={4} fill={getStatusColor(project.status)} fillOpacity={0.15} />
                        <text x={pos.x + 81} y={pos.y + 19} fill={getStatusColor(project.status)} style={{ fontSize: "8px", fontWeight: 600 }}>{getStatusLabel(project.status)}</text>
                        <text x={pos.x + 12} y={pos.y + 40} fill="#111827" style={{ fontSize: "13px", fontWeight: 600 }}>{project.title.length > 20 ? project.title.slice(0, 20) + "..." : project.title}</text>
                        <text x={pos.x + 12} y={pos.y + 58} fill="#9CA3AF" style={{ fontSize: "10px" }}>{project.progress}% complete</text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-gray-400">Progress: {project.progress}%</p>
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {filteredActions.map((action) => {
                const pos = nodePositions[`action-${action.id}`];
                if (!pos) return null;
                const isActive = activeItem?.type === "action" && activeItem?.id === action.id;
                const isLocked = lockedItem?.type === "action" && lockedItem?.id === action.id;
                const inHierarchy = isInHierarchy("action", action.id, action.strategyId, action.projectId);
                const dimmed = activeItem && !inHierarchy;
                const linkedProject = getProjectForAction(action);

                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "action", id: action.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("action", action.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={8} fill={isActive ? "#FFF7ED" : "white"} stroke={isActive ? getStrategyColor(action.strategyId) : "#E5E7EB"} strokeWidth={isActive ? 3 : 1} />
                        {isLocked && <circle cx={pos.x + pos.width - 12} cy={pos.y + 12} r={6} fill={getStrategyColor(action.strategyId)} />}
                        <circle cx={pos.x + 12} cy={pos.y + 14} r={4} fill={getStrategyColor(action.strategyId)} opacity={0.7} />
                        <text x={pos.x + 22} y={pos.y + 18} fill="#6B7280" style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}>ACTION</text>
                        <rect x={pos.x + 70} y={pos.y + 8} width={getStatusLabel(action.status).length * 6 + 12} height={16} rx={4} fill={getStatusColor(action.status)} fillOpacity={0.15} />
                        <text x={pos.x + 76} y={pos.y + 19} fill={getStatusColor(action.status)} style={{ fontSize: "8px", fontWeight: 600 }}>{getStatusLabel(action.status)}</text>
                        <text x={pos.x + 12} y={pos.y + 40} fill="#111827" style={{ fontSize: "13px", fontWeight: 600 }}>{action.title.length > 20 ? action.title.slice(0, 20) + "..." : action.title}</text>
                        <text x={pos.x + 12} y={pos.y + 58} fill="#9CA3AF" style={{ fontSize: "10px" }}>{linkedProject ? linkedProject.title.slice(0, 20) : "No project"}</text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-gray-400">Status: {action.status}</p>
                      {linkedProject && <p className="text-xs text-gray-400">Project: {linkedProject.title}</p>}
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

// Archived Projects Report Component
function ArchivedProjectsReport({ strategies, users, safeDate }: { strategies: Strategy[]; users: User[]; safeDate: (d: any) => Date | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copyingProject, setCopyingProject] = useState<any>(null);
  const [copyProjectTitle, setCopyProjectTitle] = useState("");
  const [copyAsTemplate, setCopyAsTemplate] = useState(false);

  // Fetch archived projects
  const { data: archivedProjects = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/archived-projects"],
  });

  const unarchiveProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/unarchive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archived-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Project Restored",
        description: "The project has been restored and is now active.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore project",
        variant: "destructive",
      });
    },
  });

  const copyProjectMutation = useMutation({
    mutationFn: async ({ projectId, newTitle, asTemplate }: { projectId: string; newTitle: string; asTemplate: boolean }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/copy`, { newTitle, asTemplate });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      setCopyingProject(null);
      setCopyProjectTitle("");
      setCopyAsTemplate(false);
      toast({
        title: "Project Copied",
        description: "A new project has been created based on the archived one.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy project",
        variant: "destructive",
      });
    },
  });

  const getStrategyTitle = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    return strategy?.title || 'Unknown Strategy';
  };

  const getStrategyColor = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    return strategy?.colorCode || '#6B7280';
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  const isWakeUpDatePast = (wakeUpDate: string | null) => {
    if (!wakeUpDate) return false;
    const date = safeDate(wakeUpDate);
    return date && isPast(date);
  };

  if (isLoading) {
    return (
      <Card data-testid="card-archived-projects">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Archive className="w-5 h-5 mr-2" />
            Archived Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading archived projects...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-archived-projects">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Archive className="w-5 h-5 mr-2" />
            Archived Projects
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Projects that have been removed from daily view. You can restore them or copy as new projects.
          </p>
        </CardHeader>
        <CardContent>
          {archivedProjects.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No archived projects</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                When you archive projects, they'll appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedProjects.map((project: any) => {
                const wakeUpPast = isWakeUpDatePast(project.wakeUpDate);
                
                return (
                  <div
                    key={project.id}
                    className={`border rounded-lg p-4 ${wakeUpPast ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    data-testid={`archived-project-${project.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {project.title}
                          </h3>
                          {wakeUpPast && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              <Bell className="w-3 h-3 mr-1" />
                              Ready to Reactivate
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: getStrategyColor(project.strategyId) }} 
                          />
                          <span>{getStrategyTitle(project.strategyId)}</span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="text-gray-400">Progress at Archive:</span>{' '}
                            <span className="font-medium text-gray-600 dark:text-gray-300">{project.progressAtArchive || 0}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Archived:</span>{' '}
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {project.archivedAt ? format(safeDate(project.archivedAt)!, 'MMM d, yyyy') : 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">By:</span>{' '}
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {getUserName(project.archivedBy)}
                            </span>
                          </div>
                          {project.wakeUpDate && (
                            <div>
                              <span className="text-gray-400">Wake-up:</span>{' '}
                              <span className={`font-medium ${wakeUpPast ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                {format(safeDate(project.wakeUpDate)!, 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {project.archiveReason && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                            <span className="text-gray-400">Reason:</span> {project.archiveReason}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCopyingProject(project);
                            setCopyProjectTitle(`${project.title} (Copy)`);
                            setCopyAsTemplate(false);
                          }}
                          data-testid={`button-copy-${project.id}`}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => unarchiveProjectMutation.mutate(project.id)}
                          disabled={unarchiveProjectMutation.isPending}
                          className={wakeUpPast ? 'bg-amber-600 hover:bg-amber-700' : ''}
                          data-testid={`button-restore-${project.id}`}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {wakeUpPast ? 'Activate' : 'Restore'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Project Modal */}
      <Dialog open={!!copyingProject} onOpenChange={(open) => !open && setCopyingProject(null)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copy Project
            </DialogTitle>
          </DialogHeader>
          {copyingProject && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a new project based on "{copyingProject.title}".
              </p>
              
              <div className="space-y-2">
                <label htmlFor="copy-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Project Title
                </label>
                <Input
                  id="copy-title"
                  value={copyProjectTitle}
                  onChange={(e) => setCopyProjectTitle(e.target.value)}
                  placeholder="Enter new project title..."
                  data-testid="input-copy-project-title"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="copy-as-template"
                  checked={copyAsTemplate}
                  onCheckedChange={setCopyAsTemplate}
                  data-testid="switch-copy-as-template"
                />
                <label htmlFor="copy-as-template" className="text-sm text-gray-700 dark:text-gray-300">
                  Copy as Template (resets progress, status, and dates)
                </label>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">What will be copied:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Project title, description, and settings</li>
                  <li>All actions with their details</li>
                  {copyAsTemplate ? (
                    <>
                      <li>Dates reset to today + default offsets</li>
                      <li>Progress and status reset to "Not Started"</li>
                    </>
                  ) : (
                    <li>Dates adjusted based on time since original start date</li>
                  )}
                </ul>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCopyingProject(null)}
                  data-testid="button-cancel-copy"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    copyProjectMutation.mutate({
                      projectId: copyingProject.id,
                      newTitle: copyProjectTitle,
                      asTemplate: copyAsTemplate,
                    });
                  }}
                  disabled={copyProjectMutation.isPending || !copyProjectTitle.trim()}
                  data-testid="button-confirm-copy"
                >
                  {copyProjectMutation.isPending ? "Copying..." : "Create Copy"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
