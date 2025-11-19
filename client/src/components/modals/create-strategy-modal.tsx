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

interface CreateStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStrategyModal({ open, onOpenChange }: CreateStrategyModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Define the strategic goal and desired outcome"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
