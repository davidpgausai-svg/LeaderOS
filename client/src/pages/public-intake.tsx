import { useState, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "textarea" | "select" | "checkbox" | "radio" | "date" | "number" | "email";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface IntakeFormData {
  id: string;
  title: string;
  description: string;
  fields: string;
  requireEmail: string;
  thankYouMessage: string;
}

export default function PublicIntakePage() {
  const [, params] = useRoute("/intake/:slug");
  const slug = params?.slug || "";

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<{ status: number; message: string } | null>(null);

  const { data: formData, isLoading, error } = useQuery<IntakeFormData>({
    queryKey: ["/api/public/intake", slug],
    enabled: !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async (body: { data: Record<string, any>; submitterEmail: string; submitterName: string }) => {
      const res = await apiRequest("POST", `/api/public/intake/${slug}`, body);
      return res.json();
    },
    onSuccess: (data: { success: boolean; thankYouMessage: string }) => {
      setSubmitted(true);
      setThankYouMessage(data.thankYouMessage || "Thank you for your submission!");
    },
    onError: (err: Error) => {
      const statusMatch = err.message.match(/^(\d+):/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      if (status === 429) {
        setSubmitError({ status: 429, message: "You have reached the maximum number of submissions." });
      } else {
        setSubmitError({ status, message: "Something went wrong. Please try again later." });
      }
    },
  });

  const parsedFields: FormField[] = (() => {
    if (!formData?.fields) return [];
    try {
      return JSON.parse(formData.fields);
    } catch {
      return [];
    }
  })();

  const updateValue = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const toggleCheckbox = useCallback((fieldId: string, option: string, checked: boolean) => {
    setFormValues((prev) => {
      const current: string[] = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      }
      return { ...prev, [fieldId]: current.filter((v: string) => v !== option) };
    });
  }, []);

  const findEmailValue = (): string => {
    for (const field of parsedFields) {
      if (field.type === "email" && formValues[field.id]) {
        return String(formValues[field.id]).trim();
      }
    }
    return "";
  };

  const findNameValue = (): string => {
    for (const field of parsedFields) {
      if (field.type === "text" && field.label.toLowerCase().includes("name") && formValues[field.id]) {
        return String(formValues[field.id]).trim();
      }
    }
    return "";
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    for (const field of parsedFields) {
      if (field.required) {
        const val = formValues[field.id];
        if (field.type === "checkbox") {
          if (!val || !Array.isArray(val) || val.length === 0) {
            errors[field.id] = `${field.label} is required`;
          }
        } else if (val === undefined || val === null || String(val).trim() === "") {
          errors[field.id] = `${field.label} is required`;
        }
      }
      if (field.type === "email" && formValues[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formValues[field.id]))) {
        errors[field.id] = "Please enter a valid email address";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    submitMutation.mutate({
      data: formValues,
      submitterEmail: findEmailValue(),
      submitterName: findNameValue(),
    });
  };

  const errorStatus = (() => {
    if (!error) return null;
    const msg = (error as Error).message || "";
    const match = msg.match(/^(\d+):/);
    return match ? parseInt(match[1]) : 500;
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (errorStatus === 404) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">Form Not Found</h1>
            <p className="text-gray-500">The form you're looking for doesn't exist or the link may be incorrect.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorStatus === 410) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Clock className="h-12 w-12 text-amber-400 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">Form Closed</h1>
            <p className="text-gray-500">This form is no longer accepting submissions. It may have expired or been closed by the owner.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">Something Went Wrong</h1>
            <p className="text-gray-500">We couldn't load this form. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitError?.status === 429) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">Submission Limit Reached</h1>
            <p className="text-gray-500">You have reached the maximum number of submissions for this form.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-800">Thank You!</h1>
            <p className="text-gray-600">{thankYouMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) return null;

  const renderField = (field: FormField) => {
    const error = validationErrors[field.id];

    switch (field.type) {
      case "text":
      case "email":
      case "number":
      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder || ""}
              value={formValues[field.id] ?? ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder || ""}
              value={formValues[field.id] ?? ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
              className={error ? "border-red-500" : ""}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formValues[field.id] ?? ""}
              onValueChange={(val) => updateValue(field.id, val)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2 pl-1">
              {(field.options || []).map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${opt}`}
                    checked={(formValues[field.id] || []).includes(opt)}
                    onCheckedChange={(checked) => toggleCheckbox(field.id, opt, !!checked)}
                  />
                  <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">
                    {opt}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={formValues[field.id] ?? ""}
              onValueChange={(val) => updateValue(field.id, val)}
              className="pl-1"
            >
              {(field.options || []).map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                  <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{formData.title}</h1>
          {formData.description && (
            <p className="text-gray-600">{formData.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {parsedFields.map(renderField)}

            {submitError && submitError.status !== 429 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{submitError.message}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
