import {
  Dialog,
  showDialog,
  showErrorMessage,
  ToolbarButton
} from '@jupyterlab/apputils';
import { Private } from '../library/private';
import { Signal } from '@lumino/signaling';
import { IChangedArgs, PageConfig } from '@jupyterlab/coreutils';
import { IDocumentManager, shouldOverwrite } from '@jupyterlab/docmanager';
import { FileTreeWidget } from './file-tree';
import { fileUploadIcon } from '@jupyterlab/ui-components';
import { Contents } from '@jupyterlab/services';
import { ArrayExt } from '@lumino/algorithm';
import { CHUNK_SIZE, LARGE_FILE_SIZE } from '../library/constants';

export interface IUploadModel {
  path: string;
  progress: number;
}

export class Uploader extends ToolbarButton {
  private _input = Private.createUploadInput();
  private _uploads: IUploadModel[] = [];
  private _uploadChanged = new Signal<this, IChangedArgs<IUploadModel | null>>(
    this
  );

  private manager: IDocumentManager;
  private widget: FileTreeWidget;
  private context: string;
  private basepath: string;

  public constructor(options: any) {
    super({
      icon: fileUploadIcon,
      onClick: () => {
        this.context = '';
        this._input.click();
      },
      tooltip: 'Upload Files'
    });
    this.basepath = options.widget.basepath;
    this.manager = options.manager;
    this.widget = options.widget;
    this._input.onclick = this._onInputClicked;
    this.context = '';
    this._input.onchange = this._onInputChanged;
    this.addClass('filetree-upload');
    this.addClass(options.widget.filetree_id);
  }

  public contextClick(path: string) {
    this.context = path;
    this._input.click();
  }

  public async upload(file: File, path: string): Promise<Contents.IModel> {
    const supportsChunked = PageConfig.getNotebookVersion() >= [5, 1, 0];
    const largeFile = file.size > LARGE_FILE_SIZE;

    if (largeFile && !supportsChunked) {
      const msg = `Cannot upload file (>${
        LARGE_FILE_SIZE / (1024 * 1024)
      } MB). ${file.name}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      throw msg;
    }

    const err = 'File not uploaded';
    if (largeFile && !(await this._shouldUploadLarge(file))) {
      throw new Error('Cancelled large file upload');
    }
    await this._uploadCheckDisposed();
    await this.widget.refresh();
    await this._uploadCheckDisposed();

    const contents = await this.widget.cm.get(this.context);
    contents.content.forEach(async (entry: any) => {
      if (entry.name === file.name && !(await shouldOverwrite(file.name))) {
        throw err;
      }
    });
    await this._uploadCheckDisposed();

    const chunkedUpload = supportsChunked && file.size > CHUNK_SIZE;
    return await this._upload(file, path, chunkedUpload);
  }

  private _onInputChanged = () => {
    const files = Array.prototype.slice.call(this._input.files) as File[];
    const pending = files.map(file => this.upload(file, this.context));
    this.context = '';
    Promise.all(pending).catch(error => {
      showErrorMessage('Upload Error', error);
    });
  };

  private _onInputClicked = () => {
    this._input.value = '';
  };

  private _uploadCheckDisposed(): Promise<void> {
    if (this.isDisposed) {
      return Promise.reject('Filemanager disposed. File upload canceled');
    }
    return Promise.resolve();
  }

  private async _shouldUploadLarge(file: File): Promise<boolean> {
    const { button } = await showDialog({
      body: `The file size is ${Math.round(
        file.size / (1024 * 1024)
      )} MB. Do you still want to upload it?`,
      buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'UPLOAD' })],
      title: 'Large file size warning'
    });
    return button.accept;
  }

  private async _upload(
    file: File,
    path_arg: string,
    chunked: boolean
  ): Promise<Contents.IModel> {
    // Gather the file model parameters.
    let path = path_arg || '';
    path = path ? path + '/' + file.name : file.name;
    const name = file.name;
    const type: Contents.ContentType = 'file';
    const format: Contents.FileFormat = 'base64';

    const uploadInner = async (
      blob: Blob,
      chunk?: number
    ): Promise<Contents.IModel> => {
      await this._uploadCheckDisposed();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = event =>
          reject(`Failed to upload "${file.name}":` + event);
      });
      await this._uploadCheckDisposed();

      // remove header https://stackoverflow.com/a/24289420/907060
      const content = (reader.result as string).split(',')[1];

      const model: Partial<Contents.IModel> = {
        chunk,
        content,
        format,
        name,
        type
      };
      return await this.manager.services.contents.save(
        this.basepath + path,
        model
      );
    };

    if (!chunked) {
      try {
        const result = await uploadInner(file);
        await this.widget.refresh();
        return result;
      } catch (err) {
        ArrayExt.removeFirstWhere(
          this._uploads,
          uploadIndex => file.name === uploadIndex.path
        );
        throw err;
      }
    }

    let finalModel: Contents.IModel | null = null;

    let upload = { path, progress: 0 };
    this._uploadChanged.emit({
      name: 'start',
      newValue: upload,
      oldValue: null
    });

    for (let start = 0; !finalModel; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE;
      const lastChunk = end >= file.size;
      const chunk = lastChunk ? -1 : end / CHUNK_SIZE;

      const newUpload = { path, progress: start / file.size };
      this._uploads.splice(this._uploads.indexOf(upload));
      this._uploads.push(newUpload);
      this._uploadChanged.emit({
        name: 'update',
        newValue: newUpload,
        oldValue: upload
      });
      upload = newUpload;

      let currentModel: Contents.IModel;
      try {
        currentModel = await uploadInner(file.slice(start, end), chunk);
      } catch (err) {
        ArrayExt.removeFirstWhere(
          this._uploads,
          uploadIndex => file.name === uploadIndex.path
        );

        this._uploadChanged.emit({
          name: 'failure',
          newValue: upload,
          oldValue: null
        });

        throw err;
      }

      if (lastChunk) {
        finalModel = currentModel;
      }
    }

    this._uploads.splice(this._uploads.indexOf(upload));
    this._uploadChanged.emit({
      name: 'finish',
      newValue: null,
      oldValue: upload
    });

    await this.widget.refresh();

    return finalModel;
  }
}
