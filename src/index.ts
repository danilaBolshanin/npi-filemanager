import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the npi-file-manager-ext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'npi-file-manager-ext:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension npi-file-manager-ext is activated!');
  }
};

export default plugin;
