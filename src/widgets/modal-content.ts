import { Widget } from '@lumino/widgets';

export class ModalContentWidget extends Widget {
  private _title: string;
  private _onClose: (() => void) | null = null;
  private _contentContainer: HTMLDivElement;

  constructor(title: string = 'Modal Title') {
    super();
    this._title = title;
    this.addClass('modal-content');
    
    // Создаем контейнер для контента
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'modal-content-container';
    
    this.renderContent();
  }

  // Метод для рендеринга содержимого
  private renderContent(): void {
    // Очищаем текущее содержимое
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }

    // Создаем заголовок
    const titleElement = document.createElement('h2');
    titleElement.textContent = this._title;
    titleElement.className = 'modal-title';

    // Создаем контейнер для пользовательского контента
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'modal-content-container';

    // Создаем кнопку закрытия
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'modal-close-button';
    closeButton.addEventListener('click', () => {
      if (this._onClose) {
        this._onClose();
      }
    });

    // Добавляем элементы в виджет
    this.node.appendChild(titleElement);
    this.node.appendChild(this._contentContainer);
    this.node.appendChild(closeButton);
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