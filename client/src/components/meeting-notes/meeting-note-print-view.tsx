import { format } from "date-fns";
import type { MeetingNote, Strategy, Project, Action } from "@shared/schema";

interface MeetingNotePrintViewProps {
  meetingNote: MeetingNote;
  strategy: Strategy | undefined;
  projects: Project[];
  actions: Action[];
}

export function MeetingNotePrintView({
  meetingNote,
  strategy,
  projects,
  actions,
}: MeetingNotePrintViewProps) {
  const selectedProjectIds = JSON.parse(meetingNote.selectedProjectIds || "[]");
  const selectedActionIds = JSON.parse(meetingNote.selectedActionIds || "[]");

  const selectedProjects = projects.filter((t) =>
    selectedProjectIds.includes(t.id)
  );

  const selectedActions = actions.filter((o) =>
    selectedActionIds.includes(o.id)
  );

  // Group actions by their associated project
  const actionsByProject = selectedActions.reduce((acc, action) => {
    const projectId = action.projectId || "unassigned";
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(action);
    return acc;
  }, {} as Record<string, Action[]>);

  return (
    <div className="print-view hidden print:block bg-white text-black p-8">
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-gray-300">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Meeting Report
        </h1>
        <div className="text-sm text-gray-600">
          Generated on {format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}
        </div>
      </div>

      {/* Meeting Title */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {meetingNote.title}
        </h2>
        <div className="flex items-center gap-4 text-lg">
          <div className="font-semibold text-gray-700">
            Meeting Date:{" "}
            <span className="font-normal">
              {format(new Date(meetingNote.meetingDate), "MMMM dd, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Strategy Section */}
      {strategy && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Strategy</h3>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: strategy.colorCode }}
            />
            <span className="font-semibold text-gray-900">{strategy.title}</span>
          </div>
        </div>
      )}

      {/* Selected Projects Section */}
      {selectedProjects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Projects Discussed
          </h3>
          <div className="space-y-4">
            {selectedProjects.map((project) => (
              <div
                key={project.id}
                className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg"
              >
                <h4 className="font-semibold text-gray-900 text-lg mb-1">
                  {project.title}
                </h4>
                {project.description && (
                  <p className="text-gray-700 text-sm mb-2">
                    {project.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Status:</span> {project.status}
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span> {project.progress}%
                  </div>
                  <div>
                    <span className="font-medium">Due:</span>{" "}
                    {format(new Date(project.dueDate), "MMM dd, yyyy")}
                  </div>
                </div>

                {/* Actions under this project */}
                {actionsByProject[project.id] &&
                  actionsByProject[project.id].length > 0 && (
                    <div className="mt-3 ml-4">
                      <div className="font-medium text-gray-800 mb-2 text-sm">
                        Related Actions:
                      </div>
                      <ul className="space-y-2">
                        {actionsByProject[project.id].map((action) => (
                          <li
                            key={action.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-blue-600 mt-1">•</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {action.title}
                              </div>
                              {action.description && (
                                <div className="text-gray-600 text-xs mt-1">
                                  {action.description}
                                </div>
                              )}
                              <div className="flex gap-3 mt-1 text-xs text-gray-600">
                                <span>
                                  <span className="font-medium">Status:</span>{" "}
                                  {action.status}
                                </span>
                                {action.currentValue && (
                                  <span>
                                    <span className="font-medium">Current:</span>{" "}
                                    {action.currentValue}
                                    {action.measurementUnit && ` ${action.measurementUnit}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standalone Actions (not associated with any project) */}
      {actionsByProject["unassigned"] &&
        actionsByProject["unassigned"].length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Other Actions Discussed
            </h3>
            <div className="space-y-3">
              {actionsByProject["unassigned"].map((action) => (
                <div
                  key={action.id}
                  className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 rounded-r-lg"
                >
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {action.title}
                  </h4>
                  {action.description && (
                    <p className="text-gray-700 text-sm mb-2">
                      {action.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Status:</span> {action.status}
                    </div>
                    {action.currentValue && (
                      <div>
                        <span className="font-medium">Current Value:</span>{" "}
                        {action.currentValue}
                        {action.measurementUnit && ` ${action.measurementUnit}`}
                      </div>
                    )}
                    {action.targetValue && (
                      <div>
                        <span className="font-medium">Target:</span>{" "}
                        {action.targetValue}
                        {action.measurementUnit && ` ${action.measurementUnit}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Meeting Notes Section */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Notes</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {meetingNote.notes}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300 text-sm text-gray-600">
        <div className="flex justify-between">
          <div>Meeting ID: {meetingNote.id}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}
