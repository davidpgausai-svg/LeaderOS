import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStrategySchema, type InsertStrategy } from "@shared/schema";
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
import { Sparkles, Loader2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStrategyModal({ open, onOpenChange }: CreateStrategyModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<InsertStrategy>({
    resolver: zodResolver(insertStrategySchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      startDate: new Date(),
      targetDate: new Date(),
      metrics: "",
      status: "active",
      colorCode: "#3B82F6",
      createdBy: currentUser?.id || "1",
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

  const createStrategyMutation = useMutation({
    mutationFn: async (data: InsertStrategy) => {
      const response = await apiRequest("POST", "/api/strategies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Strategy created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create strategy",
        variant: "destructive",
      });
    },
  });

  const handleGenerateContinuum = async () => {
    const title = form.getValues("title");
    const description = form.getValues("description");
    const goal = form.getValues("goal");

    if (!title || !description || !goal) {
      toast({
        title: "Missing Information",
        description: "Please fill in Title, Description, and Objective before generating",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/strategies/generate-continuum", {
        title,
        description,
        goal,
      });
      const data = await response.json();

      if (!data.caseForChange || !data.visionStatement || !data.successMetrics || 
          !data.stakeholderMap || !data.readinessRating || !data.riskExposureRating || 
          !data.changeChampionAssignment || !data.reinforcementPlan || !data.benefitsRealizationPlan) {
        throw new Error("Incomplete data received from AI");
      }

      form.setValue("caseForChange", data.caseForChange);
      form.setValue("visionStatement", data.visionStatement);
      form.setValue("successMetrics", data.successMetrics);
      form.setValue("stakeholderMap", data.stakeholderMap);
      form.setValue("readinessRating", data.readinessRating);
      form.setValue("riskExposureRating", data.riskExposureRating);
      form.setValue("changeChampionAssignment", data.changeChampionAssignment);
      form.setValue("reinforcementPlan", data.reinforcementPlan);
      form.setValue("benefitsRealizationPlan", data.benefitsRealizationPlan);

      toast({
        title: "Success",
        description: "Change Continuum fields generated successfully. You can edit them before submitting.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate Change Continuum fields. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = (data: InsertStrategy) => {
    createStrategyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Strategy</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter strategy title" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Describe the strategy and its objectives"
                      {...field}
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
                        <TooltipContent className="max-w-sm p-3">
                          <p className="text-sm">An Objective is a clear, qualitative, and time-bound strategic outcome that articulates the organization's intended direction of travel. It expresses the meaningful change we aim to create, provides a shared north star for decision-making, and anchors downstream execution across projects and actions.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Define the strategic objective and desired outcome"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center py-2">
              <Button
                type="button"
                onClick={handleGenerateContinuum}
                disabled={isGenerating}
                variant="outline"
                className="w-full md:w-auto"
                data-testid="button-generate-continuum"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Change Continuum...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Change Continuum with AI
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="metrics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success Metrics</FormLabel>
                  <FormControl>
                    <Input placeholder="How will success be measured?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Color</FormLabel>
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

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Continuum (Required)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete all fields to define the change management framework for this strategy.
              </p>

              <FormField
                control={form.control}
                name="caseForChange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case for Change *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Why is this change necessary?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vision Statement *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="What will success look like?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="successMetrics"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Success Metrics *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="How will we measure success?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stakeholderMap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stakeholder Map *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Who are the key stakeholders?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="readinessRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Readiness Rating (RAG) *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Red/Amber/Green assessment of organizational readiness"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskExposureRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Exposure Rating *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Assessment of risks and potential issues"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="changeChampionAssignment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Champion Assignment *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Who will champion this change?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reinforcementPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reinforcement Plan *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="How will we reinforce and sustain the change?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="benefitsRealizationPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefits Realization Plan *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="How will we realize and track benefits?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStrategyMutation.isPending}
              >
                {createStrategyMutation.isPending ? "Creating..." : "Create Strategy"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
