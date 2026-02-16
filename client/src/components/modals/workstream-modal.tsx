import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  LayoutGrid,
  BarChart3,
  Shield,
  List,
  Circle,
  ArrowRight,
  Link2,
  Milestone,
  Flag,
  X,
} from "lucide-react";

interface Workstream {
  id: string;
  organizationId: string;
  strategyId: string;
  name: string;
  lead: string | null;
  status: string;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Phase {
  id: string;
  organizationId: string;
  strategyId: string;
  name: string;
  sequence: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WorkstreamTask {
  id: string;
  organizationId: string;
  workstreamId: string;
  phaseId: string;
  name: string;
  description: string | null;
  owner: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  durationDays: number;
  percentComplete: number;
  status: string;
  isMilestone: string;
  milestoneType: string | null;
  sortOrder: number;
  isCritical: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WorkstreamDependency {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: string;
  lagDays: number;
  createdAt: string | null;
}

interface GateCriterion {
  id: string;
  gateTaskId: string;
  description: string;
  isMet: string;
  evidence: string | null;
  owner: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CalculationDataRaw {
  taskRag: Record<string, string>;
  workstreamGateRag: Record<string, Record<string, string>>;
  programGateRag: Record<string, string>;
  criticalPath: Record<string, { isCritical: boolean; totalFloat: number }>;
}

interface CalculationData {
  taskRags: Record<string, string>;
  workstreamGateRags: Record<string, string>;
  programGateRags: Record<string, string>;
  criticalPathTaskIds: string[];
}

interface WorkstreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: string;
  strategyTitle?: string;
}

const RAG_COLORS: Record<string, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

const TASK_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "blocked", label: "Blocked" },
];

const DEP_TYPES = [
  { value: "FS", label: "Finish-to-Start (FS)" },
  { value: "FF", label: "Finish-to-Finish (FF)" },
  { value: "SS", label: "Start-to-Start (SS)" },
  { value: "SF", label: "Start-to-Finish (SF)" },
];

function RagDot({ status }: { status?: string }) {
  if (!status) return <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />;
  return <span className={cn("w-3 h-3 rounded-full inline-block", RAG_COLORS[status] || "bg-gray-300")} />;
}

export function WorkstreamModal({ open, onOpenChange, strategyId, strategyTitle }: WorkstreamModalProps) {
  const { canManageUsers, canEditProjects } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("workstream");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string>("");
  const [cellPanel, setCellPanel] = useState<{ workstreamId: string; phaseId: string } | null>(null);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkstreamTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    owner: "",
    phaseId: "",
    workstreamId: "",
    durationDays: "5",
    plannedStart: "",
    plannedEnd: "",
    isMilestone: "false",
    milestoneType: "",
    status: "not_started",
  });

  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depForm, setDepForm] = useState({
    predecessorTaskId: "",
    successorTaskId: "",
    type: "FS",
    lagDays: "0",
  });

  const [criteriaDialogOpen, setCriteriaDialogOpen] = useState(false);
  const [criteriaGateTaskId, setCriteriaGateTaskId] = useState("");
  const [criteriaForm, setCriteriaForm] = useState({
    description: "",
    owner: "",
  });

  const isAdmin = canManageUsers();
  const canEdit = canEditProjects();

  const { data: workstreams = [] } = useQuery<Workstream[]>({
    queryKey: [`/api/workstreams?strategyId=${strategyId}`],
    enabled: !!strategyId && open,
  });

  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: [`/api/phases?strategyId=${strategyId}`],
    enabled: !!strategyId && open,
  });

  const { data: tasks = [] } = useQuery<WorkstreamTask[]>({
    queryKey: [`/api/workstream-tasks?strategyId=${strategyId}`],
    enabled: !!strategyId && open,
  });

  const { data: dependencies = [] } = useQuery<WorkstreamDependency[]>({
    queryKey: [`/api/workstream-dependencies?strategyId=${strategyId}`],
    enabled: !!strategyId && open,
  });

  const { data: calculations } = useQuery<CalculationDataRaw, Error, CalculationData>({
    queryKey: [`/api/workstream-calculations?strategyId=${strategyId}`],
    enabled: !!strategyId && open,
    select: (raw: CalculationDataRaw): CalculationData => {
      const workstreamGateRags: Record<string, string> = {};
      if (raw.workstreamGateRag) {
        for (const [wsId, phaseMap] of Object.entries(raw.workstreamGateRag)) {
          for (const [phId, rag] of Object.entries(phaseMap)) {
            workstreamGateRags[`${wsId}_${phId}`] = rag;
          }
        }
      }
      const criticalPathTaskIds = raw.criticalPath
        ? Object.entries(raw.criticalPath).filter(([, v]) => v.isCritical).map(([id]) => id)
        : [];
      return {
        taskRags: raw.taskRag || {},
        workstreamGateRags,
        programGateRags: raw.programGateRag || {},
        criticalPathTaskIds,
      };
    },
  });

  const sortedPhases = useMemo(() => [...phases].sort((a, b) => a.sequence - b.sequence), [phases]);
  const sortedWorkstreams = useMemo(() => [...workstreams].sort((a, b) => a.sortOrder - b.sortOrder), [workstreams]);

  const programGateTasks = useMemo(() => {
    return tasks.filter(t => t.isMilestone === "true" && t.milestoneType === "program_gate");
  }, [tasks]);

  const workstreamGateTasks = useMemo(() => {
    return tasks.filter(t => t.isMilestone === "true" && t.milestoneType === "workstream_gate");
  }, [tasks]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/workstreams?strategyId=${strategyId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/phases?strategyId=${strategyId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/workstream-tasks?strategyId=${strategyId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/workstream-dependencies?strategyId=${strategyId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/workstream-calculations?strategyId=${strategyId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
  };

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workstream-tasks", data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Task created" });
      closeTaskDialog();
    },
    onError: () => toast({ title: "Error", description: "Failed to create task", variant: "destructive" }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/workstream-tasks/${id}`, data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Task updated" });
      closeTaskDialog();
    },
    onError: () => toast({ title: "Error", description: "Failed to update task", variant: "destructive" }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workstream-tasks/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Task deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete task", variant: "destructive" }),
  });

  const createDepMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workstream-dependencies", data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Dependency created" });
      setDepDialogOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to create dependency", variant: "destructive" }),
  });

  const deleteDepMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workstream-dependencies/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Dependency removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete dependency", variant: "destructive" }),
  });

  const createCriteriaMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gate-criteria", data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Criterion added" });
      setCriteriaDialogOpen(false);
      setCriteriaForm({ description: "", owner: "" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add criterion", variant: "destructive" }),
  });

  const updateCriteriaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/gate-criteria/${id}`, data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Criterion updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update criterion", variant: "destructive" }),
  });

  const deleteCriteriaMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/gate-criteria/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Success", description: "Criterion deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete criterion", variant: "destructive" }),
  });

  function openCreateTask(workstreamId?: string, phaseId?: string) {
    setEditingTask(null);
    setTaskForm({
      name: "",
      description: "",
      owner: "",
      phaseId: phaseId || "",
      workstreamId: workstreamId || "",
      durationDays: "5",
      plannedStart: "",
      plannedEnd: "",
      isMilestone: "false",
      milestoneType: "",
      status: "not_started",
    });
    setTaskDialogOpen(true);
  }

  function openEditTask(task: WorkstreamTask) {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      description: task.description || "",
      owner: task.owner || "",
      phaseId: task.phaseId,
      workstreamId: task.workstreamId,
      durationDays: String(task.durationDays),
      plannedStart: task.plannedStart || "",
      plannedEnd: task.plannedEnd || "",
      isMilestone: task.isMilestone,
      milestoneType: task.milestoneType || "",
      status: task.status,
    });
    setTaskDialogOpen(true);
  }

  function closeTaskDialog() {
    setTaskDialogOpen(false);
    setEditingTask(null);
  }

  function handleSaveTask() {
    if (!taskForm.name.trim()) {
      toast({ title: "Validation Error", description: "Task name is required", variant: "destructive" });
      return;
    }
    const payload = {
      strategyId,
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || null,
      owner: taskForm.owner.trim() || null,
      phaseId: taskForm.phaseId,
      workstreamId: taskForm.workstreamId,
      durationDays: parseInt(taskForm.durationDays) || 5,
      plannedStart: taskForm.plannedStart || null,
      plannedEnd: taskForm.plannedEnd || null,
      isMilestone: taskForm.isMilestone,
      milestoneType: taskForm.milestoneType || null,
      status: taskForm.status,
    };
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  }

  function handleSaveDep() {
    if (!depForm.predecessorTaskId || !depForm.successorTaskId) {
      toast({ title: "Validation Error", description: "Select both predecessor and successor", variant: "destructive" });
      return;
    }
    createDepMutation.mutate({
      predecessorTaskId: depForm.predecessorTaskId,
      successorTaskId: depForm.successorTaskId,
      type: depForm.type,
      lagDays: parseInt(depForm.lagDays) || 0,
      strategyId,
    });
  }

  function handleSaveCriteria() {
    if (!criteriaForm.description.trim()) {
      toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
      return;
    }
    createCriteriaMutation.mutate({
      gateTaskId: criteriaGateTaskId,
      description: criteriaForm.description.trim(),
      owner: criteriaForm.owner.trim() || null,
    });
  }

  function handleUpdateTaskField(taskId: string, field: string, value: any) {
    updateTaskMutation.mutate({ id: taskId, data: { [field]: value } });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#5856D6" }}
              >
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl">Workstreams</span>
                {strategyTitle && (
                  <p className="text-sm font-normal text-gray-500 mt-0.5">{strategyTitle}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="workstream" className="gap-2">
                <List className="w-4 h-4" />
                Workstream View
              </TabsTrigger>
              <TabsTrigger value="matrix" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Matrix View
              </TabsTrigger>
              <TabsTrigger value="executive" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Executive View
              </TabsTrigger>
              <TabsTrigger value="phase-gate" className="gap-2">
                <Shield className="w-4 h-4" />
                Phase Gate Review
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workstream">
              <WorkstreamView
                workstreams={sortedWorkstreams}
                phases={sortedPhases}
                tasks={tasks}
                calculations={calculations}
                dependencies={dependencies}
                selectedWorkstreamId={selectedWorkstreamId}
                setSelectedWorkstreamId={setSelectedWorkstreamId}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onCreateTask={openCreateTask}
                onEditTask={openEditTask}
                onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
                onUpdateField={handleUpdateTaskField}
                onOpenDepDialog={() => setDepDialogOpen(true)}
                onDeleteDep={(id) => deleteDepMutation.mutate(id)}
              />
            </TabsContent>

            <TabsContent value="matrix">
              <MatrixView
                workstreams={sortedWorkstreams}
                phases={sortedPhases}
                tasks={tasks}
                calculations={calculations}
                programGateTasks={programGateTasks}
                workstreamGateTasks={workstreamGateTasks}
                cellPanel={cellPanel}
                setCellPanel={setCellPanel}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onCreateTask={openCreateTask}
                onEditTask={openEditTask}
                onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
                onUpdateField={handleUpdateTaskField}
                dependencies={dependencies}
              />
            </TabsContent>

            <TabsContent value="executive">
              <ExecutiveView
                phases={sortedPhases}
                workstreams={sortedWorkstreams}
                calculations={calculations}
                programGateTasks={programGateTasks}
                workstreamGateTasks={workstreamGateTasks}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onOpenCriteriaDialog={(gateTaskId: string) => {
                  setCriteriaGateTaskId(gateTaskId);
                  setCriteriaDialogOpen(true);
                }}
                onUpdateCriteria={(id: string, data: any) => updateCriteriaMutation.mutate({ id, data })}
                onDeleteCriteria={(id: string) => deleteCriteriaMutation.mutate(id)}
                strategyId={strategyId}
              />
            </TabsContent>

            <TabsContent value="phase-gate">
              <PhaseGateReview
                phases={sortedPhases}
                workstreams={sortedWorkstreams}
                calculations={calculations}
                programGateTasks={programGateTasks}
                workstreamGateTasks={workstreamGateTasks}
                selectedPhaseId={selectedPhaseId}
                setSelectedPhaseId={setSelectedPhaseId}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onOpenCriteriaDialog={(gateTaskId: string) => {
                  setCriteriaGateTaskId(gateTaskId);
                  setCriteriaDialogOpen(true);
                }}
                onUpdateCriteria={(id: string, data: any) => updateCriteriaMutation.mutate({ id, data })}
                onDeleteCriteria={(id: string) => deleteCriteriaMutation.mutate(id)}
                strategyId={strategyId}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg z-[60]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                placeholder="Task name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Workstream</Label>
                <Select value={taskForm.workstreamId} onValueChange={(v) => setTaskForm({ ...taskForm, workstreamId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select workstream" /></SelectTrigger>
                  <SelectContent>
                    {sortedWorkstreams.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phase</Label>
                <Select value={taskForm.phaseId} onValueChange={(v) => setTaskForm({ ...taskForm, phaseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                  <SelectContent>
                    {sortedPhases.map((ph) => (
                      <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Owner</Label>
                <Input
                  value={taskForm.owner}
                  onChange={(e) => setTaskForm({ ...taskForm, owner: e.target.value })}
                  placeholder="Owner name"
                />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={taskForm.durationDays}
                  onChange={(e) => setTaskForm({ ...taskForm, durationDays: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Planned Start</Label>
                <Input
                  type="date"
                  value={taskForm.plannedStart}
                  onChange={(e) => setTaskForm({ ...taskForm, plannedStart: e.target.value })}
                />
              </div>
              <div>
                <Label>Planned End</Label>
                <Input
                  type="date"
                  value={taskForm.plannedEnd}
                  onChange={(e) => setTaskForm({ ...taskForm, plannedEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Milestone</Label>
                <Select value={taskForm.isMilestone} onValueChange={(v) => setTaskForm({ ...taskForm, isMilestone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {taskForm.isMilestone === "true" && (
              <div>
                <Label>Milestone Type</Label>
                <Select value={taskForm.milestoneType} onValueChange={(v) => setTaskForm({ ...taskForm, milestoneType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workstream_gate">Workstream Gate</SelectItem>
                    <SelectItem value="program_gate">Program Gate</SelectItem>
                    <SelectItem value="general">General Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTaskDialog}>Cancel</Button>
            <Button
              onClick={handleSaveTask}
              disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
            >
              {editingTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
        <DialogContent className="max-w-lg z-[60]">
          <DialogHeader>
            <DialogTitle>Add Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Predecessor Task</Label>
              <Select value={depForm.predecessorTaskId} onValueChange={(v) => setDepForm({ ...depForm, predecessorTaskId: v })}>
                <SelectTrigger><SelectValue placeholder="Select predecessor" /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Successor Task</Label>
              <Select value={depForm.successorTaskId} onValueChange={(v) => setDepForm({ ...depForm, successorTaskId: v })}>
                <SelectTrigger><SelectValue placeholder="Select successor" /></SelectTrigger>
                <SelectContent>
                  {tasks.filter(t => t.id !== depForm.predecessorTaskId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={depForm.type} onValueChange={(v) => setDepForm({ ...depForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEP_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lag (days)</Label>
                <Input
                  type="number"
                  value={depForm.lagDays}
                  onChange={(e) => setDepForm({ ...depForm, lagDays: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDep} disabled={createDepMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={criteriaDialogOpen} onOpenChange={setCriteriaDialogOpen}>
        <DialogContent className="max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle>Add Gate Criterion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Textarea
                value={criteriaForm.description}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, description: e.target.value })}
                placeholder="Gate criterion description"
              />
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                value={criteriaForm.owner}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, owner: e.target.value })}
                placeholder="Criterion owner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriteriaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCriteria} disabled={createCriteriaMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MatrixView({
  workstreams,
  phases,
  tasks,
  calculations,
  programGateTasks,
  workstreamGateTasks,
  cellPanel,
  setCellPanel,
  canEdit,
  isAdmin,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onUpdateField,
  dependencies,
}: {
  workstreams: Workstream[];
  phases: Phase[];
  tasks: WorkstreamTask[];
  calculations?: CalculationData;
  programGateTasks: WorkstreamTask[];
  workstreamGateTasks: WorkstreamTask[];
  cellPanel: { workstreamId: string; phaseId: string } | null;
  setCellPanel: (v: { workstreamId: string; phaseId: string } | null) => void;
  canEdit: boolean;
  isAdmin: boolean;
  onCreateTask: (wsId?: string, phId?: string) => void;
  onEditTask: (task: WorkstreamTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateField: (taskId: string, field: string, value: any) => void;
  dependencies: WorkstreamDependency[];
}) {
  if (workstreams.length === 0 || phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workstreams configured</h3>
          <p className="text-gray-600">Configure workstreams and phases in Settings first.</p>
        </CardContent>
      </Card>
    );
  }

  const cellTasks = cellPanel ? tasks.filter(t => t.workstreamId === cellPanel.workstreamId && t.phaseId === cellPanel.phaseId) : [];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 bg-gray-100 border border-gray-200 font-semibold text-sm min-w-[200px]">
                Workstream
              </th>
              {phases.map((ph) => (
                <th key={ph.id} className="text-center p-3 bg-gray-100 border border-gray-200 font-semibold text-sm min-w-[150px]">
                  {ph.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workstreams.map((ws) => (
              <tr key={ws.id}>
                <td className="p-3 border border-gray-200 bg-white font-medium text-sm">
                  <div className="flex items-center gap-2">
                    <span>{ws.name}</span>
                    {ws.lead && <Badge variant="outline" className="text-xs">{ws.lead}</Badge>}
                  </div>
                </td>
                {phases.map((ph) => {
                  const cellTaskCount = tasks.filter(t => t.workstreamId === ws.id && t.phaseId === ph.id).length;
                  const gateKey = `${ws.id}_${ph.id}`;
                  const gateRag = calculations?.workstreamGateRags?.[gateKey];
                  const isSelected = cellPanel?.workstreamId === ws.id && cellPanel?.phaseId === ph.id;

                  return (
                    <td
                      key={ph.id}
                      className={cn(
                        "p-3 border border-gray-200 text-center cursor-pointer hover:bg-blue-50 transition-colors",
                        isSelected ? "bg-blue-100 ring-2 ring-blue-400" : "bg-white"
                      )}
                      onClick={() => setCellPanel(isSelected ? null : { workstreamId: ws.id, phaseId: ph.id })}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-medium">{cellTaskCount}</span>
                        {cellTaskCount > 0 && <span className="text-xs text-gray-500">tasks</span>}
                      </div>
                      {gateRag && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <RagDot status={gateRag} />
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
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-purple-500" />
                  Program Gates
                </div>
              </td>
              {phases.map((ph) => {
                const programRag = calculations?.programGateRags?.[ph.id];
                const gate = programGateTasks.find(t => t.phaseId === ph.id);
                return (
                  <td key={ph.id} className="p-3 border border-gray-200 bg-gray-50 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RagDot status={programRag} />
                      {gate && <span className="text-xs text-gray-600 truncate">{gate.name}</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {cellPanel && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {workstreams.find(w => w.id === cellPanel.workstreamId)?.name} — {phases.find(p => p.id === cellPanel.phaseId)?.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => onCreateTask(cellPanel.workstreamId, cellPanel.phaseId)}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Task
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setCellPanel(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cellTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks in this cell</p>
            ) : (
              <div className="space-y-2">
                {cellTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    calculations={calculations}
                    dependencies={dependencies}
                    tasks={tasks}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task.id)}
                    onUpdateField={onUpdateField}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskRow({
  task,
  calculations,
  dependencies,
  tasks,
  canEdit,
  isAdmin,
  onEdit,
  onDelete,
  onUpdateField,
}: {
  task: WorkstreamTask;
  calculations?: CalculationData;
  dependencies: WorkstreamDependency[];
  tasks: WorkstreamTask[];
  canEdit: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateField: (taskId: string, field: string, value: any) => void;
}) {
  const isCritical = calculations?.criticalPathTaskIds?.includes(task.id);
  const taskRag = calculations?.taskRags?.[task.id];
  const taskDeps = dependencies.filter(d => d.predecessorTaskId === task.id || d.successorTaskId === task.id);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border bg-white flex items-center justify-between gap-3",
        isCritical && "border-l-4 border-l-red-500"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.isMilestone === "true" ? (
            <Milestone className="w-4 h-4 text-purple-500 shrink-0" />
          ) : (
            <Circle className="w-3 h-3 text-gray-400 shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{task.name}</span>
          <RagDot status={taskRag} />
          {task.isMilestone === "true" && (
            <Badge variant="secondary" className="text-xs">{task.milestoneType || "milestone"}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {task.owner && <span>Owner: {task.owner}</span>}
          <span>{task.durationDays}d</span>
          {task.plannedStart && <span>Start: {task.plannedStart}</span>}
          {task.plannedEnd && <span>End: {task.plannedEnd}</span>}
          {taskDeps.length > 0 && (
            <span className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {taskDeps.length} dep{taskDeps.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canEdit && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              className="w-16 h-7 text-xs"
              value={task.percentComplete}
              onChange={(e) => onUpdateField(task.id, "percentComplete", parseInt(e.target.value) || 0)}
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        )}
        {canEdit && (
          <Select value={task.status} onValueChange={(v) => onUpdateField(task.id, "status", v)}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!canEdit && (
          <Badge variant="outline" className="text-xs">
            {TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}
          </Badge>
        )}
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
            <Edit className="w-3 h-3" />
          </Button>
        )}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{task.name}"? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

function GateCriteriaList({
  gateTaskId,
  canEdit,
  isAdmin,
  onOpenAdd,
  onUpdate,
  onDelete,
}: {
  gateTaskId: string;
  canEdit: boolean;
  isAdmin: boolean;
  onOpenAdd: (gateTaskId: string) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  const { data: criteria = [] } = useQuery<GateCriterion[]>({
    queryKey: [`/api/gate-criteria?gateTaskId=${gateTaskId}`],
    enabled: !!gateTaskId,
  });

  const [evidenceInputs, setEvidenceInputs] = useState<Record<string, string>>({});

  return (
    <div className="space-y-2">
      {criteria.length === 0 && (
        <p className="text-xs text-gray-500 italic">No gate criteria defined</p>
      )}
      {criteria.map((c) => (
        <div key={c.id} className="flex items-start gap-2 p-2 rounded border bg-white">
          <Checkbox
            checked={c.isMet === "true"}
            disabled={!canEdit}
            onCheckedChange={(checked) => onUpdate(c.id, { isMet: checked ? "true" : "false" })}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm", c.isMet === "true" && "line-through text-gray-400")}>
              {c.description}
            </p>
            {c.owner && <p className="text-xs text-gray-500 mt-0.5">Owner: {c.owner}</p>}
            {c.evidence && <p className="text-xs text-blue-600 mt-0.5">Evidence: {c.evidence}</p>}
            {canEdit && (
              <div className="flex items-center gap-1 mt-1">
                <Input
                  className="h-6 text-xs flex-1"
                  placeholder="Add evidence..."
                  value={evidenceInputs[c.id] || ""}
                  onChange={(e) => setEvidenceInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && evidenceInputs[c.id]?.trim()) {
                      onUpdate(c.id, { evidence: evidenceInputs[c.id].trim() });
                      setEvidenceInputs(prev => ({ ...prev, [c.id]: "" }));
                    }
                  }}
                />
              </div>
            )}
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => onDelete(c.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
      {canEdit && (
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenAdd(gateTaskId)}>
          <Plus className="w-3 h-3 mr-1" />
          Add Criterion
        </Button>
      )}
    </div>
  );
}

function ExecutiveView({
  phases,
  workstreams,
  calculations,
  programGateTasks,
  workstreamGateTasks,
  canEdit,
  isAdmin,
  onOpenCriteriaDialog,
  onUpdateCriteria,
  onDeleteCriteria,
  strategyId,
}: {
  phases: Phase[];
  workstreams: Workstream[];
  calculations?: CalculationData;
  programGateTasks: WorkstreamTask[];
  workstreamGateTasks: WorkstreamTask[];
  canEdit: boolean;
  isAdmin: boolean;
  onOpenCriteriaDialog: (gateTaskId: string) => void;
  onUpdateCriteria: (id: string, data: any) => void;
  onDeleteCriteria: (id: string) => void;
  strategyId: string;
}) {
  if (phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No phases configured</h3>
          <p className="text-gray-600">Configure phases in Settings to see the executive overview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const programRag = calculations?.programGateRags?.[phase.id];
        const programGate = programGateTasks.find(t => t.phaseId === phase.id);
        const wsGates = workstreamGateTasks.filter(t => t.phaseId === phase.id);

        return (
          <Card key={phase.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <RagDot status={programRag} />
                <CardTitle className="text-lg">{phase.name}</CardTitle>
                {phase.plannedStart && <Badge variant="outline" className="text-xs">{phase.plannedStart} — {phase.plannedEnd}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Workstream Gate Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {wsGates.length === 0 && workstreams.map((ws) => {
                      const gateKey = `${ws.id}_${phase.id}`;
                      const wsRag = calculations?.workstreamGateRags?.[gateKey];
                      return (
                        <div key={ws.id} className="flex items-center gap-2 p-2 rounded border bg-gray-50">
                          <RagDot status={wsRag} />
                          <span className="text-sm">{ws.name}</span>
                        </div>
                      );
                    })}
                    {wsGates.map((gate) => {
                      const ws = workstreams.find(w => w.id === gate.workstreamId);
                      const gateKey = `${gate.workstreamId}_${phase.id}`;
                      const wsRag = calculations?.workstreamGateRags?.[gateKey];
                      return (
                        <div key={gate.id} className="flex items-center gap-2 p-2 rounded border bg-gray-50">
                          <RagDot status={wsRag} />
                          <span className="text-sm">{ws?.name || gate.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {programGate && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Program Gate Criteria</h4>
                    <GateCriteriaList
                      gateTaskId={programGate.id}
                      canEdit={canEdit}
                      isAdmin={isAdmin}
                      onOpenAdd={onOpenCriteriaDialog}
                      onUpdate={onUpdateCriteria}
                      onDelete={onDeleteCriteria}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PhaseGateReview({
  phases,
  workstreams,
  calculations,
  programGateTasks,
  workstreamGateTasks,
  selectedPhaseId,
  setSelectedPhaseId,
  canEdit,
  isAdmin,
  onOpenCriteriaDialog,
  onUpdateCriteria,
  onDeleteCriteria,
  strategyId,
}: {
  phases: Phase[];
  workstreams: Workstream[];
  calculations?: CalculationData;
  programGateTasks: WorkstreamTask[];
  workstreamGateTasks: WorkstreamTask[];
  selectedPhaseId: string;
  setSelectedPhaseId: (v: string) => void;
  canEdit: boolean;
  isAdmin: boolean;
  onOpenCriteriaDialog: (gateTaskId: string) => void;
  onUpdateCriteria: (id: string, data: any) => void;
  onDeleteCriteria: (id: string) => void;
  strategyId: string;
}) {
  const activePhaseId = selectedPhaseId || phases[0]?.id || "";
  const activePhase = phases.find(p => p.id === activePhaseId);
  const programGate = programGateTasks.find(t => t.phaseId === activePhaseId);
  const programRag = calculations?.programGateRags?.[activePhaseId];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Select Phase:</Label>
        <Select value={activePhaseId} onValueChange={setSelectedPhaseId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select phase" />
          </SelectTrigger>
          <SelectContent>
            {phases.map((ph) => (
              <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activePhase && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-500" />
                <CardTitle>Workstream Gates — {activePhase.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workstreams.map((ws) => {
                  const gateKey = `${ws.id}_${activePhaseId}`;
                  const wsRag = calculations?.workstreamGateRags?.[gateKey];
                  const gate = workstreamGateTasks.find(t => t.workstreamId === ws.id && t.phaseId === activePhaseId);
                  return (
                    <div key={ws.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                      <RagDot status={wsRag} />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{ws.name}</span>
                        {gate && <span className="text-xs text-gray-500 ml-2">({gate.name})</span>}
                      </div>
                      {gate && (
                        <Badge variant="outline" className="text-xs">
                          {gate.percentComplete}% complete
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <RagDot status={programRag} />
                <CardTitle>Program Gate — {activePhase.name}</CardTitle>
                {programGate && <Badge variant="outline" className="text-xs">{programGate.name}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {programGate ? (
                <GateCriteriaList
                  gateTaskId={programGate.id}
                  canEdit={canEdit}
                  isAdmin={isAdmin}
                  onOpenAdd={onOpenCriteriaDialog}
                  onUpdate={onUpdateCriteria}
                  onDelete={onDeleteCriteria}
                />
              ) : (
                <p className="text-sm text-gray-500">No program gate milestone found for this phase.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function WorkstreamView({
  workstreams,
  phases,
  tasks,
  calculations,
  dependencies,
  selectedWorkstreamId,
  setSelectedWorkstreamId,
  canEdit,
  isAdmin,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onUpdateField,
  onOpenDepDialog,
  onDeleteDep,
}: {
  workstreams: Workstream[];
  phases: Phase[];
  tasks: WorkstreamTask[];
  calculations?: CalculationData;
  dependencies: WorkstreamDependency[];
  selectedWorkstreamId: string;
  setSelectedWorkstreamId: (v: string) => void;
  canEdit: boolean;
  isAdmin: boolean;
  onCreateTask: (wsId?: string, phId?: string) => void;
  onEditTask: (task: WorkstreamTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateField: (taskId: string, field: string, value: any) => void;
  onOpenDepDialog: () => void;
  onDeleteDep: (id: string) => void;
}) {
  const activeWsId = selectedWorkstreamId || workstreams[0]?.id || "";
  const activeWs = workstreams.find(w => w.id === activeWsId);
  const wsTasks = tasks.filter(t => t.workstreamId === activeWsId);

  if (workstreams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workstreams configured</h3>
          <p className="text-gray-600">Configure workstreams and phases in Settings first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Select Workstream:</Label>
          <Select value={activeWsId} onValueChange={setSelectedWorkstreamId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select workstream" />
            </SelectTrigger>
            <SelectContent>
              {workstreams.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={onOpenDepDialog}>
                <Link2 className="w-4 h-4 mr-1" />
                Add Dependency
              </Button>
              <Button size="sm" onClick={() => onCreateTask(activeWsId)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </>
          )}
        </div>
      </div>

      {activeWs && (
        <div className="space-y-4">
          {phases.map((phase) => {
            const phaseTasks = wsTasks
              .filter(t => t.phaseId === phase.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <Card key={phase.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {phase.name}
                      <Badge variant="secondary" className="text-xs">{phaseTasks.length} tasks</Badge>
                    </CardTitle>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => onCreateTask(activeWsId, phase.id)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {phaseTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-3">No tasks in this phase</p>
                  ) : (
                    <div className="space-y-2">
                      {phaseTasks.map((task) => {
                        const taskDeps = dependencies.filter(d => d.predecessorTaskId === task.id || d.successorTaskId === task.id);
                        return (
                          <div key={task.id}>
                            <TaskRow
                              task={task}
                              calculations={calculations}
                              dependencies={dependencies}
                              tasks={tasks}
                              canEdit={canEdit}
                              isAdmin={isAdmin}
                              onEdit={() => onEditTask(task)}
                              onDelete={() => onDeleteTask(task.id)}
                              onUpdateField={onUpdateField}
                            />
                            {taskDeps.length > 0 && (
                              <div className="ml-8 mt-1 space-y-1">
                                {taskDeps.map((dep) => {
                                  const isPredecessor = dep.successorTaskId === task.id;
                                  const otherTaskId = isPredecessor ? dep.predecessorTaskId : dep.successorTaskId;
                                  const otherTask = tasks.find(t => t.id === otherTaskId);
                                  return (
                                    <div key={dep.id} className="flex items-center gap-2 text-xs text-gray-500">
                                      <ArrowRight className="w-3 h-3" />
                                      <span>
                                        {isPredecessor ? "Predecessor" : "Successor"}: {otherTask?.name || "Unknown"}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1">{dep.type}</Badge>
                                      {dep.lagDays > 0 && <span>+{dep.lagDays}d lag</span>}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                          onClick={() => onDeleteDep(dep.id)}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}