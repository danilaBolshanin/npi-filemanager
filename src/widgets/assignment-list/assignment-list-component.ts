import { JupyterFrontEnd } from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import { PageConfig } from '@jupyterlab/coreutils';
import { Assignment } from './assignment';
import { requestAPI } from './utils';

export class AssignmentList {
  released_selector: string;
  fetched_selector: string;
  submitted_selector: string;
  released_element: HTMLDivElement;
  fetched_element: HTMLDivElement;
  submitted_element: HTMLDivElement;
  options: Map<string, string>;
  base_url: string;
  app: JupyterFrontEnd;
  callback: (() => void) | undefined;

  list_loading_ids = [
    'released_assignments_list_loading',
    'fetched_assignments_list_loading',
    'submitted_assignments_list_loading'
  ];
  list_placeholder_ids = [
    'released_assignments_list_placeholder',
    'fetched_assignments_list_placeholder',
    'submitted_assignments_list_placeholder'
  ];
  list_error_ids = [
    'released_assignments_list_error',
    'fetched_assignments_list_error',
    'submitted_assignments_list_error'
  ];

  constructor(
    widget: Widget,
    released_selector: string,
    fetched_selector: string,
    submitted_selector: string,
    options: Map<string, string>,
    app: JupyterFrontEnd
  ) {
    this.released_selector = released_selector;
    this.fetched_selector = fetched_selector;
    this.submitted_selector = submitted_selector;

    var div_elements = widget.node.getElementsByTagName('div');
    // this.released_element = div_elements.namedItem(released_selector);
    const releasedElem = div_elements.namedItem(released_selector);
    if (!releasedElem) {
      throw new Error(`Element with id "${released_selector}" not found`);
    }
    this.released_element = releasedElem as HTMLDivElement;
    // this.fetched_element = div_elements.namedItem(fetched_selector);
    const fetchedElem = div_elements.namedItem(fetched_selector);
    if (!fetchedElem) {
      throw new Error(`Element with id "${fetched_selector}" not found`);
    }
    this.fetched_element = fetchedElem as HTMLDivElement;
    // this.submitted_element = div_elements.namedItem(submitted_selector);
    const submittedElem = div_elements.namedItem(submitted_selector);
    if (!submittedElem) {
      throw new Error(`Element with id "${submitted_selector}" not found`);
    }
    this.submitted_element = submittedElem as HTMLDivElement;

    this.options = options;
    this.base_url = options.get('base_url') || PageConfig.getBaseUrl();

    this.app = app;
    this.callback = undefined;
  }

  public clear_list(loading: boolean): void {
    var elems = [
      this.released_element,
      this.fetched_element,
      this.submitted_element
    ];
    var i;
    var j;

    // remove list items
    for (i = 0; i < elems.length; i++) {
      for (j = 0; j < elems[i].children.length; ++j) {
        if (elems[i].children[j].classList.contains('list_item')) {
          elems[i].removeChild(elems[i].children[j]);
          --j;
        }
      }

      if (loading) {
        // show loading
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_loading_ids[i])
        )).hidden = false;

