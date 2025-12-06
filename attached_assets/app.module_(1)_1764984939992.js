import shared from '../_shared/shared.module.js?490258';
import { Gantt, ProjectModel, AsyncHelper, PresetManager, ProjectGenerator } from '../../build/gantt.module.js?490258';

const
    toggleCustom  = show => {
        taskCountField.hidden = projectSizeField.hidden = !show;
    },
    applyPreset   = count => {
        toggleCustom(false);
        projectSizeField.value = 50;
        taskCountField.value = count;
        gantt.generateDataset();
    };

PresetManager.registerPreset('threeMonths', {
    name            : '3 months',
    base            : 'weekAndDayLetter',
    tickSize        : 20,
    defaultSpan     : 3,
    defaultSpanUnit : 'month'
});

let busy = false;

const gantt = new Gantt({
    appendTo : 'container',

    emptyText : '',

    dependencyIdField : 'sequenceNumber',

    columns : [
        { type : 'name', field : 'name', text : 'Name', width : 200 },
        { type : 'startdate', text : 'Start date' },
        { type : 'duration', text : 'Duration' }
    ],

    columnLines : false,

    // If you try approach B or C below you need to define a project here
    // project : {
    //     taskStore       : { useRawData : true },
    //     dependencyStore : { useRawData : true }
    // },

    // hide data generation
    async generateDataset(count = taskCountField.value) {
        // Bail out if we are already generating a dataset (it is async)
        if (busy) {
            return;
        }

        busy = true;

        if (count > 1000) {
            gantt.mask('Generating tasks');
        }

        // Required to allow browser to update DOM before task generation starts
        await AsyncHelper.sleep(100);

        const config = await ProjectGenerator.generateAsync(count, projectSizeField.value);

        // Required to allow browser to update DOM before calculations starts
        await AsyncHelper.sleep(10);

        //
        // Alternative approaches that should have similar performance:
        //

        // A) Replace entire project with a new project
        gantt.project?.destroy();

        gantt.project = new ProjectModel({
            autoSetConstraints : true,
            // The `useRawData` settings below speeds record creation up a bit by not cloning the raw data objects,
            // instead uses them directly as is
            taskStore          : { useRawData : true },
            dependencyStore    : { useRawData : true },
            ...config
        });

        gantt.startDate = gantt.project.startDate;

        if (count > 1000) {
            gantt.unmask();
        }

        // B) Replace store data per store
        // gantt.taskStore.data = config.tasksData;
        // gantt.dependencyStore.data = config.dependenciesData;
        // C) Replace store data via project
        // gantt.project.loadInlineData(config);

        gantt.project.on({
            dataReady() {
                busy = false;
            }
        });
    },
    // end hide

    // hide toolbar settings
    tbar : [
        'Presets',
        {
            type        : 'buttongroup',
            rendition   : 'padded',
            toggleGroup : true,
            items       : [
                {
                    text    : '1K tasks',
                    pressed : true,
                    ref     : '1kButton',
                    tasks   : 1000
                },
                {
                    text  : '5K tasks',
                    ref   : '5kButton',
                    tasks : 5000
                },
                {
                    text  : '10K tasks',
                    ref   : '10kButton',
                    tasks : 10000
                },
                {
                    text : 'Custom',
                    ref  : 'customButton',
                    onClick() {
                        toggleCustom(true);
                    }
                }
            ],
            onClick({ source : button }) {
                if (button.tasks) {
                    applyPreset(button.tasks);
                }
            }
        },
        {
            type       : 'number',
            ref        : 'taskCountField',
            label      : 'Tasks',
            tooltip    : 'Enter number of tasks to generate and press [ENTER]. Tasks are divided into blocks of ten',
            value      : 1000,
            min        : 10,
            max        : 10000,
            inputWidth : '7em',
            step       : 10,
            hidden     : true,
            onChange({ userAction }) {
                if (userAction) {
                    gantt.generateDataset();
                }
            }
        }, {
            type       : 'number',
            ref        : 'projectSizeField',
            label      : 'Project size',
            tooltip    : 'Enter number of tasks that should be connected into a "project" (multipliers of 10)',
            min        : 10,
            max        : 1000,
            value      : 50,
            inputWidth : '6em',
            step       : 10,
            hidden     : true,
            onChange({ userAction }) {
                if (userAction) {
                    gantt.generateDataset();
                }
            }
        },
        '->',
        {
            type    : 'viewpresetcombo',
            presets : ['weekAndDay', 'dayAndMonth', 'threeMonths']
        }
    ]
    // end hide
});

const { taskCountField, projectSizeField } = gantt.widgetMap;

gantt.generateDataset();
