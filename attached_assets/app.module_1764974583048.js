import shared from '../_shared/shared.module.js?490258';
import { Gantt, DateHelper, TaskModel, DependencyModel, StringHelper } from '../../build/gantt.module.js?490258';

class Task extends TaskModel {
    // Add a stable class name that survives code minification
    static $name = 'Task';

    static fields = [
        'isProject',
        'prio'
        // Add your own custom fields here
    ];

    // For this demo, tasks are styled based on the first-level parent nodes (unless defined on task level)
    get eventColor() {
        return super.eventColor || this.parent.eventColor;
    }

    findAncestor(fn) {
        let result;

        this.bubbleWhile(t => {
            if (fn(t)) {
                result = t;
                return false;
            }
        }, !this.isProject);

        return result;
    }
}

class Dependency extends DependencyModel {
    // Add a stable class name that survives code minification
    static $name = 'Dependency';

    get isCrossProject() {
        const
            fromTaskProject = this.fromTask.findAncestor(task => task.isProject),
            toTaskProject   = this.toTask.findAncestor(task => task.isProject);

        return fromTaskProject && toTaskProject && fromTaskProject !== toTaskProject;
    }
}

const gantt = new Gantt({
    appendTo          : 'container',
    dependencyIdField : 'sequenceNumber',
    rowHeight         : 38,
    tickSize          : 120,
    barMargin         : 9,
    viewPreset        : 'monthAndYear',
    resourceImagePath : '../_shared/images/transparent-users/',
    project           : {
        autoLoad             : true,
        loadUrl              : '../_datasets/portfolio-planning.json',
        taskModelClass       : Task,
        dependencyModelClass : Dependency
    },

    subGridConfigs : {
        locked : {
            flex : 3
        },
        normal : {
            flex : 5
        }
    },
    columnLines : false,
    features    : {
        projectLines : false,
        rollups      : true,
        dependencies : {
            // Rounded line joints
            radius     : 10,
            clickWidth : 5,
            renderer({ domConfig, dependencyRecord }) {
                // Add a custom CSS class to dependencies between different projects
                domConfig.class.crossProject = dependencyRecord.isCrossProject;
            },
            tooltipTemplate(dependencyRecord) {
                return [
                    { tag : 'label', text : 'From' },
                    { text : dependencyRecord.fromEvent.name },
                    { tag : 'label', text : 'To' },
                    { text : dependencyRecord.toEvent.name },
                    { tag : 'label', text : 'Lag' },
                    { text : `${dependencyRecord.lag || 0} ${DateHelper.getLocalizedNameOfUnit(dependencyRecord.lagUnit, dependencyRecord.lag !== 1)}` },
                    dependencyRecord.isCrossProject ? { tag : 'label', text : 'Cross project dependency' } : undefined
                ];
            }
        },
        labels : {
            right : {
                field : 'name',
                renderer({ taskRecord, domConfig }) {
                    domConfig.children = [taskRecord.name];

                    if (taskRecord.prio) {
                        domConfig.children.push({
                            class   : 'b-prio-tag',
                            dataset : {
                                btip : 'Priority ' + taskRecord.prio
                            },
                            text : taskRecord.prio
                        });
                    }
                },
                editor : {
                    type : 'textfield'
                }
            }
        },
        taskTooltip : {
            template({ taskRecord }) {
                return `<div class="field"><label>Task</label><span>${StringHelper.encodeHtml(taskRecord.name)}</span></div>
                        <div class="field"><label>Priority</label><span class="b-prio-tag">${StringHelper.encodeHtml(taskRecord.prio || 'Normal')}</span></div>
                        <div class="field"><label>Start</label><span>${DateHelper.format(taskRecord.startDate, 'MMM DD')}</span></div>
                        <div class="field"><label>Duration</label><span>${taskRecord.fullDuration}</span></div>
                    `;
            }
        }
    },

    columns : [
        { type : 'wbs' },
        { type : 'name', width : 350 },
        { type : 'startdate' },
        { type : 'duration', abbreviatedUnit : true },
        { type : 'percentdone', mode : 'circle', width : 70 },
        { type : 'resourceassignment', width : 120, showAvatars : true }
    ]
});

