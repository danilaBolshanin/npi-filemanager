import { JupyterFrontEnd } from "@jupyterlab/application";
import { PageConfig } from '@jupyterlab/coreutils';
import React from "react";
import { showNbGraderDialog } from './validate';
import { Dialog } from '@jupyterlab/apputils';
import { remove_children, requestAPI } from "./utils";
import { Submission } from "./submission";
import { Notebook } from './notebook';

export class Assignment {
  element: HTMLDivElement;
  data: any;
  parent: string;
  on_refresh: (data: any) => void;
  options: Map<string, string>;
  base_url: any;
  app: JupyterFrontEnd;

  constructor(
    element: HTMLDivElement,
    data: any,
    parent: string,
    on_refresh: (data: any) => void,
    options: Map<string, string>,
    app: JupyterFrontEnd
  ) {
    this.element = element;
    this.data = data;
    this.parent = parent;
    this.on_refresh = on_refresh;
    this.options = options;
    this.base_url = options.get('base_url') || PageConfig.getBaseUrl();
    this.app = app;
    this.style();
    this.make_row();
  }

  private style(): void {
    this.element.classList.add('list_item', 'row');
  }

  private escape_id(): string {
    // construct the id from the course id and the assignment id, and also
    // prepend the id with "nbgrader" (this also ensures that the first
    // character is always a letter, as required by HTML 4)
    var id =
      'nbgrader-' + this.data['course_id'] + '-' + this.data['assignment_id'];

    // replace spaces with '_'
    id = id.replace(/ /g, '_');

    // remove any characters that are invalid in HTML div ids
    id = id.replace(/[^A-Za-z0-9\-_]/g, '');

    return id;
  }

  private make_link(): HTMLSpanElement {
    var container = document.createElement('span');
    container.classList.add('item_name', 'col-sm-6');

    var link;
    if (this.data['status'] === 'fetched') {
      link = document.createElement('a');
      var id = this.escape_id();
      link.classList.add('collapsed', 'assignment-notebooks-link');
      link.setAttribute('role', 'button');
      link.setAttribute('data-toggle', 'collapse');
      link.setAttribute('data-parent', this.parent);
      link.setAttribute('href', '#' + id);
      link.setAttribute('aria-expanded', 'false');
      link.setAttribute('aria-controls', id);
    } else {
      link = document.createElement('span');
    }
    link.innerText = this.data['assignment_id'];
    container.append(link);
    return container;
  }

  private submit_error(data: { value: any }): void {
    const body_title = React.createElement(
      'p',
      null,
      'Assignment not submitted:'
    );
    const body_content = React.createElement('pre', null, data.value);
    const body = React.createElement('div', { id: 'submission-message' }, [
      body_title,
      body_content
    ]);

    showNbGraderDialog(
      {
        title: 'Invalid Submission',
        body: body,
        buttons: [Dialog.okButton()]
      },
      true
    );
  }

  private make_button(): HTMLSpanElement {
    var container = document.createElement('span');
    container.classList.add('item_status', 'col-sm-4');
    var button = document.createElement('button');
    button.classList.add('btn', 'btn-primary', 'btn-xs');
    container.append(button);
    var that = this;
    if (this.data['status'] === 'released') {
      button.innerText = 'Fetch';
      button.onclick = async function () {
        button.innerText = 'Fetching...';
        button.setAttribute('disabled', 'disabled');
        const dataToSend = {
          course_id: that.data['course_id'],
          assignment_id: that.data['assignment_id']
        };
        try {
          const reply = await requestAPI<any>('assignments/fetch', {
            body: JSON.stringify(dataToSend),
            method: 'POST'
          });

          that.on_refresh(reply);
        } catch (reason) {
          remove_children(container);
          container.innerText = 'Error fetching assignment.';
          console.error(
            `Error on POST /assignment_list/fetch ${dataToSend}.\n${reason}`
          );
        }
      };
    } else if (this.data.status == 'fetched') {
      button.innerText = 'Submit';
      button.onclick = async function () {
        button.innerText = 'submitting...';
        button.setAttribute('disabled', 'disabled');
        const dataToSend = {
          course_id: that.data['course_id'],
          assignment_id: that.data['assignment_id']
        };
        try {
          const reply = await requestAPI<any>('assignments/submit', {
            body: JSON.stringify(dataToSend),
            method: 'POST'
          });

          if (!reply.success) {
            that.submit_error(reply);
            button.innerText = 'Submit';
            button.removeAttribute('disabled');
          } else {
            that.on_refresh(reply);
          }
        } catch (reason) {
          remove_children(container);
          container.innerText = 'Error submitting assignment.';
          console.error(
            `Error on POST /assignment_list/assignments/submit ${dataToSend}.\n${reason}`
          );
        }
      };
    } else if (this.data.status == 'submitted') {
      button.innerText = 'Fetch Feedback';
      button.onclick = async function () {
        button.innerText = 'Fetching Feedback...';
        button.setAttribute('disabled', 'disabled');
        const dataToSend = {
          course_id: that.data['course_id'],
          assignment_id: that.data['assignment_id']
        };
        try {
          const reply = await requestAPI<any>('assignments/fetch_feedback', {
            body: JSON.stringify(dataToSend),
            method: 'POST'
          });

          that.on_refresh(reply);
        } catch (reason) {
          remove_children(container);
          container.innerText = 'Error fetching feedback.';
          console.error(
            `Error on POST /assignments/fetch_feedback ${dataToSend}.\n${reason}`
          );
        }
      };
    }

    return container;
  }

  private make_row(): void {
    var row = document.createElement('div');
    row.classList.add('col-md-12');
    var link = this.make_link();
    row.append(link);
    var s = document.createElement('span');
    s.classList.add('item_course', 'col-sm-2');
    s.innerText = this.data['course_id'];
    row.append(s);

    var id, element;
    var children = document.createElement('div');
    if (this.data['status'] == 'submitted') {
      id = this.escape_id() + '-submissions';
      children.id = id;
      children.classList.add(
        'panel-collapse',
        'list_container',
        'assignment-notebooks'
      );
      children.setAttribute('role', 'tabpanel');

      var d = document.createElement('div');
      d.classList.add('list_item', 'row');
      children.append(d);
      for (var i = 0; i < this.data['submissions'].length; i++) {
        element = document.createElement('div');
        new Submission(
          element,
          this.data.submissions[i],
          this.options,
          this.app
        );
        children.append(element);
      }
    } else if (this.data['status'] === 'fetched') {
      id = this.escape_id();
      children.id = id;
      children.classList.add(
        'panel-collapse',
        'list_container',
        'assignment-notebooks',
        'collapse'
      );
      children.setAttribute('role', 'tabpanel');
      var d = document.createElement('div');
      d.classList.add('list_item', 'row');
      children.append(d);
      for (var i = 0; i < this.data['notebooks'].length; i++) {
        element = document.createElement('div');
        this.data.notebooks[i]['course_id'] = this.data['course_id'];
        this.data.notebooks[i]['assignment_id'] = this.data['assignment_id'];
        new Notebook(element, this.data.notebooks[i], this.options, this.app);
        children.append(element);
      }
    }

    row.append(this.make_button());
    this.element.innerHTML = '';

    this.element.append(row);
    this.element.append(children);
  }
}