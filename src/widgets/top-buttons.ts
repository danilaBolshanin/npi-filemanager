import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

export class LogoButtonsWidget extends Widget {
  private _container: HTMLElement;
  private _button: HTMLButtonElement;

  constructor(logoUrl: string, tooltipText: string) {
    super();

    // Устанавливаем ID и классы для контейнера
    this.id = 'logo-buttons-container';
    this.addClass('logo-buttons-container');
    this.addClass('flex-column-container');

    // Создаем внутренний контейнер
    this._container = document.createElement('div');
    this._container.classList.add('logo-buttons-inner');
    this.node.appendChild(this._container);

    // Создаем кнопку с иконкой
    this._button = document.createElement('button');
    this._button.classList.add('logo-button');

    // Создаем элемент изображения для иконки
    const icon = document.createElement('img');
    //@ts-ignore
    icon.src = logoUrl;
    //@ts-ignore
    icon.alt = 'Logo';
    icon.classList.add('logo-icon');

    // Добавляем иконку в кнопку
    this._button.appendChild(icon);

    // Добавляем тултип
    this._button.title = tooltipText;
    this._button.setAttribute('aria-label', tooltipText);

    this._container.appendChild(this._button);
  }

  // Метод для обработки кликов по кнопке
  setButtonClickHandler(handler: () => void): void {
    this._button.addEventListener('click', handler);
  }

  // Метод для обновления тултипа
  updateTooltipText(text: string): void {
    this._button.title = text;
    this._button.setAttribute('aria-label', text);
  }

  // Метод для обновления иконки
  updateLogo(logoUrl: string): void {
    const icon = this._button.querySelector('.logo-icon') as HTMLImageElement;
    if (icon) {
      //@ts-ignore
      icon.src = logoUrl;
    }
  }

  // Очистка обработчиков событий при отсоединении
  protected onBeforeDetach(msg: Message): void {
    const newButton = this._button.cloneNode(true) as HTMLButtonElement;
    this._container.replaceChild(newButton, this._button);
    this._button = newButton;
    super.onBeforeDetach(msg);
  }
}
