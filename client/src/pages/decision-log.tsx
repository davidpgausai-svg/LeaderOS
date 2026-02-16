import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  Plus,
  Edit,
  Trash2,
  Filter,
  Calendar,
  Target,
  X,
  Users,
} from "lucide-react";
import type { Strategy, User } from "@shared/schema";

interface RaciAssignment {
  userId: string;
  role: "responsible" | "accountable" | "consulted" | "informed";
}

interface Decision {
  id: string;
  organizationId: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  escalationLevel: string | null;
  outcome: string | null;
  rationale: string | null;
  impactNotes: string | null;
  strategyId: string | null;
  dueDate: string | null;
  decisionDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  raciAssignments?: RaciAssignment[];
}

const CATEGORIES = [
  { value: "strategic", label: "Strategic", color: "#3B82F6" },
  { value: "technical", label: "Technical", color: "#8B5CF6" },
  { value: "process", label: "Process", color: "#10B981" },
  { value: "resource", label: "Resource", color: "#F59E0B" },
  { value: "budget", label: "Budget", color: "#EF4444" },
  { value: "scope", label: "Scope", color: "#6366F1" },
];

const STATUSES = [
  { value: "proposed", label: "Proposed", color: "#9CA3AF" },
  { value: "under_review", label: "Under Review", color: "#F59E0B" },
  { value: "decided", label: "Decided", color: "#10B981" },
  { value: "superseded", label: "Superseded", color: "#6B7280" },
];

const ESCALATION_LEVELS = [
  { value: "work_stream_lead", label: "Work Stream Lead", color: "#93C5FD" },
  { value: "work_stream", label: "Work Stream", color: "#60A5FA" },
  { value: "steering_committee", label: "Steering Committee", color: "#F97316" },
  { value: "executive_committee", label: "Executive Committee", color: "#EF4444" },
];

const RACI_ROLES = ["responsible", "accountable", "consulted", "informed"] as const;

const RACI_LABELS: Record<string, string> = {
  responsible: "Responsible",
  accountable: "Accountable",
  consulted: "Consulted",
  informed: "Informed",
};

const RACI_COLORS: Record<string, string> = {
  responsible: "#3B82F6",
  accountable: "#EF4444",
  consulted: "#F59E0B",
  informed: "#6B7280",
};

function getCategoryColor(category: string) {
  return CATEGORIES.find((c) => c.value === category)?.color || "#9CA3AF";
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || "#9CA3AF";
}

function getEscalationColor(level: string) {
  return ESCALATION_LEVELS.find((e) => e.value === level)?.color || "#9CA3AF";
}

function getEscalationLabel(level: string) {
  return ESCALATION_LEVELS.find((e) => e.value === level)?.label || level;
}

function getCategoryLabel(category: string) {
  return CATEGORIES.find((c) => c.value === category)?.label || category;
}

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

function getUserInitials(user: User) {
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  if (first || last) return (first + last).toUpperCase();
  return (user.email?.[0] || "?").toUpperCase();
}

function getUserDisplayName(user: User) {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  return user.email || "Unknown User";
}

const emptyForm = {
  title: "",
  description: "",
  category: "strategic",
  status: "proposed",
  escalationLevel: "work_stream_lead",
  strategyId: "",
  dueDate: "",
  decisionDate: "",
  outcome: "",
  rationale: "",
  impactNotes: "",
};

