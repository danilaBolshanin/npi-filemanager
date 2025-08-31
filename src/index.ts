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
import { CommandIDs } from './utils';
import { TileFileManagerWidget } from './tile-file-manager';
import { TogglePanelWidget } from './toggle-main-panel-btn';
import { refreshIcon } from '@jupyterlab/ui-components';
import { Uploader } from './uploader';
import { registerCommands } from './register';

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

    app.shell.add(dockPanel, 'top', {});
    app.shell.add(stackedPanel, 'top', {});
    app.shell.add(toggleButton, 'top', { rank: 1000 });

    const refresh = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        app.commands.execute(CommandIDs.refresh + ':' + fileTree.id);
      },
      tooltip: 'Refresh'
    });

    fileTree.toolbar.addItem('upload', uploader);
    fileTree.toolbar.addItem('refresh', refresh);

    registerCommands(app, fileTree);
  }
};

export default plugin;
