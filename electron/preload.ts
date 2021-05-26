import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getFile: (hash: string) => ipcRenderer.invoke("get-file", hash),
  uploadFile: (path: string) => ipcRenderer.invoke("upload-file", path),
  getPeers: () => ipcRenderer.invoke("get-peers"),
});