export default function DecisionLog() {
  const { canEditProjects, canManageUsers } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [raciAssignments, setRaciAssignments] = useState<RaciAssignment[]>([]);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [escalationFilter, setEscalationFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");

  const { data: decisions, isLoading } = useQuery<Decision[]>({
    queryKey: ["/api/decisions"],
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/decisions", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });
      toast({ title: "Success", description: "Decision created successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create decision", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/decisions/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });
      toast({ title: "Success", description: "Decision updated successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update decision", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/decisions/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });
      toast({ title: "Success", description: "Decision deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete decision", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDecision(null);
    setForm({ ...emptyForm });
    setRaciAssignments([]);
  };

  const openCreate = () => {
    setEditingDecision(null);
    setForm({ ...emptyForm });
    setRaciAssignments([]);
    setIsDialogOpen(true);
  };

  const openEdit = async (decision: Decision) => {
    setEditingDecision(decision);
    setForm({
      title: decision.title || "",
      description: decision.description || "",
      category: decision.category || "strategic",
      status: decision.status || "proposed",
      escalationLevel: decision.escalationLevel || "work_stream_lead",
      strategyId: decision.strategyId || "",
      dueDate: decision.dueDate ? format(new Date(decision.dueDate), "yyyy-MM-dd") : "",
      decisionDate: decision.decisionDate ? format(new Date(decision.decisionDate), "yyyy-MM-dd") : "",
      outcome: decision.outcome || "",
      rationale: decision.rationale || "",
      impactNotes: decision.impactNotes || "",
    });

    try {
      const res = await fetch(`/api/decisions/${decision.id}`, { credentials: "include" });
      if (res.ok) {
        const detail = await res.json();
        setRaciAssignments(
          (detail.raciAssignments || []).map((ra: any) => ({
            userId: ra.userId,
            role: ra.role,
          }))
        );
      }
    } catch {
      setRaciAssignments([]);
    }

    setIsDialogOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    setForm((prev) => {
      const updates: any = { ...prev, status: newStatus };
      if (newStatus === "decided" && !prev.decisionDate) {
        updates.decisionDate = format(new Date(), "yyyy-MM-dd");
      }
      return updates;
    });
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      status: form.status,
      escalationLevel: form.escalationLevel || null,
      strategyId: form.strategyId || null,
      dueDate: form.dueDate || null,
      decisionDate: form.decisionDate || null,
      outcome: form.outcome.trim() || null,
      rationale: form.rationale.trim() || null,
      impactNotes: form.impactNotes.trim() || null,
      raciAssignments,
    };

    if (editingDecision) {
      updateMutation.mutate({ id: editingDecision.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addRaciUser = (role: string, userId: string) => {
    if (raciAssignments.some((ra) => ra.userId === userId && ra.role === role)) return;
    setRaciAssignments((prev) => [...prev, { userId, role: role as RaciAssignment["role"] }]);
  };

  const removeRaciUser = (role: string, userId: string) => {
    setRaciAssignments((prev) => prev.filter((ra) => !(ra.userId === userId && ra.role === role)));
  };

  const filteredDecisions = (decisions || []).filter((d) => {
    if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (escalationFilter !== "all" && d.escalationLevel !== escalationFilter) return false;
    if (strategyFilter !== "all" && d.strategyId !== strategyFilter) return false;
    return true;
  });

  const sortedDecisions = [...filteredDecisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const canEdit = canEditProjects();
  const canDelete = canManageUsers();

  if (isLoading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "#86868B" }}>Loading decisions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="px-6 py-5"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "#5856D6" }}
              >
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1D1D1F" }}>
                  Decision Log
                </h1>
                <p style={{ color: "#86868B" }}>
                  Track and manage organizational decisions
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-full px-5"
                style={{ backgroundColor: "#007AFF" }}
              >
                <Plus className="w-4 h-4" />
                New Decision
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={escalationFilter} onValueChange={setEscalationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Escalation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {ESCALATION_LEVELS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {(strategies || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorCode }} />
                        {s.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(categoryFilter !== "all" || statusFilter !== "all" || escalationFilter !== "all" || strategyFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    setEscalationFilter("all");
                    setStrategyFilter("all");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {sortedDecisions.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No decisions yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Get started by logging your first decision.
                    </p>
                    {canEdit && (
                      <Button
                        onClick={openCreate}
                        className="flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Create Decision
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedDecisions.map((decision) => {
                  const strategy = (strategies || []).find((s) => s.id === decision.strategyId);
                  const raciUsers = decision.raciAssignments || [];

                  return (
                    <Card
                      key={decision.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openEdit(decision)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="flex items-center gap-3 mb-2">
                              <span className="text-xl truncate">{decision.title}</span>
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge
                                style={{
                                  backgroundColor: getCategoryColor(decision.category) + "20",
                                  color: getCategoryColor(decision.category),
                                  borderColor: getCategoryColor(decision.category),
                                }}
                                variant="outline"
                              >
                                {getCategoryLabel(decision.category)}
                              </Badge>
                              <Badge
                                style={{
                                  backgroundColor: getStatusColor(decision.status) + "20",
                                  color: getStatusColor(decision.status),
                                  borderColor: getStatusColor(decision.status),
                                }}
                                variant="outline"
                              >
                                {getStatusLabel(decision.status)}
                              </Badge>
                              {decision.escalationLevel && (
                                <Badge
                                  style={{
                                    backgroundColor: getEscalationColor(decision.escalationLevel) + "20",
                                    color: getEscalationColor(decision.escalationLevel),
                                    borderColor: getEscalationColor(decision.escalationLevel),
                                  }}
                                  variant="outline"
                                >
                                  {getEscalationLabel(decision.escalationLevel)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(decision)}
                                className="flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Decision</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{decision.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(decision.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {decision.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {decision.description.length > 100
                                ? decision.description.slice(0, 100) + "..."
                                : decision.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {decision.status === "decided" && decision.decisionDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Decided {format(new Date(decision.decisionDate), "MMM dd, yyyy")}</span>
                              </div>
                            )}
                            {decision.status !== "decided" && decision.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Due {format(new Date(decision.dueDate), "MMM dd, yyyy")}</span>
                              </div>
                            )}
                            {strategy && (
                              <div className="flex items-center gap-1">
                                <Target className="w-3.5 h-3.5" />
                                <span>{strategy.title}</span>
                              </div>
                            )}
                          </div>

                          {raciUsers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <div className="flex items-center gap-1 flex-wrap">
                                {RACI_ROLES.map((role) => {
                                  const assigned = raciUsers.filter((ra) => ra.role === role);
                                  if (assigned.length === 0) return null;
                                  return (
                                    <div key={role} className="flex items-center gap-1 mr-2">
                                      <span
                                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                        style={{
                                          backgroundColor: RACI_COLORS[role] + "20",
                                          color: RACI_COLORS[role],
                                        }}
                                      >
                                        {role[0].toUpperCase()}
                                      </span>
                                      {assigned.map((ra) => {
                                        const user = (users || []).find((u) => u.id === ra.userId);
                                        if (!user) return null;
                                        return (
                                          <span
                                            key={ra.userId}
                                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: RACI_COLORS[role] }}
                                            title={`${getUserDisplayName(user)} (${RACI_LABELS[role]})`}
                                          >
                                            {getUserInitials(user)}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              {editingDecision ? "Edit Decision" : "New Decision"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-5 p-1">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Decision title"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the decision..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Category
                  </label>
                  <Select value={form.category} onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Status
                  </label>
                  <Select value={form.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Escalation Level
                  </label>
                  <Select
                    value={form.escalationLevel}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, escalationLevel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESCALATION_LEVELS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
                            {e.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Linked Strategy
                  </label>
                  <Select
                    value={form.strategyId || "none"}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, strategyId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Strategy</SelectItem>
                      {(strategies || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorCode }} />
                            {s.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Decision Date
                  </label>
                  <Input
                    type="date"
                    value={form.decisionDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, decisionDate: e.target.value }))}
                  />
                </div>
              </div>

              {(form.status === "decided" || form.status === "superseded") && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Outcome
                  </label>
                  <Textarea
                    value={form.outcome}
                    onChange={(e) => setForm((prev) => ({ ...prev, outcome: e.target.value }))}
                    placeholder="What was the outcome?"
                    rows={2}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Why was this decided?
                </label>
                <Textarea
                  value={form.rationale}
                  onChange={(e) => setForm((prev) => ({ ...prev, rationale: e.target.value }))}
                  placeholder="Rationale for this decision..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Impact Notes
                </label>
                <Textarea
                  value={form.impactNotes}
                  onChange={(e) => setForm((prev) => ({ ...prev, impactNotes: e.target.value }))}
                  placeholder="Expected impact..."
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  RACI Assignments
                </h4>
                <div className="space-y-4">
                  {RACI_ROLES.map((role) => {
                    const assignedUsers = raciAssignments
                      .filter((ra) => ra.role === role)
                      .map((ra) => (users || []).find((u) => u.id === ra.userId))
                      .filter(Boolean) as User[];

                    const availableUsers = (users || []).filter(
                      (u) => !raciAssignments.some((ra) => ra.userId === u.id && ra.role === role)
                    );

                    return (
                      <div key={role}>
                        <label className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: RACI_COLORS[role] }}
                          >
                            {role[0].toUpperCase()}
                          </span>
                          {RACI_LABELS[role]}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {assignedUsers.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium text-white mr-1"
                                style={{ backgroundColor: RACI_COLORS[role] }}
                              >
                                {getUserInitials(user)}
                              </span>
                              {getUserDisplayName(user)}
                              <button
                                type="button"
                                onClick={() => removeRaciUser(role, user.id)}
                                className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {availableUsers.length > 0 && (
                          <Select onValueChange={(userId) => addRaciUser(role, userId)} value="">
                            <SelectTrigger className="w-[240px]">
                              <SelectValue placeholder="Add user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {getUserDisplayName(u)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{ backgroundColor: "#007AFF" }}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingDecision
                    ? "Save Changes"
                    : "Create Decision"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
