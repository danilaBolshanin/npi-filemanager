import { JupyterFrontEnd } from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import { ContentsManager } from '@jupyterlab/services';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandIDs } from './utils';
import { LabIcon } from '@jupyterlab/ui-components';
//import { Time } from '@jupyterlab/coreutils';

export class FileTreeWidget extends Widget {
  public commands: any;
  public cm: ContentsManager;
  public dr: DocumentRegistry;
  public basepath: string;
  public controller: any;
  //@ts-ignore
  public table: HTMLTableElement;
  //@ts-ignore
  public tree: HTMLElement;
  public selected: string;
  private _openFolders: Set<string> = new Set();
  private _onFolderChange: (path: string) => void;
  private _onFileClick: (path: string) => void;

  public constructor(
    lab: JupyterFrontEnd,
    basepath = '',
    id = 'jupyterlab-filetree',
    onFolderChange: (path: string) => void = () => {},
    onFileClick: (path: string) => void = () => {}
  ) {
    super();
    this.id = id;
    this.addClass('jp-filetreeWidget');
    this.addClass(id);
    this._onFolderChange = onFolderChange;
    this._onFileClick = onFileClick;

    // Инициализация сервисов
    //@ts-ignore
    this.cm = lab.serviceManager.contents;
    this.dr = lab.docRegistry;
    this.commands = lab.commands;
    this.controller = {};
    this.selected = '';

    this.basepath = basepath === '' ? basepath : basepath + ':';

    // Загрузка корневой директории
    const base = this.cm.get(this.basepath);
    base
      .then(res => {
        this.controller[''] = { last_modified: res.last_modified, open: false };
        const table = this.buildTable(['Name'], res.content);
        this.node.appendChild(table);
      })
      .catch(error => {
        console.error('Error loading base directory:', error);
      });
  }

  public buildTable(headers: any, data: any): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'filetree-head';
    const thead = table.createTHead();
    const tbody = document.createElement('tbody');
    tbody.id = 'filetree-body';

    const headRow = document.createElement('tr');
    headers.forEach((el: string) => {
      const th = document.createElement('th');
      th.className = 'filetree-header';
      th.appendChild(document.createTextNode(el));
      headRow.appendChild(th);
    });

    headRow.children[headRow.children.length - 1].className += ' modified';
    thead.appendChild(headRow);
    table.appendChild(thead);

    this.table = table;
    this.tree = tbody;

    // Строим содержимое таблицы
    this.buildTableContents(data, 1, null);

