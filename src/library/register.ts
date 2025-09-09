import { JupyterFrontEnd } from '@jupyterlab/application';
import { FileTreeWidget } from '../widgets/file-tree/file-tree';
import { PathExt } from '@jupyterlab/coreutils';
import { CommandIDs, switchView, u_atob, u_btoa } from './utils';

export function registerCommands(
  app: JupyterFrontEnd,
  fileTree: FileTreeWidget
) {
  app.commands.addCommand(CommandIDs.toggle + ':' + fileTree.id, {
    execute: args => {
      const row = args.row as string;
      const level = args.level as number;

      let row_element = fileTree.node.querySelector<HTMLElement>(
        "[id='" + u_btoa(row) + "']"
      );

      if (
        row_element?.nextElementSibling &&
        u_atob(row_element?.nextElementSibling.id).startsWith(row + '/')
      ) {
        // next element in folder, already constructed
        const display = switchView(
          fileTree.node.querySelector<HTMLElement>(
            "[id='" + row_element?.nextElementSibling.id + "']"
          )?.style.display
        );
        fileTree.controller[row].open = !fileTree.controller[row].open;
        const open_flag = fileTree.controller[row].open;
        // open folder
        while (
          row_element?.nextElementSibling &&
          u_atob(row_element.nextElementSibling.id).startsWith(row + '/')
        ) {
          row_element = fileTree.node.querySelector(
            "[id='" + row_element.nextElementSibling.id + "']"
          );
          // check if the parent folder is open
          if (
            !open_flag ||
            (row_element &&
              fileTree.controller[PathExt.dirname(u_atob(row_element.id))].open)
          ) {
            if (row_element) {
              row_element.style.display = display;
            }
          }
        }
      } else {
        // if children elements don't exist yet
        const base = app.serviceManager.contents.get(fileTree.basepath + row);
        base.then(res => {
          fileTree.buildTableContents(res.content, level, row_element);
          fileTree.controller[row] = {
            last_modified: res.last_modified,
            open: true
          };
        });
      }
    }
  });

  app.commands.addCommand(CommandIDs.select + ':' + fileTree.id, {
    execute: args => {
      if (fileTree.selected !== '') {
        const element = fileTree.node.querySelector(
          "[id='" + u_btoa(fileTree.selected) + "']"
        );
        if (element !== null) {
          element.className = element.className.replace('selected', '');
        }
      }
      if (args.path === '') {
        return;
      }
      fileTree.selected = args.path as string;
      const element = fileTree.node.querySelector(
        "[id='" + u_btoa(fileTree.selected) + "']"
      );
      if (element !== null) {
        element.className += ' selected';
      }
    },
    label: 'Select'
  });

  app.commands.addCommand(CommandIDs.refresh + ':' + fileTree.id, {
    execute: () => {
      Object.keys(fileTree.controller).forEach(key => {
        const promise = app.serviceManager.contents.get(
          fileTree.basepath + key
        );
        promise.then(async res => {
          if (res.last_modified > fileTree.controller[key].last_modified) {
            fileTree.controller[key].last_modified = res.last_modified;
          }
        });
        promise.catch(reason => {
          console.log(reason);
          delete fileTree.controller[key];
        });
      });
      fileTree.refresh();
    }
  });
}
