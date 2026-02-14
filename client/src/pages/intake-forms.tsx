import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Link,
  FileText,
  Clock,
  Mail,
  Eye,
  GripVertical,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import type { IntakeForm } from "@shared/schema";

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'email';
  label: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

interface FormState {
  title: string;
  description: string;
  slug: string;
  fields: FormField[];
  status: string;
  expiresAt: string;
  thankYouMessage: string;
  requireEmail: boolean;
  maxSubmissionsPerEmail: string;
  maxTotalSubmissions: string;
}

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);

const generateId = () => crypto.randomUUID();

const emptyFormState: FormState = {
  title: '',
  description: '',
  slug: '',
  fields: [],
  status: 'active',
  expiresAt: '',
  thankYouMessage: '',
  requireEmail: true,
  maxSubmissionsPerEmail: '',
  maxTotalSubmissions: '',
};

const fieldTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
];

const hasOptions = (type: string) => ['select', 'radio', 'checkbox'].includes(type);

export default function IntakeForms() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<IntakeForm | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const isAdmin = currentUser?.role === 'administrator';

  const { data: intakeForms, isLoading } = useQuery<IntakeForm[]>({
    queryKey: ['/api/intake-forms'],
  });

  const { data: submissionCounts } = useQuery<Record<string, number>>({
    queryKey: ['/api/intake-forms', 'submission-counts'],
    queryFn: async () => {
      if (!intakeForms?.length) return {};
      const counts: Record<string, number> = {};
      await Promise.all(
        intakeForms.map(async (form) => {
          try {
            const res = await fetch(`/api/intake-forms/${form.id}/submissions`, { credentials: 'include' });
            if (res.ok) {
              const submissions = await res.json();
              counts[form.id] = Array.isArray(submissions) ? submissions.length : 0;
            }
          } catch {
            counts[form.id] = 0;
          }
        })
      );
      return counts;
    },
    enabled: !!intakeForms?.length,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/intake-forms", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/intake-forms'] });
      toast({ title: "Success", description: "Intake form created successfully" });
      closeModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to create form", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/intake-forms/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/intake-forms'] });
      toast({ title: "Success", description: "Intake form updated successfully" });
      closeModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update form", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/intake-forms/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/intake-forms'] });
      toast({ title: "Success", description: "Intake form deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete form", variant: "destructive" });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingForm(null);
    setFormState(emptyFormState);
    setSlugManuallyEdited(false);
    setExpandedFields(new Set());
  };

  const openCreateModal = () => {
    setEditingForm(null);
    setFormState(emptyFormState);
    setSlugManuallyEdited(false);
    setExpandedFields(new Set());
    setIsModalOpen(true);
  };

  const openEditModal = (form: IntakeForm) => {
    let fields: FormField[] = [];
    try {
      fields = JSON.parse(form.fields || '[]');
    } catch { fields = []; }

    setEditingForm(form);
    setFormState({
      title: form.title,
      description: form.description || '',
      slug: form.slug,
      fields,
      status: form.status,
      expiresAt: form.expiresAt ? format(new Date(form.expiresAt), 'yyyy-MM-dd') : '',
      thankYouMessage: form.thankYouMessage || '',
      requireEmail: form.requireEmail === 'true',
      maxSubmissionsPerEmail: form.maxSubmissionsPerEmail?.toString() || '',
      maxTotalSubmissions: form.maxTotalSubmissions?.toString() || '',
    });
    setSlugManuallyEdited(true);
    setExpandedFields(new Set());
    setIsModalOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setFormState(prev => ({
      ...prev,
      title,
      slug: slugManuallyEdited ? prev.slug : generateSlug(title),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    setFormState(prev => ({ ...prev, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
  };

  const addField = () => {
    const newField: FormField = {
      id: generateId(),
      type: 'text',
      label: '',
      required: false,
      placeholder: '',
      options: [],
    };
    setFormState(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setExpandedFields(prev => new Set(prev).add(newField.id));
  };

  const removeField = (id: string) => {
    setFormState(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
    setExpandedFields(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormState(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formState.fields.length) return;
    setFormState(prev => {
      const fields = [...prev.fields];
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      return { ...prev, fields };
    });
  };

  const toggleFieldExpanded = (id: string) => {
    setExpandedFields(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleSubmit = () => {
    if (!formState.title.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formState.slug.trim()) {
      toast({ title: "Validation Error", description: "Slug is required", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      slug: formState.slug.trim(),
      fields: JSON.stringify(formState.fields),
      status: formState.status,
      expiresAt: formState.expiresAt ? new Date(formState.expiresAt).toISOString() : null,
      thankYouMessage: formState.thankYouMessage.trim() || null,
      requireEmail: formState.requireEmail ? 'true' : 'false',
      maxSubmissionsPerEmail: formState.maxSubmissionsPerEmail ? parseInt(formState.maxSubmissionsPerEmail) : null,
      maxTotalSubmissions: formState.maxTotalSubmissions ? parseInt(formState.maxTotalSubmissions) : null,
    };

    if (editingForm) {
      updateMutation.mutate({ id: editingForm.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/intake/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link Copied", description: "Public form URL copied to clipboard" });
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p style={{ color: '#86868B' }}>Only administrators can manage intake forms.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: '#86868B' }}>Loading intake forms...</p>
          </div>
        </div>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="px-6 py-5"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#5856D6' }}
              >
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>
                  Intake Forms
                </h1>
                <p style={{ color: '#86868B' }}>
                  Create and manage intake forms for collecting submissions
                </p>
              </div>
            </div>
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full px-5"
              style={{ backgroundColor: '#007AFF' }}
            >
              <Plus className="w-4 h-4" />
              New Form
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {!intakeForms?.length ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No intake forms yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Get started by creating your first intake form.
                    </p>
                    <Button
                      onClick={openCreateModal}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Intake Form
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {intakeForms.map((form) => (
                  <Card key={form.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight">{form.title}</CardTitle>
                        <Badge
                          variant={form.status === 'active' ? 'default' : 'secondary'}
                          className={form.status === 'active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                          }
                        >
                          {form.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {form.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{form.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between pt-0">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Link className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs truncate">/intake/{form.slug}</span>
                        </div>
                        {form.expiresAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Expires {format(new Date(form.expiresAt), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{form.requireEmail === 'true' ? 'Email required' : 'Email optional'}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {submissionCounts?.[form.id] ?? 0} submissions
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(form)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copyLink(form.slug)}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy Link
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Intake Form</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{form.title}"? This will also delete all submissions. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(form.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editingForm ? 'Edit Intake Form' : 'Create Intake Form'}
            </DialogTitle>
          </DialogHeader>
            <div className="space-y-6 pb-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Info</h3>
                <div className="space-y-2">
                  <Label htmlFor="form-title">Title *</Label>
                  <Input
                    id="form-title"
                    value={formState.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Project Request Form"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    value={formState.description}
                    onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this form's purpose"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-slug">Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">/intake/</span>
                    <Input
                      id="form-slug"
                      value={formState.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="project-request"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Form Fields</h3>
                {formState.fields.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No fields added yet. Click "Add Field" to start building your form.</p>
                )}
                <div className="space-y-3">
                  {formState.fields.map((field, index) => {
                    const isExpanded = expandedFields.has(field.id);
                    return (
                      <div key={field.id} className="border rounded-lg bg-white">
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleFieldExpanded(field.id)}
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                              disabled={index === formState.fields.length - 1}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">
                            {field.label || 'Untitled Field'}
                          </span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{field.type}</Badge>
                          {field.required && <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100 flex-shrink-0">Required</Badge>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(val) => updateField(field.id, { type: val as FormField['type'] })}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldTypeOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Label *</Label>
                                <Input
                                  className="h-8 text-sm"
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  placeholder="Field label"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                className="h-8 text-sm"
                                value={field.placeholder}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Placeholder text"
                              />
                            </div>
                            {hasOptions(field.type) && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Options (comma-separated)</Label>
                                <Input
                                  className="h-8 text-sm"
                                  value={field.options.join(', ')}
                                  onChange={(e) => updateField(field.id, {
                                    options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  })}
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                              />
                              <Label className="text-xs">Required field</Label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button type="button" variant="outline" onClick={addField} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Settings</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Status</Label>
                    <p className="text-xs text-gray-500">Active forms can receive submissions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{formState.status === 'active' ? 'Active' : 'Inactive'}</span>
                    <Switch
                      checked={formState.status === 'active'}
                      onCheckedChange={(checked) => setFormState(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="form-expires">Expiration Date (optional)</Label>
                  <Input
                    id="form-expires"
                    type="date"
                    value={formState.expiresAt}
                    onChange={(e) => setFormState(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="form-thankyou">Thank You Message</Label>
                  <Textarea
                    id="form-thankyou"
                    value={formState.thankYouMessage}
                    onChange={(e) => setFormState(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                    placeholder="Custom message shown after submission"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Email</Label>
                    <p className="text-xs text-gray-500">Submitters must provide an email address</p>
                  </div>
                  <Switch
                    checked={formState.requireEmail}
                    onCheckedChange={(checked) => setFormState(prev => ({ ...prev, requireEmail: checked }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="form-max-per-email">Max Submissions Per Email</Label>
                    <Input
                      id="form-max-per-email"
                      type="number"
                      min="1"
                      value={formState.maxSubmissionsPerEmail}
                      onChange={(e) => setFormState(prev => ({ ...prev, maxSubmissionsPerEmail: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-max-total">Max Total Submissions</Label>
                    <Input
                      id="form-max-total"
                      type="number"
                      min="1"
                      value={formState.maxTotalSubmissions}
                      onChange={(e) => setFormState(prev => ({ ...prev, maxTotalSubmissions: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
              </div>
            </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} style={{ backgroundColor: '#007AFF' }}>
              {isSaving ? 'Saving...' : editingForm ? 'Update Form' : 'Create Form'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}