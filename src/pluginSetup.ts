import { DockPanel, StackedPanel, Widget } from '@lumino/widgets';
import { TogglePanelWidget } from './toggle-main-panel-btn';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { DocumentManager } from '@jupyterlab/docmanager';
import { FileTreeWidget } from './file-tree';
import { TileFileManagerWidget } from './tile-file-manager';
import { Uploader } from './uploader';
import { ToolbarButton } from '@jupyterlab/apputils';
import { CommandIDs } from './utils';
import { refreshIcon } from '@jupyterlab/ui-components';
import { LogoButtonsWidget } from './top-buttons';

export function createMainWidgets() {
  const dockPanel = new DockPanel();
  const stackedPanel = new StackedPanel();
  const toggleButton = new TogglePanelWidget(dockPanel);
  const logoWidget = new LogoButtonsWidget(
    'https://s3.twcstorage.ru/c499f568-f74defa5-3966-4c98-81d8-620254b44e2c/logo.png', 
    'NPI Educational', 
    'Список курсов'
  );

  return { dockPanel, stackedPanel, toggleButton, logoWidget };
}

export function createDocumentManager(app: JupyterFrontEnd, dockPanel: DockPanel) {
  const widgets = new Set<Widget>();
  
  const opener = {
    open: (widget: Widget) => {
      if (!widgets.has(widget)) {
        dockPanel.addWidget(widget, { mode: 'tab-after' });
        widgets.add(widget);
      }
      dockPanel.activateWidget(widget);
      widget.disposed.connect((w: Widget) => {
        widgets.delete(w);
      });
    },
    get opened() {
      return {
        connect: () => false,
        disconnect: () => false
      };
    }
  };

  const docManger = new DocumentManager({
    registry: app.docRegistry,
    manager: app.serviceManager,
    opener
  });

  return { docManger };
}

export function createFileManager(
  app: JupyterFrontEnd, 
  dockPanel: DockPanel, 
  toggleButton: TogglePanelWidget,
  docManger: DocumentManager
) {
  let fileTree: FileTreeWidget;
  let tileManager: TileFileManagerWidget;

  // Создаем fileTree
  fileTree = new FileTreeWidget(
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

  // Создаем tileManager
  tileManager = new TileFileManagerWidget(
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

  // Создаем uploader
  const uploader = new Uploader({ manager: docManger, widget: fileTree });

  return { fileTree, tileManager, uploader };
}

export function setupWidgets(
  app: JupyterFrontEnd,
  dockPanel: DockPanel,
  stackedPanel: StackedPanel,
  fileTree: FileTreeWidget,
  tileManager: TileFileManagerWidget,
  toggleButton: TogglePanelWidget,
  logoWidget: LogoButtonsWidget
) {
  // Основная панель документа (с лаунчерами)
  dockPanel.id = 'npi-dockpanel';
  dockPanel.addClass('npi-dockpanel');
  dockPanel.addWidget(tileManager);

  // Левая панель (файловый браузер)
  stackedPanel.id = 'npi-stackedpanel';
  stackedPanel.addClass('npi-stackedpanel');
  stackedPanel.addWidget(fileTree);

  const widgetsToAdd = [
    { widget: dockPanel, area: 'top' as const, options: {} },
    { widget: stackedPanel, area: 'top' as const, options: {} },
    { widget: toggleButton, area: 'top' as const, options: { rank: 1000 } },
    { widget: logoWidget, area: 'top' as const, options: { rank: 0 } }
  ];

  widgetsToAdd.forEach(({ widget, area, options }) => {
    app.shell.add(widget, area, options);
  });
}

export function addToolbarItems(
  fileTree: FileTreeWidget,
  uploader: Uploader,
  app: JupyterFrontEnd
) {
  const refresh = new ToolbarButton({
    icon: refreshIcon,
    onClick: () => {
      app.commands.execute(CommandIDs.refresh + ':' + fileTree.id);
    },
    tooltip: 'Refresh'
  });

  fileTree.toolbar.addItem('upload', uploader);
  fileTree.toolbar.addItem('refresh', refresh);
}

