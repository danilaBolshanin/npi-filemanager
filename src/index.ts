import {
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { ICommandPalette, IWindowResolver } from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { DockPanel, StackedPanel } from '@lumino/widgets';
import { FileTreeWidget } from './file-tree';
import { CommandIDs, switchView, u_atob, u_btoa } from './utils';
import { PathExt } from '@jupyterlab/coreutils';
import { TileFileManagerWidget } from './tile-file-manager';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'react-widget',
  description: 'A minimal JupyterLab extension using a React Widget.',
  autoStart: true,
  optional: [ILauncher],
  requires: [
    ICommandPalette,
    IFileBrowserFactory,
    JupyterFrontEnd.IPaths,
    IWindowResolver,
    ILayoutRestorer,
    IDocumentManager,
    IRouter
  ],
  activate: (app: JupyterFrontEnd, {}: JupyterFrontEnd) => {
    const dockPanel = new DockPanel();
    const stackedPanel = new StackedPanel();

    const fileTree = new FileTreeWidget(
      app,
      '',
      'jupyterlab-filetree',
      (path: any) => {
        tileManager.navigateTo(path);
      }
    );
    const tileManager = new TileFileManagerWidget(
      app,
      '',
      (path: any) => {
        fileTree.navigateTo(path);
      },
      'jupyterlab-filetree'
    );

    //main doc panel (with lauchers)
    dockPanel.id = 'npi-dockpanel';
    dockPanel.addClass('npi-dockpanel');
    dockPanel.addWidget(tileManager);

    //left stacked panel (filebrowser)
    stackedPanel.id = 'npi-stackedpanel';
    stackedPanel.addClass('npi-stackedpanel');
    stackedPanel.addWidget(fileTree);

    app.shell.add(dockPanel, 'top', {});
    app.shell.add(stackedPanel, 'top', {});

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
                fileTree.controller[PathExt.dirname(u_atob(row_element.id))]
                  .open)
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
  }
};

export default plugin;
