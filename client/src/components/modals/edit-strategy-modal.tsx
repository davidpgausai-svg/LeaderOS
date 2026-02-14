import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStrategySchema, type InsertStrategy, type Strategy } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Info, X, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BUILT_IN_SECTIONS = [
  { key: "caseForChange", label: "Case for Change", placeholder: "Why is this change necessary?" },
  { key: "visionStatement", label: "Vision Statement", placeholder: "What will success look like?" },
  { key: "successMetrics", label: "Success Metrics", placeholder: "How will we measure success?" },
  { key: "stakeholderMap", label: "Stakeholder Map", placeholder: "Who are the key stakeholders?" },
  { key: "readinessRating", label: "Readiness Rating (RAG)", placeholder: "Red/Amber/Green assessment" },
  { key: "riskExposureRating", label: "Risk Exposure Rating", placeholder: "Assessment of risks and potential issues" },
  { key: "changeChampionAssignment", label: "Change Champion Assignment", placeholder: "Who will champion this change?" },
  { key: "reinforcementPlan", label: "Reinforcement Plan", placeholder: "How will we reinforce and sustain the change?" },
  { key: "benefitsRealizationPlan", label: "Benefits Realization Plan", placeholder: "How will we realize and track benefits?" },
];

interface EditStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
}

export function EditStrategyModal({ open, onOpenChange, strategy }: EditStrategyModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [customSections, setCustomSections] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [addingCustomSection, setAddingCustomSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSectionValue, setNewSectionValue] = useState("");

  const form = useForm<InsertStrategy>({
    resolver: zodResolver(insertStrategySchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      startDate: null,
      targetDate: null,
      metrics: "",
      status: "active",
      colorCode: "#3B82F6",
      createdBy: currentUser?.id || "",
      caseForChange: "",
      visionStatement: "",
      successMetrics: "",
      stakeholderMap: "",
      readinessRating: "",
      riskExposureRating: "",
      changeChampionAssignment: "",
      reinforcementPlan: "",
      benefitsRealizationPlan: "",
    },
  });

  const predefinedColors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Red", value: "#EF4444" },
    { name: "Pink", value: "#EC4899" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Indigo", value: "#6366F1" },
  ];

  useEffect(() => {
    if (strategy && open) {
      form.reset({
        title: strategy.title,
        description: strategy.description,
        goal: strategy.goal || "",
        startDate: strategy.startDate ? new Date(strategy.startDate) : null,
        targetDate: strategy.targetDate ? new Date(strategy.targetDate) : null,
        metrics: strategy.metrics,
        status: strategy.status,
        colorCode: strategy.colorCode,
        createdBy: strategy.createdBy,
        caseForChange: strategy.caseForChange || "",
        visionStatement: strategy.visionStatement || "",
        successMetrics: strategy.successMetrics || "",
        stakeholderMap: strategy.stakeholderMap || "",
        readinessRating: strategy.readinessRating || "",
        riskExposureRating: strategy.riskExposureRating || "",
        changeChampionAssignment: strategy.changeChampionAssignment || "",
        reinforcementPlan: strategy.reinforcementPlan || "",
        benefitsRealizationPlan: strategy.benefitsRealizationPlan || "",
      });
      try {
        const hidden = JSON.parse(strategy.hiddenContinuumSections || "[]");
        setHiddenSections(new Set(Array.isArray(hidden) ? hidden : []));
      } catch {
        setHiddenSections(new Set());
      }
      try {
        const custom = JSON.parse(strategy.customContinuumSections || "[]");
        setCustomSections(
          Array.isArray(custom)
            ? custom.map((s: { label: string; value: string }) => ({ id: crypto.randomUUID(), label: s.label, value: s.value }))
            : []
        );
      } catch {
        setCustomSections([]);
      }
      setAddingCustomSection(false);
      setNewSectionLabel("");
      setNewSectionValue("");
    }
  }, [strategy, open, form]);

  const updateStrategyMutation = useMutation({
    mutationFn: async (data: InsertStrategy) => {
      if (!strategy) throw new Error("No strategy to update");
      const response = await apiRequest("PATCH", `/api/strategies/${strategy.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Priority updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Strategy update error:", error);
      toast({
        title: "Error", 
        description: "Failed to update priority",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertStrategy) => {
    updateStrategyMutation.mutate({
      ...data,
      hiddenContinuumSections: JSON.stringify(Array.from(hiddenSections)),
      customContinuumSections: JSON.stringify(customSections.map(s => ({ label: s.label, value: s.value }))),
    });
  };

  if (!strategy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Strategic Priority</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter priority title..." {...field} data-testid="input-edit-strategy-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the priority..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-edit-strategy-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Objective
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm p-3 z-[100]">
                              <p className="text-sm">An Objective is a clear, qualitative, and time-bound strategic outcome that articulates the organization's intended direction of travel. It expresses the meaningful change we aim to create, provides a shared north star for decision-making, and anchors downstream execution across projects and actions.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Increase revenue by 25%" {...field} value={field.value || ""} data-testid="input-edit-strategy-goal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Metrics and Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Metrics & Status</h3>
                
                <FormField
                  control={form.control}
                  name="metrics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Success Metrics *
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm p-3 z-[100]">
                              <p className="text-sm">A Success Metric is a quantitative, verifiable indicator that measures whether a strategic Objective has been achieved. It translates the organization's intended outcome into clear evidence of progress, enabling leaders to assess performance, validate impact, and course-correct in real time.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 25% revenue increase, 3 new markets" 
                          {...field} 
                          data-testid="input-edit-strategy-metrics"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-strategy-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>
                
                <FormField
                  control={form.control}
                  name="colorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Color</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => field.onChange(color.value)}
                                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                  field.value === color.value
                                    ? 'border-gray-900 dark:border-white scale-110'
                                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                                data-testid={`color-${color.value}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-custom-color"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              or choose a custom color
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Change Continuum */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Change Continuum (Required)</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingCustomSection(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Section
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete all fields to define the change management framework for this priority.
                </p>

                {BUILT_IN_SECTIONS.filter(section => !hiddenSections.has(section.key)).map(section => (
                  <FormField
                    key={section.key}
                    control={form.control}
                    name={section.key as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>{section.label}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setHiddenSections(prev => {
                                const next = new Set(prev);
                                next.add(section.key);
                                return next;
                              });
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder={section.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                {customSections.map(section => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {section.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomSections(prev => prev.filter(s => s.id !== section.id))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Textarea
                      rows={2}
                      value={section.value}
                      onChange={(e) => setCustomSections(prev => prev.map(s => s.id === section.id ? { ...s, value: e.target.value } : s))}
                    />
                  </div>
                ))}

                {addingCustomSection && (
                  <div className="space-y-3 border rounded-md p-3">
                    <Input
                      placeholder="Section label"
                      value={newSectionLabel}
                      onChange={(e) => setNewSectionLabel(e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Section content"
                      value={newSectionValue}
                      onChange={(e) => setNewSectionValue(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddingCustomSection(false);
                          setNewSectionLabel("");
                          setNewSectionValue("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (newSectionLabel.trim()) {
                            setCustomSections(prev => [...prev, { id: crypto.randomUUID(), label: newSectionLabel.trim(), value: newSectionValue }]);
                            setNewSectionLabel("");
                            setNewSectionValue("");
                            setAddingCustomSection(false);
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit-strategy"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateStrategyMutation.isPending}
                data-testid="button-save-strategy"
              >
                {updateStrategyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}