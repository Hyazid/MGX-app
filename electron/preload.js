const { contextBridge, ipcRenderer } = require('electron')

// Expose une API propre à React via window.api
// React n'a JAMAIS accès direct à Node.js — tout passe par ici
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data)
})

// Utilisation dans React :
// const users = await window.api.invoke('users:getAll')
// await window.api.invoke('bc:create', { ...formData })

