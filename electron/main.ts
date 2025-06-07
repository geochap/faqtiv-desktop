import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import yaml from 'js-yaml'
import dotenv from 'dotenv'
import { KnowledgeBaseClient } from '../src/services/KBClient'; 
import { TaskClient } from '../src/services/TaskClient';
import { Agent } from '../src/types';

dotenv.config()

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
import * as pkg from '../package.json'
import { FDConfig } from '../src/types'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let config: FDConfig | null

function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 400,
    height: 350,
    title: 'About',
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  })

  aboutWindow.loadFile('about.html')
  aboutWindow.webContents.on('did-finish-load', () => {
    aboutWindow.webContents.send(
      'about-info',
      JSON.stringify({
        version: pkg.version,
        repository: pkg.repository.url
      })
    )
  })
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  })
  win.maximize()
  win.show()

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('did-finish-load', setupMenu)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

ipcMain.on('app-init', (event) => {
  const userDataDir = app.getPath('userData')
  const configPath = path.join(userDataDir, 'config.yaml')

  if (!fs.existsSync(configPath)) {
    config = {
      version: pkg.version,
      agents: []
    }
    fs.writeFileSync(configPath, yaml.dump(config), 'utf8')
  } else {
    config = yaml.load(fs.readFileSync(configPath, 'utf8')) as FDConfig
  }

  event.reply(
    'app-init-reply',
    JSON.stringify({
      config,
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL
      }
    })
  )
})

function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Import Agent...' },
        { label: 'Export Agent...' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => createAboutWindow()
        }
      ]
    }
  ]

  if (process.env.NODE_ENV === 'development') {
    template.push({
      label: 'Development',
      submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

ipcMain.on('add-agent', async (event, agent) => {
  try {
    config?.agents.push(agent)
    await updateConfigFile()
    event.reply('add-agent-reply', { success: true })
  } catch (error: any) {
    event.reply('add-agent-reply', { error: error.message })
  }
})

ipcMain.on('update-agent', async (event, updatedAgent) => {
  try {
    const agentIndex = config?.agents.findIndex((agent) => agent.id === updatedAgent.id)
    if (agentIndex === null || agentIndex === undefined || agentIndex === -1)
      throw new Error('Agent not found')

    const agent = config!.agents[agentIndex]

    config!.agents[agentIndex] = {
      ...agent,
      ...updatedAgent
    }
    await updateConfigFile()
    event.reply('update-agent-reply', { success: true })
  } catch (error: any) {
    event.reply('update-agent-reply', { error: error.message })
  }
})

ipcMain.on('delete-agent', async (event, agentId) => {
  try {
    config!.agents = config!.agents.filter((agent) => agent.id !== agentId)
    await updateConfigFile()
    event.reply('delete-agent-reply', { success: true })
  } catch (error: any) {
    event.reply('delete-agent-reply', { error: error.message })
  }
})


ipcMain.handle('kb:search', async (_, agent: Agent, query: string) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    return await client.search(query, 20);
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('kb:recent', async (_, agent: Agent) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    return await client.getRecent();
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('kb:insert', async (_, agent: Agent, question: string, answer: string) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    const id = await client.insertQA(agent.id, question, answer);
    return { id };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('kb:getById', async (_, agent: Agent, id: string) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    return await client.getById(id);
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('kb:update', async (_, agent: Agent, id: string, updates: any) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    await client.updateQA(id, updates);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('kb:delete', async (_, agent: Agent, id: string) => {
  try {
    const client = new KnowledgeBaseClient(agent);
    await client.deleteQA(id);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});

// Function to update the config file
async function updateConfigFile() {
  const userDataDir = app.getPath('userData')
  const configPath = path.join(userDataDir, 'config.yaml')

  fs.writeFileSync(configPath, yaml.dump(config), 'utf8')
}

ipcMain.handle('tasks:search', async (_event, agent: Agent, query: string) => {
  try {
    const client = new TaskClient(agent);
    return await client.search(query);
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('tasks:recent', async (_event, agent: Agent) => {
  try {
    const client = new TaskClient(agent);
    return await client.getRecent();
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('tasks:insert', async (_event, agent: Agent, description: string) => {
  try {
    const client = new TaskClient(agent);
    const id = await client.insertTask(agent.id, description);
    return { id };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('tasks:getById', async (_event, agent: Agent, id: string) => {
  try {
    const client = new TaskClient(agent);
    return await client.getById(id);
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('tasks:update', async (_event, agent: Agent, id: string, updates: any) => {
  try {
    const client = new TaskClient(agent);
    await client.updateTask(id, updates);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('tasks:delete', async (_event, agent: Agent, id: string) => {
  try {
    const client = new TaskClient(agent);
    await client.deleteTask(id);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});
