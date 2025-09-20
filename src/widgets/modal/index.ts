import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { ModalContentWidget } from './modal-content';
import { LabIcon, jupyterIcon } from '@jupyterlab/ui-components';

export class ModalWidget extends Widget {
  private _openButton: HTMLButtonElement;
  private _modalOverlay: HTMLDivElement;
  private _modalContent: ModalContentWidget;

  constructor(
    buttonText: string = 'Open Modal',
    modalTitle: string = 'Modal Title',
    icon: LabIcon = jupyterIcon
  ) {
    super();

    this.addClass('modal-widget-container');
    this.id = 'modal-widget-container';

    // Создаем кнопку для открытия модального окна
    this._openButton = document.createElement('button');
    this._openButton.classList.add('modal-button');
    this._openButton.classList.add('button-secondary');
    this._openButton.classList.add('with-icon');

    const buttonContent = document.createElement('div');
    buttonContent.className = 'button-content';

    const iconElement = icon.element({
      className: 'modal-button-icon'
    });
    buttonContent.appendChild(iconElement);

    // Создаем модальное окно
    this._modalOverlay = document.createElement('div');
    this._modalOverlay.className = 'modal-overlay';
    this._modalOverlay.style.display = 'none';

    // Создаем виджет контента модального окна
    this._modalContent = new ModalContentWidget(modalTitle);
    this._modalContent.setOnClose(() => {
      this.closeModal();
    });

    const textElement = document.createElement('span');
    textElement.className = 'modal-button-text';
    textElement.textContent = buttonText;
    buttonContent.appendChild(textElement);

    this._openButton.appendChild(buttonContent);

    // Добавляем контент в оверлей
    this._modalOverlay.appendChild(this._modalContent.node);

    // Добавляем элементы в виджет
    this.node.appendChild(this._openButton);
    this.node.appendChild(this._modalOverlay);

    // Назначаем обработчики событий
    this._openButton.addEventListener('click', this.openModal.bind(this));
    this._modalOverlay.addEventListener(
      'click',
      this.handleOverlayClick.bind(this)
    );
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

  public setButtonText(text: string): void {
    this._openButton.textContent = text;
  }

  public setHtmlContent(html: string): void {
    this._modalContent.setHtmlContent(html);
  }

  public addContent(content: HTMLElement | Widget): void {
    this._modalContent.addContent(content);
  }

  public clearContent(): void {
    this._modalContent.clearContent();
  }

  public setModalTitle(title: string): void {
    this._modalContent.setTitle(title);
  }

  public get contentWidget(): ModalContentWidget {
    return this._modalContent;
  }
}
