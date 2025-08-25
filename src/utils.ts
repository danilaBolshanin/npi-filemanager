export const CommandIDs = {
  navigate: 'filetree:navigate',

  toggle: 'filetree:toggle',

  refresh: 'filetree:refresh',

  select: 'filetree:select',

  set_context: 'filetree:set-context',

  rename: 'filetree:rename',

  create_folder: 'filetree:create-folder',

  create_file: 'filetree:create-file',

  delete_op: 'filetree:delete',

  download: 'filetree:download',

  upload: 'filetree:upload',

  move: 'filetree:move',

  copy_path: 'filetree:copy_path'
};

export function u_btoa(str: string) {
  return btoa(encodeURIComponent(str));
}

export function u_atob(str: string) {
  return decodeURIComponent(atob(str));
}

export function fileSizeString(fileBytes: number) {
  if (fileBytes == null) {
    return '';
  }
  if (fileBytes < 1024) {
    return fileBytes + ' B';
  }

  let i = -1;
  const byteUnits = [' KB', ' MB', ' GB', ' TB'];
  do {
    fileBytes = fileBytes / 1024;
    i++;
  } while (fileBytes > 1024);

  return Math.max(fileBytes, 0.1).toFixed(1) + byteUnits[i];
}

export function switchView(mode: any) {
  if (mode === 'none') {
    return '';
  } else {
    return 'none';
  }
}
