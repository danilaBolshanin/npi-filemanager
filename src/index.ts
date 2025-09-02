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

import { registerCommands } from './register';
import {
  addToolbarItems,
  createDocumentManager,
  createFileManager,
  createMainWidgets,
  setupWidgets
} from './pluginSetup';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'npi-filemanager',
  description: 'NPI file manager extension for jupyterlab',
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
    const { dockPanel, stackedPanel, toggleButton, logoWidget } =
      createMainWidgets();

    const { docManger } = createDocumentManager(app, dockPanel);

    const { fileTree, tileManager, uploader } = createFileManager(
      app,
      dockPanel,
      toggleButton,
      docManger
    );

    setupWidgets(
      app,
      dockPanel,
      stackedPanel,
      fileTree,
      tileManager,
      toggleButton,
      logoWidget
    );

    registerCommands(app, fileTree);

    addToolbarItems(fileTree, uploader, app);
  }
};

export default plugin;
