import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  User,
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Users,
  Trash2,
  Save,
  Moon,
  Sun,
  Globe,
  GripVertical,
  Target,
  ChevronDown,
  FileText,
  Plus,
  Link,
  RefreshCw,
  Copy,
  Check,
  Building2,
  CalendarDays,
  Star,
  LayoutGrid,
} from "lucide-react";
import type { TemplateType, Organization, ExecutiveGoal, TeamTag, PtoEntry, Holiday } from "@shared/schema";
import { Pencil, X, Hash } from "lucide-react";

interface UserStrategyRowProps {
  user: any;
  strategies: any[];
  currentUserId: string;
  teamTags: TeamTag[];
  onRoleChange: (userId: string, newRole: string) => void;
  onStrategyToggle: (userId: string, strategyId: string, isAssigned: boolean) => void;
  onDelete: (userId: string, userName: string) => void;
  onCapacityUpdate: (userId: string, fte: string, salary: number | null, serviceDeliveryHours: string) => void;
  onTeamTagsUpdate: (userId: string, tagIds: string[], primaryTagId?: string) => void;
}

function UserStrategyRow({ user, strategies, currentUserId, teamTags, onRoleChange, onStrategyToggle, onDelete, onCapacityUpdate, onTeamTagsUpdate }: UserStrategyRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCapacityOpen, setIsCapacityOpen] = useState(false);
  const [fteValue, setFteValue] = useState(user.fte || '1.0');
  const [salaryValue, setSalaryValue] = useState(user.salary?.toString() || '');
  const [serviceDeliveryValue, setServiceDeliveryValue] = useState(user.serviceDeliveryHours || '0');
  
  // Fetch user's current team tag assignments
  const { data: userTeamTagAssignments } = useQuery<{id: string; userId: string; teamTagId: string; organizationId: string; isPrimary: boolean}[]>({
    queryKey: ['/api/users', user.id, 'team-tags'],
  });
  
  const [selectedTeamTagIds, setSelectedTeamTagIds] = useState<string[]>([]);
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(null);
  
  // Reset selected tags when popover opens (to get fresh data)
  React.useEffect(() => {
    if (isCapacityOpen && userTeamTagAssignments) {
      setSelectedTeamTagIds(userTeamTagAssignments.map(a => a.teamTagId));
      const primary = userTeamTagAssignments.find(a => a.isPrimary);
      setPrimaryTagId(primary?.teamTagId || null);
    }
  }, [isCapacityOpen, userTeamTagAssignments]);
  
  // Also update when data first loads
  React.useEffect(() => {
    if (userTeamTagAssignments && !isCapacityOpen) {
      setSelectedTeamTagIds(userTeamTagAssignments.map(a => a.teamTagId));
      const primary = userTeamTagAssignments.find(a => a.isPrimary);
      setPrimaryTagId(primary?.teamTagId || null);
    }
  }, [userTeamTagAssignments]);
  
  const { data: userAssignments } = useQuery({
    queryKey: [`/api/users/${user.id}/strategy-assignments`],
    enabled: user.role !== 'administrator',
  });

  const assignedStrategyIds = React.useMemo(() => {
    if (user.role === 'administrator') return [];
    // Deduplicate strategy IDs to prevent counting duplicates
    const strategyIds = (userAssignments as any[] || []).map((a: any) => a.strategyId);
    return Array.from(new Set(strategyIds));
  }, [userAssignments, user.role]);

  const assignedCount = user.role === 'administrator' 
    ? strategies?.length || 0 
    : assignedStrategyIds.length;

  return (
    <div 
      className="flex flex-col p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      data-testid={`admin-user-item-${user.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {user.firstName?.[0] || user.lastName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white" data-testid="text-admin-user-name">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email || 'Unknown User'
              }
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {user.role === 'administrator' 
                ? 'Full modification power over the app'
                : user.role === 'co_lead' 
                  ? 'Can edit tactics and actions for assigned strategies'
                  : user.role === 'sme'
                    ? 'Subject Matter Expert - Tracking only, cannot log in'
                    : 'View-only access to assigned strategies'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={
            user.role === 'administrator'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : user.role === 'co_lead' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                : user.role === 'sme'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }>
            {user.role === 'administrator' ? 'Administrator' : user.role === 'co_lead' ? 'Co-Lead' : user.role === 'sme' ? 'SME' : 'View'}
          </Badge>
          <Select 
            value={user.role} 
            onValueChange={(value) => onRoleChange(user.id, value)}
          >
            <SelectTrigger className="w-32" data-testid={`select-admin-user-role-${user.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="co_lead">Co-Lead</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="sme">SME (No Login)</SelectItem>
            </SelectContent>
          </Select>
          
          {/* FTE/Salary Edit Popover */}
          <Popover open={isCapacityOpen} onOpenChange={setIsCapacityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                data-testid={`button-edit-capacity-${user.id}`}
                title="Edit FTE & Salary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Capacity Settings</h4>
                <div className="space-y-2">
                  <Label htmlFor={`fte-${user.id}`} className="text-xs">
                    FTE (Full-Time Equivalent)
                  </Label>
                  <Input
                    id={`fte-${user.id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={fteValue}
                    onChange={(e) => setFteValue(e.target.value)}
                    placeholder="1.0"
                    data-testid={`input-fte-${user.id}`}
                  />
                  <p className="text-xs text-gray-500">1.0 = 40 hrs/week</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`salary-${user.id}`} className="text-xs">
                    Annual Salary ($)
                  </Label>
                  <Input
                    id={`salary-${user.id}`}
                    type="number"
                    min="0"
                    value={salaryValue}
                    onChange={(e) => setSalaryValue(e.target.value)}
                    placeholder="Optional"
                    data-testid={`input-salary-${user.id}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`service-delivery-${user.id}`} className="text-xs">
                    Service Delivery (hrs/week)
                  </Label>
                  <Input
                    id={`service-delivery-${user.id}`}
                    type="number"
                    step="0.5"
                    min="0"
                    max="40"
                    value={serviceDeliveryValue}
                    onChange={(e) => setServiceDeliveryValue(e.target.value)}
                    placeholder="0"
                    data-testid={`input-service-delivery-${user.id}`}
                  />
                  <p className="text-xs text-gray-500">Hours for meetings, IC work, etc.</p>
                </div>
                
                {/* Team Tags Multi-Select */}
                {teamTags && teamTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Team Tags</Label>
                    <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-gray-50 dark:bg-gray-900 max-h-32 overflow-y-auto">
                      {teamTags.map(tag => {
                        const isSelected = selectedTeamTagIds.includes(tag.id);
                        const isPrimary = primaryTagId === tag.id;
                        return (
                          <Badge
                            key={tag.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer transition-colors flex items-center gap-1"
                            style={isSelected ? { backgroundColor: tag.colorHex, borderColor: tag.colorHex } : { borderColor: tag.colorHex, color: tag.colorHex }}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTeamTagIds(prev => prev.filter(id => id !== tag.id));
                                if (isPrimary) {
                                  setPrimaryTagId(null);
                                }
                              } else {
                                setSelectedTeamTagIds(prev => [...prev, tag.id]);
                                if (!primaryTagId) {
                                  setPrimaryTagId(tag.id);
                                }
                              }
                            }}
                            data-testid={`team-tag-${tag.id}-${user.id}`}
                          >
                            {isPrimary && <Star className="h-3 w-3 fill-current" />}
                            {tag.name}
                            {isSelected && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">Click to toggle team assignments</p>
                    {selectedTeamTagIds.length > 1 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Primary Team (for capacity report)</Label>
                        <Select value={primaryTagId || ''} onValueChange={(val) => setPrimaryTagId(val)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select primary team" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTeamTagIds.map(tagId => {
                              const tag = teamTags.find(t => t.id === tagId);
                              return tag ? (
                                <SelectItem key={tag.id} value={tag.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.colorHex }} />
                                    {tag.name}
                                  </div>
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onCapacityUpdate(
                      user.id, 
                      fteValue, 
                      salaryValue ? parseInt(salaryValue) : null,
                      serviceDeliveryValue
                    );
                    const actualPrimaryId = primaryTagId && selectedTeamTagIds.includes(primaryTagId) 
                      ? primaryTagId 
                      : selectedTeamTagIds[0] || undefined;
                    onTeamTagsUpdate(user.id, selectedTeamTagIds, actualPrimaryId);
                    setIsCapacityOpen(false);
                  }}
                  data-testid={`button-save-capacity-${user.id}`}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={user.id === currentUserId}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                data-testid={`button-delete-user-${user.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(user.id, user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'this user')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {user.role !== 'administrator' && user.role !== 'sme' && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Assigned Strategies</Label>
              <Badge variant="outline" className="text-xs">
                {assignedCount} of {strategies?.length || 0}
              </Badge>
            </div>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-assign-strategies-${user.id}`}
                >
                  Manage Assignments
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Select Strategies</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Choose which strategies this user can access
                    </p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {strategies?.map((strategy: any) => {
                      const isAssigned = assignedStrategyIds.includes(strategy.id);
                      return (
                        <div 
                          key={strategy.id} 
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                        >
                          <Checkbox
                            id={`${user.id}-${strategy.id}`}
                            checked={isAssigned}
                            onCheckedChange={() => onStrategyToggle(user.id, strategy.id, isAssigned)}
                            data-testid={`checkbox-strategy-${strategy.id}-${user.id}`}
                          />
                          <label
                            htmlFor={`${user.id}-${strategy.id}`}
                            className="flex-1 text-sm cursor-pointer flex items-center space-x-2"
                          >
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: strategy.colorCode }}
                            />
                            <span>{strategy.title}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {assignedCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {strategies
                ?.filter((s: any) => assignedStrategyIds.includes(s.id))
                .map((strategy: any) => (
                  <Badge 
                    key={strategy.id}
                    variant="secondary"
                    className="text-xs"
                    style={{ borderLeft: `3px solid ${strategy.colorCode}` }}
                  >
                    {strategy.title}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TwoFactorSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isDisableMode, setIsDisableMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    setIsLoading(true);
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const response = await fetch("/api/auth/2fa/status", {
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
        setMaskedEmail(data.email);
      }
    } catch (error) {
      console.error("Failed to fetch 2FA status", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSetup = async () => {
    setIsSending(true);
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const response = await fetch("/api/auth/2fa/setup", {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      const data = await response.json();
      if (response.ok) {
        setIsSetupMode(true);
        toast({
          title: "Code sent",
          description: "A verification code has been sent to your email.",
        });
      } else {
        throw new Error(data.error || 'Failed to start setup');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start 2FA setup",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifySetup = async () => {
    setIsVerifying(true);
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const response = await fetch("/api/auth/2fa/verify-setup", {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsEnabled(true);
        setIsSetupMode(false);
        setVerificationCode("");
        toast({
          title: "2FA Enabled",
          description: "Two-factor authentication has been enabled for your account.",
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please check the code and try again",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async () => {
    setIsVerifying(true);
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const response = await fetch("/api/auth/2fa/disable", {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsEnabled(false);
        setIsDisableMode(false);
        setPassword("");
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled for your account.",
        });
      } else {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const cancelSetup = () => {
    setIsSetupMode(false);
    setVerificationCode("");
  };

  const cancelDisable = () => {
    setIsDisableMode(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <Card data-testid="card-2fa-settings">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-2fa-settings">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSetupMode && !isDisableMode ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {isEnabled ? 'Enabled' : 'Not enabled'}
                </p>
                <p className="text-sm text-gray-500">
                  {isEnabled 
                    ? `Verification codes are sent to ${maskedEmail || 'your email'}` 
                    : 'Add an extra layer of security to your account'
                  }
                </p>
              </div>
              <Badge variant={isEnabled ? "default" : "secondary"}>
                {isEnabled ? 'On' : 'Off'}
              </Badge>
            </div>

            {isEnabled ? (
              <Button 
                variant="outline" 
                onClick={() => setIsDisableMode(true)}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                data-testid="button-disable-2fa"
              >
                Disable Two-Factor Authentication
              </Button>
            ) : (
              <Button 
                onClick={startSetup}
                disabled={isSending}
                data-testid="button-enable-2fa"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable Two-Factor Authentication
                  </>
                )}
              </Button>
            )}
          </>
        ) : isSetupMode ? (
          <>
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm mb-4">
                We've sent a 6-digit verification code to your email. Enter it below to enable two-factor authentication.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">Verification Code</Label>
                  <Input
                    id="2fa-code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-xl tracking-widest"
                    data-testid="input-2fa-setup-code"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={verifySetup}
                    disabled={isVerifying || verificationCode.length !== 6}
                    data-testid="button-verify-2fa-setup"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Enable'
                    )}
                  </Button>
                  <Button variant="outline" onClick={cancelSetup} data-testid="button-cancel-2fa-setup">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm mb-4">
                To disable two-factor authentication, please enter your password to confirm.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="2fa-disable-password">Password</Label>
                  <Input
                    id="2fa-disable-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-2fa-disable-password"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive"
                    onClick={disable2FA}
                    disabled={isVerifying || !password}
                    data-testid="button-confirm-disable-2fa"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      'Disable 2FA'
                    )}
                  </Button>
                  <Button variant="outline" onClick={cancelDisable} data-testid="button-cancel-disable-2fa">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t dark:border-gray-700">
          <p className="text-xs text-gray-500">
            When enabled, you'll be asked to enter a verification code sent to your email each time you sign in.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}



function PtoSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingPto, setIsAddingPto] = useState(false);
  const [editingPto, setEditingPto] = useState<PtoEntry | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: ptoEntries = [], isLoading } = useQuery<PtoEntry[]>({
    queryKey: ['/api/users', userId, 'pto'],
    enabled: !!userId,
  });

  const createPtoMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/pto`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Time off added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'pto'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add time off", variant: "destructive" });
    },
  });

  const updatePtoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { startDate?: string; endDate?: string; notes?: string } }) => {
      const response = await apiRequest("PATCH", `/api/pto/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Time off updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'pto'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update time off", variant: "destructive" });
    },
  });

  const deletePtoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pto/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Time off deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'pto'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete time off", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsAddingPto(false);
    setEditingPto(null);
    setStartDate("");
    setEndDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Error", description: "Start date must be before end date", variant: "destructive" });
      return;
    }

    const data = { startDate, endDate, notes: notes || undefined };
    if (editingPto) {
      updatePtoMutation.mutate({ id: editingPto.id, data });
    } else {
      createPtoMutation.mutate(data);
    }
  };

  const startEdit = (entry: PtoEntry) => {
    setEditingPto(entry);
    setStartDate(new Date(entry.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(entry.endDate).toISOString().split('T')[0]);
    setNotes(entry.notes || "");
    setIsAddingPto(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card data-testid="card-pto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" />
            Time Off
          </div>
          {!isAddingPto && (
            <Button size="sm" onClick={() => setIsAddingPto(true)} data-testid="button-add-pto">
              <Plus className="h-4 w-4 mr-2" />
              Add Time Off
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingPto && (
          <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-pto-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-pto-end"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Vacation, Doctor's appointment"
                data-testid="input-pto-notes"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={createPtoMutation.isPending || updatePtoMutation.isPending}
                data-testid="button-save-pto"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingPto ? 'Update' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel-pto">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : ptoEntries.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No time off scheduled</p>
            <p className="text-sm">Click "Add Time Off" to schedule vacation or leave</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ptoEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800"
                data-testid={`pto-entry-${entry.id}`}
              >
                <div>
                  <p className="font-medium">
                    {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
                  </p>
                  {entry.notes && (
                    <p className="text-sm text-gray-500">{entry.notes}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(entry)}
                    data-testid={`button-edit-pto-${entry.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-pto-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Time Off</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this time off entry?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePtoMutation.mutate(entry.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HolidaysSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: { date: string; name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/holidays", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Holiday added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add holiday", variant: "destructive" });
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { date?: string; name?: string; description?: string } }) => {
      const response = await apiRequest("PATCH", `/api/holidays/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Holiday updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update holiday", variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Holiday deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete holiday", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsAddingHoliday(false);
    setEditingHoliday(null);
    setHolidayDate("");
    setHolidayName("");
    setHolidayDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      toast({ title: "Error", description: "Please enter a date and name for the holiday", variant: "destructive" });
      return;
    }

    const data = { date: holidayDate, name: holidayName.trim(), description: holidayDescription || undefined };
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data });
    } else {
      createHolidayMutation.mutate(data);
    }
  };

  const startEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayDate(new Date(holiday.date).toISOString().split('T')[0]);
    setHolidayName(holiday.name);
    setHolidayDescription(holiday.description || "");
    setIsAddingHoliday(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card data-testid="card-holidays">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Star className="mr-2 h-5 w-5 text-yellow-500" />
            Holidays
          </div>
          {!isAddingHoliday && (
            <Button size="sm" onClick={() => setIsAddingHoliday(true)} data-testid="button-add-holiday">
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Organization-wide holidays appear on all team members' calendars with a gold star.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingHoliday && (
          <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  data-testid="input-holiday-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., New Year's Day, Independence Day"
                  data-testid="input-holiday-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-description">Description (optional)</Label>
              <Input
                id="holiday-description"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                placeholder="e.g., Office closed"
                data-testid="input-holiday-description"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                data-testid="button-save-holiday"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingHoliday ? 'Update' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel-holiday">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : holidays.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Star className="h-12 w-12 mx-auto mb-2 opacity-50 text-yellow-400" />
            <p>No holidays scheduled</p>
            <p className="text-sm">Click "Add Holiday" to add organization-wide holidays</p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-700"
                data-testid={`holiday-entry-${holiday.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(holiday.date)}
                    </p>
                    {holiday.description && (
                      <p className="text-sm text-gray-400 dark:text-gray-500">{holiday.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(holiday)}
                    data-testid={`button-edit-holiday-${holiday.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-holiday-${holiday.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{holiday.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { currentRole, currentUser, setCurrentUser, canManageUsers } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [adminActiveTab, setAdminActiveTab] = useState("user-management");
  const [frameworkOrder, setFrameworkOrder] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    strategic: true,
    tactical: true,
    deadlines: true,
  });
  const [newTemplateTypeName, setNewTemplateTypeName] = useState("");
  const [newExecutiveGoalName, setNewExecutiveGoalName] = useState("");
  const [newExecutiveGoalDescription, setNewExecutiveGoalDescription] = useState("");
  const [editingExecutiveGoal, setEditingExecutiveGoal] = useState<ExecutiveGoal | null>(null);
  const [editedGoalName, setEditedGoalName] = useState("");
  const [editedGoalDescription, setEditedGoalDescription] = useState("");
  const [newTeamTagName, setNewTeamTagName] = useState("");
  const [newTeamTagColor, setNewTeamTagColor] = useState("#3B82F6");
  const [editingTeamTag, setEditingTeamTag] = useState<TeamTag | null>(null);
  const [editedTagName, setEditedTagName] = useState("");
  const [editedTagColor, setEditedTagColor] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [orgNameInput, setOrgNameInput] = useState("");

  const [wsSelectedStrategyId, setWsSelectedStrategyId] = useState("");
  const [wsNewName, setWsNewName] = useState("");
  const [wsNewLead, setWsNewLead] = useState("");
  const [wsShowAddForm, setWsShowAddForm] = useState(false);
  const [wsEditingId, setWsEditingId] = useState<string | null>(null);
  const [wsEditName, setWsEditName] = useState("");
  const [wsEditLead, setWsEditLead] = useState("");
  const [wsEditSortOrder, setWsEditSortOrder] = useState("");
  const [phNewName, setPhNewName] = useState("");
  const [phNewSequence, setPhNewSequence] = useState("");
  const [phNewPlannedStart, setPhNewPlannedStart] = useState("");
  const [phNewPlannedEnd, setPhNewPlannedEnd] = useState("");
  const [phShowAddForm, setPhShowAddForm] = useState(false);
  const [phEditingId, setPhEditingId] = useState<string | null>(null);
  const [phEditName, setPhEditName] = useState("");
  const [phEditSequence, setPhEditSequence] = useState("");
  const [phEditPlannedStart, setPhEditPlannedStart] = useState("");
  const [phEditPlannedEnd, setPhEditPlannedEnd] = useState("");

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: templateTypes = [] } = useQuery<TemplateType[]>({
    queryKey: ["/api/template-types"],
  });

  const { data: executiveGoals = [] } = useQuery<ExecutiveGoal[]>({
    queryKey: ["/api/executive-goals"],
    enabled: currentUser?.role === 'administrator',
  });

  const { data: teamTags = [] } = useQuery<TeamTag[]>({
    queryKey: ["/api/team-tags"],
    enabled: currentUser?.role === 'administrator',
  });

  const { data: orgInfo } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/organizations/current"],
    enabled: currentUser?.role === 'administrator',
  });

  const currentOrg: Organization | undefined = orgInfo ? orgInfo as Organization : undefined;

  const canAddUsers = true;

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

  const { data: workstreams = [], isLoading: wsLoading } = useQuery<Workstream[]>({
    queryKey: ['/api/workstreams', wsSelectedStrategyId],
    queryFn: async () => {
      const res = await fetch(`/api/workstreams?strategyId=${wsSelectedStrategyId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch workstreams');
      return res.json();
    },
    enabled: !!wsSelectedStrategyId,
  });

  const { data: phases = [], isLoading: phLoading } = useQuery<Phase[]>({
    queryKey: ['/api/phases', wsSelectedStrategyId],
    queryFn: async () => {
      const res = await fetch(`/api/phases?strategyId=${wsSelectedStrategyId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch phases');
      return res.json();
    },
    enabled: !!wsSelectedStrategyId,
  });

  const invalidateWorkstreamData = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && (
        key.startsWith('/api/workstreams') ||
        key.startsWith('/api/phases') ||
        key.startsWith('/api/workstream-tasks') ||
        key.startsWith('/api/workstream-calculations')
      );
    }});
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
  };

  const createWorkstreamMutation = useMutation({
    mutationFn: async (data: { strategyId: string; name: string; lead?: string }) => {
      const res = await apiRequest("POST", "/api/workstreams", data);
      if (!res.ok) throw new Error('Failed to create workstream');
      return res.json();
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      setWsNewName(""); setWsNewLead(""); setWsShowAddForm(false);
      toast({ title: "Success", description: "Workstream created" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const updateWorkstreamMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; lead?: string; sortOrder?: number }) => {
      const res = await apiRequest("PATCH", `/api/workstreams/${id}`, data);
      if (!res.ok) throw new Error('Failed to update workstream');
      return res.json();
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      setWsEditingId(null);
      toast({ title: "Success", description: "Workstream updated" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const deleteWorkstreamMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/workstreams/${id}`);
      if (!res.ok) throw new Error('Failed to delete workstream');
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      toast({ title: "Success", description: "Workstream deleted" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const createPhaseMutation = useMutation({
    mutationFn: async (data: { strategyId: string; name: string; sequence: number; plannedStart?: string; plannedEnd?: string }) => {
      const res = await apiRequest("POST", "/api/phases", data);
      if (!res.ok) throw new Error('Failed to create phase');
      return res.json();
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      setPhNewName(""); setPhNewSequence(""); setPhNewPlannedStart(""); setPhNewPlannedEnd(""); setPhShowAddForm(false);
      toast({ title: "Success", description: "Phase created" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; sequence?: number; plannedStart?: string; plannedEnd?: string }) => {
      const res = await apiRequest("PATCH", `/api/phases/${id}`, data);
      if (!res.ok) throw new Error('Failed to update phase');
      return res.json();
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      setPhEditingId(null);
      toast({ title: "Success", description: "Phase updated" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/phases/${id}`);
      if (!res.ok) throw new Error('Failed to delete phase');
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      toast({ title: "Success", description: "Phase deleted" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const seedProgramMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const res = await apiRequest("POST", "/api/workstreams/seed-program", { strategyId });
      if (!res.ok) throw new Error('Failed to seed program');
      return res.json();
    },
    onSuccess: () => {
      invalidateWorkstreamData();
      toast({ title: "Success", description: "ERP program defaults have been seeded" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  // Update organization name mutation
  const updateOrgNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("PATCH", "/api/organizations/name", { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization name');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      setEditingOrgName(false);
      toast({
        title: "Success",
        description: "Organization name updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize framework order when strategies load
  React.useEffect(() => {
    if (strategies) {
      const sortedStrategies = [...(strategies as any[])]
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setFrameworkOrder(sortedStrategies);
    }
  }, [strategies]);

  // Initialize org name input when organization data loads (only when not actively editing)
  React.useEffect(() => {
    if (currentOrg?.name && !editingOrgName) {
      setOrgNameInput(currentOrg.name);
    }
  }, [currentOrg?.name, editingOrgName]);

  // Fetch registration token when admin security tab is active
  React.useEffect(() => {
    if (adminActiveTab === "security" && canManageUsers() && !registrationToken) {
      fetchRegistrationToken();
    }
  }, [adminActiveTab]);

  const fetchRegistrationToken = async () => {
    setIsLoadingToken(true);
    try {
      const response = await apiRequest("GET", "/api/admin/registration-token");
      const data = await response.json();
      setRegistrationToken(data.token);
    } catch (error: any) {
      console.error("Failed to fetch registration token:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch registration token",
        variant: "destructive",
      });
    } finally {
      setIsLoadingToken(false);
    }
  };

  const rotateRegistrationToken = async () => {
    setIsRotatingToken(true);
    try {
      const response = await apiRequest("POST", "/api/admin/registration-token/rotate");
      const data = await response.json();
      setRegistrationToken(data.token);
      toast({
        title: "Success",
        description: "Registration link has been rotated. The old link is now invalid.",
      });
    } catch (error: any) {
      console.error("Failed to rotate registration token:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to rotate registration token",
        variant: "destructive",
      });
    } finally {
      setIsRotatingToken(false);
    }
  };

  const copyRegistrationUrl = async () => {
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register/${registrationToken}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast({
        title: "Copied!",
        description: "Registration link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("PATCH", `/api/users/${userData.id}`, userData);
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setCurrentUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const reorderFrameworksMutation = useMutation({
    mutationFn: async (strategyOrders: { id: string; displayOrder: number }[]) => {
      await apiRequest("POST", "/api/strategies/reorder", { strategyOrders });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Framework order updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update framework order",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const createTemplateTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/template-types", { name });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template category created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/template-types"] });
      setNewTemplateTypeName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template category",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/template-types/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template category deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/template-types"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template category",
        variant: "destructive",
      });
    },
  });

  const createExecutiveGoalMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/executive-goals", { name, description });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Executive Goal created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/executive-goals"] });
      setNewExecutiveGoalName("");
      setNewExecutiveGoalDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Executive Goal",
        variant: "destructive",
      });
    },
  });

  const updateExecutiveGoalMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const response = await apiRequest("PATCH", `/api/executive-goals/${id}`, { name, description });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Executive Goal updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/executive-goals"] });
      setEditingExecutiveGoal(null);
      setEditedGoalName("");
      setEditedGoalDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Executive Goal",
        variant: "destructive",
      });
    },
  });

  const deleteExecutiveGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/executive-goals/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Executive Goal deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/executive-goals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Executive Goal",
        variant: "destructive",
      });
    },
  });

  const createTeamTagMutation = useMutation({
    mutationFn: async ({ name, colorHex }: { name: string; colorHex: string }) => {
      const response = await apiRequest("POST", "/api/team-tags", { name, colorHex });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team Tag created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-tags"] });
      setNewTeamTagName("");
      setNewTeamTagColor("#3B82F6");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Team Tag",
        variant: "destructive",
      });
    },
  });

  const updateTeamTagMutation = useMutation({
    mutationFn: async ({ id, name, colorHex }: { id: string; name: string; colorHex: string }) => {
      const response = await apiRequest("PATCH", `/api/team-tags/${id}`, { name, colorHex });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team Tag updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-tags"] });
      setEditingTeamTag(null);
      setEditedTagName("");
      setEditedTagColor("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Team Tag",
        variant: "destructive",
      });
    },
  });

  const deleteTeamTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team-tags/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team Tag deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-tags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Team Tag",
        variant: "destructive",
      });
    },
  });

  const handleAddTemplateType = () => {
    const trimmedName = newTemplateTypeName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }
    
    const defaultCategories = ["Strategic Planning", "Project Management", "Daily Tasks"];
    const existingNames = [...defaultCategories, ...templateTypes.map(t => t.name.toLowerCase())];
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    createTemplateTypeMutation.mutate(trimmedName);
  };

  const handleAddExecutiveGoal = () => {
    const trimmedName = newExecutiveGoalName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a goal tag",
        variant: "destructive",
      });
      return;
    }
    
    const existingNames = executiveGoals.map(g => g.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "An Executive Goal with this tag already exists",
        variant: "destructive",
      });
      return;
    }
    
    createExecutiveGoalMutation.mutate({ 
      name: trimmedName, 
      description: newExecutiveGoalDescription.trim() || undefined 
    });
  };

  const handleEditExecutiveGoal = (goal: ExecutiveGoal) => {
    setEditingExecutiveGoal(goal);
    setEditedGoalName(goal.name);
    setEditedGoalDescription(goal.description || "");
  };

  const handleSaveExecutiveGoalEdit = () => {
    if (!editingExecutiveGoal) return;
    
    const trimmedName = editedGoalName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Goal tag cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const existingNames = executiveGoals
      .filter(g => g.id !== editingExecutiveGoal.id)
      .map(g => g.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "An Executive Goal with this tag already exists",
        variant: "destructive",
      });
      return;
    }
    
    updateExecutiveGoalMutation.mutate({ 
      id: editingExecutiveGoal.id, 
      name: trimmedName,
      description: editedGoalDescription.trim() || undefined
    });
  };

  const handleAddTeamTag = () => {
    const trimmedName = newTeamTagName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Team tag name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const existingNames = teamTags.map(t => t.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "A Team Tag with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    createTeamTagMutation.mutate({ 
      name: trimmedName, 
      colorHex: newTeamTagColor 
    });
  };

  const handleEditTeamTag = (tag: TeamTag) => {
    setEditingTeamTag(tag);
    setEditedTagName(tag.name);
    setEditedTagColor(tag.colorHex);
  };

  const handleSaveTeamTagEdit = () => {
    if (!editingTeamTag) return;
    
    const trimmedName = editedTagName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Team tag name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const existingNames = teamTags
      .filter(t => t.id !== editingTeamTag.id)
      .map(t => t.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "A Team Tag with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    updateTeamTagMutation.mutate({ 
      id: editingTeamTag.id, 
      name: trimmedName,
      colorHex: editedTagColor
    });
  };

  const isOrgAdministrator = () => {
    return currentUser?.role === 'administrator';
  };

  const handleProfileUpdate = (formData: FormData) => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const profileData = {
      id: currentUser.id,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: currentUser.email, // Keep existing email
      role: currentUser.role, // Keep existing role
      timezone: formData.get('timezone') as string,
    };
    updateUserMutation.mutate(profileData);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleCapacityUpdate = async (userId: string, fte: string, salary: number | null, serviceDeliveryHours: string) => {
    try {
      await apiRequest("PATCH", `/api/users/${userId}/capacity`, { fte, salary, serviceDeliveryHours });
      toast({
        title: "Success", 
        description: "User capacity updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user capacity",
        variant: "destructive",
      });
    }
  };

  const handleUserTeamTagsUpdate = async (userId: string, tagIds: string[], primaryTagId?: string) => {
    try {
      await apiRequest("PUT", `/api/users/${userId}/team-tags`, { tagIds, primaryTagId });
      toast({
        title: "Success",
        description: "Team tags updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'team-tags'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team tags",
        variant: "destructive",
      });
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest("PATCH", `/api/users/${userId}`, { role: newRole });
      toast({
        title: "Success", 
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    try {
      await apiRequest("DELETE", `/api/strategies/${strategyId}`);
      toast({
        title: "Success",
        description: "Priority deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete priority",
        variant: "destructive",
      });
    }
  };

  const flattenValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const escapeCSV = (value: any): string => {
    const str = flattenValue(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const STRATEGY_HEADERS = ['id', 'organizationId', 'name', 'description', 'status', 'progress', 'executiveGoalTag', 'color', 'archived', 'displayOrder', 'completionDate', 'createdBy'];
  const PROJECT_HEADERS = ['id', 'organizationId', 'strategyId', 'name', 'description', 'status', 'progress', 'startDate', 'dueDate', 'completionDate', 'communicationUrl', 'archived', 'createdBy'];
  const ACTION_HEADERS = ['id', 'organizationId', 'projectId', 'description', 'status', 'priority', 'startDate', 'dueDate', 'achievedDate', 'notes', 'archived', 'createdBy'];

  const convertToCSV = (data: any[], defaultHeaders?: string[]): string => {
    const headers = data.length > 0 ? Object.keys(data[0]) : (defaultHeaders || []);
    if (headers.length === 0) return '';
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => escapeCSV(row[header])).join(',')
      )
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

  const handleExportStrategies = async () => {
    try {
      const response = await fetch('/api/strategies', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch strategies');
      const data = await response.json();
      const timestamp = new Date().toISOString().split('T')[0];
      const csv = convertToCSV(data, STRATEGY_HEADERS);
      downloadCSV(csv, `priorities-export-${timestamp}.csv`);
      toast({
        title: "Success",
        description: `Exported ${data.length} priorities`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export priorities",
        variant: "destructive",
      });
    }
  };

  const handleExportProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      const timestamp = new Date().toISOString().split('T')[0];
      const csv = convertToCSV(data, PROJECT_HEADERS);
      downloadCSV(csv, `projects-export-${timestamp}.csv`);
      toast({
        title: "Success",
        description: `Exported ${data.length} projects`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export projects",
        variant: "destructive",
      });
    }
  };

  const handleExportAll = async () => {
    try {
      const [strategiesRes, projectsRes, actionsRes] = await Promise.all([
        fetch('/api/strategies', { credentials: 'include' }),
        fetch('/api/projects', { credentials: 'include' }),
        fetch('/api/actions', { credentials: 'include' }),
      ]);
      
      if (!strategiesRes.ok || !projectsRes.ok || !actionsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [strategies, projects, actions] = await Promise.all([
        strategiesRes.json(),
        projectsRes.json(),
        actionsRes.json(),
      ]);
      
      const timestamp = new Date().toISOString().split('T')[0];
      
      downloadCSV(convertToCSV(strategies, STRATEGY_HEADERS), `priorities-export-${timestamp}.csv`);
      setTimeout(() => downloadCSV(convertToCSV(projects, PROJECT_HEADERS), `projects-export-${timestamp}.csv`), 100);
      setTimeout(() => downloadCSV(convertToCSV(actions, ACTION_HEADERS), `actions-export-${timestamp}.csv`), 200);
      
      toast({
        title: "Success",
        description: `Exported ${strategies.length} priorities, ${projects.length} projects, and ${actions.length} actions as 3 CSV files`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const moveFramework = (fromIndex: number, toIndex: number) => {
    const updatedOrder = [...frameworkOrder];
    const [movedItem] = updatedOrder.splice(fromIndex, 1);
    updatedOrder.splice(toIndex, 0, movedItem);
    setFrameworkOrder(updatedOrder);
  };

  const saveFrameworkOrder = () => {
    const strategyOrders = frameworkOrder.map((framework, index) => ({
      id: framework.id,
      displayOrder: index
    }));
    reorderFrameworksMutation.mutate(strategyOrders);
  };

  const assignStrategyMutation = useMutation({
    mutationFn: async ({ userId, strategyId }: { userId: string; strategyId: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/strategy-assignments`, { strategyId });
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/strategy-assignments`] });
      toast({
        title: "Success",
        description: "Priority assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign priority",
        variant: "destructive",
      });
    },
  });

  const unassignStrategyMutation = useMutation({
    mutationFn: async ({ userId, strategyId }: { userId: string; strategyId: string }) => {
      await apiRequest("DELETE", `/api/users/${userId}/strategy-assignments/${strategyId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/strategy-assignments`] });
      toast({
        title: "Success",
        description: "Priority unassigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign priority",
        variant: "destructive",
      });
    },
  });

  const handleStrategyAssignmentToggle = async (userId: string, strategyId: string, isAssigned: boolean) => {
    if (isAssigned) {
      unassignStrategyMutation.mutate({ userId, strategyId });
    } else {
      assignStrategyMutation.mutate({ userId, strategyId });
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    toast({
      title: "Theme Updated",
      description: `Switched to ${!isDarkMode ? 'dark' : 'light'} mode`,
    });
  };

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
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#8E8E93' }}
            >
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Settings</h2>
              <p style={{ color: '#86868B' }}>
                {!activeTab.startsWith("admin") 
                  ? "Manage your personal preferences and profile settings"
                  : "Manage organization-wide settings and user permissions"
                }
              </p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Settings Layer Selector */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={!activeTab.startsWith("admin") ? "secondary" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className="flex-1"
                data-testid="button-user-settings"
              >
                <User className="w-4 h-4 mr-2" />
                User Settings
              </Button>
              {canManageUsers() && (
                <Button
                  variant={activeTab.startsWith("admin") ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("admin-user-management")}
                  className="flex-1"
                  data-testid="button-admin-settings"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Administrator Settings
                </Button>
              )}
            </div>
          </div>

          {/* User Settings */}
          {!activeTab.startsWith("admin") && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div 
                className="flex flex-wrap gap-2 p-2 rounded-2xl"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
              >
                {[
                  { value: 'profile', icon: User, label: 'Profile' },
                  { value: 'pto', icon: CalendarDays, label: 'Time Off' },
                  { value: 'notifications', icon: Bell, label: 'Notifications' },
                  { value: 'appearance', icon: Palette, label: 'Appearance' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
                        transition-all duration-200 ease-out
                        ${isActive ? 'shadow-sm' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'}
                      `}
                      style={{
                        backgroundColor: isActive ? 'var(--background)' : 'transparent',
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

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card data-testid="card-profile">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleProfileUpdate(formData);
                  }} className="space-y-4">
                    <div className="flex items-center space-x-6">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-lg">
                          {currentUser?.firstName?.[0] || currentUser?.lastName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          name="firstName"
                          defaultValue={currentUser?.firstName || ''}
                          data-testid="input-firstName"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          name="lastName"
                          defaultValue={currentUser?.lastName || ''}
                          data-testid="input-lastName"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email"
                        value={currentUser?.email || ''}
                        disabled
                        data-testid="input-email"
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                      <p className="text-sm text-gray-500">
                        Email cannot be changed after registration
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={currentUser?.role || 'co_lead'} disabled>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administrator">Administrator</SelectItem>
                          <SelectItem value="co_lead">Co-Lead</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Role changes must be made by an administrator
                      </p>
                    </div>

                    {currentRole === 'administrator' && (
                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span>Timezone</span>
                        </Label>
                        <Select 
                          name="timezone" 
                          defaultValue={currentUser?.timezone || 'America/Chicago'}
                        >
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                            <SelectItem value="America/Phoenix">Mountain Time - Arizona (MST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                            <SelectItem value="America/Anchorage">Alaska Time (AKST/AKDT)</SelectItem>
                            <SelectItem value="Pacific/Honolulu">Hawaii-Aleutian Time (HST)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">
                          Used to determine "today" on the Timeline
                        </p>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <TwoFactorSettings />
            </TabsContent>

            {/* PTO / Time Off */}
            <TabsContent value="pto" className="space-y-6">
              <PtoSettings userId={currentUser?.id || ''} />
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <Card data-testid="card-notifications">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch 
                        id="email-notifications"
                        checked={notifications.email}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email: checked }))
                        }
                        data-testid="switch-email-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Browser push notifications
                        </p>
                      </div>
                      <Switch 
                        id="push-notifications"
                        checked={notifications.push}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, push: checked }))
                        }
                        data-testid="switch-push-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="strategic-notifications">Strategic Updates</Label>
                        <p className="text-sm text-gray-500">
                          Strategy creation and milestone updates
                        </p>
                      </div>
                      <Switch 
                        id="strategic-notifications"
                        checked={notifications.strategic}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, strategic: checked }))
                        }
                        data-testid="switch-strategic-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="tactical-notifications">Tactical Updates</Label>
                        <p className="text-sm text-gray-500">
                          Tactic assignments and progress updates
                        </p>
                      </div>
                      <Switch 
                        id="tactical-notifications"
                        checked={notifications.tactical}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, tactical: checked }))
                        }
                        data-testid="switch-tactical-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="deadline-notifications">Deadline Alerts</Label>
                        <p className="text-sm text-gray-500">
                          Upcoming deadlines and overdue items
                        </p>
                      </div>
                      <Switch 
                        id="deadline-notifications"
                        checked={notifications.deadlines}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, deadlines: checked }))
                        }
                        data-testid="switch-deadline-notifications"
                      />
                    </div>
                  </div>

                  <Button data-testid="button-save-notifications">
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance */}
            <TabsContent value="appearance" className="space-y-6">
              <Card data-testid="card-appearance">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5" />
                    Appearance Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-sm text-gray-500">
                        Toggle dark mode interface
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <Switch 
                        id="dark-mode"
                        checked={isDarkMode}
                        onCheckedChange={toggleTheme}
                        data-testid="switch-dark-mode"
                      />
                      <Moon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern (EST)</SelectItem>
                        <SelectItem value="pst">Pacific (PST)</SelectItem>
                        <SelectItem value="gmt">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            </Tabs>
          )}

          {/* Administrator Settings */}
          {canManageUsers() && activeTab.startsWith("admin") && (
            <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab} className="space-y-6">
              <div 
                className="flex flex-wrap gap-2 p-2 rounded-2xl"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
              >
                {[
                  { value: 'organization', icon: Building2, label: 'Organization' },
                  { value: 'user-management', icon: Users, label: 'User Roles' },
                  { value: 'holidays', icon: Star, label: 'Holidays' },
                  { value: 'framework-management', icon: Target, label: 'Framework Order' },
                  { value: 'workstreams', icon: LayoutGrid, label: 'Workstreams' },
                  { value: 'security', icon: Shield, label: 'Security' },
                  { value: 'data', icon: SettingsIcon, label: 'Data Management' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = adminActiveTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setAdminActiveTab(tab.value)}
                      className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
                        transition-all duration-200 ease-out
                        ${isActive ? 'shadow-sm' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'}
                      `}
                      style={{
                        backgroundColor: isActive ? 'var(--background)' : 'transparent',
                        color: isActive ? '#007AFF' : '#86868B',
                      }}
                      data-testid={`tab-admin-${tab.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Organization Settings */}
              {(
                <TabsContent value="organization" className="space-y-6">
                  <Card data-testid="card-admin-organization">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Building2 className="mr-2 h-5 w-5" />
                        Organization Settings
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Manage your organization's name and settings. This name appears throughout the app and in communications.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Building2 className="h-5 w-5 text-gray-500" />
                            <div>
                              <Label className="text-sm text-gray-500">Organization Name</Label>
                              {editingOrgName ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    value={orgNameInput}
                                    onChange={(e) => setOrgNameInput(e.target.value)}
                                    placeholder="Enter organization name"
                                    className="max-w-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && orgNameInput.trim()) {
                                        updateOrgNameMutation.mutate(orgNameInput.trim());
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingOrgName(false);
                                      }
                                    }}
                                    data-testid="input-org-name"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrgNameMutation.mutate(orgNameInput.trim())}
                                    disabled={updateOrgNameMutation.isPending || !orgNameInput.trim()}
                                    data-testid="button-save-org-name"
                                  >
                                    {updateOrgNameMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingOrgName(false)}
                                    data-testid="button-cancel-org-name"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <p className="font-medium text-gray-900 dark:text-white text-lg">
                                  {currentOrg?.name || 'Your Organization'}
                                </p>
                              )}
                            </div>
                          </div>
                          {!editingOrgName && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOrgNameInput(currentOrg?.name || '');
                                setEditingOrgName(true);
                              }}
                              disabled={!currentOrg?.name}
                              data-testid="button-edit-org-name"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              {currentOrg?.name ? 'Edit' : 'Loading...'}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          The organization name is used for branding and appears in emails, invoices, and throughout the app.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Administrator User Management */}
              <TabsContent value="user-management" className="space-y-6">
                <Card data-testid="card-admin-user-management">
                  <CardHeader>
                    <div>
                      <CardTitle className="flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        User Role Management
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Manage user roles and strategy assignments. New users can register using the secret registration link found in the Security tab.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(users as any[])?.slice().sort((a: any, b: any) => 
                        (a.firstName || '').localeCompare(b.firstName || '')
                      ).map((user: any) => (
                        <UserStrategyRow
                          key={user.id}
                          user={user}
                          strategies={strategies as any[]}
                          currentUserId={currentUser?.id || ''}
                          teamTags={(teamTags as TeamTag[]) || []}
                          onRoleChange={handleUserRoleChange}
                          onStrategyToggle={handleStrategyAssignmentToggle}
                          onDelete={handleDeleteUser}
                          onCapacityUpdate={handleCapacityUpdate}
                          onTeamTagsUpdate={handleUserTeamTagsUpdate}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Holidays Management */}
              <TabsContent value="holidays" className="space-y-6">
                <HolidaysSettings />
              </TabsContent>

              {/* Strategy Management */}
              <TabsContent value="framework-management" className="space-y-6">
                <Card data-testid="card-admin-framework-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      Strategy Priority Order
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Set the display order for your strategies. The order you set here will be reflected 
                      across all pages including Dashboard, Strategies, Projects, and Actions. This helps establish 
                      organizational priority and focus for your strategic initiatives.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {frameworkOrder.map((framework, index) => (
                        <div 
                          key={framework.id} 
                          className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 transition-colors"
                          data-testid={`framework-item-${framework.id}`}
                          style={{ borderLeft: `4px solid ${framework.colorCode}` }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: framework.colorCode }}
                              />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{framework.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {framework.description.substring(0, 80)}...
                              </p>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Priority #{index + 1} • {framework.status}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFramework(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              data-testid={`button-move-up-${framework.id}`}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFramework(index, Math.min(frameworkOrder.length - 1, index + 1))}
                              disabled={index === frameworkOrder.length - 1}
                              data-testid={`button-move-down-${framework.id}`}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {frameworkOrder.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No strategic frameworks found.</p>
                          <p className="text-sm">Create frameworks on the Framework page to manage their display order.</p>
                        </div>
                      )}
                    </div>
                    
                    {frameworkOrder.length > 0 && (
                      <div className="mt-6 pt-4 border-t dark:border-gray-700">
                        <Button 
                          onClick={saveFrameworkOrder}
                          disabled={reorderFrameworksMutation.isPending}
                          data-testid="button-save-framework-order"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {reorderFrameworksMutation.isPending ? 'Saving...' : 'Save Framework Order'}
                        </Button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Changes will be reflected across Dashboard, Framework, Strategies, and Outcomes pages.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Administrator Security */}
              <TabsContent value="security" className="space-y-6">
                <Card data-testid="card-admin-security">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5" />
                      Security & Access Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className={`p-4 border rounded-lg ${canAddUsers ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800/50 opacity-75'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Link className={`h-5 w-5 ${canAddUsers ? 'text-blue-600' : 'text-gray-400'}`} />
                            <h4 className={`font-medium ${canAddUsers ? 'text-blue-800 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                              User Registration Link
                            </h4>
                          </div>
                          {!canAddUsers && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                              Team Plan Required
                            </Badge>
                          )}
                        </div>
                        {!canAddUsers && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Adding team members requires the Team plan. Upgrade to invite additional users to your organization.
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Share this secret link with people you want to grant access to the platform. 
                          The first person to register becomes an Administrator. All others become Co-Leads by default.
                        </p>
                        
                        {isLoadingToken ? (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Loading registration link...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-2 mb-4">
                              <Input
                                value={registrationToken ? `${window.location.origin}/register/${registrationToken}` : ''}
                                readOnly
                                className={`font-mono text-sm ${canAddUsers ? 'bg-white dark:bg-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
                                disabled={!canAddUsers}
                                data-testid="input-registration-url"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={copyRegistrationUrl}
                                disabled={!registrationToken}
                                className={!canAddUsers ? 'opacity-50' : ''}
                                data-testid="button-copy-registration-url"
                              >
                                {copiedToken ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`${canAddUsers ? 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950' : 'text-gray-400 border-gray-300'}`}
                                  disabled={isRotatingToken || !canAddUsers}
                                  data-testid="button-rotate-registration-token"
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isRotatingToken ? 'animate-spin' : ''}`} />
                                  {isRotatingToken ? 'Rotating...' : 'Rotate Registration Link'}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rotate Registration Link?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will create a new registration link and immediately invalidate the old one. 
                                    Anyone with the old link will no longer be able to register.
                                    <br /><br />
                                    Use this if the registration link was shared with unauthorized users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={rotateRegistrationToken}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Rotate Link
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>

                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            Security Status: Good
                          </span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          All security measures are active and up to date
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Password Requirements</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• Minimum 6 characters required</p>
                          <p>• Email must be a valid email address</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Session Management</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          User sessions expire after 7 days of inactivity
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Administrator Data Management */}
              <TabsContent value="data" className="space-y-6">
                <Card data-testid="card-admin-data-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <SettingsIcon className="mr-2 h-5 w-5" />
                      Organization Data Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Priority Cleanup</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Remove completed or outdated priorities to keep the organization's workspace clean.
                        </p>
                        <div className="space-y-2">
                          {(strategies as any[])?.filter((s: any) => s.status === 'completed').map((strategy: any) => (
                            <div key={strategy.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <span className="text-sm">{strategy.title}</span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" data-testid={`button-admin-delete-strategy-${strategy.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Priority</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{strategy.title}"? This action cannot be undone and will affect all associated projects.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStrategy(strategy.id)}>
                                      Delete Priority
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Organization Data Export</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Export all organizational strategic planning data for backup, compliance, or analysis.
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="outline" onClick={handleExportStrategies} data-testid="button-admin-export-strategies">
                            Export All Priorities
                          </Button>
                          <Button variant="outline" onClick={handleExportProjects} data-testid="button-admin-export-tactics">
                            Export All Projects
                          </Button>
                          <Button variant="outline" onClick={handleExportAll} data-testid="button-admin-export-everything">
                            Complete Data Export
                          </Button>
                        </div>
                      </div>

                      {isOrgAdministrator() && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Executive Goals
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Create goal tags that can be applied to strategies for reporting and tracking.
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex gap-2">
                              <div className="flex-1 max-w-xs">
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Goal Tag *</label>
                                <Input
                                  value={newExecutiveGoalName}
                                  onChange={(e) => setNewExecutiveGoalName(e.target.value)}
                                  placeholder="Short tag (e.g., Growth)"
                                  onKeyDown={(e) => e.key === "Enter" && handleAddExecutiveGoal()}
                                  data-testid="input-new-executive-goal"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Goal Description</label>
                                <Input
                                  value={newExecutiveGoalDescription}
                                  onChange={(e) => setNewExecutiveGoalDescription(e.target.value)}
                                  placeholder="Full description (shown on hover)"
                                  onKeyDown={(e) => e.key === "Enter" && handleAddExecutiveGoal()}
                                  data-testid="input-new-executive-goal-description"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  onClick={handleAddExecutiveGoal}
                                  disabled={createExecutiveGoalMutation.isPending}
                                  data-testid="button-add-executive-goal"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  {createExecutiveGoalMutation.isPending ? "Adding..." : "Add Goal"}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {executiveGoals.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                No Executive Goals yet. Add one above.
                              </p>
                            ) : (
                              executiveGoals.map((goal: ExecutiveGoal) => (
                                <div
                                  key={goal.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                  data-testid={`executive-goal-item-${goal.id}`}
                                >
                                  {editingExecutiveGoal?.id === goal.id ? (
                                    <div className="flex flex-col gap-2 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Goal Tag *</label>
                                          <Input
                                            value={editedGoalName}
                                            onChange={(e) => setEditedGoalName(e.target.value)}
                                            placeholder="Short tag"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleSaveExecutiveGoalEdit();
                                              if (e.key === "Escape") {
                                                setEditingExecutiveGoal(null);
                                                setEditedGoalName("");
                                                setEditedGoalDescription("");
                                              }
                                            }}
                                            autoFocus
                                            data-testid={`input-edit-executive-goal-${goal.id}`}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Goal Description</label>
                                          <Input
                                            value={editedGoalDescription}
                                            onChange={(e) => setEditedGoalDescription(e.target.value)}
                                            placeholder="Full description (shown on hover)"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleSaveExecutiveGoalEdit();
                                              if (e.key === "Escape") {
                                                setEditingExecutiveGoal(null);
                                                setEditedGoalName("");
                                                setEditedGoalDescription("");
                                              }
                                            }}
                                            data-testid={`input-edit-executive-goal-description-${goal.id}`}
                                          />
                                        </div>
                                        <div className="flex items-end gap-1">
                                          <Button
                                            size="sm"
                                            onClick={handleSaveExecutiveGoalEdit}
                                            disabled={updateExecutiveGoalMutation.isPending}
                                            data-testid={`button-save-executive-goal-${goal.id}`}
                                          >
                                            <Save className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingExecutiveGoal(null);
                                              setEditedGoalName("");
                                              setEditedGoalDescription("");
                                            }}
                                            data-testid={`button-cancel-edit-executive-goal-${goal.id}`}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant="secondary" 
                                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1"
                                        >
                                          {goal.name}
                                        </Badge>
                                        {goal.description && (
                                          <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                            {goal.description}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditExecutiveGoal(goal)}
                                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                                          data-testid={`button-edit-executive-goal-${goal.id}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                              data-testid={`button-delete-executive-goal-${goal.id}`}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Executive Goal</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete the "{goal.name}" goal? This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteExecutiveGoalMutation.mutate(goal.id)}
                                                className="bg-red-600 hover:bg-red-700"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <Hash className="w-4 h-4" />
                              Team Tags
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Create team tags that can be applied to projects for organization and reporting.
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 max-w-xs">
                              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Team Name *</label>
                              <Input
                                value={newTeamTagName}
                                onChange={(e) => setNewTeamTagName(e.target.value)}
                                placeholder="e.g., Engineering, Marketing"
                                onKeyDown={(e) => e.key === "Enter" && handleAddTeamTag()}
                                data-testid="input-new-team-tag"
                              />
                            </div>
                            <div className="w-24">
                              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={newTeamTagColor}
                                  onChange={(e) => setNewTeamTagColor(e.target.value)}
                                  className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                                  data-testid="input-team-tag-color"
                                />
                              </div>
                            </div>
                            <div className="flex items-end">
                              <Button
                                onClick={handleAddTeamTag}
                                disabled={createTeamTagMutation.isPending}
                                data-testid="button-add-team-tag"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {createTeamTagMutation.isPending ? "Adding..." : "Add Tag"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {teamTags.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                              No Team Tags yet. Add one above.
                            </p>
                          ) : (
                            teamTags.map((tag: TeamTag) => (
                              <div
                                key={tag.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                data-testid={`team-tag-item-${tag.id}`}
                              >
                                {editingTeamTag?.id === tag.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      value={editedTagName}
                                      onChange={(e) => setEditedTagName(e.target.value)}
                                      placeholder="Team name"
                                      className="max-w-xs"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveTeamTagEdit();
                                        if (e.key === "Escape") {
                                          setEditingTeamTag(null);
                                          setEditedTagName("");
                                          setEditedTagColor("");
                                        }
                                      }}
                                      autoFocus
                                      data-testid={`input-edit-team-tag-${tag.id}`}
                                    />
                                    <input
                                      type="color"
                                      value={editedTagColor}
                                      onChange={(e) => setEditedTagColor(e.target.value)}
                                      className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                                      data-testid={`input-edit-team-tag-color-${tag.id}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleSaveTeamTagEdit}
                                      disabled={updateTeamTagMutation.isPending}
                                      data-testid={`button-save-team-tag-${tag.id}`}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingTeamTag(null);
                                        setEditedTagName("");
                                        setEditedTagColor("");
                                      }}
                                      data-testid={`button-cancel-edit-team-tag-${tag.id}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-4 h-4 rounded-full" 
                                        style={{ backgroundColor: tag.colorHex }}
                                      />
                                      <Badge 
                                        variant="secondary" 
                                        className="px-3 py-1"
                                        style={{ 
                                          backgroundColor: `${tag.colorHex}20`,
                                          color: tag.colorHex,
                                          borderColor: tag.colorHex
                                        }}
                                      >
                                        #{tag.name}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditTeamTag(tag)}
                                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                                        data-testid={`button-edit-team-tag-${tag.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                            data-testid={`button-delete-team-tag-${tag.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Team Tag</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete the "#{tag.name}" tag? This will remove it from all projects. This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteTeamTagMutation.mutate(tag.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Template Categories
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Manage custom template categories for the Templates page.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newTemplateTypeName}
                            onChange={(e) => setNewTemplateTypeName(e.target.value)}
                            placeholder="New category name..."
                            className="max-w-xs"
                            onKeyDown={(e) => e.key === "Enter" && handleAddTemplateType()}
                            data-testid="input-new-template-type"
                          />
                          <Button
                            onClick={handleAddTemplateType}
                            disabled={createTemplateTypeMutation.isPending}
                            data-testid="button-add-template-type"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {createTemplateTypeMutation.isPending ? "Adding..." : "Add"}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {templateTypes.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                              No custom template categories yet. Add one above.
                            </p>
                          ) : (
                            templateTypes.map((templateType: TemplateType) => (
                              <div
                                key={templateType.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {templateType.name}
                                  </span>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                      data-testid={`button-delete-template-type-${templateType.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Template Category</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the "{templateType.name}" category? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteTemplateTypeMutation.mutate(templateType.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                        <h4 className="font-medium mb-2 text-red-800 dark:text-red-200">Danger Zone</h4>
                        <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                          These actions are permanent and cannot be undone.
                        </p>
                        <Button variant="destructive" data-testid="button-admin-reset-all">
                          Reset All Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workstreams" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5" />
                      Workstream & Phase Configuration
                    </CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage workstream templates and phases for ERP program management. These are associated with strategies.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Select Strategy</Label>
                      <div className="flex items-center gap-3">
                        <Select value={wsSelectedStrategyId} onValueChange={setWsSelectedStrategyId}>
                          <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Choose a strategy..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(strategies as any[])?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {wsSelectedStrategyId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={seedProgramMutation.isPending}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Setup ERP Program
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Seed ERP Program Defaults</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will create default workstreams and phases for the selected strategy. Existing data will not be removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => seedProgramMutation.mutate(wsSelectedStrategyId)}>
                                  Seed Defaults
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {wsSelectedStrategyId && (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Workstreams</h3>
                            <Button size="sm" onClick={() => setWsShowAddForm(!wsShowAddForm)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Workstream
                            </Button>
                          </div>

                          {wsShowAddForm && (
                            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input value={wsNewName} onChange={(e) => setWsNewName(e.target.value)} placeholder="Workstream name" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Lead</Label>
                                  <Input value={wsNewLead} onChange={(e) => setWsNewLead(e.target.value)} placeholder="Lead (optional)" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!wsNewName.trim() || createWorkstreamMutation.isPending} onClick={() => createWorkstreamMutation.mutate({ strategyId: wsSelectedStrategyId, name: wsNewName.trim(), ...(wsNewLead.trim() ? { lead: wsNewLead.trim() } : {}) })}>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setWsShowAddForm(false); setWsNewName(""); setWsNewLead(""); }}>Cancel</Button>
                              </div>
                            </div>
                          )}

                          {wsLoading ? (
                            <p className="text-sm text-gray-500">Loading workstreams...</p>
                          ) : workstreams.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No workstreams found for this strategy.</p>
                          ) : (
                            <div className="space-y-2">
                              {workstreams.map((ws) => (
                                <div key={ws.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                                  {wsEditingId === ws.id ? (
                                    <div className="flex-1 flex items-center gap-3">
                                      <Input className="w-48" value={wsEditName} onChange={(e) => setWsEditName(e.target.value)} placeholder="Name" />
                                      <Input className="w-36" value={wsEditLead} onChange={(e) => setWsEditLead(e.target.value)} placeholder="Lead" />
                                      <Input className="w-20" type="number" value={wsEditSortOrder} onChange={(e) => setWsEditSortOrder(e.target.value)} placeholder="Order" />
                                      <Button size="sm" disabled={updateWorkstreamMutation.isPending} onClick={() => updateWorkstreamMutation.mutate({ id: ws.id, name: wsEditName, lead: wsEditLead || undefined, sortOrder: wsEditSortOrder ? parseInt(wsEditSortOrder) : undefined })}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setWsEditingId(null)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-sm">{ws.name}</span>
                                        {ws.lead && <Badge variant="secondary" className="text-xs">{ws.lead}</Badge>}
                                        <Badge variant="outline" className="text-xs">{ws.status}</Badge>
                                        <span className="text-xs text-gray-400">Order: {ws.sortOrder}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setWsEditingId(ws.id); setWsEditName(ws.name); setWsEditLead(ws.lead || ""); setWsEditSortOrder(String(ws.sortOrder)); }}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Workstream</AlertDialogTitle>
                                              <AlertDialogDescription>Are you sure you want to delete "{ws.name}"? This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => deleteWorkstreamMutation.mutate(ws.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t dark:border-gray-700 pt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Phases</h3>
                            <Button size="sm" onClick={() => setPhShowAddForm(!phShowAddForm)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Phase
                            </Button>
                          </div>

                          {phShowAddForm && (
                            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input value={phNewName} onChange={(e) => setPhNewName(e.target.value)} placeholder="Phase name" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Sequence</Label>
                                  <Input type="number" value={phNewSequence} onChange={(e) => setPhNewSequence(e.target.value)} placeholder="1" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Planned Start</Label>
                                  <Input type="date" value={phNewPlannedStart} onChange={(e) => setPhNewPlannedStart(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Planned End</Label>
                                  <Input type="date" value={phNewPlannedEnd} onChange={(e) => setPhNewPlannedEnd(e.target.value)} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!phNewName.trim() || !phNewSequence || createPhaseMutation.isPending} onClick={() => createPhaseMutation.mutate({ strategyId: wsSelectedStrategyId, name: phNewName.trim(), sequence: parseInt(phNewSequence), ...(phNewPlannedStart ? { plannedStart: phNewPlannedStart } : {}), ...(phNewPlannedEnd ? { plannedEnd: phNewPlannedEnd } : {}) })}>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setPhShowAddForm(false); setPhNewName(""); setPhNewSequence(""); setPhNewPlannedStart(""); setPhNewPlannedEnd(""); }}>Cancel</Button>
                              </div>
                            </div>
                          )}

                          {phLoading ? (
                            <p className="text-sm text-gray-500">Loading phases...</p>
                          ) : phases.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No phases found for this strategy.</p>
                          ) : (
                            <div className="space-y-2">
                              {phases.map((ph) => (
                                <div key={ph.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                                  {phEditingId === ph.id ? (
                                    <div className="flex-1 flex items-center gap-3">
                                      <Input className="w-48" value={phEditName} onChange={(e) => setPhEditName(e.target.value)} placeholder="Name" />
                                      <Input className="w-20" type="number" value={phEditSequence} onChange={(e) => setPhEditSequence(e.target.value)} placeholder="Seq" />
                                      <Input className="w-36" type="date" value={phEditPlannedStart} onChange={(e) => setPhEditPlannedStart(e.target.value)} />
                                      <Input className="w-36" type="date" value={phEditPlannedEnd} onChange={(e) => setPhEditPlannedEnd(e.target.value)} />
                                      <Button size="sm" disabled={updatePhaseMutation.isPending} onClick={() => updatePhaseMutation.mutate({ id: ph.id, name: phEditName, sequence: parseInt(phEditSequence), ...(phEditPlannedStart ? { plannedStart: phEditPlannedStart } : {}), ...(phEditPlannedEnd ? { plannedEnd: phEditPlannedEnd } : {}) })}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setPhEditingId(null)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-sm">{ph.name}</span>
                                        <Badge variant="outline" className="text-xs">Seq: {ph.sequence}</Badge>
                                        {ph.plannedStart && <span className="text-xs text-gray-400">Start: {ph.plannedStart}</span>}
                                        {ph.plannedEnd && <span className="text-xs text-gray-400">End: {ph.plannedEnd}</span>}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setPhEditingId(ph.id); setPhEditName(ph.name); setPhEditSequence(String(ph.sequence)); setPhEditPlannedStart(ph.plannedStart || ""); setPhEditPlannedEnd(ph.plannedEnd || ""); }}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Phase</AlertDialogTitle>
                                              <AlertDialogDescription>Are you sure you want to delete "{ph.name}"? This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => deletePhaseMutation.mutate(ph.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

    </div>
  );
}