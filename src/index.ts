import {
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import {
  ICommandPalette,
  IWindowResolver,
  ToolbarButton
} from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DockPanel, StackedPanel, Widget } from '@lumino/widgets';
import { FileTreeWidget } from './file-tree';
import { CommandIDs, switchView, u_atob, u_btoa } from './utils';
import { PathExt } from '@jupyterlab/coreutils';
import { TileFileManagerWidget } from './tile-file-manager';
import { TogglePanelWidget } from './toggle-main-panel-btn';
import { refreshIcon } from '@jupyterlab/ui-components';
import { Uploader } from './uploader';

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
  activate: (app: JupyterFrontEnd) => {
    const widgets: Widget[] = [];

    const dockPanel = new DockPanel();
    const stackedPanel = new StackedPanel();
    const toggleButton = new TogglePanelWidget(dockPanel);

    const opener = {
      open: (widget: Widget) => {
        if (widgets.indexOf(widget) === -1) {
          dockPanel.addWidget(widget, { mode: 'tab-after' });
          widgets.push(widget);
        }
        dockPanel.activateWidget(widget);
        //activeWidget = widget;
        widget.disposed.connect((w: Widget) => {
          const index = widgets.indexOf(w);
          widgets.splice(index, 1);
        });
      },
      get opened() {
        return {
          connect: () => {
            return false;
          },
          disconnect: () => {
            return false;
          }
        };
      }
    };

    const docManger = new DocumentManager({
      registry: app.docRegistry,
      manager: app.serviceManager,
      opener
    });

    const fileTree = new FileTreeWidget(
      app,
      '',
      'jupyterlab-filetree',
      (path: string) => {
        tileManager.navigateTo(path);
      },
      _ => {
        dockPanel.node.style.display = 'none';
      }
    );
    const tileManager = new TileFileManagerWidget(
      app,
      '',
      (path: string) => {
        if (path === '') {
          fileTree.collapseAll();
        } else {
          fileTree.navigateTo(path);
        }
      },
      _ => {
        dockPanel.node.style.display = 'none';
        if (toggleButton) {
          toggleButton.node.style.display = 'block';
        }
      },
      'jupyterlab-filetree'
    );

    const uploader = new Uploader({ manager: docManger, widget: fileTree });

    //main doc panel (with lauchers)
    dockPanel.id = 'npi-dockpanel';
    dockPanel.addClass('npi-dockpanel');
    dockPanel.addWidget(tileManager);

    //left stacked panel (filebrowser)
    stackedPanel.id = 'npi-stackedpanel';
    stackedPanel.addClass('npi-stackedpanel');
    stackedPanel.addWidget(fileTree);

    //fixed toggle button
    toggleButton.id = 'npi-toggle-container';

    app.shell.add(dockPanel, 'top', {});
    app.shell.add(stackedPanel, 'top', {});
    app.shell.add(toggleButton, 'top', { rank: 1000 });

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

    const refresh = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        app.commands.execute(CommandIDs.refresh + ':' + fileTree.id);
      },
      tooltip: 'Refresh'
    });

    fileTree.toolbar.addItem('upload', uploader);
    fileTree.toolbar.addItem('refresh', refresh);

    console.log(fileTree);
  }
};

export default plugin;
