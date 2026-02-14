import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Inbox,
  Eye,
  Filter,
  Mail,
  User,
  Calendar,
  Tag,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { IntakeSubmission, IntakeForm, Strategy, Project } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", className: "bg-yellow-100 text-yellow-700" },
  assigned: { label: "Assigned", className: "bg-green-100 text-green-700" },
  dismissed: { label: "Dismissed", className: "bg-gray-100 text-gray-700" },
};

function getFieldLabel(formFields: any[], fieldId: string): string {
  if (!formFields || !Array.isArray(formFields)) return fieldId;
  const field = formFields.find((f: any) => f.id === fieldId);
  return field?.label || field?.name || fieldId;
}

function parseJsonSafe(str: string | null | undefined, fallback: any = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default function IntakeSubmissions() {
  const { currentRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formFilter, setFormFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignStrategyId, setAssignStrategyId] = useState<string>("");
  const [assignProjectId, setAssignProjectId] = useState<string>("");

  const canAccess = currentRole === "administrator" || currentRole === "co_lead";

  const { data: submissions, isLoading: submissionsLoading } = useQuery<IntakeSubmission[]>({
    queryKey: ["/api/intake-submissions"],
    enabled: canAccess,
  });

  const { data: forms } = useQuery<IntakeForm[]>({
    queryKey: ["/api/intake-forms"],
    enabled: canAccess,
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
    enabled: canAccess,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: canAccess,
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/intake-submissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake-submissions"] });
      toast({ title: "Success", description: "Submission updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update submission", variant: "destructive" });
    },
  });

  const formsMap = useMemo(() => {
    const map = new Map<string, IntakeForm>();
    forms?.forEach((f) => map.set(f.id, f));
    return map;
  }, [forms]);

  const strategiesMap = useMemo(() => {
    const map = new Map<string, Strategy>();
    strategies?.forEach((s) => map.set(s.id, s));
    return map;
  }, [strategies]);

  const projectsMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects?.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const filteredSubmissions = useMemo(() => {
    let result = submissions || [];
    if (formFilter !== "all") {
      result = result.filter((s) => s.formId === formFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [submissions, formFilter, statusFilter]);

  const filteredProjects = useMemo(() => {
    if (!assignStrategyId || !projects) return [];
    return projects.filter((p) => p.strategyId === assignStrategyId);
  }, [assignStrategyId, projects]);

  const handleViewSubmission = (submission: IntakeSubmission) => {
    setSelectedSubmission(submission);
    setAssignStrategyId(submission.assignedStrategyId || "");
    setAssignProjectId(submission.assignedProjectId || "");
    setIsDetailOpen(true);
  };

  const handleStatusChange = (status: string) => {
    if (!selectedSubmission) return;
    updateSubmissionMutation.mutate(
      { id: selectedSubmission.id, data: { status } },
      {
        onSuccess: () => {
          setSelectedSubmission((prev) => prev ? { ...prev, status } : null);
          queryClient.invalidateQueries({ queryKey: ["/api/intake-submissions"] });
          toast({ title: "Success", description: "Status updated" });
        },
      }
    );
  };

  const handleAssign = () => {
    if (!selectedSubmission || !assignStrategyId) return;
    const data: Record<string, unknown> = {
      status: "assigned",
      assignedStrategyId: assignStrategyId,
    };
    if (assignProjectId) {
      data.assignedProjectId = assignProjectId;
    }
    updateSubmissionMutation.mutate(
      { id: selectedSubmission.id, data },
      {
        onSuccess: () => {
          setSelectedSubmission((prev) =>
            prev
              ? {
                  ...prev,
                  status: "assigned",
                  assignedStrategyId: assignStrategyId,
                  assignedProjectId: assignProjectId || null,
                }
              : null
          );
          queryClient.invalidateQueries({ queryKey: ["/api/intake-submissions"] });
          toast({ title: "Success", description: "Submission assigned successfully" });
        },
      }
    );
  };

  if (!canAccess) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                You do not have permission to view this page. Only Administrators and Co-Leads can manage intake submissions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submissionsLoading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "#86868B" }}>Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedForm = selectedSubmission ? formsMap.get(selectedSubmission.formId) : null;
  const selectedFormFields = parseJsonSafe(selectedForm?.fields, []);
  const selectedSubmissionData = selectedSubmission ? parseJsonSafe(selectedSubmission.data, {}) : {};

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
                <Inbox className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1D1D1F" }}>
                  Intake Submissions
                </h1>
                <p style={{ color: "#86868B" }}>
                  Review and manage form submissions
                </p>
              </div>
            </div>
            <div className="text-sm" style={{ color: "#86868B" }}>
              {filteredSubmissions.length} of {submissions?.length || 0} submissions
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Filter by form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {forms?.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
              {(formFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No submissions yet
                    </h3>
                    <p className="text-gray-600">
                      Share your intake forms to start receiving responses.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form</TableHead>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const form = formsMap.get(submission.formId);
                      const strategy = submission.assignedStrategyId
                        ? strategiesMap.get(submission.assignedStrategyId)
                        : null;
                      const project = submission.assignedProjectId
                        ? projectsMap.get(submission.assignedProjectId)
                        : null;
                      const status = statusConfig[submission.status] || statusConfig.new;

                      return (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">
                            {form?.title || "Unknown Form"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {submission.submitterName && (
                                <span className="flex items-center gap-1 text-sm">
                                  <User className="w-3 h-3 text-gray-400" />
                                  {submission.submitterName}
                                </span>
                              )}
                              {submission.submitterEmail && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  {submission.submitterEmail}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              {submission.submittedAt
                                ? format(new Date(submission.submittedAt), "MMM dd, yyyy")
                                : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.className}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {strategy ? (
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1 text-sm">
                                  <Tag className="w-3 h-3 text-gray-400" />
                                  {strategy.title}
                                </span>
                                {project && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <ArrowRight className="w-3 h-3" />
                                    {project.title}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSubmission(submission)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </main>
      </div>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedSubmission(null);
            setAssignStrategyId("");
            setAssignProjectId("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              Submission Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedSubmission && (
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Form</p>
                    <p className="text-sm font-medium">{selectedForm?.title || "Unknown Form"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submitted</p>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {selectedSubmission.submittedAt
                        ? format(new Date(selectedSubmission.submittedAt), "MMMM d, yyyy 'at' h:mm a")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedSubmission.submitterName && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</p>
                      <p className="text-sm flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        {selectedSubmission.submitterName}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.submitterEmail && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {selectedSubmission.submitterEmail}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={statusConfig[selectedSubmission.status]?.className || ""}
                    >
                      {statusConfig[selectedSubmission.status]?.label || selectedSubmission.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Submitted Data
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {Object.keys(selectedSubmissionData).length === 0 ? (
                      <p className="text-sm text-gray-500">No data submitted.</p>
                    ) : (
                      Object.entries(selectedSubmissionData).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs font-medium text-gray-500">
                            {getFieldLabel(selectedFormFields, key)}
                          </p>
                          <p className="text-sm text-gray-900 mt-0.5">
                            {typeof value === "object" ? JSON.stringify(value) : String(value || "—")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Assignment
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Strategy</label>
                      <Select value={assignStrategyId} onValueChange={(val) => {
                        setAssignStrategyId(val);
                        setAssignProjectId("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: s.colorCode }}
                                />
                                {s.title}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {assignStrategyId && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Project (optional)
                        </label>
                        <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProjects.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                No projects for this strategy
                              </SelectItem>
                            ) : (
                              filteredProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.title}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      onClick={handleAssign}
                      disabled={!assignStrategyId || updateSubmissionMutation.isPending}
                      className="w-full"
                      style={{ backgroundColor: "#34C759" }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Assign
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Quick Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("under_review")}
                      disabled={
                        selectedSubmission.status === "under_review" ||
                        updateSubmissionMutation.isPending
                      }
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Mark as Under Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("dismissed")}
                      disabled={
                        selectedSubmission.status === "dismissed" ||
                        updateSubmissionMutation.isPending
                      }
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