    table.appendChild(tbody);
    return table;
  }

  public buildTableContents(
    data: any,
    level: number,
    parentElement: HTMLElement | null
  ): void {
    const commands = this.commands;
    const dataSorted = this.sortDataByType(data);

    dataSorted.forEach((entry: any, index: number) => {
      const isLast = index === dataSorted.length - 1;
      const tr = this.createTreeElement(entry, level, isLast);

      let path = entry.path;
      if (path.startsWith('/')) {
        path = path.slice(1);
      }

      // Обработка контекстного меню
      tr.oncontextmenu = () => {
        commands.execute(CommandIDs.set_context + ':' + this.id, { path });
      };

      tr.draggable = true;
      tr.ondragstart = event => {
        event.dataTransfer?.setData('Path', tr.id);
      };

      if (entry.type === 'directory') {
        // Обработка кликов на папках
        tr.onclick = event => {
          event.stopPropagation();
          event.preventDefault();

          const classList = (event.target as HTMLElement).classList;
          if (
            classList.contains('jp-DirListing-itemIcon') ||
            classList.contains('jp-icon-selectable')
          ) {
            // Клик на иконке - переключаем состояние
            this.toggleFolder(path, level, tr);
          } else if (
            this.selected === path &&
            classList.contains('filetree-name-span')
          ) {
            // Клик на имени выделенной папки - переименовать
            commands.execute(CommandIDs.rename + ':' + this.id);
          } else {
            // Клик на папке - выделяем и переключаем
            this.selectItem(path);
            this.toggleFolder(path, level, tr);

            this._onFolderChange(path);
          }
        };

        // Обработка drag and drop
        tr.ondrop = event => {
          commands.execute('filetree:move', {
            from: event.dataTransfer?.getData('Path'),
            to: path
          });
        };

        tr.ondragover = event => {
          event.preventDefault();
        };

        // Инициализация состояния папки в контроллере
        if (!(path in this.controller)) {
          this.controller[path] = {
            last_modified: entry.last_modified,
            open: false
          };
        }

        // Если папка уже была открыта, отображаем её содержимое
        if (this.controller[path].open) {
          this.openFolder(path, level, tr, false);
        }
      } else {
        // Обработка кликов на файлах
        tr.onclick = event => {
          event.stopPropagation();
          event.preventDefault();

          if (
            this.selected === path &&
            (event.target as HTMLElement).classList.contains(
              'filetree-name-span'
            )
          ) {
            // Клик на имени выделенного файла - переименовать
            commands.execute(CommandIDs.rename + ':' + this.id);
          } else {
            this.selectItem(path);
            this._onFileClick(path);
          }
        };

        tr.ondblclick = () => {
          commands.execute('docmanager:open', { path: this.basepath + path });
        };
      }

      // Добавление элемента в DOM
      if (level === 1) {
        // Корневой уровень
        const existingElement = this.tree.querySelector(`[id="${tr.id}"]`);
        if (existingElement) {
          this.tree.removeChild(existingElement);
        }
        this.tree.appendChild(tr);
      } else if (parentElement) {
        // Вложенный уровень
        const existingElement = parentElement.parentNode?.querySelector(
          `[id="${tr.id}"]`
        );
        if (existingElement) {
          existingElement.remove();
        }
        parentElement.after(tr);
      }
    });
  }

  public createTreeElement(
    object: any,
    level: number,
    isLast: boolean = false
  ): HTMLElement {
    const tr = document.createElement('tr');
    const td = document.createElement('td');

    tr.className = 'filetree-item';
    td.className = 'filetree-item-name';

    // Добавляем классы для уровней и последнего элемента
    if (level > 1) {
      td.classList.add(`level-${level}`);
    }
    if (isLast) {
      td.classList.add('last');
    }

    // Создаем иконку в зависимости от типа
    let icon: HTMLElement;
    if (object.type === 'directory') {
      icon = LabIcon.resolveElement({
        icon: this.dr.getFileType('directory')?.icon
      }) as HTMLElement;
      icon.className = 'jp-DirListing-itemIcon';
      tr.className += ' filetree-folder';
    } else {
      const extension = object.name.split('.').pop()?.toLowerCase();
      tr.className += ' filetree-file';

      // Добавляем классы для конкретных типов файлов
      if (extension === 'js') {
        tr.classList.add('file-js');
      } else if (extension === 'ts') {
        tr.classList.add('file-ts');
      } else if (extension === 'json') {
        tr.classList.add('file-json');
      } else if (extension === 'css') {
        tr.classList.add('file-css');
      }

      const iconClass = this.dr.getFileTypesForPath(object.path);

      if (iconClass.length === 0) {
        icon = LabIcon.resolveElement({
          icon: this.dr.getFileType('text')?.icon
        }) as HTMLElement;
      } else {
        icon = LabIcon.resolveElement({
          icon: this.dr.getFileTypesForPath(object.path)[0].icon
        }) as HTMLElement;
      }

      icon.className = 'jp-DirListing-itemIcon';
    }

    // Добавляем иконку и название
    td.appendChild(icon);
    const title = document.createElement('span');
    title.innerHTML = object.name;
    title.className = 'filetree-name-span';
    td.appendChild(title);

    // Устанавливаем отступ для уровня вложенности
    td.style.setProperty('--indent', level + 'em');

    tr.appendChild(td);
    tr.id = this.btoa(object.path);
    tr.setAttribute('data-level', level.toString());
    tr.setAttribute('data-path', object.path);
    tr.setAttribute('data-parent', this.getParentPath(object.path));

    return tr;
  }

  public sortDataByType(data: any): any[] {
    return data.sort((a: any, b: any) => {
      if (a.type === b.type) return 0;
      return a.type === 'directory' ? -1 : 1;
    });
  }

  private toggleFolder(
    path: string,
    level: number,
    element: HTMLElement
  ): void {
    if (this.controller[path]?.open) {
      // Закрываем папку
      this.closeFolder(path);
      this._openFolders.delete(path);
    } else {
      // Открываем папку
      this.openFolder(path, level, element, true);
      this._openFolders.add(path);

      // Уведомляем о изменении папки
      this._onFolderChange(path);
    }
  }

  private openFolder(
    path: string,
    level: number,
    element: HTMLElement,
    closeSiblings: boolean = true
  ): void {
    if (this.controller[path] && !this.controller[path].open) {
      this.cm
        .get(path)
        .then(res => {
          this.controller[path].open = true;
          this.controller[path].last_modified = res.last_modified;

          // Закрываем другие папки на том же уровне, если нужно
          if (closeSiblings) {
            this.closeSiblings(path, level);
          }

          // Добавляем содержимое папки
          this.buildTableContents(res.content, level + 1, element);

          // Добавляем класс для визуального обозначения открытой папки
          element.classList.add('open');
          this._openFolders.add(path);
        })
        .catch(error => {
          console.error('Error opening folder:', error);
        });
    }
  }

  private closeSiblings(path: string, level: number): void {
    const parentPath = this.getParentPath(path);
    const siblings = this.tree.querySelectorAll(
      `[data-parent="${parentPath}"]`
    );

    siblings.forEach(sibling => {
      const siblingPath = sibling.getAttribute('data-path');
      if (
        siblingPath &&
        siblingPath !== path &&
        this.controller[siblingPath]?.open
      ) {
        this.closeFolder(siblingPath);
      }
    });
  }

  private closeFolder(path: string): void {
    if (this.controller[path] && this.controller[path].open) {
      this.controller[path].open = false;

      // Удаляем дочерние элементы из DOM
      const element = this.tree.querySelector(
        `[data-path="${path}"]`
      ) as HTMLElement;
      if (element) {
        element.classList.remove('open');

        // Находим и удаляем все дочерние элементы
        const level = parseInt(element.getAttribute('data-level') || '0');
        let next = element.nextElementSibling as HTMLElement | null;

        while (next) {
          const nextLevel = parseInt(next.getAttribute('data-level') || '0');
          if (nextLevel <= level) break;

          const toRemove = next;
          next = next.nextElementSibling as HTMLElement | null;

          // Обновляем контроллер для дочерних папок
          const childPath = toRemove.getAttribute('data-path');
          if (childPath && this.controller[childPath]) {
            this.controller[childPath].open = false;
            this._openFolders.delete(childPath);
          }

          toRemove.remove();
        }
      }

      this._openFolders.delete(path);
    }
  }

  private getParentPath(path: string): string {
    if (path.startsWith('/')) {
      path = path.slice(1);
    }

    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return ''; // Корневой уровень
    }

    return path.substring(0, lastSlashIndex);
  }

  private selectItem(path: string): void {
    // Снимаем выделение с предыдущего элемента
    if (this.selected) {
      const prevElement = this.tree.querySelector(
        `[data-path="${this.selected}"]`
      );
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }

    // Выделяем новый элемент
    this.selected = path;
    const element = this.tree.querySelector(`[data-path="${path}"]`);
    if (element) {
      element.classList.add('selected');
    }

    // Уведомляем о изменении выделенной папки
    this._onFolderChange(path);
  }

  private btoa(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  // Метод для обновления дерева (может быть полезен при внешних изменениях)
  public refresh(): void {
    // Очищаем текущее состояние
    while (this.tree.firstChild) {
      this.tree.removeChild(this.tree.firstChild);
    }

    this._openFolders.clear();
    this.selected = '';

    // Перезагружаем корневую директорию
    const base = this.cm.get(this.basepath);
    base
      .then(res => {
        this.controller[''] = { last_modified: res.last_modified, open: false };
        this.buildTableContents(res.content, 1, null);
      })
      .catch(error => {
        console.error('Error refreshing file tree:', error);
      });
  }

  public navigateTo(path: string): void {
    const normalizedPath = path.replace(/^\/|\/$/g, '');

    //this.collapseAll();

    this.ensurePathExpanded(normalizedPath);

    // Если путь пустой - останавливаемся на корне
    /*
    if (!normalizedPath) {
      this.selected = '';
      return;
    }
    */

    this.expandPathTo(normalizedPath);

    this.selectItem(normalizedPath);

    this.scrollToItem(normalizedPath);
  }

  private expandPathTo(path: string): void {
    const parts = path.split('/').filter(part => part !== '');
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (this.controller[currentPath] && !this.controller[currentPath].open) {
        const element = this.tree.querySelector(
          `[data-path="${currentPath}"]`
        ) as HTMLElement;
        if (element) {
          const level = parseInt(element.getAttribute('data-level') || '0');
          this.openFolder(currentPath, level, element, false);
          this._openFolders.add(currentPath);
        }
      }
    }
  }

  private ensurePathExpanded(path: string): void {
    const parts = path.split('/').filter(part => part !== '');
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const element = this.tree.querySelector(
        `[data-path="${currentPath}"]`
      ) as HTMLElement;

      if (element) {
        const level = parseInt(element.getAttribute('data-level') || '0');

        // Если папка еще не открыта, открываем ее
        if (!this.controller[currentPath]?.open) {
          this.openFolder(currentPath, level, element, false);
        }
      } else {
        // Если элемента нет в DOM, нужно загрузить родительскую папку
        console.warn('Element not found in DOM:', currentPath);
      }
    }
  }

  private scrollToItem(path: string): void {
    const element = this.tree.querySelector(
      `[data-path="${path}"]`
    ) as HTMLElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  public collapseAll(): void {
    // Закрываем все открытые папки
    this._openFolders.forEach(openPath => {
      this.closeFolder(openPath);
    });
    this._openFolders.clear();

    // Снимаем выделение
    if (this.selected) {
      const prevElement = this.tree.querySelector(
        `[data-path="${this.selected}"]`
      );
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
      this.selected = '';
    }
  }

  public setFolderChangeCallback(callback: (path: string) => void): void {
    this._onFolderChange = callback;
  }
}
