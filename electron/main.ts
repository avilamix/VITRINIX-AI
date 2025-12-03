import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// FIX: Declare __dirname to resolve TypeScript error when Node types are not found.
// This global is available in Electron's main process.
declare const __dirname: string;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Em desenvolvimento, carrega do localhost. Em produção, carregaria o arquivo buildado.
  // Ajuste a porta 5173 conforme necessário (padrão Vite)
  const devUrl = 'http://localhost:5173';
  
  win.loadURL(devUrl).catch(() => {
      // Fallback se o servidor de dev não estiver rodando (apenas exemplo)
      console.log('Aguardando servidor de desenvolvimento...');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // FIX: Cast `process` to `any` to access the `platform` property.
  // This is a workaround for the missing Node.js type definitions.
  if ((process as any).platform !== 'darwin') {
    app.quit();
  }
});

// Manipulador para salvar arquivos nativamente
// FIX: Removed `Buffer` type. It's not defined due to missing Node.js types,
// and the corresponding preload script only passes a string.
ipcMain.handle('save-file', async (event, content: string, defaultFilename: string) => {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return { success: false, error: 'No focused window' };

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: 'Salvar arquivo',
    defaultPath: defaultFilename,
    buttonLabel: 'Salvar',
  });

  if (canceled || !filePath) {
    return { success: false, error: 'Save canceled' };
  }

  try {
    // Se o conteúdo for uma string Base64 de imagem (data:image/...), removemos o cabeçalho e salvamos como buffer
    if (typeof content === 'string' && content.startsWith('data:')) {
        const base64Data = content.split(';base64,').pop();
        if (base64Data) {
            fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
        } else {
            fs.writeFileSync(filePath, content);
        }
    } else {
        fs.writeFileSync(filePath, content);
    }
    return { success: true, path: filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});