        // hide placeholders and errors
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_placeholder_ids[i])
        )).hidden = true;
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_error_ids[i])
        )).hidden = true;
      } else {
        // show placeholders display
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_placeholder_ids[i])
        )).hidden = false;

        // hide loading and errors
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_loading_ids[i])
        )).hidden = true;
        (<HTMLDivElement>(
          elems[i].children.namedItem(this.list_error_ids[i])
        )).hidden = true;
      }
    }
  }

  private load_list_success(data: string | any[]): void {
    this.clear_list(false);

    var len = data.length;
    for (var i = 0; i < len; i++) {
      var element = document.createElement('div');
      new Assignment(
        element,
        data[i],
        this.fetched_selector,
        newData => {
          this.handle_load_list(newData);
        },
        this.options,
        this.app
      );
      if (data[i].status === 'released') {
        this.released_element.append(element);
        (<HTMLDivElement>(
          this.released_element.children.namedItem(
            'released_assignments_list_placeholder'
          )
        )).hidden = true;
      } else if (data[i]['status'] === 'fetched') {
        this.fetched_element.append(element);
        (<HTMLDivElement>(
          this.fetched_element.children.namedItem(
            'fetched_assignments_list_placeholder'
          )
        )).hidden = true;
      } else if (data[i]['status'] === 'submitted') {
        this.submitted_element.append(element);
        (<HTMLDivElement>(
          this.submitted_element.children.namedItem(
            'submitted_assignments_list_placeholder'
          )
        )).hidden = true;
      }
    }

    var assignments = this.fetched_element.getElementsByClassName(
      'assignment-notebooks-link'
    );
    for (let a of Array.from(assignments)) {
      var icon = document.createElement('i');
      icon.classList.add('fa', 'fa-caret-right');
      a.append(icon);
      (<HTMLAnchorElement>a).onclick = function (event) {
        if (a.children[0].classList.contains('fa-caret-right')) {
          a.children[0].classList.remove('fa-caret-right');
          a.children[0].classList.add('fa-caret-down');
        } else {
          a.children[0].classList.remove('fa-caret-down');
          a.children[0].classList.add('fa-caret-right');
        }

        /* Open or close collapsed child list on click */
        const list_item = (<HTMLAnchorElement>event.target).closest(
          '.list_item'
        );
        list_item?.querySelector('.collapse')?.classList.toggle('in');
      };
    }

    if (this.callback) {
      this.callback();
      this.callback = undefined;
    }
  }

  public show_error(error: string): void {
    var elems = [
      this.released_element,
      this.fetched_element,
      this.submitted_element
    ];
    var i;

    // remove list items
    for (i = 0; i < elems.length; i++) {
      for (var j = 0; j < elems[i].children.length; ++j) {
        if (elems[i].children[j].classList.contains('list_item')) {
          elems[i].removeChild(elems[i].children[j]);
          --j;
        }
      }

      // show errors
      (<HTMLDivElement>(
        elems[i].children.namedItem(this.list_error_ids[i])
      )).hidden = false;
      (<HTMLDivElement>(
        elems[i].children.namedItem(this.list_error_ids[i])
      )).innerText = error;

      // hide loading and placeholding
      (<HTMLDivElement>(
        elems[i].children.namedItem(this.list_loading_ids[i])
      )).hidden = true;
      (<HTMLDivElement>(
        elems[i].children.namedItem(this.list_placeholder_ids[i])
      )).hidden = true;
    }
  }

  public handle_load_list(data: { success: any; value: any }): void {
    if (data.success) {
      this.load_list_success(data.value);
    } else {
      this.show_error(data.value);
    }
  }

  public async load_list(course: string, callback: any) {
    this.callback = callback;
    this.clear_list(true);

    try {
      const data = await requestAPI<any>('assignments?course_id=' + course, {
        method: 'GET'
      });
      //console.log(data);
      this.handle_load_list(data);
    } catch (reason) {
      console.error(`Error on GET /assignments.\n${reason}`);
    }
  }
}

export class CourseList {
  course_list_selector: string;
  default_course_selector: string;
  dropdown_selector: string;
  refresh_selector: string;
  assignment_list: AssignmentList;
  current_course: string | undefined;
  options = new Map();
  base_url: string;
  data: string[] | undefined;
  course_list_element: HTMLUListElement;
  default_course_element: HTMLButtonElement;
  dropdown_element: HTMLButtonElement;
  refresh_element: HTMLButtonElement;

