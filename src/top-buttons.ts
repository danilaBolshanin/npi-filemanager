import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

export class LogoButtonsWidget extends Widget {
  private _container: HTMLElement;
  private _logo: HTMLElement;
  private _button1: HTMLElement;
  private _button2: HTMLElement;

  constructor(logoUrl: string, button1Text: string, button2Text: string) {
    super();

    // Устанавливаем ID и классы для контейнера
    this.id = 'logo-buttons-container';
    this.addClass('logo-buttons-container');
    this.addClass('flex-column-container'); // Добавляем класс для flex стилей

    // Создаем внутренний контейнер
    this._container = document.createElement('div');
    this._container.classList.add('logo-buttons-inner');
    this.node.appendChild(this._container);

    // Создаем элемент логотипа
    this._logo = document.createElement('img');
    //@ts-ignore
    this._logo.src = logoUrl;
    //@ts-ignore
    this._logo.alt = 'Logo';
    this._logo.classList.add('logo-image');
    this._container.appendChild(this._logo);

    // Создаем первую кнопку
    this._button1 = document.createElement('button');
    this._button1.innerText = button1Text;
    this._button1.classList.add('logo-button');
    this._button1.classList.add('button-primary'); // Пример класса для стилизации
    this._container.appendChild(this._button1);

    // Создаем вторую кнопку
    this._button2 = document.createElement('button');
    this._button2.innerText = button2Text;
    this._button2.classList.add('logo-button');
    this._button2.classList.add('button-secondary'); // Пример класса для стилизации
    this._container.appendChild(this._button2);
  }

  // Методы для обработки кликов по кнопкам
  setButton1ClickHandler(handler: () => void): void {
    this._button1.addEventListener('click', handler);
  }

  setButton2ClickHandler(handler: () => void): void {
    this._button2.addEventListener('click', handler);
  }

  // Методы для обновления текста кнопок
  updateButton1Text(text: string): void {
    this._button1.innerText = text;
  }

  updateButton2Text(text: string): void {
    this._button2.innerText = text;
  }

  // Очистка обработчиков событий при отсоединении
  protected onBeforeDetach(msg: Message): void {
    // Клонируем и заменяем кнопки для удаления всех обработчиков
    const newButton1 = this._button1.cloneNode(true) as HTMLElement;
    const newButton2 = this._button2.cloneNode(true) as HTMLElement;
    
    this._container.replaceChild(newButton1, this._button1);
    this._container.replaceChild(newButton2, this._button2);
    
    this._button1 = newButton1;
    this._button2 = newButton2;
    
    super.onBeforeDetach(msg);
  }
}