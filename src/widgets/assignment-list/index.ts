import { JupyterFrontEnd } from '@jupyterlab/application';

import { Widget } from '@lumino/widgets';

import { PageConfig } from '@jupyterlab/coreutils';

import { CourseList, AssignmentList } from './assignment-list-component';
import { ASSIGNMENT_LIST_CONTENT } from './constants';
import { requestAPI } from './utils';

export class AssignmentListWidget extends Widget {
  app: JupyterFrontEnd;

  constructor(app: JupyterFrontEnd, id: string = 'my-assignment-list-widget') {
    super();
    this.app = app;
    this.id = id;
    this.title.label = 'Assignments';
    this.addClass('my-assignment-list');

    var assignment_html = ASSIGNMENT_LIST_CONTENT.join('\n');

    this.node.innerHTML = assignment_html;
    this.node.style.overflowY = 'auto';

    let base_url = PageConfig.getBaseUrl();
    console.log("base_url", base_url)
    let options = new Map();
    options.set('base_url', base_url);
    var assignment_l = new AssignmentList(
      this,
      'released_assignments_list',
      'fetched_assignments_list',
      'submitted_assignments_list',
      options,
      this.app
    );

    new CourseList(
      this,
      'course_list',
      'course_list_default',
      'course_list_dropdown',
      'refresh_assignments_list',
      assignment_l,
      options
    );

    this.checkNbGraderVersion();
  }

  checkNbGraderVersion() {
    var warning = this.node.getElementsByClassName(
      'version_error'
    )[0] as HTMLDivElement;
    warning.hidden = false;
    requestAPI<any>('nbgrader_version?version=' + '0.9.5')
      .then(response => {
        if (!response['success']) {
          warning.innerText = response['message'];
          warning.style.display = 'block';
        }
      })
      .catch(reason => {
        console.error(
          `Error on GET /assignment_list/nbgrader_version.\n${reason}`
        );
      });
  }
}
