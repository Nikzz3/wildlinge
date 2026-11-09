const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const savePath = () => path.join(app.getPath('userData'), 'save.json');

ipcMain.on('save:read', (event) => {
  try {
    event.returnValue = fs.readFileSync(savePath(), 'utf8');
  } catch {
    event.returnValue = null;
  }
});

ipcMain.on('save:write', (event, json) => {
  try {
    const tmp = savePath() + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, savePath());
    event.returnValue = true;
  } catch (err) {
    console.error('save failed', err);
    event.returnValue = false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 240 * 4,
    height: 160 * 4,
    useContentSize: true,
    minWidth: 240 * 2,
    minHeight: 160 * 2,
    backgroundColor: '#0c1418',
    title: 'Wildlinge – Alpenglühen',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAspectRatio(3 / 2);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'Ansicht', submenu: [{ role: 'togglefullscreen', label: 'Vollbild' }, { role: 'toggleDevTools', label: 'Entwicklerwerkzeuge' }] },
  ]),
);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
