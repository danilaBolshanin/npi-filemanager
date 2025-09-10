import { JupyterFrontEnd } from "@jupyterlab/application";
import { PageConfig } from '@jupyterlab/coreutils';
import { remove_children, requestAPI } from "./utils";
import { validate } from "./validate";

export class Notebook {
  element: HTMLDivElement;
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

  private make_button(): HTMLSpanElement {
    var that = this;
    var container = document.createElement('span');
    container.classList.add('item_status', 'col-sm-4');
    var button = document.createElement('button');
    button.classList.add('btn', 'btn-default', 'btn-xs');

    container.append(button);

    button.innerText = 'Validate';
    button.onclick = async function () {
      button.innerText = 'Validating...';
      button.setAttribute('disabled', 'disabled');
      const dataToSend = { path: that.data['path'] };
      try {
        const reply = await requestAPI<any>('assignments/validate', {
          body: JSON.stringify(dataToSend),
          method: 'POST'
        });

        button.innerText = 'Validate';
        button.removeAttribute('disabled');
        const success = validate(reply);

        if (success) that.validate_success(button);
        else that.validate_failure(button);
      } catch (reason) {
        remove_children(container);
        container.innerText = 'Error validating assignment.';
        console.error(
          `Error on POST /assignments/validate ${dataToSend}.\n${reason}`
        );
      }
    };

    return container;
  }

  private validate_success(button: HTMLButtonElement): void {
    button.classList.remove('btn-default', 'btn-danger', 'btn-success');
    button.classList.add('btn-success');
  }

  private validate_failure(button: HTMLButtonElement): void {
    button.classList.remove('btn-default', 'btn-danger', 'btn-success');
    button.classList.add('btn-danger');
  }

  private make_row(): void {
    var app = this.app;
    var nb_path = this.data['path'];

    var container = document.createElement('div');
    container.classList.add('col-md-12');
    var s1 = document.createElement('span');
    s1.classList.add('item_name', 'col-sm-6');

    var a = document.createElement('a');
    a.href = '#';
    a.innerText = this.data['notebook_id'];
    a.onclick = function () {
      app.commands.execute('docmanager:open', {
        path: nb_path
      });
    };

    s1.append(a);

    container.append(s1);
    var s2 = document.createElement('span');
    s2.classList.add('item_course', 'col-sm-2');
    container.append(s2);
    container.append(this.make_button());
    this.element.append(container);
  }
}