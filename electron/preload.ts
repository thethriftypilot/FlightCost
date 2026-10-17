import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('flightcost', {
  snapshot: () => ipcRenderer.invoke('snapshot'),
  setup: (aircraft: unknown, plans: unknown) => ipcRenderer.invoke('setup', aircraft, plans),
  save: (entity: unknown, value: unknown) => ipcRenderer.invoke('save', entity, value),
  remove: (entity: unknown, id: unknown) => ipcRenderer.invoke('remove', entity, id),
  setting: (key: unknown, value: unknown) => ipcRenderer.invoke('setting', key, value),
  backup: () => ipcRenderer.invoke('backup'),
  restore: () => ipcRenderer.invoke('restore'),
  exportData: () => ipcRenderer.invoke('exportData'),
  exportCsv: (id: unknown) => ipcRenderer.invoke('exportCsv', id),
  importCsv: (id: unknown) => ipcRenderer.invoke('importCsv', id),
  receipt: (id: unknown) => ipcRenderer.invoke('receipt', id),
  saveReceipt: (id: unknown) => ipcRenderer.invoke('saveReceipt', id),
  report: (id: unknown, from: unknown, to: unknown, format: unknown, kind: unknown) =>
    ipcRenderer.invoke('report', id, from, to, format, kind),
  reportCsv: (id: unknown, from: unknown, to: unknown, kind: unknown) =>
    ipcRenderer.invoke('reportCsv', id, from, to, kind),
  tripReport: (id: unknown, format: unknown) => ipcRenderer.invoke('tripReport', id, format),
  demo: () => ipcRenderer.invoke('demo'),
  external: (url: unknown) => ipcRenderer.invoke('external', url),
});
