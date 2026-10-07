const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const START_URL = 'https://warehouse.alramzybrothers.com';

app.setAppUserModelId('com.alramzybrothers.erp');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function showOffline(win) {
  win.loadFile(path.join(__dirname, 'offline.html'));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'الرمزي',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fe',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'عرض',
      submenu: [
        { label: 'تحديث', accelerator: 'F5', click: () => { if (!win.isDestroyed()) win.webContents.reload(); } },
        { label: 'الصفحة الرئيسية', click: () => { if (!win.isDestroyed()) win.loadURL(START_URL); } }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    let allowed = false;
    try {
      const target = new URL(url);
      allowed = target.origin === 'https://warehouse.alramzybrothers.com' || url.startsWith('file:');
    } catch (error) {
      allowed = false;
    }
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on('did-fail-load', (_event, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    showOffline(win);
  });

  win.loadURL(START_URL);
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  app.on('second-instance', () => {
    if (win.isMinimized()) win.restore();
    win.focus();
  });
});

app.on('window-all-closed', () => app.quit());
