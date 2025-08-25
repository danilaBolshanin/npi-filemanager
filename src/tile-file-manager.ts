import { Widget } from '@lumino/widgets';
import { ContentsManager } from '@jupyterlab/services';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { LabIcon } from '@jupyterlab/ui-components';

export class TileFileManagerWidget extends Widget {
  public cm: ContentsManager;
  public dr: DocumentRegistry;
  public basepath: string;
  public currentPath: string;
  private _onFolderChange: (path: string) => void;
  private _container: HTMLElement;
  private _breadcrumb: HTMLElement;

  public constructor(
    lab: JupyterFrontEnd,
    basepath: string = '',
    onFolderChange: (path: string) => void,
    id: string = 'jupyterlab-tilemanager'
  ) {
    super();
    this.id = id;
    this.addClass('jp-tileManagerWidget');
    this.addClass(id);

    //@ts-ignore
    this.cm = lab.serviceManager.contents;
    this.dr = lab.docRegistry;
    this.basepath = basepath === '' ? basepath : basepath + ':';
    this.currentPath = '';
    this._onFolderChange = onFolderChange;

    this._container = document.createElement('div');
    this._container.className = 'tile-container';

    this._breadcrumb = document.createElement('div');
    this._breadcrumb.className = 'tile-breadcrumb';

    this.node.appendChild(this._breadcrumb);
    this.node.appendChild(this._container);

    this.navigateTo('');
  }

  public navigateTo(path: string): void {
    this.currentPath = path.replace(/^\/|\/$/g, '');
    this.updateBreadcrumb();
    this.loadFolderContents();
  }

  private updateBreadcrumb(): void {
    this._breadcrumb.innerHTML = '';

    const normalizedPath = this.currentPath.replace(/^\/|\/$/g, '');
    const parts = normalizedPath.split('/').filter(part => part !== '');

    const breadcrumbContainer = document.createElement('div');
    breadcrumbContainer.className = 'tile-breadcrumb-path';

    // Добавляем корневой элемент
    const rootItem = document.createElement('span');
    rootItem.className = 'tile-breadcrumb-item';
    rootItem.textContent = 'Root';
    rootItem.onclick = () => this.navigateTo('');
    breadcrumbContainer.appendChild(rootItem);

    // Добавляем остальные элементы пути
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const separator = document.createElement('span');
      separator.className = 'tile-breadcrumb-separator';
      separator.textContent = ' / ';
      breadcrumbContainer.appendChild(separator);

      const item = document.createElement('span');
      item.className = 'tile-breadcrumb-item';
      item.textContent = part;

      const pathToNavigate = currentPath;
      item.onclick = () => this.navigateTo(pathToNavigate);

      breadcrumbContainer.appendChild(item);
    }

    this._breadcrumb.appendChild(breadcrumbContainer);
  }

  private loadFolderContents(): void {
    const fullPath = this.basepath + this.currentPath;

    this.cm
      .get(fullPath)
      .then(model => {
        this.renderContents(model.content);
      })
      .catch(error => {
        console.error('Error loading folder contents:', error);
        this._container.innerHTML =
          '<div class="tile-error">Error loading folder contents</div>';
      });
  }

  private renderContents(contents: any[]): void {
    // Очищаем контейнер
    this._container.innerHTML = '';

    // Сортируем: сначала папки, потом файлы
    const sortedContents = this.sortDataByType(contents);

    // Создаем плитки для каждого элемента
    sortedContents.forEach(item => {
      const tile = this.createTile(item);
      this._container.appendChild(tile);
    });
  }

  private createTile(item: any): HTMLElement {
    const tile = document.createElement('div');
    tile.className = `tile ${item.type}`;

    // Создаем иконку
    let icon: HTMLElement;
    if (item.type === 'directory') {
      icon = LabIcon.resolveElement({
        icon: this.dr.getFileType('directory')?.icon
      }) as HTMLElement;
      icon.className = 'tile-icon';
      tile.className += ' directory'; // Добавляем класс для папок
    } else {
      const extension = item.name.split('.').pop()?.toLowerCase();

      // Добавляем классы для конкретных типов файлов
      if (extension === 'js') {
        tile.classList.add('file-js');
      } else if (extension === 'ts') {
        tile.classList.add('file-ts');
      } else if (extension === 'json') {
        tile.classList.add('file-json');
      } else if (extension === 'css') {
        tile.classList.add('file-css');
      } else if (extension === 'html') {
        tile.classList.add('file-html');
      } else if (extension === 'py') {
        tile.classList.add('file-py');
      }

      const iconClass = this.dr.getFileTypesForPath(item.path);

      if (iconClass.length === 0) {
        icon = LabIcon.resolveElement({
          icon: this.dr.getFileType('text')?.icon
        }) as HTMLElement;
      } else {
        icon = LabIcon.resolveElement({
          icon: this.dr.getFileTypesForPath(item.path)[0].icon
        }) as HTMLElement;
      }

      icon.className = 'tile-icon';
      tile.className += ' file'; // Добавляем общий класс для файлов
    }

    // Создаем название
    const name = document.createElement('div');
    name.className = 'tile-name';
    name.textContent = item.name;

    tile.appendChild(icon);
    tile.appendChild(name);

    // Добавляем обработчики событий
    if (item.type === 'directory') {
      tile.onclick = () => {
        const path = item.path.startsWith('/')
          ? item.path.substring(1)
          : item.path;
        this.navigateTo(path);
        this._onFolderChange(path);
      };
    } else {
      tile.ondblclick = () => {
        // TODO: Реализовать открытие файла
        console.log('Open file:', item.path);
      };
    }

    return tile;
  }

  private sortDataByType(data: any[]): any[] {
    return data.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  }

  public setFolderChangeCallback(callback: (path: string) => void): void {
    this._onFolderChange = callback;
  }
}
