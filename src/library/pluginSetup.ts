import { DockPanel, StackedPanel, Widget } from '@lumino/widgets';
import { ToolbarButton } from '@jupyterlab/apputils';
import { refreshIcon } from '@jupyterlab/ui-components';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { DocumentManager } from '@jupyterlab/docmanager';

import { TogglePanelWidget } from '../widgets/tile-file-manager/toggle-panel';
import { FileTreeWidget } from '../widgets/file-tree/index';
import { TileFileManagerWidget } from '../widgets/tile-file-manager/index';
import { Uploader } from '../widgets/uploader';
import { LogoButtonsWidget } from '../widgets/top-buttons';
import { ModalWidget } from '../widgets/modal/index';
import { AssignmentListWidget } from '../widgets/assignment-list/index';

import { CommandIDs } from './utils';
import { NPI_EDU_NAME, NPI_LOGO_URL } from './constants';

export function createMainWidgets(app: JupyterFrontEnd) {
  const dockPanel = new DockPanel();
  const stackedPanel = new StackedPanel();
  const toggleButton = new TogglePanelWidget(dockPanel);
  const logoWidget = new LogoButtonsWidget(NPI_LOGO_URL, NPI_EDU_NAME);
  const modalWidget = new ModalWidget('Список курсов', 'Список курсов');
  const assignmentList = new AssignmentListWidget(app);
  console.log(assignmentList)

  //modalWidget.addContent(assignmentList);

  logoWidget.setButtonClickHandler(() => {
    window?.open("https://tutor-npi.ru/")
  })

  return { dockPanel, stackedPanel, toggleButton, logoWidget, modalWidget };
}

export function createDocumentManager(
  app: JupyterFrontEnd,
  dockPanel: DockPanel
) {
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
      toggleButton.setPanelState(true);
    },
    _ => {
      dockPanel.node.style.display = 'none';
      toggleButton.setPanelState(false);
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
      toggleButton.setPanelState(false);
      if (toggleButton) {
        toggleButton.node.style.display = 'block';
      }
    },
    'jupyterlab-filetree'
  );

  tileManager.setToggleButton(toggleButton);

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
  logoWidget: LogoButtonsWidget,
  modalWidget: ModalWidget,
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
    { widget: logoWidget, area: 'top' as const, options: { rank: 0 } },
    { widget: modalWidget, area: 'top' as const, options: { rank: 0 } },
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
