import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
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
  FileText,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { CreateEditMeetingNoteModal } from "@/components/modals/create-edit-meeting-note-modal";
import { MeetingNotePrintView } from "@/components/meeting-notes/meeting-note-print-view";
import type { Tactic, Outcome, Strategy, MeetingNote as MeetingNoteType } from "@shared/schema";

type MeetingNote = MeetingNoteType & {
  strategy?: Strategy;
};

export default function MeetingNotes() {
  const { canEditTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal states - placeholders for future modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [viewingNote, setViewingNote] = useState<MeetingNote | null>(null);
  
  // Print state
  const [printNote, setPrintNote] = useState<MeetingNote | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: meetingNotes, isLoading: notesLoading } = useQuery({
    queryKey: ["/api/meeting-notes"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });
  
  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });
  
  const { data: outcomes } = useQuery({
    queryKey: ["/api/outcomes"],
  });

  const deleteMeetingNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await apiRequest("DELETE", `/api/meeting-notes/${noteId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      toast({
        title: "Success",
        description: "Meeting note deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete meeting note",
        variant: "destructive",
      });
    },
  });

  // Enhance meeting notes with strategy data
  const notesWithDetails = (meetingNotes as MeetingNote[])?.map((note) => ({
    ...note,
    strategy: (strategies as Strategy[])?.find((s) => s.id === note.strategyId),
  })) || [];

  // Sort by meeting date descending (most recent first)
  const sortedNotes = [...notesWithDetails].sort((a, b) => {
    return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
  });

  const handleDeleteNote = (noteId: string) => {
    deleteMeetingNoteMutation.mutate(noteId);
  };

  const handleEditNote = (note: MeetingNote) => {
    setEditingNote(note);
    setIsEditOpen(true);
  };

  const handleViewNote = (note: MeetingNote) => {
    setViewingNote(note);
    setIsViewOpen(true);
  };
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printNote?.title || "Meeting Report",
  });
  
  const handleExportPDF = (note: MeetingNote) => {
    setPrintNote(note);
    // Wait for the print component to render with the new data
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const canEdit = canEditTactics();

  if (notesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading meeting notes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Meeting Notes
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  View and manage report-out meeting notes
                </p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-2"
                  data-testid="button-create-meeting-note"
                >
                  <Plus className="w-4 h-4" />
                  New Meeting Note
                </Button>
              )}
            </div>

            {sortedNotes.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No meeting notes yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Get started by creating your first meeting note.
                    </p>
                    {canEdit && (
                      <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 mx-auto"
                        data-testid="button-create-first-meeting-note"
                      >
                        <Plus className="w-4 h-4" />
                        Create Meeting Note
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedNotes.map((note) => (
                  <Card key={note.id} data-testid={`card-meeting-note-${note.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <span className="text-xl">{note.title}</span>
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span data-testid={`text-meeting-date-${note.id}`}>
                                {format(new Date(note.meetingDate), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            {note.strategy && (
                              <Badge
                                variant="outline"
                                className="flex items-center gap-2"
                                data-testid={`badge-strategy-${note.id}`}
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: note.strategy.colorCode }}
                                />
                                {note.strategy.title}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPDF(note)}
                            className="flex items-center gap-2"
                            data-testid={`button-export-pdf-${note.id}`}
                          >
                            <Download className="w-4 h-4" />
                            Export PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewNote(note)}
                            className="flex items-center gap-2"
                            data-testid={`button-view-${note.id}`}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNote(note)}
                                className="flex items-center gap-2"
                                data-testid={`button-edit-${note.id}`}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    data-testid={`button-delete-${note.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Meeting Note</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{note.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid={`button-cancel-delete-${note.id}`}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid={`button-confirm-delete-${note.id}`}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {note.notes}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateEditMeetingNoteModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        note={null}
      />

      <CreateEditMeetingNoteModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingNote(null);
        }}
        note={editingNote}
      />
      
      {/* Hidden print view */}
      {printNote && (
        <div ref={printRef} className="hidden print:block">
          <MeetingNotePrintView
            meetingNote={printNote as MeetingNoteType}
            strategy={(strategies as Strategy[])?.find((s) => s.id === printNote.strategyId)}
            tactics={(tactics as Tactic[]) || []}
            outcomes={(outcomes as Outcome[]) || []}
          />
        </div>
      )}
    </div>
  );
}
