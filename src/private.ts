export namespace Private {
  export function createUploadInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    return input;
  }
}
