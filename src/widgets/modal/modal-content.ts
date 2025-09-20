import { Widget } from '@lumino/widgets';

export class ModalContentWidget extends Widget {
  private _title: string;
  private _onClose: (() => void) | null = null;
  private _contentContainer: HTMLDivElement;
  private _closeButton!: HTMLButtonElement;

  constructor(title: string = 'Modal Title') {
    super();
    this._title = title;
    this.addClass('modal-content');

    // Создаем контейнер для контента
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'modal-content-container';

    this.renderContent();
  }

  private renderContent(): void {
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }

    const headerContainer = document.createElement('div');
    headerContainer.className = 'modal-header';

    // Создаем заголовок
    const titleElement = document.createElement('h2');
    titleElement.textContent = this._title;
    titleElement.className = 'modal-title';

    // Создаем контейнер для пользовательского контента
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'modal-content-container';

    // Создаем кнопку закрытия
    this._closeButton = document.createElement('button');
    this._closeButton.innerHTML = '&times;'; 
    this._closeButton.className = 'modal-close-x';
    this._closeButton.addEventListener('click', () => {
      if (this._onClose) {
        this._onClose();
      }
    });

    headerContainer.appendChild(titleElement);
    headerContainer.appendChild(this._closeButton);
    

    // Добавляем элементы в виджет
    this.node.appendChild(headerContainer);
    this.node.appendChild(this._contentContainer);
  }

  // Метод для установки HTML-контента
  public setHtmlContent(html: string): void {
    this._contentContainer.innerHTML = html;
  }

  // Метод для установки обработчика закрытия
  public setOnClose(callback: () => void): void {
    this._onClose = callback;
  }

  // Метод для обновления заголовка
  public setTitle(title: string): void {
    this._title = title;
    const titleElement = this.node.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  // Метод для добавления пользовательского контента
  public addContent(content: HTMLElement | Widget): void {
    if (content instanceof Widget) {
      this._contentContainer.appendChild(content.node);
    } else {
      this._contentContainer.appendChild(content);
    }
  }

  // Метод для очистки пользовательского контента
  public clearContent(): void {
    this._contentContainer.innerHTML = '';
  }
}
