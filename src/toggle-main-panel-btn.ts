import { DockPanel, Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

export class TogglePanelWidget extends Widget {
  private _toggleButton: HTMLElement;
  private _isPanelVisible: boolean = true;
  private _dockPanel: DockPanel;

  constructor(dockPanel: DockPanel) {
    super();
    this._dockPanel = dockPanel;

    this.id = 'npi-toggle-container';
    this.addClass('npi-toggle-container');

    this._toggleButton = document.createElement('button');
    this._toggleButton.innerText = '▶';
    this._toggleButton.classList.add('npi-toggle-button');
    this.node.appendChild(this._toggleButton);
  }

  public setPanelState(isVisible: boolean) {
    this._isPanelVisible = isVisible;

    if (this._isPanelVisible) {
      this._dockPanel.node.style.display = 'block';
      this._toggleButton.innerText = '▶';
      this.node.classList.remove('panel-hidden-state');
    } else {
      this._dockPanel.node.style.display = 'none';
      this._toggleButton.innerText = '◀';
      this.node.classList.add('panel-hidden-state');
    }
  }

  private toggle() {
    this._isPanelVisible = !this._isPanelVisible;

    if (this._isPanelVisible) {
      this._dockPanel.node.style.display = 'block';
      this._toggleButton.innerText = '▶';
      this.node.classList.remove('panel-hidden-state');
    } else {
      this._dockPanel.node.style.display = 'none';
      this._toggleButton.innerText = '◀';
      this.node.classList.add('panel-hidden-state');
    }
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._toggleButton.addEventListener('click', this.toggle.bind(this));
  }

  protected onBeforeDetach(msg: Message): void {
    this._toggleButton.removeEventListener('click', this.toggle.bind(this));
    super.onBeforeDetach(msg);
  }
}