  constructor(
    widget: Widget,
    course_list_selector: string,
    default_course_selector: string,
    dropdown_selector: string,
    refresh_selector: string,
    assignment_list: AssignmentList,
    options: Map<string, string>
  ) {
    this.course_list_selector = course_list_selector;
    this.default_course_selector = default_course_selector;
    this.dropdown_selector = dropdown_selector;
    this.refresh_selector = refresh_selector;
    // this.course_list_element = widget.node
    //   .getElementsByTagName('ul')
    //   .namedItem(course_list_selector);
    const el = widget.node
      .getElementsByTagName('ul')
      .namedItem(course_list_selector);
    if (!el) {
      throw new Error(`Element ${course_list_selector} not found`);
    }
    this.course_list_element = el;
    var buttons = widget.node.getElementsByTagName('button');
    // this.default_course_element = buttons.namedItem(default_course_selector);
    const defaultCourseEl = buttons.namedItem(default_course_selector);
    if (!defaultCourseEl) {
      throw new Error(`Button with id "${default_course_selector}" not found`);
    }
    this.default_course_element = defaultCourseEl as HTMLButtonElement;
    // this.dropdown_element = buttons.namedItem(dropdown_selector);
    const dropdownEl = buttons.namedItem(dropdown_selector);
    if (!dropdownEl) {
      throw new Error(`Button with id "${dropdown_selector}" not found`);
    }
    this.dropdown_element = dropdownEl as HTMLButtonElement;
    // this.refresh_element = buttons.namedItem(refresh_selector);
    const refreshEl = buttons.namedItem(refresh_selector);
    if (!refreshEl) {
      throw new Error(`Button with id "${refresh_selector}" not found`);
    }
    this.refresh_element = refreshEl as HTMLButtonElement;

    this.assignment_list = assignment_list;
    this.current_course = undefined;

    //options = options || {};
    this.options = options;
    this.base_url = options.get('base_url') || PageConfig.getBaseUrl();

    this.data = undefined;

    var that = this;

    /* Open the dropdown course_list when clicking on dropdown toggle button */
    this.dropdown_element.onclick = function () {
      that.course_list_element.classList.toggle('open');
    };

    /* Close the dropdown course_list if clicking anywhere else */
    document.onclick = function (event) {
      if (
        (<HTMLElement>event.target).closest('button') != that.dropdown_element
      ) {
        that.course_list_element.classList.remove('open');
      }
    };

    this.refresh_element.onclick = function () {
      that.load_list();
    };
    this.bind_events();
  }

  private enable_list(): void {
    this.dropdown_element.removeAttribute('disabled');
  }

  private disable_list(): void {
    this.dropdown_element.setAttribute('disabled', 'disabled');
  }

  public clear_list(): void {
    // remove list items
    if (this.course_list_element.children.length > 0) {
      this.course_list_element.innerHTML = '';
    }
  }

  private bind_events(): void {
    this.refresh_element.click();
  }

  private async load_list() {
    this.disable_list();
    this.clear_list();
    this.assignment_list.clear_list(true);

    try {
      const data = await requestAPI<any>('courses');
      this.handle_load_list(data);
    } catch (reason) {
      console.error(`Error on GET /courses.\n${reason}`);
    }
  }

  private handle_load_list(data: { success: any; value: any }): void {
    if (data.success) {
      this.load_list_success(data.value);
    } else {
      this.default_course_element.innerText = 'Error fetching courses!';
      this.enable_list();
      this.assignment_list.show_error(data.value);
    }
  }

  private load_list_success(data: string[]): void {
    this.data = data;
    this.disable_list();
    this.clear_list();

    if (this.data.length === 0) {
      this.default_course_element.innerText = 'No courses found.';
      this.assignment_list.clear_list(false);
      this.enable_list();
      return;
    }

    if (
      this.current_course !== undefined &&
      !this.data.includes(this.current_course)
    ) {
      this.current_course = undefined;
    }

    if (this.current_course === undefined) {
      this.change_course(this.data[0]);
    } else {
      // we still want to "change" the course here to update the
      // assignment list
      this.change_course(this.current_course);
    }
  }

  private change_course(course: string): void {
    this.disable_list();
    if (this.current_course !== undefined) {
      this.default_course_element.innerText = course;
    }
    this.current_course = course;
    this.default_course_element.innerText = this.current_course;
    var success = () => {
      this.load_assignment_list_success();
    };
    this.assignment_list.load_list(course, success);
  }

  private load_assignment_list_success(): void {
    if (this.data) {
      var that = this;
      var set_course = function (course: string) {
        return function () {
          that.change_course(course);
        };
      };

      for (var i = 0; i < this.data.length; i++) {
        var a = document.createElement('a');
        a.href = '#';
        a.innerText = this.data[i];
        var element = document.createElement('li');
        element.append(a);
        element.onclick = set_course(this.data[i]);
        this.course_list_element.append(element);
      }
      this.data = undefined;
    }
    this.enable_list();
  }
}
