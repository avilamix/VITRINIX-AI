import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string, defaultFilename: string) => 
    ipcRenderer.invoke('save-file', content, defaultFilename)
});