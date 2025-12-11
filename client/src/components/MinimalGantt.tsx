import { GanttComponent, Inject, Edit, Selection, ColumnsDirective, ColumnDirective } from "@syncfusion/ej2-react-gantt";
import "@/styles/syncfusion-gantt.css";

const MinimalGantt = () => {
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    child: 'subtasks'
  };

  const ganttData = [
    {
      TaskID: 1,
      TaskName: 'Priority Alpha',
      StartDate: '2025-01-01',
      EndDate: '2025-03-31',
      Duration: 90,
      Progress: 40,
      subtasks: [
        {
          TaskID: 2,
          TaskName: 'Project One',
          StartDate: '2025-01-01',
          EndDate: '2025-02-15',
          Duration: 45,
          Progress: 60,
          subtasks: [
            {
              TaskID: 3,
              TaskName: 'Action Item A',
              StartDate: '2025-01-15',
              EndDate: '2025-01-15',
              Duration: 0,
              Progress: 100
            },
            {
              TaskID: 4,
              TaskName: 'Action Item B',
              StartDate: '2025-02-01',
              EndDate: '2025-02-01',
              Duration: 0,
              Progress: 0
            }
          ]
        },
        {
          TaskID: 5,
          TaskName: 'Project Two',
          StartDate: '2025-02-01',
          EndDate: '2025-03-31',
          Duration: 59,
          Progress: 20
        }
      ]
    },
    {
      TaskID: 6,
      TaskName: 'Priority Beta',
      StartDate: '2025-02-01',
      EndDate: '2025-04-30',
      Duration: 89,
      Progress: 10,
      subtasks: [
        {
          TaskID: 7,
          TaskName: 'Project Three',
          StartDate: '2025-02-15',
          EndDate: '2025-04-15',
          Duration: 60,
          Progress: 15
        }
      ]
    }
  ];

  return (
    <div className="h-full w-full p-4">
      <h2 className="text-lg font-semibold mb-4">Minimal Gantt Test - Hardcoded Data</h2>
      <div className="h-[500px] border rounded">
        <GanttComponent
          dataSource={ganttData}
          taskFields={taskFields}
          height="100%"
          width="100%"
          treeColumnIndex={0}
          highlightWeekends={true}
          projectStartDate="2025-01-01"
          projectEndDate="2025-05-01"
        >
          <ColumnsDirective>
            <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
            <ColumnDirective field="StartDate" headerText="Start" width="100" />
            <ColumnDirective field="EndDate" headerText="End" width="100" />
            <ColumnDirective field="Duration" headerText="Duration" width="80" />
          </ColumnsDirective>
          <Inject services={[Edit, Selection]} />
        </GanttComponent>
      </div>
    </div>
  );
};

export default MinimalGantt;
