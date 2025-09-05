import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

export class ModalWidget extends Widget {
  private _openButton: HTMLButtonElement;
  private _modalOverlay: HTMLDivElement;
  private _modalContent: HTMLDivElement;
  private _closeButton: HTMLButtonElement;

  constructor(buttonText: string = 'Open Modal', modalTitle: string = 'Modal Title') {
    super();
    
    this.addClass('modal-widget-container');
    this.id = 'modal-widget-container';
    
    // Создаем кнопку для открытия модального окна
    this._openButton = document.createElement('button');
    this._openButton.textContent = buttonText;
    this._openButton.classList.add('logo-button');
    this._openButton.classList.add('button-secondary');
    
    // Создаем модальное окно
    this._modalOverlay = document.createElement('div');
    this._modalOverlay.className = 'modal-overlay';
    this._modalOverlay.style.display = 'none';
    
    this._modalContent = document.createElement('div');
    this._modalContent.className = 'modal-content';
    
    // Заголовок модального окна
    const title = document.createElement('h2');
    title.textContent = modalTitle;
    title.className = 'modal-title';
    
    // Кнопка закрытия внутри модального окна
    this._closeButton = document.createElement('button');
    this._closeButton.textContent = 'Close';
    this._closeButton.className = 'modal-close-button';
    
    // Собираем структуру модального окна
    this._modalContent.appendChild(title);
    this._modalContent.appendChild(this._closeButton);
    this._modalOverlay.appendChild(this._modalContent);
    
    // Добавляем элементы в виджет
    this.node.appendChild(this._openButton);
    this.node.appendChild(this._modalOverlay);
    
    // Назначаем обработчики событий
    this._openButton.addEventListener('click', this.openModal.bind(this));
    this._closeButton.addEventListener('click', this.closeModal.bind(this));
    this._modalOverlay.addEventListener('click', this.handleOverlayClick.bind(this));
  }

  // Метод для открытия модального окна
  private openModal(): void {
    this._modalOverlay.style.display = 'flex';
  }

  // Метод для закрытия модального окна
  private closeModal(): void {
    this._modalOverlay.style.display = 'none';
  }

  // Обработчик клика по оверлею (закрывает модальное окно при клике вне контента)
  private handleOverlayClick(event: MouseEvent): void {
    if (event.target === this._modalOverlay) {
      this.closeModal();
    }
  }

  // Добавляем обработчик клавиши Escape для закрытия модального окна
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    super.onBeforeDetach(msg);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this._modalOverlay.style.display === 'flex') {
      this.closeModal();
    }
  }

  // Методы для обновления контента модального окна
  public setModalContent(content: HTMLElement): void {
    // Очищаем текущий контент (кроме заголовка и кнопки закрытия)
    while (this._modalContent.firstChild) {
      if (this._modalContent.firstChild !== this._closeButton) {
        this._modalContent.removeChild(this._modalContent.firstChild);
      } else {
        break;
      }
    }
    
    // Добавляем новый контент перед кнопкой закрытия
    this._modalContent.insertBefore(content, this._closeButton);
  }

  public setButtonText(text: string): void {
    this._openButton.textContent = text;
  }

  public setModalTitle(title: string): void {
    const titleElement = this._modalContent.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
}