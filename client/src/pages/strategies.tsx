import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { StrategyCard } from "@/components/cards/strategy-card";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

export default function Strategies() {
  const { currentRole } = useRole();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  // Enhance strategies with tactics
  const strategiesWithTactics = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    tactics: (tactics as any[])?.filter((tactic: any) => tactic.strategyId === strategy.id) || []
  })) || [];

  // Filter strategies
  const filteredStrategies = strategiesWithTactics.filter((strategy: any) => {
    const matchesSearch = strategy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || strategy.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTactic = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setIsCreateTacticOpen(true);
  };

  if (strategiesLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Strategies</h2>
              <p className="text-gray-600 mt-1">
                Manage and track strategic initiatives
              </p>
            </div>
            {currentRole === 'executive' && (
              <Button onClick={() => setIsCreateStrategyOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Strategy
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search strategies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="p-6">
          {filteredStrategies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first strategy"}
              </p>
              {currentRole === 'executive' && !searchTerm && statusFilter === "all" && (
                <Button onClick={() => setIsCreateStrategyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategy
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredStrategies.map((strategy: any) => (
                <div key={strategy.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {strategy.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {strategy.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Start:</span>
                      <span className="ml-2">
                        {new Date(strategy.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Target:</span>
                      <span className="ml-2">
                        {new Date(strategy.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Metrics:</span>
                      <span className="ml-2">{strategy.metrics}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {strategy.tactics.length} tactics
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCreateTactic(strategy.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Tactic
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateStrategyModal
        open={isCreateStrategyOpen}
        onOpenChange={setIsCreateStrategyOpen}
      />
      <CreateTacticModal
        open={isCreateTacticOpen}
        onOpenChange={setIsCreateTacticOpen}
        strategyId={selectedStrategyId}
      />
    </div>
  );
}
