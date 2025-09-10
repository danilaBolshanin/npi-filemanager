import { JupyterFrontEnd } from "@jupyterlab/application";
import { PageConfig } from '@jupyterlab/coreutils';

export class Submission {
  element: any;
  data: any;
  options: Map<string, string>;
  base_url: any;
  app: JupyterFrontEnd;

  constructor(
    element: HTMLDivElement,
    data: any,
    options: Map<string, string>,
    app: JupyterFrontEnd
  ) {
    this.element = element;
    this.data = data;
    this.options = options;
    this.base_url = options.get('base_url') || PageConfig.getBaseUrl();
    this.app = app;
    this.style();
    this.make_row();
  }

  private style(): void {
    this.element.classList.add('list_item', 'row', 'nested_list_item');
  }

  private make_row(): void {
    var container = document.createElement('div');
    container.classList.add('col-md-12');
    var status = document.createElement('span');
    status.classList.add('item_name', 'col-sm-6');
    var s = (document.createElement('span').innerText = this.data['timestamp']);
    status.append(s);

    if (this.data['has_local_feedback'] && !this.data['feedback_updated']) {
      var app = this.app;
      var feedback_path = this.data['local_feedback_path'];
      // var url = URLExt.join(this.base_url, 'tree', this.data['local_feedback_path']);
      var link = document.createElement('a');
      link.onclick = function () {
        app.commands.execute('filebrowser:go-to-path', {
          path: feedback_path
        });
      };
      link.innerText = ' (view feedback)';
      status.append(link);
    } else if (this.data['has_exchange_feedback']) {
      var feedback = document.createElement('span');
      feedback.innerText = ' (feedback available to fetch)';
      status.append(feedback);
    } else {
      var feedback = document.createElement('span');
      feedback.innerText = '';
      status.append(feedback);
    }
    container.append(status);
    var s1 = document.createElement('span');
    s1.classList.add('item_course', 'col-sm-2');
    container.append(s1);
    var s2 = document.createElement('span');
    s2.classList.add('item_status', 'col-sm-4');
    container.append(s2);
    this.element.append(container);
  }
}