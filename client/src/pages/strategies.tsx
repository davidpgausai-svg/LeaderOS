import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import type { ExecutiveGoal, TeamTag } from "@shared/schema";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { EditStrategyModal } from "@/components/modals/edit-strategy-modal";
import { ViewStrategyModal } from "@/components/modals/view-strategy-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { EditProjectModal } from "@/components/modals/edit-project-modal";
import { ViewProjectModal } from "@/components/modals/view-project-modal";
import { ManageBarriersModal } from "@/components/modals/manage-barriers-modal";
import { WorkstreamModal } from "@/components/modals/workstream-modal";
import { CreateActionModal } from "@/components/modals/create-action-modal";
import { EditActionModal } from "@/components/modals/edit-action-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Search, Trash2, MoreVertical, Edit, Eye, CheckCircle, Archive, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, ArrowRight, Target, Calendar, BarChart3, RefreshCw, Circle, FolderOpen, TrendingUp, AlertTriangle, Users, Megaphone, Link2, ExternalLink, X, Clock, ListChecks, StickyNote, Tag, Indent, Outdent, Hash, List, LayoutGrid, GripVertical, Network, Flag } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PeopleSelector } from "@/components/ui/people-selector";
import { useLocation, Link } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Strategies() {
  const { canCreateStrategies, canEditAllStrategies } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isEditStrategyOpen, setIsEditStrategyOpen] = useState(false);
  const [isViewStrategyOpen, setIsViewStrategyOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [metricsModalStrategy, setMetricsModalStrategy] = useState<any>(null);
  const [continuumModalStrategy, setContinuumModalStrategy] = useState<any>(null);
  const [resourcesModalProject, setResourcesModalProject] = useState<any>(null);
  const [resourceHoursInputs, setResourceHoursInputs] = useState<Record<string, string>>({});
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Project icon bar modal states
  const [barriersProjectId, setBarriersProjectId] = useState<string | null>(null);
  const [isManageBarriersOpen, setIsManageBarriersOpen] = useState(false);
  const [timelineModalProject, setTimelineModalProject] = useState<any>(null);
  const [kpiModalProject, setKpiModalProject] = useState<any>(null);
  const [documentsModalProject, setDocumentsModalProject] = useState<any>(null);
  const [communicationModalProject, setCommunicationModalProject] = useState<any>(null);
  const [documentUrlInput, setDocumentUrlInput] = useState("");
  const [documentUrlEditing, setDocumentUrlEditing] = useState(false);
  const [communicationUrlInput, setCommunicationUrlInput] = useState("");
  const [communicationUrlEditing, setCommunicationUrlEditing] = useState(false);
  const [isCreateWsTaskOpen, setIsCreateWsTaskOpen] = useState(false);
  const [wsTaskWorkstreamId, setWsTaskWorkstreamId] = useState<string | null>(null);
  const [wsTaskProjectId, setWsTaskProjectId] = useState<string | null>(null);
  const [wsTaskStrategyId, setWsTaskStrategyId] = useState<string | null>(null);
  const [urlSaving, setUrlSaving] = useState(false);
  const [dependenciesModalProject, setDependenciesModalProject] = useState<any>(null);
  const [selectedDependencyType, setSelectedDependencyType] = useState<"project" | "action" | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [viewingProject, setViewingProject] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);
  const [archivingProject, setArchivingProject] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveWakeUpDate, setArchiveWakeUpDate] = useState<string>("");
  
  // Action icon bar modal states
  const [dueDateModalAction, setDueDateModalAction] = useState<any>(null);
  const [checklistModalAction, setChecklistModalAction] = useState<any>(null);
  const [folderUrlModalAction, setFolderUrlModalAction] = useState<any>(null);
  const [dependenciesModalAction, setDependenciesModalAction] = useState<any>(null);
  const [selectedActionDependencyType, setSelectedActionDependencyType] = useState<"project" | "action" | null>(null);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [viewingAction, setViewingAction] = useState<any>(null);
  const [isEditActionOpen, setIsEditActionOpen] = useState(false);
  const [isViewActionOpen, setIsViewActionOpen] = useState(false);
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [selectedProjectIdForAction, setSelectedProjectIdForAction] = useState<string | null>(null);
  const [selectedStrategyIdForAction, setSelectedStrategyIdForAction] = useState<string | null>(null);
  const [actionFolderUrl, setActionFolderUrl] = useState("");
  const [actionFolderUrlEditing, setActionFolderUrlEditing] = useState(false);
  const [actionFolderUrlSaving, setActionFolderUrlSaving] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemTitle, setEditingChecklistItemTitle] = useState("");
  const [notesModalAction, setNotesModalAction] = useState<any>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionPeopleModalAction, setActionPeopleModalAction] = useState<any>(null);
  
  // Kanban view state (per-project toggle)
  const [kanbanViewProjects, setKanbanViewProjects] = useState<Set<string>>(new Set());
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  
  // Workstream modal state
  const [workstreamModalStrategyId, setWorkstreamModalStrategyId] = useState<string | null>(null);
  const [workstreamModalTitle, setWorkstreamModalTitle] = useState<string>("");

  // Executive Goal tagging state
  const [executiveGoalModalStrategy, setExecutiveGoalModalStrategy] = useState<any>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  
  // Highlight state for navigation from calendar
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const [highlightedActionId, setHighlightedActionId] = useState<string | null>(null);
  const projectRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: strategies, isLoading: strategiesLoading } = useQuery<any[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch all actions for expandable actions section
  const { data: actions } = useQuery<any[]>({
    queryKey: ["/api/actions"],
  });

  // Fetch all barriers for barrier icons
  const { data: barriers } = useQuery<any[]>({
    queryKey: ["/api/barriers"],
  });

  // Fetch all users for leader lookups
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all dependencies for dependency icons
  const { data: dependencies } = useQuery<any[]>({
    queryKey: ["/api/dependencies"],
  });

  // Fetch all checklist items for checklist icons
  const { data: checklistItems } = useQuery<any[]>({
    queryKey: ["/api/action-checklist-items"],
  });

  // Fetch executive goals for strategy tagging
  const { data: executiveGoals = [] } = useQuery<ExecutiveGoal[]>({
    queryKey: ["/api/executive-goals"],
  });

  const { data: teamTags = [] } = useQuery<TeamTag[]>({
    queryKey: ["/api/team-tags"],
  });

  const { data: projectTeamTags = [] } = useQuery<any[]>({
    queryKey: ["/api/project-team-tags"],
  });

  const { data: phases = [] } = useQuery<any[]>({
    queryKey: ["/api/phases"],
    queryFn: async () => {
      const res = await fetch(`/api/phases`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch resource assignments for the currently open modal project
  const { data: projectResourceAssignments = [], refetch: refetchProjectResourceAssignments } = useQuery<any[]>({
    queryKey: resourcesModalProject?.id 
      ? [`/api/projects/${resourcesModalProject.id}/resource-assignments`] 
      : ["/api/projects/none/resource-assignments"],
    enabled: !!resourcesModalProject?.id,
  });

  // Fetch all resource assignments for capacity calculations
  const { data: allResourceAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/resource-assignments"],
  });

  // Fetch all action people assignments for to-do list tagging
  const { data: allActionPeopleAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/action-people-assignments"],
  });

  // Fetch strategy-executive-goal mappings for multiple goals per strategy
  const { data: strategyExecutiveGoalMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/strategy-executive-goals"],
  });

  // Helper to get executive goal by ID
  const getExecutiveGoalById = (goalId: string | null | undefined) => {
    if (!goalId || !executiveGoals) return null;
    return executiveGoals.find((g: ExecutiveGoal) => g.id === goalId);
  };

  // Helper to get team tags for a project
  const getProjectTeamTags = (projectId: string): TeamTag[] => {
    if (!teamTags || !projectTeamTags) return [];
    
    const projectTagIds = (projectTeamTags || [])
      .filter((m: any) => m.projectId === projectId)
      .map((m: any) => m.teamTagId);
    
    return teamTags.filter((tag: TeamTag) => projectTagIds.includes(tag.id));
  };

  // Helper to get all executive goals for a strategy (using junction table + legacy field)
  const getStrategyExecutiveGoals = (strategyId: string): ExecutiveGoal[] => {
    if (!executiveGoals) return [];
    
    // Get goal IDs from junction table mappings
    const junctionGoalIds = (strategyExecutiveGoalMappings || [])
      .filter((m: any) => m.strategyId === strategyId)
      .map((m: any) => m.executiveGoalId);
    
    // Also check legacy executiveGoalId field on the strategy
    const strategy = strategies?.find((s: any) => s.id === strategyId);
    const legacyGoalId = strategy?.executiveGoalId;
    
    // Combine both sources, removing duplicates
    const combinedIds = [...junctionGoalIds, ...(legacyGoalId ? [legacyGoalId] : [])];
    const allGoalIds = Array.from(new Set(combinedIds));
    
    return executiveGoals.filter((g: ExecutiveGoal) => allGoalIds.includes(g.id));
  };

  // Helper to check if an action has dependencies
  const actionHasDependencies = (actionId: string) => {
    if (!dependencies) return false;
    return dependencies.some(
      (d: any) => 
        (d.sourceType === 'action' && d.sourceId === actionId) ||
        (d.targetType === 'action' && d.targetId === actionId)
    );
  };

  // Helper to get action dependencies
  const getActionDependencies = (actionId: string) => {
    if (!dependencies) return [];
    return dependencies.filter(
      (d: any) => 
        (d.sourceType === 'action' && d.sourceId === actionId) ||
        (d.targetType === 'action' && d.targetId === actionId)
    );
  };

  // Helper to get action checklist items
  const getActionChecklistItems = (actionId: string) => {
    if (!checklistItems) return [];
    return checklistItems.filter((item: any) => item.actionId === actionId);
  };

  // Helper to check if action has incomplete checklist items
  const actionHasIncompleteChecklist = (actionId: string) => {
    const items = getActionChecklistItems(actionId);
    return items.length > 0 && items.some((item: any) => item.isCompleted !== 'true');
  };

  // Helper to calculate due date display for actions
  const getActionDueDateDisplay = (action: any) => {
    if (!action?.dueDate) return null;
    const now = new Date();
    const dueDate = new Date(action.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (diffDays === 0) return { text: 'Due today', date: formattedDate, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    if (diffDays === 1) return { text: 'Due tomorrow', date: formattedDate, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, date: formattedDate, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, date: formattedDate, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return { text: `Due in ${diffDays} days`, date: formattedDate, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
  };

  // Helper to get action status circle color
  const getActionStatusCircleColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'at_risk': return 'bg-red-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  // Action status options for dropdown
  const actionStatusOptions = [
    { value: 'achieved', label: 'Achieved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'at_risk', label: 'At Risk' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'not_started', label: 'Not Started' },
  ];

  // Helper to check if a project has dependencies
  const projectHasDependencies = (projectId: string) => {
    if (!dependencies) return false;
    return dependencies.some(
      (d: any) => 
        (d.sourceType === 'project' && d.sourceId === projectId) ||
        (d.targetType === 'project' && d.targetId === projectId)
    );
  };

  // Helper to get project dependencies
  const getProjectDependencies = (projectId: string) => {
    if (!dependencies) return [];
    return dependencies.filter(
      (d: any) => 
        (d.sourceType === 'project' && d.sourceId === projectId) ||
        (d.targetType === 'project' && d.targetId === projectId)
    );
  };

  // Helper to get timeline color based on due date
  const getTimelineColor = (project: any) => {
    if (!project?.dueDate) return 'gray';
    const now = new Date();
    const dueDate = new Date(project.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'red'; // Past due
    if (daysUntilDue <= 7) return 'yellow'; // Within 7 days
    return 'green'; // On track
  };

  // Helper to get timeline icon classes
  const getTimelineIconClass = (project: any) => {
    const color = getTimelineColor(project);
    switch (color) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  // Helper to get leader names from project's accountableLeaders
  const getProjectLeaders = (project: any) => {
    if (!project?.accountableLeaders || !users) return [];
    try {
      const leaderIds = JSON.parse(project.accountableLeaders);
      if (!Array.isArray(leaderIds)) return [];
      return leaderIds
        .map((id: string) => users.find((u: any) => u.id === id))
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // Helper to check if a project has active barriers
  const projectHasActiveBarriers = (projectId: string) => {
    if (!barriers) return false;
    return barriers.some((b: any) => b.projectId === projectId && b.status === 'active');
  };

  // Helper to check if a project has people resources assigned
  const projectHasResources = (projectId: string) => {
    if (!allResourceAssignments) return false;
    return allResourceAssignments.some((a: any) => a.projectId === projectId);
  };

  // Helper to check if an action has people assigned
  const actionHasPeople = (actionId: string) => {
    if (!allActionPeopleAssignments) return false;
    return allActionPeopleAssignments.some((a: any) => a.actionId === actionId);
  };

  // Helper to get people assigned to an action
  const getActionPeople = (actionId: string) => {
    if (!allActionPeopleAssignments) return [];
    return allActionPeopleAssignments.filter((a: any) => a.actionId === actionId);
  };

  // Helper to check if a person is assigned at the project level
  const isPersonAssignedToProject = (projectId: string, userId: string) => {
    if (!allResourceAssignments) return false;
    return allResourceAssignments.some((a: any) => a.projectId === projectId && a.userId === userId);
  };

  // Check URL for strategyId param to auto-filter to that strategy
  // Note: wouter's location only includes pathname, so we use window.location.search for query params
  // The location dependency ensures this re-runs when navigating between pages
  const urlStrategyId = useMemo(() => 
    new URLSearchParams(window.location.search).get('strategyId'),
    [location]
  );
  const lastAppliedUrlParam = useRef<string | null>(null);
  
  useEffect(() => {
    if (strategies && urlStrategyId && urlStrategyId !== lastAppliedUrlParam.current) {
      const validStrategyIds = new Set((strategies as any[]).map((s: any) => s.id));
      
      if (validStrategyIds.has(urlStrategyId)) {
        // Set the strategy filter to show only the target strategy
        setStrategyFilter(urlStrategyId);
        // Expand all strategies when filtered (since there's only one showing)
        setCollapsedStrategies(new Set());
        // Track that we've applied this URL param
        lastAppliedUrlParam.current = urlStrategyId;
      }
    }
  }, [strategies, urlStrategyId]);

  // Handler for manual filter dropdown changes
  const handleStrategyFilterChange = (value: string) => {
    setStrategyFilter(value);
    // Reset the URL param guard when user manually changes filter
    // This allows navigation arrows to re-apply the same strategy filter
    if (value === "all") {
      lastAppliedUrlParam.current = null;
    }
  };

  // Track previous filter to only reset collapse state when filter actually changes
  const previousFilterRef = useRef<string>(strategyFilter);
  // Track whether initial collapse has been done
  const initialCollapseRef = useRef<boolean>(false);
  
  // Auto-collapse all strategies when "All Strategies" filter is active
  useEffect(() => {
    // On initial load with "all" filter, collapse all strategies
    if (!initialCollapseRef.current && strategies && strategyFilter === "all") {
      const allStrategyIds = new Set((strategies as any[]).map((s: any) => s.id));
      setCollapsedStrategies(allStrategyIds);
      initialCollapseRef.current = true;
      return;
    }
    
    // Only reset collapse state when the filter actually changes, not on data refresh
    if (previousFilterRef.current !== strategyFilter) {
      previousFilterRef.current = strategyFilter;
      
      if (strategies && strategyFilter === "all") {
        // Collapse all strategy cards
        const allStrategyIds = new Set((strategies as any[]).map((s: any) => s.id));
        setCollapsedStrategies(allStrategyIds);
      } else if (strategyFilter !== "all") {
        // Expand when a specific strategy is selected
        setCollapsedStrategies(new Set());
      }
    }
  }, [strategies, strategyFilter]);

  // Handle highlight parameter from calendar navigation
  const highlightParam = useMemo(() => 
    new URLSearchParams(window.location.search).get('highlight'),
    [location]
  );
  const highlightProjectParam = useMemo(() => 
    new URLSearchParams(window.location.search).get('project'),
    [location]
  );

  useEffect(() => {
    if (!highlightParam || !projects || !strategies) return;

    // Parse highlight param (format: "project-{id}" or "action-{id}")
    const parts = highlightParam.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');

    // Helper to clear only highlight params from URL while preserving others
    const clearHighlightParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('highlight');
      url.searchParams.delete('project');
      const newPath = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
      window.history.replaceState({}, '', newPath);
    };

    if (type === 'project') {
      const project = (projects as any[]).find((p: any) => p.id === id);
      if (project) {
        // Find the strategy containing this project
        const strategy = (strategies as any[]).find((s: any) => s.id === project.strategyId);
        if (strategy) {
          // Filter to only show this strategy to ensure visibility
          setStrategyFilter(strategy.id);
          // Clear all collapsed strategies to ensure the target is visible
          setCollapsedStrategies(new Set());
          // Set highlight
          setHighlightedProjectId(id);
          // Clear only the highlight params from URL after a short delay
          setTimeout(() => {
            clearHighlightParams();
          }, 100);
          // Scroll to the project after render
          setTimeout(() => {
            const element = projectRefs.current.get(id);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
          // Clear highlight after animation
          setTimeout(() => {
            setHighlightedProjectId(null);
          }, 2500);
        }
      }
    } else if (type === 'action' && highlightProjectParam) {
      const project = (projects as any[]).find((p: any) => p.id === highlightProjectParam);
      if (project) {
        // Find the strategy containing this project
        const strategy = (strategies as any[]).find((s: any) => s.id === project.strategyId);
        if (strategy) {
          // Filter to only show this strategy to ensure visibility
          setStrategyFilter(strategy.id);
          // Clear all collapsed strategies to ensure the target is visible
          setCollapsedStrategies(new Set());
          // Expand the project to show actions
          setExpandedProjects(prev => {
            const newSet = new Set(prev);
            newSet.add(highlightProjectParam);
            return newSet;
          });
          // Set highlights
          setHighlightedProjectId(highlightProjectParam);
          setHighlightedActionId(id);
          // Clear only the highlight params from URL after a short delay
          setTimeout(() => {
            clearHighlightParams();
          }, 100);
          // Scroll to the project after render
          setTimeout(() => {
            const element = projectRefs.current.get(highlightProjectParam);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
          // Clear highlights after animation
          setTimeout(() => {
            setHighlightedProjectId(null);
            setHighlightedActionId(null);
          }, 2500);
        }
      }
    }
  }, [highlightParam, highlightProjectParam, projects, strategies]);

  // Toggle project expand/collapse (projects are collapsed by default)
  const toggleProjectCollapse = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Get actions for a specific project (sorted by due date)
  const getProjectActions = (projectId: string) => {
    const filtered = (actions || []).filter(a => a.projectId === projectId && a.isArchived !== 'true');
    // Sort by due date (items without due date go last)
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  };

  // Get action status color
  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'fill-green-500 text-green-500';
      case 'in_progress': return 'fill-blue-500 text-blue-500';
      case 'at_risk': return 'fill-yellow-500 text-yellow-500';
      case 'on_hold': return 'fill-orange-500 text-orange-500';
      default: return 'fill-gray-300 text-gray-300';
    }
  };

  // Get action status badge
  const getActionStatusBadge = (status: string) => {
    switch (status) {
      case 'achieved': return { label: 'Achieved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'in_progress': return { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'at_risk': return { label: 'At Risk', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
      case 'on_hold': return { label: 'On Hold', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
      default: return { label: 'Not Started', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
    }
  };

  // Get project status display
  const getProjectStatusBadge = (status: string) => {
    switch (status) {
      case 'C': return { label: 'C', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'OT': return { label: 'OT', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'OH': return { label: 'OH', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
      case 'B': return { label: 'B', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
      case 'NYS': return { label: 'NYS', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    }
  };

  // Get circle color for status dropdown
  const getStatusCircleColor = (status: string) => {
    switch (status) {
      case 'C': return 'bg-green-500';
      case 'OT': return 'bg-blue-500';
      case 'OH': return 'bg-yellow-500';
      case 'B': return 'bg-red-500';
      case 'NYS': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Status options for dropdown
  const projectStatusOptions = [
    { value: 'NYS', label: 'Not Yet Started', shortLabel: 'NYS' },
    { value: 'OT', label: 'On Track', shortLabel: 'OT' },
    { value: 'OH', label: 'On Hold', shortLabel: 'OH' },
    { value: 'B', label: 'Behind', shortLabel: 'B' },
    { value: 'C', label: 'Completed', shortLabel: 'C' },
  ];

  // Format date for display - use UTC to prevent timezone offset issues
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  };

  // Enhance strategies with projects
  const strategiesWithProjects = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    projects: (projects as any[])?.filter((project: any) => project.strategyId === strategy.id) || []
  })) || [];

  // Filter and sort strategies (active and completed)
  const filteredStrategies = strategiesWithProjects
    .filter((strategy: any) => {
      const matchesSearch = strategy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by strategy dropdown
      const matchesStrategyFilter = strategyFilter === "all" || strategy.id === strategyFilter;
      
      // Default filter hides archived items
      const isNotArchived = strategy.status !== 'Archived';
      
      return matchesSearch && matchesStrategyFilter && isNotArchived;
    })
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Get archived strategies separately
  const archivedStrategies = strategiesWithProjects
    .filter((strategy: any) => {
      const matchesSearch = strategy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStrategyFilter = strategyFilter === "all" || strategy.id === strategyFilter;
      return matchesSearch && matchesStrategyFilter && strategy.status?.toLowerCase() === 'archived';
    })
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleCreateProject = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setIsCreateProjectOpen(true);
  };



  const completeStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("PATCH", `/api/strategies/${strategyId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Priority marked as completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete priority",
        variant: "destructive",
      });
    },
  });

  const archiveStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("PATCH", `/api/strategies/${strategyId}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outcomes"] });
      toast({
        title: "Success",
        description: "Priority and related items archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive priority",
        variant: "destructive",
      });
    },
  });

  const updateStrategyExecutiveGoalsMutation = useMutation({
    mutationFn: async ({ strategyId, goalIds }: { strategyId: string; goalIds: string[] }) => {
      const response = await apiRequest("PUT", `/api/strategies/${strategyId}/executive-goals`, { executiveGoalIds: goalIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategy-executive-goals"] });
      setExecutiveGoalModalStrategy(null);
      setSelectedGoalIds([]);
      toast({
        title: "Success",
        description: "Executive Goals updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update Executive Goals",
        variant: "destructive",
      });
    },
  });

  // Resource assignment mutations for capacity planning
  const upsertResourceAssignmentMutation = useMutation({
    mutationFn: async ({ projectId, assignedUserId, hoursPerWeek }: { projectId: string; assignedUserId: string; hoursPerWeek: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/resource-assignments`, { assignedUserId, hoursPerWeek });
      return response.json();
    },
    onSuccess: () => {
      if (resourcesModalProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${resourcesModalProject.id}/resource-assignments`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/resource-assignments"] });
      toast({
        title: "Success",
        description: "Resource assignment updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update resource assignment",
        variant: "destructive",
      });
    },
  });

  const deleteResourceAssignmentMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}/resource-assignments/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      if (resourcesModalProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${resourcesModalProject.id}/resource-assignments`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/resource-assignments"] });
      toast({
        title: "Success",
        description: "Resource removed from project",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove resource",
        variant: "destructive",
      });
    },
  });

  // Action people assignment mutations (for to-do list tagging)
  const addActionPeopleMutation = useMutation({
    mutationFn: async ({ actionId, assignedUserId }: { actionId: string; assignedUserId: string }) => {
      const response = await apiRequest("POST", `/api/actions/${actionId}/people-assignments`, { assignedUserId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-people-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-todos"] });
      toast({
        title: "Success",
        description: "Person assigned to action",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign person",
        variant: "destructive",
      });
    },
  });

  const removeActionPeopleMutation = useMutation({
    mutationFn: async ({ actionId, userId }: { actionId: string; userId: string }) => {
      const response = await apiRequest("DELETE", `/api/actions/${actionId}/people-assignments/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-people-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-todos"] });
      toast({
        title: "Success",
        description: "Person removed from action",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove person",
        variant: "destructive",
      });
    },
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("DELETE", `/api/strategies/${strategyId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      toast({
        title: "Success",
        description: "Priority deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete priority",
        variant: "destructive",
      });
    },
  });

  const handleEditStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setIsEditStrategyOpen(true);
  };

  const handleViewStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setIsViewStrategyOpen(true);
  };

  const handleDeleteStrategy = (strategyId: string) => {
    deleteStrategyMutation.mutate(strategyId);
  };

  // Project action handlers
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async ({ projectId, reason, wakeUpDate }: { projectId: string; reason?: string; wakeUpDate?: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/archive`, {
        reason,
        wakeUpDate: wakeUpDate || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      setArchivingProject(null);
      setArchiveReason("");
      setArchiveWakeUpDate("");
      toast({
        title: "Project Archived",
        description: "The project has been moved to the archive and removed from daily view.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    },
  });

  const createDependencyMutation = useMutation({
    mutationFn: async (data: { sourceType: string; sourceId: string; targetType: string; targetId: string }) => {
      const response = await apiRequest("POST", "/api/dependencies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Dependency added successfully",
      });
      setSelectedDependencyType(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add dependency",
        variant: "destructive",
      });
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      await apiRequest("DELETE", `/api/dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Dependency removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove dependency",
        variant: "destructive",
      });
    },
  });

  // Action status update mutation
  const updateActionStatusMutation = useMutation({
    mutationFn: async ({ action, status }: { action: any; status: string }) => {
      const updateData: any = {
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        status: status,
        isArchived: action.isArchived,
        createdBy: action.createdBy,
      };
      if (action.projectId) updateData.projectId = action.projectId;
      if (action.targetValue) updateData.targetValue = action.targetValue;
      if (action.currentValue) updateData.currentValue = action.currentValue;
      if (action.measurementUnit) updateData.measurementUnit = action.measurementUnit;
      if (action.dueDate) updateData.dueDate = action.dueDate;
      if (action.documentFolderUrl) updateData.documentFolderUrl = action.documentFolderUrl;
      
      return await apiRequest("PATCH", `/api/actions/${action.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Action status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update action status",
        variant: "destructive",
      });
    },
  });

  // Action folder URL update mutation
  const updateActionFolderUrlMutation = useMutation({
    mutationFn: async ({ action, folderUrl }: { action: any; folderUrl: string }) => {
      const updateData: any = {
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        status: action.status,
        isArchived: action.isArchived,
        createdBy: action.createdBy,
        documentFolderUrl: folderUrl || null,
      };
      if (action.projectId) updateData.projectId = action.projectId;
      if (action.targetValue) updateData.targetValue = action.targetValue;
      if (action.currentValue) updateData.currentValue = action.currentValue;
      if (action.measurementUnit) updateData.measurementUnit = action.measurementUnit;
      if (action.dueDate) updateData.dueDate = action.dueDate;
      
      return await apiRequest("PATCH", `/api/actions/${action.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Success",
        description: "Folder link updated",
      });
      setFolderUrlModalAction(null);
      setActionFolderUrl("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update folder link",
        variant: "destructive",
      });
    },
  });

  // Action notes update mutation
  const updateActionNotesMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: any; notes: string }) => {
      const updateData: any = {
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        status: action.status,
        isArchived: action.isArchived,
        createdBy: action.createdBy,
        notes: notes || null,
      };
      if (action.projectId) updateData.projectId = action.projectId;
      if (action.targetValue) updateData.targetValue = action.targetValue;
      if (action.currentValue) updateData.currentValue = action.currentValue;
      if (action.measurementUnit) updateData.measurementUnit = action.measurementUnit;
      if (action.dueDate) updateData.dueDate = action.dueDate;
      if (action.documentFolderUrl) updateData.documentFolderUrl = action.documentFolderUrl;
      
      return await apiRequest("PATCH", `/api/actions/${action.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Success",
        description: "Notes updated",
      });
      setNotesModalAction(null);
      setActionNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    },
  });

  // Action due date update mutation
  const updateActionDueDateMutation = useMutation({
    mutationFn: async ({ action, dueDate }: { action: any; dueDate: string | null }) => {
      const updateData: any = {
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        status: action.status,
        isArchived: action.isArchived,
        createdBy: action.createdBy,
        dueDate: dueDate,
      };
      if (action.projectId) updateData.projectId = action.projectId;
      if (action.targetValue) updateData.targetValue = action.targetValue;
      if (action.currentValue) updateData.currentValue = action.currentValue;
      if (action.measurementUnit) updateData.measurementUnit = action.measurementUnit;
      if (action.documentFolderUrl) updateData.documentFolderUrl = action.documentFolderUrl;
      if (action.notes) updateData.notes = action.notes;
      
      return await apiRequest("PATCH", `/api/actions/${action.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Success",
        description: "Due date updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    },
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await apiRequest("DELETE", `/api/actions/${actionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Action deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete action",
        variant: "destructive",
      });
    },
  });

  // Create checklist item mutation
  const createChecklistItemMutation = useMutation({
    mutationFn: async ({ actionId, title }: { actionId: string; title: string }) => {
      const response = await apiRequest("POST", `/api/actions/${actionId}/checklist`, {
        title,
        isCompleted: 'false',
        orderIndex: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-checklist-items"] });
      setNewChecklistItem("");
      toast({
        title: "Success",
        description: "Checklist item added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add checklist item",
        variant: "destructive",
      });
    },
  });

  // Toggle checklist item mutation
  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ item, isCompleted }: { item: any; isCompleted: boolean }) => {
      return await apiRequest("PATCH", `/api/actions/${item.actionId}/checklist/${item.id}`, {
        title: item.title,
        isCompleted: isCompleted ? 'true' : 'false',
        orderIndex: item.orderIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-checklist-items"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    },
  });

  // Delete checklist item mutation
  const deleteChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, actionId }: { itemId: string; actionId: string }) => {
      await apiRequest("DELETE", `/api/actions/${actionId}/checklist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-checklist-items"] });
      toast({
        title: "Success",
        description: "Checklist item removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove checklist item",
        variant: "destructive",
      });
    },
  });

  // Update checklist item indent level mutation
  const updateChecklistIndentMutation = useMutation({
    mutationFn: async ({ item, indentLevel }: { item: any; indentLevel: number }) => {
      return await apiRequest("PATCH", `/api/actions/${item.actionId}/checklist/${item.id}`, {
        indentLevel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-checklist-items"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update indent level",
        variant: "destructive",
      });
    },
  });

  // Update checklist item title mutation
  const updateChecklistTitleMutation = useMutation({
    mutationFn: async ({ item, title }: { item: any; title: string }) => {
      return await apiRequest("PATCH", `/api/actions/${item.actionId}/checklist/${item.id}`, {
        title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-checklist-items"] });
      setEditingChecklistItemId(null);
      setEditingChecklistItemTitle("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    },
  });

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  };

  const handleViewProject = (project: any) => {
    setViewingProject(project);
    setIsViewProjectOpen(true);
  };

  const handleEditAction = (action: any) => {
    setEditingAction(action);
    setIsEditActionOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  const handleManageBarriers = (projectId: string) => {
    setBarriersProjectId(projectId);
    setIsManageBarriersOpen(true);
  };

  const toggleStrategyCollapse = (strategyId: string) => {
    const newCollapsed = new Set(collapsedStrategies);
    if (newCollapsed.has(strategyId)) {
      newCollapsed.delete(strategyId);
    } else {
      newCollapsed.add(strategyId);
    }
    setCollapsedStrategies(newCollapsed);
  };

  if (strategiesLoading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 rounded-xl w-1/4 mb-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}></div>
            <div className="h-4 rounded-xl w-1/2 mb-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header - Apple HIG Glassmorphism */}
        <header 
          className="sticky top-0 z-10 px-6 py-5"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Strategic Priorities</h2>
              </div>
            </div>
            {canCreateStrategies() && (
              <Button 
                onClick={() => setIsCreateStrategyOpen(true)} 
                className="rounded-full px-5"
                style={{ backgroundColor: '#007AFF' }}
                data-testid="button-create-strategy"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Strategic Priority
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="px-6 py-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#86868B' }} />
              <Input
                placeholder="Search strategies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-0"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}
                data-testid="input-search-strategies"
              />
            </div>
            <Select value={strategyFilter} onValueChange={handleStrategyFilterChange}>
              <SelectTrigger className="w-48 rounded-xl border-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }} data-testid="select-strategy-filter">
                <Target className="w-4 h-4 mr-2" style={{ color: '#007AFF' }} />
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Strategies</SelectItem>
                {(strategies as any[])?.filter(s => s.status !== 'Archived').map((strategy: any) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="p-6">
          {filteredStrategies.length === 0 ? (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
              >
                <Search className="h-7 w-7" style={{ color: '#007AFF' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1D1D1F' }}>No strategic priorities found</h3>
              <p className="mb-4" style={{ color: '#86868B' }}>
                {searchTerm || strategyFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first strategic priority"}
              </p>
              {canCreateStrategies() && !searchTerm && strategyFilter === "all" && (
                <Button 
                  onClick={() => setIsCreateStrategyOpen(true)} 
                  className="rounded-full px-5"
                  style={{ backgroundColor: '#007AFF' }}
                  data-testid="button-create-first-strategy"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Strategic Priority
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStrategies.map((strategy: any) => {
                const isCollapsed = collapsedStrategies.has(strategy.id);
                const strategyProgress = strategy.progress || 0;
                
                return (
                <Card 
                  key={strategy.id} 
                  className="overflow-hidden border-0 rounded-2xl"
                  style={{ 
                    borderLeft: `4px solid ${strategy.colorCode}`,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  {/* Compact Header - Always Visible */}
                  <CardHeader 
                    className="cursor-pointer transition-colors py-3 px-4"
                    style={{ backgroundColor: 'transparent' }}
                    onClick={() => toggleStrategyCollapse(strategy.id)}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Executive Goal Tags - Above title (supports multiple) */}
                      {getStrategyExecutiveGoals(strategy.id).length > 0 && (
                        <div className="flex items-center gap-2 pl-8 flex-wrap">
                          <TooltipProvider>
                            {getStrategyExecutiveGoals(strategy.id).map((goal: ExecutiveGoal) => (
                              <Tooltip key={goal.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <span
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <Badge 
                                      className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium px-2 py-0.5 cursor-help"
                                      data-testid={`executive-goal-tag-${strategy.id}-${goal.id}`}
                                    >
                                      <Tag className="w-3 h-3 mr-1" />
                                      {goal.name}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs z-[100]">
                                  <p>{goal.description || goal.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </TooltipProvider>
                        </div>
                      )}
                      {/* Row 1: Chevron, Status dot, Full Title */}
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                        <h3 className="text-base sm:text-lg font-bold flex-1" style={{ color: '#1D1D1F' }}>
                          {strategy.title}
                        </h3>
                      </div>
                      
                      {/* Row 2: Meta info and actions */}
                      <div className="flex items-center justify-between gap-2 pl-8">
                        {/* Left side: meta info */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Project count */}
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span className="whitespace-nowrap">{strategy.projects.length} project{strategy.projects.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {/* Progress Ring */}
                          <ProgressRing progress={strategyProgress} size={32} strokeWidth={3} />
                          
                          {/* Status Badge */}
                          <Badge 
                            variant="outline" 
                            className="text-xs font-medium"
                            style={{ color: strategy.colorCode, borderColor: strategy.colorCode }}
                          >
                            {strategy.status.toLowerCase()}
                          </Badge>
                        </div>
                        
                        {/* Right side: Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Metrics Button - opens modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMetricsModalStrategy(strategy)}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-metrics-${strategy.id}`}
                          >
                            <BarChart3 className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Metrics</span>
                          </Button>
                          
                          {/* Continuum Button - opens modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContinuumModalStrategy(strategy)}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-continuum-${strategy.id}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Continuum</span>
                          </Button>
                        
                          {/* Menu */}
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-strategy-menu-${strategy.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewStrategy(strategy);
                              }}
                              data-testid={`button-view-strategy-${strategy.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkstreamModalStrategyId(strategy.id);
                                setWorkstreamModalTitle(strategy.title || "");
                              }}
                            >
                              <Network className="h-4 w-4 mr-2" />
                              Workstreams
                            </DropdownMenuItem>
                            {canEditAllStrategies() && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStrategy(strategy);
                                  }}
                                  data-testid={`button-edit-strategy-${strategy.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Priority
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentGoalIds = getStrategyExecutiveGoals(strategy.id).map(g => g.id);
                                    setSelectedGoalIds(currentGoalIds);
                                    setExecutiveGoalModalStrategy(strategy);
                                  }}
                                  data-testid={`button-tag-executive-goal-${strategy.id}`}
                                >
                                  <Tag className="h-4 w-4 mr-2" />
                                  Tag Executive Goals
                                </DropdownMenuItem>
                                {strategy.status?.toLowerCase() === 'active' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      completeStrategyMutation.mutate(strategy.id);
                                    }}
                                    data-testid={`button-complete-${strategy.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}
                                {strategy.status?.toLowerCase() === 'completed' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      archiveStrategyMutation.mutate(strategy.id);
                                    }}
                                    data-testid={`button-archive-${strategy.id}`}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={(e) => e.preventDefault()}
                                      data-testid={`button-delete-strategy-${strategy.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Priority
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Priority</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{strategy.title}"? This action cannot be undone and will also delete all associated projects.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteStrategy(strategy.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`button-confirm-delete-strategy-${strategy.id}`}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Content - Projects and Continuum */}
                  {!isCollapsed && (
                    <CardContent className="pt-0 px-6 pb-4">
                      {/* Projects Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Projects ({strategy.projects.length})
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateProject(strategy.id);
                              }}
                              className="h-7 px-2 text-xs"
                              style={{ backgroundColor: strategy.colorCode, borderColor: strategy.colorCode }}
                              data-testid={`button-add-project-${strategy.id}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Project
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStrategyIdForAction(strategy.id);
                                setSelectedProjectIdForAction(null);
                                setIsCreateActionOpen(true);
                              }}
                              className="h-7 px-2 text-xs"
                              data-testid={`button-add-action-${strategy.id}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Action
                            </Button>
                          </div>
                        </div>

                        {/* Project List */}
                        <div className="space-y-2">
                          {strategy.projects.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                              No projects yet. Create your first project to get started.
                            </p>
                          ) : (
                            [...strategy.projects]
                              .sort((a: any, b: any) => {
                                // Sort by start date (earliest first), projects without start date go last
                                const aDate = a.startDate ? new Date(a.startDate).getTime() : null;
                                const bDate = b.startDate ? new Date(b.startDate).getTime() : null;
                                const aValid = aDate !== null && !isNaN(aDate);
                                const bValid = bDate !== null && !isNaN(bDate);
                                if (!aValid && !bValid) return 0;
                                if (!aValid) return 1;
                                if (!bValid) return -1;
                                return aDate - bDate;
                              })
                              .map((project: any) => {
                              const projectActions = getProjectActions(project.id);
                              const isProjectExpanded = expandedProjects.has(project.id);
                              const statusBadge = getProjectStatusBadge(project.status);
                              const projectProgress = project.progress || 0;

                              return (
                                <div 
                                  key={project.id} 
                                  ref={(el) => {
                                    if (el) projectRefs.current.set(project.id, el);
                                  }}
                                  className={`border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 ${
                                    highlightedProjectId === project.id 
                                      ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-950/30 animate-pulse' 
                                      : ''
                                  }`}
                                >
                                  {/* Project Row */}
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    onClick={(e) => {
                                      toggleProjectCollapse(project.id, e);
                                    }}
                                  >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      {/* Expand chevron */}
                                      {project.isWorkstream === 'true' ? (
                                        isProjectExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                        )
                                      ) : isProjectExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      )}
                                      
                                      {/* Project title, status badge, and action count */}
                                      <div className="min-w-0 flex-1">
                                        {/* Project dates - above the title */}
                                        {(project.startDate || project.dueDate) && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">
                                            {project.startDate && formatDateShort(project.startDate)}
                                            {project.startDate && project.dueDate && ' - '}
                                            {project.dueDate && formatDateShort(project.dueDate)}
                                          </span>
                                        )}
                                        <div className="flex items-center gap-2">
                                          {/* Title and Status - left side */}
                                          <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                                            <span className="font-medium text-base text-gray-900 dark:text-white truncate">
                                              {project.title}
                                            </span>
                                            {project.isWorkstream === 'true' && (
                                              <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 shrink-0">
                                                ERP Workstream
                                              </Badge>
                                            )}
                                            {/* Status dropdown - immediately after title */}
                                            {canEditAllStrategies() ? (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-1.5 py-0 flex items-center gap-1"
                                                  onClick={(e) => e.stopPropagation()}
                                                  data-testid={`status-dropdown-${project.id}`}
                                                >
                                                  <div className={`w-3 h-3 rounded-full ${getStatusCircleColor(project.status)}`} />
                                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                                {projectStatusOptions.map((option) => (
                                                  <DropdownMenuItem
                                                    key={option.value}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      updateProjectStatusMutation.mutate({ projectId: project.id, status: option.value });
                                                    }}
                                                    className="flex items-center gap-2"
                                                    data-testid={`status-option-${option.value}-${project.id}`}
                                                  >
                                                    <div className={`w-3 h-3 rounded-full ${getStatusCircleColor(option.value)}`} />
                                                    <span>{option.label}</span>
                                                    {project.status === option.value && (
                                                      <CheckCircle className="w-3 h-3 ml-auto text-green-500" />
                                                    )}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          ) : (
                                            <Badge className={`text-xs px-1.5 py-0 ${statusBadge.color}`}>
                                              {statusBadge.label}
                                            </Badge>
                                          )}
                                          </div>
                                          
                                          {/* Icon Bar - pushed to the right */}
                                          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                                            {/* Leaders */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setResourcesModalProject(project);
                                              }}
                                              title="Capacity Planning Tag"
                                              data-testid={`button-view-leaders-${project.id}`}
                                            >
                                              <Users className={`w-3.5 h-3.5 ${projectHasResources(project.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Barriers - grey if none, red if active */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageBarriers(project.id);
                                              }}
                                              title={projectHasActiveBarriers(project.id) ? "Manage barriers" : "Add barrier"}
                                              data-testid={`button-barriers-${project.id}`}
                                            >
                                              <AlertTriangle className={`w-3.5 h-3.5 ${projectHasActiveBarriers(project.id) ? 'text-red-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Dependencies - right after Barriers */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDependenciesModalProject(project);
                                              }}
                                              title={projectHasDependencies(project.id) ? "View dependencies" : "No dependencies"}
                                              data-testid={`button-dependencies-${project.id}`}
                                            >
                                              <Link2 className={`w-3.5 h-3.5 ${projectHasDependencies(project.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Documents */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDocumentUrlInput(project.documentFolderUrl || "");
                                                setDocumentUrlEditing(!project.documentFolderUrl && canEditAllStrategies());
                                                setDocumentsModalProject(project);
                                              }}
                                              title={project.documentFolderUrl ? "Manage project documents" : "Add documents link"}
                                              data-testid={`button-documents-${project.id}`}
                                            >
                                              <FolderOpen className={`w-3.5 h-3.5 ${project.documentFolderUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Communication */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setCommunicationUrlInput(project.communicationUrl || "");
                                                setCommunicationUrlEditing(!project.communicationUrl && canEditAllStrategies());
                                                setCommunicationModalProject(project);
                                              }}
                                              title={project.communicationUrl ? "Manage communication plan" : "Add communication link"}
                                              data-testid={`button-communication-${project.id}`}
                                            >
                                              <Megaphone className={`w-3.5 h-3.5 ${project.communicationUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Three dots menu */}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-6 w-6 p-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                  data-testid={`menu-project-${project.id}`}
                                                >
                                                  <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewProject(project);
                                                  }}
                                                  data-testid={`menu-view-project-${project.id}`}
                                                >
                                                  <Eye className="w-4 h-4 mr-2" />
                                                  View Details
                                                </DropdownMenuItem>
                                                {canEditAllStrategies() && (
                                                  <>
                                                    <DropdownMenuItem 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditProject(project);
                                                      }}
                                                      data-testid={`menu-edit-project-${project.id}`}
                                                    >
                                                      <Edit className="w-4 h-4 mr-2" />
                                                      Edit Project
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setArchivingProject(project);
                                                        setArchiveReason("");
                                                        setArchiveWakeUpDate("");
                                                      }}
                                                      data-testid={`menu-archive-project-${project.id}`}
                                                    >
                                                      <Archive className="w-4 h-4 mr-2" />
                                                      Archive Project
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem 
                                                          onSelect={(e) => e.preventDefault()}
                                                          className="text-red-600"
                                                          data-testid={`menu-delete-project-${project.id}`}
                                                        >
                                                          <Trash2 className="w-4 h-4 mr-2" />
                                                          Delete
                                                        </DropdownMenuItem>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            Are you sure you want to delete "{project.title}"? This action cannot be undone.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction
                                                            onClick={() => handleDeleteProject(project.id)}
                                                            className="bg-red-600 hover:bg-red-700"
                                                          >
                                                            Delete
                                                          </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>
                                                  </>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                            
                                            {/* Progress ring - inline with icons */}
                                            <div className="h-6 w-6 flex items-center justify-center ml-1">
                                              <ProgressRing progress={projectProgress} size={24} strokeWidth={2.5} />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {projectActions.length} action{projectActions.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Phase-Grouped Actions - for workstream projects */}
                                  {isProjectExpanded && project.isWorkstream === 'true' && (() => {
                                    const wsActions = (actions || []).filter((a: any) => a.projectId === project.id && a.workstreamId);
                                    const strategyPhases = phases.filter((p: any) => p.strategyId === project.strategyId)
                                      .sort((a: any, b: any) => (a.sequence || a.orderIndex || 0) - (b.sequence || b.orderIndex || 0));
                                    const ungrouped = wsActions.filter((a: any) => !a.phaseId);
                                    return (
                                      <div className="border-t border-gray-200 dark:border-gray-700 bg-indigo-50/30 dark:bg-indigo-900/10 px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                              {wsActions.length} workstream action{wsActions.length !== 1 ? 's' : ''}
                                            </Badge>
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-indigo-600 dark:text-indigo-400" onClick={(e) => {
                                              e.stopPropagation();
                                              setWorkstreamModalStrategyId(project.strategyId);
                                              setWorkstreamModalTitle(strategies?.find((s: any) => s.id === project.strategyId)?.title || "");
                                            }}>
                                              Open Full Workstream View
                                            </Button>
                                          </div>
                                          {canEditAllStrategies() && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setWsTaskStrategyId(project.strategyId);
                                                setWsTaskProjectId(project.id);
                                                setWsTaskWorkstreamId(project.workstreamId);
                                                setIsCreateWsTaskOpen(true);
                                              }}
                                            >
                                              <Plus className="w-3 h-3 mr-1" />
                                              Add Task
                                            </Button>
                                          )}
                                        </div>
                                        {strategyPhases.map((phase: any) => {
                                          const phaseActions = wsActions.filter((a: any) => a.phaseId === phase.id);
                                          if (phaseActions.length === 0) return null;
                                          return (
                                            <div key={phase.id} className="mb-3">
                                              <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{phase.name}</span>
                                                <span className="text-xs text-gray-400">({phaseActions.length})</span>
                                              </div>
                                              <div className="space-y-1 ml-4">
                                                {phaseActions.map((action: any) => {
                                                  const dueDateDisplay = getActionDueDateDisplay(action);
                                                  const isMilestone = action.isMilestone === 'true';
                                                  return (
                                                    <div
                                                      key={action.id}
                                                      className="flex items-center justify-between py-1.5 hover:bg-white/50 dark:hover:bg-gray-800/30 rounded px-2 -mx-2"
                                                      data-testid={`ws-action-row-${action.id}`}
                                                    >
                                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {canEditAllStrategies() ? (
                                                          <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                              <Button variant="ghost" size="sm" className="h-5 px-1 py-0 flex items-center gap-0.5">
                                                                <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(action.status)}`} />
                                                                <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                                                              </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start">
                                                              {actionStatusOptions.map((option) => (
                                                                <DropdownMenuItem
                                                                  key={option.value}
                                                                  onClick={() => updateActionStatusMutation.mutate({ action, status: option.value })}
                                                                  className="flex items-center gap-2"
                                                                >
                                                                  <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(option.value)}`} />
                                                                  <span>{option.label}</span>
                                                                  {action.status === option.value && (
                                                                    <CheckCircle className="w-3 h-3 ml-auto text-green-500" />
                                                                  )}
                                                                </DropdownMenuItem>
                                                              ))}
                                                            </DropdownMenuContent>
                                                          </DropdownMenu>
                                                        ) : (
                                                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getActionStatusCircleColor(action.status)}`} />
                                                        )}
                                                        {isMilestone && (
                                                          <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                        )}
                                                        <span
                                                          className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-primary cursor-pointer"
                                                          onClick={() => setChecklistModalAction(action)}
                                                        >
                                                          {action.title}
                                                        </span>
                                                        {isMilestone && action.milestoneType && (
                                                          <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                                            {action.milestoneType === 'program_gate' ? 'Gate' : 'Milestone'}
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-1 flex-shrink-0">
                                                        {dueDateDisplay && (
                                                          <>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dueDateDisplay.date}</span>
                                                            <Badge
                                                              className={`text-xs px-1.5 py-0 cursor-pointer ${dueDateDisplay.color}`}
                                                              onClick={(e) => { e.stopPropagation(); setDueDateModalAction(action); }}
                                                            >
                                                              {dueDateDisplay.text}
                                                            </Badge>
                                                          </>
                                                        )}
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setActionPeopleModalAction(action); }} title="Assign To-Do Actions">
                                                          <Users className={`w-3 h-3 ${actionHasPeople(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setDependenciesModalAction(action); }} title={actionHasDependencies(action.id) ? "View dependencies" : "Add dependency"}>
                                                          <Link2 className={`w-3 h-3 ${actionHasDependencies(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setChecklistModalAction(action); }} title="View checklist">
                                                          <ListChecks className={`w-3 h-3 ${actionHasIncompleteChecklist(action.id) ? 'text-yellow-500' : getActionChecklistItems(action.id).length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setActionFolderUrl(action.documentFolderUrl || ""); setActionFolderUrlEditing(!action.documentFolderUrl && canEditAllStrategies()); setFolderUrlModalAction(action); }} title={action.documentFolderUrl ? "View folder link" : "Add folder link"}>
                                                          <FolderOpen className={`w-3 h-3 ${action.documentFolderUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setNotesModalAction(action); setActionNotes(action.notes || ""); }} title={action.notes ? "View notes" : "Add notes"}>
                                                          <StickyNote className={`w-3 h-3 ${action.notes ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        </Button>
                                                        {canEditAllStrategies() && (
                                                          <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => e.stopPropagation()}>
                                                                <MoreVertical className="w-3 h-3 text-gray-500" />
                                                              </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                              <DropdownMenuItem onClick={() => { setDueDateModalAction(action); }}>
                                                                <Calendar className="w-3.5 h-3.5 mr-2" />
                                                                Edit Due Date
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem onClick={() => { setFolderUrlModalAction(action); setActionFolderUrl(action.documentFolderUrl || ""); }}>
                                                                <FolderOpen className="w-3.5 h-3.5 mr-2" />
                                                                Edit Folder Link
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem onClick={() => handleEditAction(action)}>
                                                                <Edit className="w-3.5 h-3.5 mr-2" />
                                                                Edit Task
                                                              </DropdownMenuItem>
                                                              <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                    Delete
                                                                  </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                                  <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                      Are you sure you want to delete "{action.title}"? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                  </AlertDialogHeader>
                                                                  <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => deleteActionMutation.mutate(action.id)} className="bg-red-600 hover:bg-red-700">
                                                                      Delete
                                                                    </AlertDialogAction>
                                                                  </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                              </AlertDialog>
                                                            </DropdownMenuContent>
                                                          </DropdownMenu>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                        {ungrouped.length > 0 && (
                                          <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Unassigned Phase</span>
                                              <span className="text-xs text-gray-400">({ungrouped.length})</span>
                                            </div>
                                            <div className="space-y-1 ml-4">
                                              {ungrouped.map((action: any) => {
                                                const dueDateDisplay = getActionDueDateDisplay(action);
                                                return (
                                                  <div
                                                    key={action.id}
                                                    className="flex items-center justify-between py-1.5 hover:bg-white/50 dark:hover:bg-gray-800/30 rounded px-2 -mx-2"
                                                    data-testid={`ws-action-row-${action.id}`}
                                                  >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      {canEditAllStrategies() ? (
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-5 px-1 py-0 flex items-center gap-0.5">
                                                              <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(action.status)}`} />
                                                              <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="start">
                                                            {actionStatusOptions.map((option) => (
                                                              <DropdownMenuItem
                                                                key={option.value}
                                                                onClick={() => updateActionStatusMutation.mutate({ action, status: option.value })}
                                                                className="flex items-center gap-2"
                                                              >
                                                                <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(option.value)}`} />
                                                                <span>{option.label}</span>
                                                                {action.status === option.value && (
                                                                  <CheckCircle className="w-3 h-3 ml-auto text-green-500" />
                                                                )}
                                                              </DropdownMenuItem>
                                                            ))}
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      ) : (
                                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getActionStatusCircleColor(action.status)}`} />
                                                      )}
                                                      <span
                                                        className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-primary cursor-pointer"
                                                        onClick={() => setChecklistModalAction(action)}
                                                      >
                                                        {action.title}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                      {dueDateDisplay && (
                                                        <>
                                                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dueDateDisplay.date}</span>
                                                          <Badge
                                                            className={`text-xs px-1.5 py-0 cursor-pointer ${dueDateDisplay.color}`}
                                                            onClick={(e) => { e.stopPropagation(); setDueDateModalAction(action); }}
                                                          >
                                                            {dueDateDisplay.text}
                                                          </Badge>
                                                        </>
                                                      )}
                                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setActionPeopleModalAction(action); }} title="Assign To-Do Actions">
                                                        <Users className={`w-3 h-3 ${actionHasPeople(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                      </Button>
                                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setDependenciesModalAction(action); }} title={actionHasDependencies(action.id) ? "View dependencies" : "Add dependency"}>
                                                        <Link2 className={`w-3 h-3 ${actionHasDependencies(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                      </Button>
                                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setChecklistModalAction(action); }} title="View checklist">
                                                        <ListChecks className={`w-3 h-3 ${actionHasIncompleteChecklist(action.id) ? 'text-yellow-500' : getActionChecklistItems(action.id).length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                                                      </Button>
                                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setActionFolderUrl(action.documentFolderUrl || ""); setActionFolderUrlEditing(!action.documentFolderUrl && canEditAllStrategies()); setFolderUrlModalAction(action); }} title={action.documentFolderUrl ? "View folder link" : "Add folder link"}>
                                                        <FolderOpen className={`w-3 h-3 ${action.documentFolderUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                                      </Button>
                                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setNotesModalAction(action); setActionNotes(action.notes || ""); }} title={action.notes ? "View notes" : "Add notes"}>
                                                        <StickyNote className={`w-3 h-3 ${action.notes ? 'text-blue-500' : 'text-gray-400'}`} />
                                                      </Button>
                                                      {canEditAllStrategies() && (
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => e.stopPropagation()}>
                                                              <MoreVertical className="w-3 h-3 text-gray-500" />
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setDueDateModalAction(action); }}>
                                                              <Calendar className="w-3.5 h-3.5 mr-2" />
                                                              Edit Due Date
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setFolderUrlModalAction(action); setActionFolderUrl(action.documentFolderUrl || ""); }}>
                                                              <FolderOpen className="w-3.5 h-3.5 mr-2" />
                                                              Edit Folder Link
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditAction(action)}>
                                                              <Edit className="w-3.5 h-3.5 mr-2" />
                                                              Edit Task
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                              <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                  Delete
                                                                </DropdownMenuItem>
                                                              </AlertDialogTrigger>
                                                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                                <AlertDialogHeader>
                                                                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                                                  <AlertDialogDescription>
                                                                    Are you sure you want to delete "{action.title}"? This action cannot be undone.
                                                                  </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                  <AlertDialogAction onClick={() => deleteActionMutation.mutate(action.id)} className="bg-red-600 hover:bg-red-700">
                                                                    Delete
                                                                  </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                              </AlertDialogContent>
                                                            </AlertDialog>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        {wsActions.length === 0 && (
                                          <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">No workstream actions yet. Use the Add Task button to get started.</p>
                                        )}
                                        {canEditAllStrategies() && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-7 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 justify-center"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setWsTaskStrategyId(project.strategyId);
                                              setWsTaskProjectId(project.id);
                                              setWsTaskWorkstreamId(project.workstreamId);
                                              setIsCreateWsTaskOpen(true);
                                            }}
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Task
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Expanded Actions - only for regular projects */}
                                  {isProjectExpanded && project.isWorkstream !== 'true' && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 py-2">
                                      {/* List/Kanban toggle */}
                                      {projectActions.length > 0 && (
                                        <div className="flex items-center justify-end mb-2">
                                          <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-6 px-2 py-0 text-xs rounded-md ${!kanbanViewProjects.has(project.id) ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setKanbanViewProjects(prev => { const next = new Set(prev); next.delete(project.id); return next; });
                                              }}
                                              data-testid={`toggle-list-${project.id}`}
                                            >
                                              <List className="w-3 h-3 mr-1" />
                                              List
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-6 px-2 py-0 text-xs rounded-md ${kanbanViewProjects.has(project.id) ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setKanbanViewProjects(prev => { const next = new Set(prev); next.add(project.id); return next; });
                                              }}
                                              data-testid={`toggle-kanban-${project.id}`}
                                            >
                                              <LayoutGrid className="w-3 h-3 mr-1" />
                                              Board
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Kanban Board View */}
                                      {kanbanViewProjects.has(project.id) ? (
                                        <div className="flex gap-2 overflow-x-auto pb-2" data-testid={`kanban-board-${project.id}`}>
                                          {actionStatusOptions.map((statusCol) => {
                                            const columnActions = projectActions.filter((a: any) => a.status === statusCol.value);
                                            return (
                                              <div
                                                key={statusCol.value}
                                                className="flex-1 min-w-[160px] max-w-[220px]"
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-blue-400'); }}
                                                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-blue-400'); }}
                                                onDrop={(e) => {
                                                  e.preventDefault();
                                                  e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                                                  if (draggedActionId && canEditAllStrategies()) {
                                                    const action = projectActions.find((a: any) => a.id === draggedActionId);
                                                    if (action && action.status !== statusCol.value) {
                                                      updateActionStatusMutation.mutate({ action, status: statusCol.value });
                                                    }
                                                    setDraggedActionId(null);
                                                  }
                                                }}
                                                data-testid={`kanban-column-${statusCol.value}-${project.id}`}
                                              >
                                                <div className="flex items-center gap-1.5 mb-2 px-1">
                                                  <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(statusCol.value)}`} />
                                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{statusCol.label}</span>
                                                  <span className="text-xs text-gray-400 dark:text-gray-500">({columnActions.length})</span>
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1.5 min-h-[80px] space-y-1.5 transition-all">
                                                  {columnActions.map((action: any) => {
                                                    const dueDateDisplay = getActionDueDateDisplay(action);
                                                    const people = getActionPeople(action.id);
                                                    const peopleNames = people.map((p: any) => {
                                                      const user = users?.find((u: any) => u.id === p.userId);
                                                      return user ? (user.firstName || user.email?.split('@')[0] || '?') : '?';
                                                    });
                                                    return (
                                                      <div
                                                        key={action.id}
                                                        draggable={canEditAllStrategies()}
                                                        onDragStart={(e) => {
                                                          setDraggedActionId(action.id);
                                                          e.dataTransfer.effectAllowed = 'move';
                                                        }}
                                                        onDragEnd={() => setDraggedActionId(null)}
                                                        className={`bg-white dark:bg-gray-700 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow ${
                                                          draggedActionId === action.id ? 'opacity-50' : ''
                                                        } ${canEditAllStrategies() ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                        onClick={() => setChecklistModalAction(action)}
                                                        data-testid={`kanban-card-${action.id}`}
                                                      >
                                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-1.5 line-clamp-2">{action.title}</p>
                                                        {dueDateDisplay && (
                                                          <div className="mb-1.5">
                                                            <Badge className={`text-[10px] px-1 py-0 ${dueDateDisplay.color}`}>
                                                              {dueDateDisplay.date}
                                                            </Badge>
                                                          </div>
                                                        )}
                                                        {peopleNames.length > 0 && (
                                                          <div className="flex items-center gap-1">
                                                            <Users className="w-2.5 h-2.5 text-blue-500" />
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                              {peopleNames.slice(0, 2).join(', ')}{peopleNames.length > 2 ? ` +${peopleNames.length - 2}` : ''}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                      /* List View (default) */
                                      <div className="space-y-1.5">
                                        {projectActions.length > 0 ? projectActions.map((action: any) => {
                                          const dueDateDisplay = getActionDueDateDisplay(action);
                                          return (
                                            <div
                                              key={action.id}
                                              className={`flex items-center justify-between py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded px-2 -mx-2 transition-all duration-300 ${
                                                highlightedActionId === action.id 
                                                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30 animate-pulse' 
                                                  : ''
                                              }`}
                                              data-testid={`action-row-${action.id}`}
                                            >
                                              {/* Left side: Status dropdown and title */}
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {/* Status dropdown */}
                                                {canEditAllStrategies() ? (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1 py-0 flex items-center gap-0.5"
                                                        data-testid={`action-status-dropdown-${action.id}`}
                                                      >
                                                        <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(action.status)}`} />
                                                        <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start">
                                                      {actionStatusOptions.map((option) => (
                                                        <DropdownMenuItem
                                                          key={option.value}
                                                          onClick={() => updateActionStatusMutation.mutate({ action, status: option.value })}
                                                          className="flex items-center gap-2"
                                                          data-testid={`action-status-option-${option.value}-${action.id}`}
                                                        >
                                                          <div className={`w-2.5 h-2.5 rounded-full ${getActionStatusCircleColor(option.value)}`} />
                                                          <span>{option.label}</span>
                                                          {action.status === option.value && (
                                                            <CheckCircle className="w-3 h-3 ml-auto text-green-500" />
                                                          )}
                                                        </DropdownMenuItem>
                                                      ))}
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                ) : (
                                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getActionStatusCircleColor(action.status)}`} />
                                                )}
                                                
                                                {/* Action title */}
                                                <span 
                                                  className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-primary cursor-pointer"
                                                  onClick={() => setChecklistModalAction(action)}
                                                >
                                                  {action.title}
                                                </span>
                                              </div>
                                              
                                              {/* Right side: Icon bar */}
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                {/* Due date pill - view only if read-only */}
                                                {dueDateDisplay && (
                                                  <>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dueDateDisplay.date}</span>
                                                    <Badge 
                                                      className={`text-xs px-1.5 py-0 cursor-pointer ${dueDateDisplay.color}`}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDueDateModalAction(action);
                                                      }}
                                                      data-testid={`action-due-date-${action.id}`}
                                                    >
                                                      {dueDateDisplay.text}
                                                    </Badge>
                                                  </>
                                                )}
                                                
                                                {/* People assigned - 1st */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionPeopleModalAction(action);
                                                  }}
                                                  title="Assign To-Do Actions"
                                                  data-testid={`action-people-${action.id}`}
                                                >
                                                  <Users className={`w-3 h-3 ${actionHasPeople(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                </Button>
                                                
                                                {/* Dependencies - 2nd */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDependenciesModalAction(action);
                                                  }}
                                                  title={actionHasDependencies(action.id) ? "View dependencies" : "Add dependency"}
                                                  data-testid={`action-dependencies-${action.id}`}
                                                >
                                                  <Link2 className={`w-3 h-3 ${actionHasDependencies(action.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                </Button>
                                                
                                                {/* Checklist - 3rd */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setChecklistModalAction(action);
                                                  }}
                                                  title="View checklist"
                                                  data-testid={`action-checklist-${action.id}`}
                                                >
                                                  <ListChecks className={`w-3 h-3 ${actionHasIncompleteChecklist(action.id) ? 'text-yellow-500' : getActionChecklistItems(action.id).length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                                                </Button>
                                                
                                                {/* Folder link - 4th - view only if read-only */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionFolderUrl(action.documentFolderUrl || "");
                                                    setActionFolderUrlEditing(!action.documentFolderUrl && canEditAllStrategies());
                                                    setFolderUrlModalAction(action);
                                                  }}
                                                  title={action.documentFolderUrl ? "View folder link" : "Add folder link"}
                                                  data-testid={`action-folder-${action.id}`}
                                                >
                                                  <FolderOpen className={`w-3 h-3 ${action.documentFolderUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                                </Button>
                                                
                                                {/* Notes - 5th */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNotesModalAction(action);
                                                    setActionNotes(action.notes || "");
                                                  }}
                                                  title={action.notes ? "View notes" : "Add notes"}
                                                  data-testid={`action-notes-${action.id}`}
                                                >
                                                  <StickyNote className={`w-3 h-3 ${action.notes ? 'text-blue-500' : 'text-gray-400'}`} />
                                                </Button>
                                                
                                                {/* Three dots menu - 6th (last) - only show when editable */}
                                                {canEditAllStrategies() && (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                        data-testid={`action-menu-${action.id}`}
                                                      >
                                                        <MoreVertical className="w-3 h-3 text-gray-500" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem
                                                        onClick={() => {
                                                          setDueDateModalAction(action);
                                                        }}
                                                        data-testid={`action-menu-due-date-${action.id}`}
                                                      >
                                                        <Calendar className="w-3.5 h-3.5 mr-2" />
                                                        Edit Due Date
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => {
                                                          setFolderUrlModalAction(action);
                                                          setActionFolderUrl(action.documentFolderUrl || "");
                                                        }}
                                                        data-testid={`action-menu-folder-${action.id}`}
                                                      >
                                                        <FolderOpen className="w-3.5 h-3.5 mr-2" />
                                                        Edit Folder Link
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleEditAction(action)}
                                                        data-testid={`action-menu-edit-${action.id}`}
                                                      >
                                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                                        Edit Action
                                                      </DropdownMenuItem>
                                                      <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <DropdownMenuItem
                                                            onSelect={(e) => e.preventDefault()}
                                                            className="text-red-600"
                                                            data-testid={`action-menu-delete-${action.id}`}
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                            Delete
                                                          </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                          <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Action</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                              Are you sure you want to delete "{action.title}"? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                              onClick={() => deleteActionMutation.mutate(action.id)}
                                                              className="bg-red-600 hover:bg-red-700"
                                                            >
                                                              Delete
                                                            </AlertDialogAction>
                                                          </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                      </AlertDialog>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        }) : (
                                          <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
                                            No actions yet
                                          </div>
                                        )}
                                      </div>
                                      )}
                                        
                                        {/* Add Action button inside project */}
                                        {canEditAllStrategies() && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-7 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 justify-center"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedStrategyIdForAction(project.strategyId);
                                              setSelectedProjectIdForAction(project.id);
                                              setIsCreateActionOpen(true);
                                            }}
                                            data-testid={`button-add-action-in-project-${project.id}`}
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Action
                                          </Button>
                                        )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </CardContent>
                  )}
                </Card>
              );
              })}
            </div>
          )}

          {/* Archived Strategies Section */}
          {archivedStrategies.length > 0 && (
            <div className="mt-8" data-testid="archived-strategies-section">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archived
                  </span>
                  <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                </div>
                
                <div className="space-y-4">
                  {archivedStrategies.map((strategy: any) => (
                    <Card 
                      key={strategy.id} 
                      className="border-l-4 opacity-60 hover:opacity-80 transition-opacity"
                      style={{ borderLeftColor: strategy.colorCode || '#6B7280' }}
                      data-testid={`card-archived-strategy-${strategy.id}`}
                    >
                      <CardHeader className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                {strategy.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDateShort(strategy.startDate)} - {formatDateShort(strategy.endDate)}</span>
                              <span className="ml-2">
                                <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
                                {strategy.projects.length} projects
                              </span>
                            </div>
                            <ProgressRing progress={strategy.progress} size={28} />
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStrategy(strategy)}
                              className="h-7 px-2 text-xs"
                              data-testid={`button-view-archived-${strategy.id}`}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
        </div>
      </main>

      <CreateStrategyModal
        open={isCreateStrategyOpen}
        onOpenChange={setIsCreateStrategyOpen}
      />
      <EditStrategyModal
        open={isEditStrategyOpen}
        onOpenChange={setIsEditStrategyOpen}
        strategy={selectedStrategy}
      />
      <ViewStrategyModal
        open={isViewStrategyOpen}
        onOpenChange={setIsViewStrategyOpen}
        strategy={selectedStrategy}
      />
      <WorkstreamModal
        open={!!workstreamModalStrategyId}
        onOpenChange={(open) => { if (!open) setWorkstreamModalStrategyId(null); }}
        strategyId={workstreamModalStrategyId || ""}
        strategyTitle={workstreamModalTitle}
      />
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        strategyId={selectedStrategyId}
      />

      {/* Key Metrics Modal */}
      <Dialog open={!!metricsModalStrategy} onOpenChange={(open) => !open && setMetricsModalStrategy(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Key Metrics
            </DialogTitle>
          </DialogHeader>
          {metricsModalStrategy && (
            <div className="space-y-4">
              {/* Strategy Title and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {metricsModalStrategy.title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs"
                    style={{ color: metricsModalStrategy.colorCode, borderColor: metricsModalStrategy.colorCode }}
                  >
                    {metricsModalStrategy.status?.toLowerCase()}
                  </Badge>
                </div>
                <ProgressRing progress={metricsModalStrategy.progress || 0} size={48} strokeWidth={4} />
              </div>

              {/* Timeline and Projects Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Timeline</span>
                  </div>
                  <div className="text-sm">
                    <div>Start: <span className="font-medium">{metricsModalStrategy.startDate ? new Date(metricsModalStrategy.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span></div>
                    <div>Target: <span className="font-medium">{metricsModalStrategy.targetDate ? new Date(metricsModalStrategy.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Projects</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {metricsModalStrategy.projects?.filter((p: any) => p.status === 'C').length || 0}/{metricsModalStrategy.projects?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">{metricsModalStrategy.progress || 0}% complete</div>
                </div>
              </div>

              {/* Success Metrics */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Success Metrics</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {metricsModalStrategy.successMetrics || "No metrics defined"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Continuum Modal */}
      <Dialog open={!!continuumModalStrategy} onOpenChange={(open) => !open && setContinuumModalStrategy(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Change Continuum
            </DialogTitle>
          </DialogHeader>
          {continuumModalStrategy && (
            <div className="space-y-4">
              {/* Strategy Title and Status */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {continuumModalStrategy.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Change management framework</p>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ color: continuumModalStrategy.colorCode, borderColor: continuumModalStrategy.colorCode }}
                >
                  {continuumModalStrategy.status?.toLowerCase()}
                </Badge>
              </div>

              {/* Numbered Continuum Fields */}
              {(() => {
                const hiddenSections: string[] = (() => { try { return JSON.parse(continuumModalStrategy.hiddenContinuumSections || "[]"); } catch { return []; } })();
                const customSections: {label: string; value: string}[] = (() => { try { return JSON.parse(continuumModalStrategy.customContinuumSections || "[]"); } catch { return []; } })();
                const builtInSections = [
                  { key: "caseForChange", label: "Case for Change" },
                  { key: "visionStatement", label: "Vision Statement" },
                  { key: "successMetrics", label: "Success Metrics" },
                  { key: "stakeholderMap", label: "Stakeholder Map" },
                  { key: "readinessRating", label: "Readiness Rating (RAG)" },
                  { key: "riskExposureRating", label: "Risk Exposure Rating" },
                  { key: "changeChampionAssignment", label: "Change Champion" },
                  { key: "reinforcementPlan", label: "Reinforcement Plan" },
                  { key: "benefitsRealizationPlan", label: "Benefits Realization" },
                ];
                const visibleBuiltIn = builtInSections.filter(s => !hiddenSections.includes(s.key));
                let counter = 0;
                return (
                  <div className="space-y-3">
                    {visibleBuiltIn.map((section) => {
                      counter++;
                      return (
                        <div key={section.key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{counter}. {section.label}</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{(continuumModalStrategy as any)[section.key] || "To be defined"}</p>
                        </div>
                      );
                    })}
                    {customSections.map((section, idx) => {
                      counter++;
                      return (
                        <div key={`custom-${idx}`} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{counter}. {section.label}</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{section.value || "To be defined"}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* People Resources Modal */}
      <Dialog open={!!resourcesModalProject} onOpenChange={(open) => {
        if (!open) {
          setResourcesModalProject(null);
          setResourceHoursInputs({});
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People Resources for Capacity Planning
            </DialogTitle>
          </DialogHeader>
          {resourcesModalProject && (
            <div className="space-y-4">
              {/* Project Title */}
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {resourcesModalProject.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">People assigned to this project with capacity allocation</p>
              </div>

              {/* Assigned Resources List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {projectResourceAssignments.length > 0 ? (
                  projectResourceAssignments.map((assignment: any) => {
                    const assignedUser = users?.find((u: any) => u.id === assignment.userId);
                    if (!assignedUser) return null;
                    const fullName = [assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(' ');
                    const fte = parseFloat(assignedUser.fte || '1') || 1;
                    const maxHours = fte * 40;
                    const hours = parseFloat(assignment.hoursPerWeek || '0') || 0;
                    const capacityPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;
                    
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {fullName || assignedUser.email}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {assignedUser.role?.replace('_', ' ')} · FTE: {fte}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEditAllStrategies() ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="80"
                                step="0.5"
                                className="w-16 h-8 text-center text-sm"
                                value={resourceHoursInputs[assignment.userId] ?? assignment.hoursPerWeek ?? '0'}
                                onChange={(e) => setResourceHoursInputs(prev => ({
                                  ...prev,
                                  [assignment.userId]: e.target.value
                                }))}
                                onBlur={() => {
                                  const newHours = resourceHoursInputs[assignment.userId];
                                  if (newHours !== undefined && newHours !== assignment.hoursPerWeek) {
                                    upsertResourceAssignmentMutation.mutate({
                                      projectId: resourcesModalProject.id,
                                      assignedUserId: assignment.userId,
                                      hoursPerWeek: newHours
                                    });
                                  }
                                }}
                                data-testid={`input-hours-${assignment.userId}`}
                              />
                              <span className="text-xs text-gray-500">hrs/wk</span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium">{hours} hrs/wk</span>
                          )}
                          <Badge 
                            className={`text-xs ${
                              capacityPercent > 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                              capacityPercent >= 80 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}
                          >
                            {capacityPercent.toFixed(0)}%
                          </Badge>
                          {canEditAllStrategies() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteResourceAssignmentMutation.mutate({
                                projectId: resourcesModalProject.id,
                                userId: assignment.userId
                              })}
                              data-testid={`button-remove-resource-${assignment.userId}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No resources assigned to this project</p>
                  </div>
                )}
              </div>

              {/* Add Resource Section - only for admins/co-leads */}
              {canEditAllStrategies() && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Add Resource
                  </label>
                  <PeopleSelector
                    users={(users as any[]) || []}
                    selectedUserIds={[]}
                    onChange={(userIds) => {
                      if (userIds.length > 0) {
                        upsertResourceAssignmentMutation.mutate({
                          projectId: resourcesModalProject.id,
                          assignedUserId: userIds[0],
                          hoursPerWeek: '0'
                        });
                      }
                    }}
                    mode="single"
                    placeholder="Search and select a person..."
                    showFte
                    showRole
                    excludeUserIds={projectResourceAssignments.map((a: any) => a.userId)}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action People Assignment Modal */}
      <Dialog open={!!actionPeopleModalAction} onOpenChange={(open) => {
        if (!open) {
          setActionPeopleModalAction(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign To-Do Actions to Specific People
            </DialogTitle>
          </DialogHeader>
          {actionPeopleModalAction && (() => {
            const actionPeople = getActionPeople(actionPeopleModalAction.id);
            const parentProject = projects?.find((p: any) => p.id === actionPeopleModalAction.projectId);
            
            return (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {actionPeopleModalAction.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">People tagged for this action (for to-do list)</p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {actionPeople.length > 0 ? (
                    actionPeople.map((assignment: any) => {
                      const assignedUser = users?.find((u: any) => u.id === assignment.userId);
                      if (!assignedUser) return null;
                      const fullName = [assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(' ');
                      const isOnProject = parentProject ? isPersonAssignedToProject(parentProject.id, assignment.userId) : true;
                      
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {fullName || assignedUser.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                              {assignedUser.role?.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditAllStrategies() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeActionPeopleMutation.mutate({
                                  actionId: actionPeopleModalAction.id,
                                  userId: assignment.userId
                                })}
                                data-testid={`button-remove-action-person-${assignment.userId}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {!isOnProject && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Not on project
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No people assigned to this action</p>
                    </div>
                  )}
                </div>

                {/* Warning for people not on project */}
                {parentProject && actionPeople.some((a: any) => !isPersonAssignedToProject(parentProject.id, a.userId)) && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <span className="font-medium">Warning:</span> Some assigned people are not part of the project team.
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Person Section - only for admins/co-leads */}
                {canEditAllStrategies() && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Add Person
                    </label>
                    <PeopleSelector
                      users={(users as any[]) || []}
                      selectedUserIds={[]}
                      onChange={(userIds) => {
                        if (userIds.length > 0) {
                          addActionPeopleMutation.mutate({
                            actionId: actionPeopleModalAction.id,
                            assignedUserId: userIds[0]
                          });
                        }
                      }}
                      mode="single"
                      placeholder="Search and select a person..."
                      showRole
                      excludeUserIds={actionPeople.map((a: any) => a.userId)}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Timeline Modal */}
      <Dialog open={!!timelineModalProject} onOpenChange={(open) => !open && setTimelineModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline
            </DialogTitle>
          </DialogHeader>
          {timelineModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {timelineModalProject.title}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Start Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {timelineModalProject.startDate 
                      ? new Date(timelineModalProject.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Due Date</span>
                  <span className={`font-medium ${getTimelineColor(timelineModalProject) === 'red' ? 'text-red-600' : getTimelineColor(timelineModalProject) === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {timelineModalProject.dueDate 
                      ? new Date(timelineModalProject.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
                <div className={`p-3 rounded-lg ${
                  getTimelineColor(timelineModalProject) === 'red' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  getTimelineColor(timelineModalProject) === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                  'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                }`}>
                  <span className={`text-sm font-medium ${
                    getTimelineColor(timelineModalProject) === 'red' ? 'text-red-700 dark:text-red-300' :
                    getTimelineColor(timelineModalProject) === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-green-700 dark:text-green-300'
                  }`}>
                    {getTimelineColor(timelineModalProject) === 'red' ? 'Past Due' :
                     getTimelineColor(timelineModalProject) === 'yellow' ? 'Due Soon' :
                     'On Track'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Modal */}
      <Dialog open={!!kpiModalProject} onOpenChange={(open) => !open && setKpiModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project KPIs
            </DialogTitle>
          </DialogHeader>
          {kpiModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {kpiModalProject.title}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Key Performance Indicator</div>
                  <p className="text-gray-900 dark:text-white">
                    {kpiModalProject.kpi || 'No KPI defined'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">KPI Tracking</div>
                  <p className="text-gray-900 dark:text-white">
                    {kpiModalProject.kpiTracking || 'No tracking data'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents Modal */}
      <Dialog open={!!documentsModalProject} onOpenChange={(open) => {
        if (!open) {
          setDocumentsModalProject(null);
          setDocumentUrlEditing(false);
          setDocumentUrlInput("");
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Documents
            </DialogTitle>
          </DialogHeader>
          {documentsModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {documentsModalProject.title}
                </h3>
              </div>
              
              {documentUrlEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Document Folder URL
                    </label>
                    <input
                      type="url"
                      value={documentUrlInput}
                      onChange={(e) => setDocumentUrlInput(e.target.value)}
                      placeholder="https://drive.google.com/... or https://onedrive.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="input-document-url"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Paste a link to your document folder (Google Drive, OneDrive, SharePoint, etc.)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDocumentUrlEditing(false);
                        setDocumentUrlInput(documentsModalProject.documentFolderUrl || "");
                      }}
                      disabled={urlSaving}
                      data-testid="button-cancel-document-url"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (documentUrlInput) {
                          try {
                            new URL(documentUrlInput);
                          } catch {
                            toast({ 
                              title: "Invalid URL format", 
                              description: "Please enter a valid URL starting with https:// or http://",
                              variant: "destructive" 
                            });
                            return;
                          }
                        }
                        setUrlSaving(true);
                        try {
                          await apiRequest("PATCH", `/api/projects/${documentsModalProject.id}`, { 
                            documentFolderUrl: documentUrlInput || null 
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                          toast({ title: "Document folder URL saved" });
                          setDocumentsModalProject({ ...documentsModalProject, documentFolderUrl: documentUrlInput || null });
                          setDocumentUrlEditing(false);
                        } catch (error) {
                          toast({ title: "Failed to save URL", variant: "destructive" });
                        } finally {
                          setUrlSaving(false);
                        }
                      }}
                      disabled={urlSaving}
                      data-testid="button-save-document-url"
                    >
                      {urlSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : documentsModalProject.documentFolderUrl ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    {(() => {
                      try {
                        const hostname = new URL(documentsModalProject.documentFolderUrl).hostname;
                        return (
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                            alt=""
                            className="w-6 h-6 mt-0.5 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        );
                      } catch {
                        return <FolderOpen className="w-6 h-6 mt-0.5 text-blue-500" />;
                      }
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {(() => {
                          try {
                            return new URL(documentsModalProject.documentFolderUrl).hostname;
                          } catch {
                            return "Document Folder";
                          }
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {documentsModalProject.documentFolderUrl}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.open(documentsModalProject.documentFolderUrl, '_blank')}
                    data-testid="button-open-document-url"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Document Folder
                  </Button>
                  
                  {canEditAllStrategies() && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1"
                        onClick={() => setDocumentUrlEditing(true)}
                        data-testid="button-edit-document-url"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          setUrlSaving(true);
                          try {
                            await apiRequest("PATCH", `/api/projects/${documentsModalProject.id}`, { 
                              documentFolderUrl: null 
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                            toast({ title: "Document folder link removed" });
                            setDocumentsModalProject({ ...documentsModalProject, documentFolderUrl: null });
                            setDocumentUrlInput("");
                            setDocumentUrlEditing(true);
                          } catch (error) {
                            toast({ title: "Failed to remove link", variant: "destructive" });
                          } finally {
                            setUrlSaving(false);
                          }
                        }}
                        disabled={urlSaving}
                        data-testid="button-remove-document-url"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No document folder linked</p>
                  {canEditAllStrategies() ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setDocumentUrlEditing(true)}
                      data-testid="button-add-document-url"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Document Link
                    </Button>
                  ) : (
                    <p className="text-xs mt-1">Contact an administrator to add a document folder URL</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Communication Modal */}
      <Dialog open={!!communicationModalProject} onOpenChange={(open) => {
        if (!open) {
          setCommunicationModalProject(null);
          setCommunicationUrlEditing(false);
          setCommunicationUrlInput("");
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Communication Plan
            </DialogTitle>
          </DialogHeader>
          {communicationModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {communicationModalProject.title}
                </h3>
              </div>
              
              {communicationUrlEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Communication Plan URL
                    </label>
                    <input
                      type="url"
                      value={communicationUrlInput}
                      onChange={(e) => setCommunicationUrlInput(e.target.value)}
                      placeholder="https://docs.google.com/... or https://sharepoint.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="input-communication-url"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Paste a link to your communication plan document or folder
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCommunicationUrlEditing(false);
                        setCommunicationUrlInput(communicationModalProject.communicationUrl || "");
                      }}
                      disabled={urlSaving}
                      data-testid="button-cancel-communication-url"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (communicationUrlInput) {
                          try {
                            new URL(communicationUrlInput);
                          } catch {
                            toast({ 
                              title: "Invalid URL format", 
                              description: "Please enter a valid URL starting with https:// or http://",
                              variant: "destructive" 
                            });
                            return;
                          }
                        }
                        setUrlSaving(true);
                        try {
                          await apiRequest("PATCH", `/api/projects/${communicationModalProject.id}`, { 
                            communicationUrl: communicationUrlInput || null 
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                          toast({ title: "Communication plan URL saved" });
                          setCommunicationModalProject({ ...communicationModalProject, communicationUrl: communicationUrlInput || null });
                          setCommunicationUrlEditing(false);
                        } catch (error) {
                          toast({ title: "Failed to save URL", variant: "destructive" });
                        } finally {
                          setUrlSaving(false);
                        }
                      }}
                      disabled={urlSaving}
                      data-testid="button-save-communication-url"
                    >
                      {urlSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : communicationModalProject.communicationUrl ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    {(() => {
                      try {
                        const hostname = new URL(communicationModalProject.communicationUrl).hostname;
                        return (
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                            alt=""
                            className="w-6 h-6 mt-0.5 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        );
                      } catch {
                        return <Megaphone className="w-6 h-6 mt-0.5 text-green-500" />;
                      }
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {(() => {
                          try {
                            return new URL(communicationModalProject.communicationUrl).hostname;
                          } catch {
                            return "Communication Plan";
                          }
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {communicationModalProject.communicationUrl}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => window.open(communicationModalProject.communicationUrl, '_blank')}
                    data-testid="button-open-communication-url"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Communication Plan
                  </Button>
                  
                  {canEditAllStrategies() && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1"
                        onClick={() => setCommunicationUrlEditing(true)}
                        data-testid="button-edit-communication-url"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          setUrlSaving(true);
                          try {
                            await apiRequest("PATCH", `/api/projects/${communicationModalProject.id}`, { 
                              communicationUrl: null 
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                            toast({ title: "Communication plan link removed" });
                            setCommunicationModalProject({ ...communicationModalProject, communicationUrl: null });
                            setCommunicationUrlInput("");
                            setCommunicationUrlEditing(true);
                          } catch (error) {
                            toast({ title: "Failed to remove link", variant: "destructive" });
                          } finally {
                            setUrlSaving(false);
                          }
                        }}
                        disabled={urlSaving}
                        data-testid="button-remove-communication-url"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No communication plan linked</p>
                  {canEditAllStrategies() ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setCommunicationUrlEditing(true)}
                      data-testid="button-add-communication-url"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Communication Link
                    </Button>
                  ) : (
                    <p className="text-xs mt-1">Contact an administrator to add a communication plan URL</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dependencies Modal */}
      <Dialog 
        open={!!dependenciesModalProject} 
        onOpenChange={(open) => {
          if (!open) {
            setDependenciesModalProject(null);
            setSelectedDependencyType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Project Dependencies
            </DialogTitle>
          </DialogHeader>
          {dependenciesModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {dependenciesModalProject.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage dependencies for this project
                </p>
              </div>
              
              {/* Add Dependency Section */}
              {canEditAllStrategies() && (
                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                  {!selectedDependencyType ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select dependency type
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedDependencyType("project")}
                          data-testid="button-select-project-type"
                        >
                          Project
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedDependencyType("action")}
                          data-testid="button-select-action-type"
                        >
                          Action
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDependencyType(null)}
                          className="text-xs h-7 px-2"
                          data-testid="button-back-dependency-type"
                        >
                          <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                          Back
                        </Button>
                        <span className="text-xs text-gray-500">
                          Select {selectedDependencyType}
                        </span>
                      </div>
                      <Command className="border rounded-lg">
                        <CommandInput
                          placeholder={`Search ${selectedDependencyType}s...`}
                          data-testid="input-search-dependency-target"
                        />
                        <CommandList className="max-h-48">
                          <CommandEmpty>No {selectedDependencyType}s found.</CommandEmpty>
                          <CommandGroup heading={`Available ${selectedDependencyType}s`}>
                            {selectedDependencyType === "project" && (projects || [])
                              .filter((p: any) => 
                                p.id !== dependenciesModalProject.id &&
                                p.isArchived !== 'true' &&
                                !getProjectDependencies(dependenciesModalProject.id).some(
                                  (d: any) => d.targetType === 'project' && d.targetId === p.id
                                )
                              )
                              .map((project: any) => {
                                const strategy = (strategies || []).find((s: any) => s.id === project.strategyId);
                                return (
                                  <CommandItem
                                    key={project.id}
                                    value={project.title}
                                    onSelect={() => {
                                      createDependencyMutation.mutate({
                                        sourceType: 'project',
                                        sourceId: dependenciesModalProject.id,
                                        targetType: 'project',
                                        targetId: project.id,
                                      });
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                    data-testid={`option-project-${project.id}`}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: strategy?.colorCode || '#3B82F6' }}
                                    />
                                    <span className="flex-1 truncate">{project.title}</span>
                                    {strategy && (
                                      <span className="text-xs text-gray-400 truncate max-w-24">
                                        {strategy.title}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            {selectedDependencyType === "action" && (actions || [])
                              .filter((a: any) => 
                                a.isArchived !== 'true' &&
                                !getProjectDependencies(dependenciesModalProject.id).some(
                                  (d: any) => d.targetType === 'action' && d.targetId === a.id
                                )
                              )
                              .map((action: any) => {
                                const strategy = (strategies || []).find((s: any) => s.id === action.strategyId);
                                return (
                                  <CommandItem
                                    key={action.id}
                                    value={action.title}
                                    onSelect={() => {
                                      createDependencyMutation.mutate({
                                        sourceType: 'project',
                                        sourceId: dependenciesModalProject.id,
                                        targetType: 'action',
                                        targetId: action.id,
                                      });
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                    data-testid={`option-action-${action.id}`}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: strategy?.colorCode || '#3B82F6' }}
                                    />
                                    <span className="flex-1 truncate">{action.title}</span>
                                    {strategy && (
                                      <span className="text-xs text-gray-400 truncate max-w-24">
                                        {strategy.title}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Dependencies List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Current Dependencies ({getProjectDependencies(dependenciesModalProject.id).length})
                </p>
                {getProjectDependencies(dependenciesModalProject.id).length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getProjectDependencies(dependenciesModalProject.id).map((dep: any) => {
                      const isSource = dep.sourceType === 'project' && dep.sourceId === dependenciesModalProject.id;
                      const targetType = isSource ? dep.targetType : dep.sourceType;
                      const targetId = isSource ? dep.targetId : dep.sourceId;
                      const direction = isSource ? 'Depends on' : 'Blocked by';
                      
                      const getTargetTitle = () => {
                        if (targetType === 'project') {
                          const project = (projects || []).find((p: any) => p.id === targetId);
                          return project?.title || 'Unknown Project';
                        } else {
                          const action = (actions || []).find((a: any) => a.id === targetId);
                          return action?.title || 'Unknown Action';
                        }
                      };

                      const getTargetStrategy = () => {
                        if (targetType === 'project') {
                          const project = (projects || []).find((p: any) => p.id === targetId);
                          return (strategies || []).find((s: any) => s.id === project?.strategyId);
                        } else {
                          const action = (actions || []).find((a: any) => a.id === targetId);
                          return (strategies || []).find((s: any) => s.id === action?.strategyId);
                        }
                      };

                      const targetStrategy = getTargetStrategy();
                      
                      return (
                        <div
                          key={dep.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isSource 
                              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                              : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                          }`}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: targetStrategy?.colorCode || '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {getTargetTitle()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span className={isSource ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                {direction}
                              </span>
                              <span>({targetType})</span>
                              {targetStrategy && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="truncate max-w-24">{targetStrategy.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {canEditAllStrategies() && isSource && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                              onClick={() => deleteDependencyMutation.mutate(dep.id)}
                              data-testid={`button-remove-dep-${dep.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No dependencies for this project</p>
                    {!canEditAllStrategies() && (
                      <p className="text-xs mt-1">Contact an administrator to add dependencies</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Edit/View Modals */}
      {editingProject && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          onClose={() => {
            setIsEditProjectOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
        />
      )}
      
      {viewingProject && (
        <ViewProjectModal
          isOpen={isViewProjectOpen}
          onClose={() => {
            setIsViewProjectOpen(false);
            setViewingProject(null);
          }}
          project={viewingProject}
        />
      )}

      {/* Manage Barriers Modal */}
      {barriersProjectId && (
        <ManageBarriersModal
          isOpen={isManageBarriersOpen}
          onClose={() => {
            setIsManageBarriersOpen(false);
            setBarriersProjectId(null);
          }}
          projectId={barriersProjectId}
        />
      )}

      {/* Edit Action Modal */}
      {editingAction && (
        <EditActionModal
          open={isEditActionOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditActionOpen(false);
              setEditingAction(null);
            }
          }}
          action={editingAction}
        />
      )}

      {/* Create Action Modal */}
      <CreateActionModal
        open={isCreateActionOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateActionOpen(false);
            setSelectedStrategyIdForAction(null);
            setSelectedProjectIdForAction(null);
          }
        }}
        strategyId={selectedStrategyIdForAction || undefined}
        projectId={selectedProjectIdForAction || undefined}
      />

      {/* Create Workstream Task Modal */}
      <CreateActionModal
        open={isCreateWsTaskOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateWsTaskOpen(false);
            setWsTaskStrategyId(null);
            setWsTaskProjectId(null);
            setWsTaskWorkstreamId(null);
          }
        }}
        strategyId={wsTaskStrategyId || undefined}
        projectId={wsTaskProjectId || undefined}
        workstreamId={wsTaskWorkstreamId || undefined}
        isWorkstreamTask
      />

      {/* Action Due Date Modal */}
      <Dialog open={!!dueDateModalAction} onOpenChange={(open) => !open && setDueDateModalAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Edit Due Date
            </DialogTitle>
          </DialogHeader>
          {dueDateModalAction && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {dueDateModalAction.title}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Select Due Date</span>
                </div>
                <Input
                  type="date"
                  value={dueDateModalAction.dueDate ? new Date(dueDateModalAction.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                    updateActionDueDateMutation.mutate({
                      action: dueDateModalAction,
                      dueDate: newDate
                    });
                    setDueDateModalAction({ ...dueDateModalAction, dueDate: newDate });
                  }}
                  className="w-full"
                  data-testid="input-action-due-date"
                />
                {dueDateModalAction.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(dueDateModalAction.dueDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          updateActionDueDateMutation.mutate({
                            action: dueDateModalAction,
                            dueDate: null
                          });
                          setDueDateModalAction({ ...dueDateModalAction, dueDate: null });
                        }}
                        data-testid="button-clear-due-date"
                      >
                        Clear
                      </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Checklist Modal */}
      <Dialog open={!!checklistModalAction} onOpenChange={(open) => !open && setChecklistModalAction(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Checklist
            </DialogTitle>
          </DialogHeader>
          {checklistModalAction && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {checklistModalAction.title}
                </h3>
              </div>
              
              {/* Add new checklist item */}
              {canEditAllStrategies() && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add checklist item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newChecklistItem.trim()) {
                        createChecklistItemMutation.mutate({ 
                          actionId: checklistModalAction.id, 
                          title: newChecklistItem.trim() 
                        });
                      }
                    }}
                    data-testid="input-new-checklist-item"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        createChecklistItemMutation.mutate({ 
                          actionId: checklistModalAction.id, 
                          title: newChecklistItem.trim() 
                        });
                      }
                    }}
                    disabled={!newChecklistItem.trim() || createChecklistItemMutation.isPending}
                    data-testid="button-add-checklist-item"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Checklist items */}
              <div className="space-y-1">
                {getActionChecklistItems(checklistModalAction.id).length > 0 ? (
                  getActionChecklistItems(checklistModalAction.id)
                    .sort((a: any, b: any) => {
                      // Primary sort by orderIndex, secondary by createdAt for stable ordering
                      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
                      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return aTime - bTime;
                    })
                    .map((item: any) => {
                      const indentLevel = item.indentLevel || 1;
                      const indentPadding = (indentLevel - 1) * 24;
                      const isEditing = editingChecklistItemId === item.id;
                      const getTextStyle = () => {
                        if (item.isCompleted === 'true') return 'line-through text-gray-400';
                        if (indentLevel === 1) return 'font-bold text-gray-900 dark:text-white';
                        if (indentLevel === 2) return 'font-normal text-gray-700 dark:text-gray-300';
                        return 'font-normal text-gray-600 dark:text-gray-400 text-xs';
                      };
                      const displayTitle = indentLevel === 3 ? item.title.toLowerCase() : item.title;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          style={{ paddingLeft: `${8 + indentPadding}px` }}
                        >
                          <Checkbox
                            id={`checklist-${item.id}`}
                            checked={item.isCompleted === 'true'}
                            onCheckedChange={(checked) => {
                              toggleChecklistItemMutation.mutate({ item, isCompleted: !!checked });
                            }}
                            disabled={!canEditAllStrategies() || isEditing}
                            data-testid={`checkbox-checklist-${item.id}`}
                          />
                          {isEditing ? (
                            <Input
                              value={editingChecklistItemTitle}
                              onChange={(e) => setEditingChecklistItemTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingChecklistItemTitle.trim()) {
                                  updateChecklistTitleMutation.mutate({ item, title: editingChecklistItemTitle.trim() });
                                } else if (e.key === 'Escape') {
                                  setEditingChecklistItemId(null);
                                  setEditingChecklistItemTitle("");
                                }
                              }}
                              onBlur={() => {
                                if (editingChecklistItemTitle.trim() && editingChecklistItemTitle !== item.title) {
                                  updateChecklistTitleMutation.mutate({ item, title: editingChecklistItemTitle.trim() });
                                } else {
                                  setEditingChecklistItemId(null);
                                  setEditingChecklistItemTitle("");
                                }
                              }}
                              className="flex-1 h-7 text-sm"
                              autoFocus
                              data-testid={`input-edit-checklist-${item.id}`}
                            />
                          ) : (
                            <span 
                              className={`flex-1 text-sm cursor-pointer ${getTextStyle()}`}
                              onDoubleClick={() => {
                                if (canEditAllStrategies()) {
                                  setEditingChecklistItemId(item.id);
                                  setEditingChecklistItemTitle(item.title);
                                }
                              }}
                              title={canEditAllStrategies() ? "Double-click to edit" : undefined}
                            >
                              {displayTitle}
                            </span>
                          )}
                          {canEditAllStrategies() && !isEditing && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                onClick={() => {
                                  setEditingChecklistItemId(item.id);
                                  setEditingChecklistItemTitle(item.title);
                                }}
                                title="Edit item"
                                data-testid={`button-edit-checklist-${item.id}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                onClick={() => updateChecklistIndentMutation.mutate({ item, indentLevel: Math.max(1, indentLevel - 1) })}
                                disabled={indentLevel <= 1}
                                title="Decrease indent"
                                data-testid={`button-outdent-${item.id}`}
                              >
                                <Outdent className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                onClick={() => updateChecklistIndentMutation.mutate({ item, indentLevel: Math.min(3, indentLevel + 1) })}
                                disabled={indentLevel >= 3}
                                title="Increase indent"
                                data-testid={`button-indent-${item.id}`}
                              >
                                <Indent className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                onClick={() => deleteChecklistItemMutation.mutate({ itemId: item.id, actionId: item.actionId })}
                                data-testid={`button-delete-checklist-${item.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No checklist items yet</p>
                    {canEditAllStrategies() && (
                      <p className="text-xs mt-1">Add items above to track progress</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Progress summary */}
              {getActionChecklistItems(checklistModalAction.id).length > 0 && (
                <div className="border-t pt-3 text-sm text-gray-500 dark:text-gray-400">
                  {getActionChecklistItems(checklistModalAction.id).filter((i: any) => i.isCompleted === 'true').length} of {getActionChecklistItems(checklistModalAction.id).length} completed
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Folder URL Modal */}
      <Dialog 
        open={!!folderUrlModalAction} 
        onOpenChange={(open) => {
          if (!open) {
            setFolderUrlModalAction(null);
            setActionFolderUrl("");
            setActionFolderUrlEditing(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Action Folder Link
            </DialogTitle>
          </DialogHeader>
          {folderUrlModalAction && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {folderUrlModalAction.title}
                </h3>
              </div>
              
              {actionFolderUrlEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Folder URL (ClickUp, OneDrive, Google Drive, etc.)
                    </label>
                    <input
                      type="url"
                      value={actionFolderUrl}
                      onChange={(e) => setActionFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/... or https://onedrive.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="input-action-folder-url"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Paste a link to your folder (Google Drive, OneDrive, ClickUp, SharePoint, etc.)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActionFolderUrlEditing(false);
                        setActionFolderUrl(folderUrlModalAction.documentFolderUrl || "");
                      }}
                      disabled={actionFolderUrlSaving}
                      data-testid="button-cancel-action-folder-url"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (actionFolderUrl) {
                          try {
                            new URL(actionFolderUrl);
                          } catch {
                            toast({ 
                              title: "Invalid URL format", 
                              description: "Please enter a valid URL starting with https:// or http://",
                              variant: "destructive" 
                            });
                            return;
                          }
                        }
                        setActionFolderUrlSaving(true);
                        try {
                          await apiRequest("PATCH", `/api/actions/${folderUrlModalAction.id}`, { 
                            documentFolderUrl: actionFolderUrl || null 
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
                          toast({ title: "Folder link saved" });
                          setFolderUrlModalAction({ ...folderUrlModalAction, documentFolderUrl: actionFolderUrl || null });
                          setActionFolderUrlEditing(false);
                        } catch (error) {
                          toast({ title: "Failed to save URL", variant: "destructive" });
                        } finally {
                          setActionFolderUrlSaving(false);
                        }
                      }}
                      disabled={actionFolderUrlSaving}
                      data-testid="button-save-action-folder-url"
                    >
                      {actionFolderUrlSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : folderUrlModalAction.documentFolderUrl ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    {(() => {
                      try {
                        const hostname = new URL(folderUrlModalAction.documentFolderUrl).hostname;
                        return (
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                            alt=""
                            className="w-6 h-6 mt-0.5 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        );
                      } catch {
                        return <FolderOpen className="w-6 h-6 mt-0.5 text-blue-500" />;
                      }
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {(() => {
                          try {
                            return new URL(folderUrlModalAction.documentFolderUrl).hostname;
                          } catch {
                            return "Folder Link";
                          }
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {folderUrlModalAction.documentFolderUrl}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.open(folderUrlModalAction.documentFolderUrl, '_blank')}
                    data-testid="button-open-action-folder-url"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Folder
                  </Button>
                  
                  {canEditAllStrategies() && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1"
                        onClick={() => setActionFolderUrlEditing(true)}
                        data-testid="button-edit-action-folder-url"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          setActionFolderUrlSaving(true);
                          try {
                            await apiRequest("PATCH", `/api/actions/${folderUrlModalAction.id}`, { 
                              documentFolderUrl: null 
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
                            toast({ title: "Folder link removed" });
                            setFolderUrlModalAction({ ...folderUrlModalAction, documentFolderUrl: null });
                            setActionFolderUrl("");
                            setActionFolderUrlEditing(true);
                          } catch (error) {
                            toast({ title: "Failed to remove link", variant: "destructive" });
                          } finally {
                            setActionFolderUrlSaving(false);
                          }
                        }}
                        disabled={actionFolderUrlSaving}
                        data-testid="button-remove-action-folder-url"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No folder linked</p>
                  {canEditAllStrategies() ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActionFolderUrlEditing(true)}
                      data-testid="button-add-action-folder-url"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Folder Link
                    </Button>
                  ) : (
                    <p className="text-xs mt-1">Contact an administrator to add a folder link</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Notes Modal */}
      <Dialog 
        open={!!notesModalAction} 
        onOpenChange={(open) => {
          if (!open) {
            setNotesModalAction(null);
            setActionNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Action Notes
            </DialogTitle>
          </DialogHeader>
          {notesModalAction && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {notesModalAction.title}
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-notes">Notes</Label>
                <textarea
                  id="action-notes"
                  placeholder="Add notes about this action..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  disabled={!canEditAllStrategies()}
                  data-testid="textarea-action-notes"
                />
              </div>
              {canEditAllStrategies() && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNotesModalAction(null);
                      setActionNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateActionNotesMutation.mutate({ 
                        action: notesModalAction, 
                        notes: actionNotes 
                      });
                    }}
                    disabled={updateActionNotesMutation.isPending}
                    data-testid="button-save-action-notes"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dependencies Modal */}
      <Dialog 
        open={!!dependenciesModalAction} 
        onOpenChange={(open) => {
          if (!open) {
            setDependenciesModalAction(null);
            setSelectedActionDependencyType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Action Dependencies
            </DialogTitle>
          </DialogHeader>
          {dependenciesModalAction && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {dependenciesModalAction.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage dependencies for this action
                </p>
              </div>
              
              {/* Add Dependency Section */}
              {canEditAllStrategies() && (
                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                  {!selectedActionDependencyType ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select dependency type
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedActionDependencyType("project")}
                          data-testid="button-action-dep-type-project"
                        >
                          Project
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedActionDependencyType("action")}
                          data-testid="button-action-dep-type-action"
                        >
                          Action
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select {selectedActionDependencyType}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedActionDependencyType(null)}
                          data-testid="button-action-dep-cancel-type"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Command className="border rounded-md">
                        <CommandInput placeholder={`Search ${selectedActionDependencyType}s...`} />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>No {selectedActionDependencyType}s found</CommandEmpty>
                          <CommandGroup>
                            {selectedActionDependencyType === "project" ? (
                              projects?.filter((p: any) => 
                                p.isArchived !== 'true' &&
                                !getActionDependencies(dependenciesModalAction.id).some(
                                  (d: any) => d.targetType === 'project' && d.targetId === p.id
                                )
                              ).map((p: any) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.title}
                                  onSelect={() => {
                                    createDependencyMutation.mutate({
                                      sourceType: 'action',
                                      sourceId: dependenciesModalAction.id,
                                      targetType: 'project',
                                      targetId: p.id,
                                    });
                                    setSelectedActionDependencyType(null);
                                  }}
                                  data-testid={`action-dep-project-option-${p.id}`}
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${getStatusCircleColor(p.status)}`} />
                                  {p.title}
                                </CommandItem>
                              ))
                            ) : (
                              actions?.filter((a: any) => 
                                a.id !== dependenciesModalAction.id &&
                                a.isArchived !== 'true' &&
                                !getActionDependencies(dependenciesModalAction.id).some(
                                  (d: any) => d.targetType === 'action' && d.targetId === a.id
                                )
                              ).map((a: any) => (
                                <CommandItem
                                  key={a.id}
                                  value={a.title}
                                  onSelect={() => {
                                    createDependencyMutation.mutate({
                                      sourceType: 'action',
                                      sourceId: dependenciesModalAction.id,
                                      targetType: 'action',
                                      targetId: a.id,
                                    });
                                    setSelectedActionDependencyType(null);
                                  }}
                                  data-testid={`action-dep-action-option-${a.id}`}
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${getActionStatusCircleColor(a.status)}`} />
                                  {a.title}
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              )}
              
              {/* Current Dependencies */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Dependencies ({getActionDependencies(dependenciesModalAction.id).length})
                </p>
                {getActionDependencies(dependenciesModalAction.id).length > 0 ? (
                  <div className="space-y-2">
                    {getActionDependencies(dependenciesModalAction.id).map((dep: any) => {
                      const isSource = dep.sourceType === 'action' && dep.sourceId === dependenciesModalAction.id;
                      const targetType = isSource ? dep.targetType : dep.sourceType;
                      const targetId = isSource ? dep.targetId : dep.sourceId;
                      const targetItem = targetType === 'project' 
                        ? projects?.find((p: any) => p.id === targetId)
                        : actions?.find((a: any) => a.id === targetId);
                      
                      return (
                        <div 
                          key={dep.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {targetType}
                            </Badge>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {targetItem?.title || 'Unknown'}
                            </span>
                          </div>
                          {canEditAllStrategies() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => deleteDependencyMutation.mutate(dep.id)}
                              data-testid={`button-remove-action-dep-${dep.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No dependencies for this action</p>
                    {!canEditAllStrategies() && (
                      <p className="text-xs mt-1">Contact an administrator to add dependencies</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Executive Goal Selection Modal (Multi-select) */}
      <Dialog open={!!executiveGoalModalStrategy} onOpenChange={(open) => {
        if (!open) {
          setExecutiveGoalModalStrategy(null);
          setSelectedGoalIds([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tag Executive Goals
            </DialogTitle>
          </DialogHeader>
          {executiveGoalModalStrategy && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select one or more Executive Goals to tag this priority.
              </p>
              
              <div className="space-y-2">
                {executiveGoals.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No Executive Goals available</p>
                    <p className="text-xs mt-1">Create Executive Goals in Settings to tag priorities</p>
                  </div>
                ) : (
                  <>
                    {executiveGoals.map((goal: ExecutiveGoal) => {
                      const isSelected = selectedGoalIds.includes(goal.id);
                      return (
                        <div
                          key={goal.id}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500'
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGoalIds(selectedGoalIds.filter(id => id !== goal.id));
                            } else {
                              setSelectedGoalIds([...selectedGoalIds, goal.id]);
                            }
                          }}
                          data-testid={`select-executive-goal-${goal.id}`}
                        >
                          <div className="flex flex-col gap-1">
                            <Badge 
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 w-fit"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {goal.name}
                            </Badge>
                            {goal.description && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                                {goal.description}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          updateStrategyExecutiveGoalsMutation.mutate({
                            strategyId: executiveGoalModalStrategy.id,
                            goalIds: selectedGoalIds,
                          });
                        }}
                        disabled={updateStrategyExecutiveGoalsMutation.isPending}
                        data-testid="button-save-executive-goals"
                      >
                        {updateStrategyExecutiveGoalsMutation.isPending ? "Saving..." : "Save Goals"}
                      </Button>
                      {selectedGoalIds.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedGoalIds([])}
                          data-testid="button-clear-executive-goals"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Project Modal */}
      <Dialog open={!!archivingProject} onOpenChange={(open) => !open && setArchivingProject(null)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archive Project
            </DialogTitle>
          </DialogHeader>
          {archivingProject && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Are you sure you want to archive <span className="font-medium">"{archivingProject.title}"</span>?</p>
              </div>
              
              {/* Warning for non-100% progress */}
              {archivingProject.progress !== undefined && archivingProject.progress < 100 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-medium">Project is not 100% complete</p>
                      <p className="text-xs mt-0.5">
                        Current progress: {archivingProject.progress || 0}%. Consider completing remaining actions before archiving.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">When archived:</p>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                  <li>Project and its actions will be hidden from daily view</li>
                  <li>Dependencies on this project will be removed</li>
                  <li>A snapshot will be created for version history</li>
                  <li>You can restore or copy it anytime from Reports</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="archive-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Archive Reason (optional)
                  </label>
                  <Textarea
                    id="archive-reason"
                    placeholder="e.g., Completed, Postponed, Cyclical work completed for this quarter..."
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-archive-reason"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="wake-up-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wake-up Date (optional)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Set a date when you'll be reminded to reactivate this project (useful for cyclical work)
                  </p>
                  <Input
                    id="wake-up-date"
                    type="date"
                    value={archiveWakeUpDate}
                    onChange={(e) => setArchiveWakeUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-archive-wake-up-date"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setArchivingProject(null);
                    setArchiveReason("");
                    setArchiveWakeUpDate("");
                  }}
                  data-testid="button-cancel-archive"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    archiveProjectMutation.mutate({
                      projectId: archivingProject.id,
                      reason: archiveReason || undefined,
                      wakeUpDate: archiveWakeUpDate || undefined,
                    });
                  }}
                  disabled={archiveProjectMutation.isPending}
                  data-testid="button-confirm-archive"
                >
                  {archiveProjectMutation.isPending ? "Archiving..." : "Archive Project"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
