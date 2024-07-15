import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import yaml from 'js-yaml'
import { exec } from 'node:child_process'
import dotenv from 'dotenv'

dotenv.config()

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
import * as pkg from '../package.json'
import { Agent, FDConfig } from '../src/types'
import { nanoid } from 'nanoid'

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
      agents: [
        {
          id: nanoid(),
          name: 'BankReportAgent',
          path: '../faqtiv-agent-toolkit/examples/bank-report-demo-js'
        }
      ]
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
  const isMac = process.platform === 'darwin'

  const template = [
    {
      label: 'Go',
      submenu: [
        {
          label: 'Home',
          click: () => {
            win?.webContents.send('change-page', 'Home')
          }
        },
        {
          label: 'Agents',
          click: () => {
            win?.webContents.send('change-page', 'Agents')
          }
        },
        isMac ? { role: 'close' } : { role: 'quit' }
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
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            createAboutWindow()
          }
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

  //@ts-expect-error won't define all properties
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function executeAgentCommand(agentId: string, command: string): Promise<string> {
  const project = config?.agents.find((agent: Agent) => agent.id === agentId)
  if (!project) {
    throw new Error(`Project with id ${agentId} not found`)
  }

  return new Promise((resolve, reject) => {
    exec(command, { cwd: project.path }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error executing command: ${stderr}`))
      } else {
        resolve(stdout)
      }
    })
  })
}

ipcMain.on('get-agent-tasks', async (event, agentId) => {
  const uniqueListener = `get-agent-tasks-reply-${agentId}`

  try {
    const tasks = await getAgentFAQ(agentId)
    event.reply(uniqueListener, JSON.stringify(tasks))
  } catch (error: any) {
    event.reply(uniqueListener, { error: error.message })
  }
})

async function getAgentFAQ(agentId: string): Promise<any> {
  const tasks = await executeAgentCommand(agentId, 'faqtiv list-tasks --json')
  const instructions = await executeAgentCommand(agentId, 'faqtiv print-desktop-instructions')

  return {
    tasks: JSON.parse(tasks),
    instructions: instructions
  }
}

ipcMain.on('run-agent-task', async (event, agentId, taskName, params) => {
  try {
    const result = await runAgentTask(agentId, taskName, params)
    event.reply('run-agent-task-reply', result)
  } catch (error: any) {
    event.reply('run-agent-task-reply', { error: error.message })
  }
})

async function runAgentTask(agentId: string, taskName: string, params: string): Promise<any> {
  const project = config?.agents.find((agent: Agent) => String(agent.id) === String(agentId))
  if (!project) {
    throw new Error(`Project with id ${agentId} not found`)
  }
  const runParams = JSON.parse(params)
  const command = `faqtiv run-task ${taskName} ${Object.values(runParams)
    .map((p) => `"${p}"`)
    .join(' ')}`

  return await executeAgentCommand(agentId, command)
}

ipcMain.on('download-local-file', async (event, filePath) => {
  try {
    const fileContent = await readLocalFile(filePath)
    event.reply('download-local-file-reply', { success: true, data: fileContent })
  } catch (error: any) {
    event.reply('download-local-file-reply', { error: error.message })
  }
})

// Function to read a local file and return its contents
async function readLocalFile(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

ipcMain.on('select-faqtiv-agent-dir', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (result.canceled) {
    event.reply('select-faqtiv-agent-dir-reply', { error: 'Directory selection was canceled' })
  } else {
    const selectedPath = result.filePaths[0]
    const configFile = path.join(selectedPath, 'faqtiv_config.yml')
    const faqtivDir = path.join(selectedPath, '.faqtiv')

    if (fs.existsSync(configFile) && fs.existsSync(faqtivDir)) {
      event.reply('select-faqtiv-agent-dir-reply', { path: selectedPath })
    } else {
      event.reply('select-faqtiv-agent-dir-reply', {
        error: 'Not an agent directory'
      })
    }
  }
})

// New IPC handlers for adding, updating, and deleting agents
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
      name: updatedAgent.name
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

// Function to update the config file
async function updateConfigFile() {
  const userDataDir = app.getPath('userData')
  const configPath = path.join(userDataDir, 'config.yaml')

  fs.writeFileSync(configPath, yaml.dump(config), 'utf8')
}
