import { app, BrowserWindow, ipcMain } from "electron";
// @ts-expect-error
import Ctl from "ipfsd-ctl";
import copyfiles from "copyfiles";
import fs from "fs-extra";
import path from "path";
import isDev from "electron-is-dev";
import serve from "electron-serve";
import { appendFileSync } from "fs";

import "./ipcMain";

const loadURL = serve({ directory: "dist/parcel-build" });

const BOOTSTRAP = [
  "/ip4/52.79.200.55/tcp/4001/ipfs/12D3KooWMLsqXp8j3Q4eFqfQh1cEVFrmrkKdtcd3JVRaZ2wq94ok",
  "/ip4/15.164.162.140/tcp/4001/ipfs/12D3KooWLe8sbS7M4mPuWeF2v8h9qyR7qjMeTuiPgYi51AGFQNdS",
  "/ip4/3.37.88.192/tcp/4001/ipfs/12D3KooWHcQJrUAHAt3XSGzEoedRbdmf2S4Y4aX39EqR8wAExTDb",
];

let ipfsd: any;

export let mainWindow: BrowserWindow | null = null;

function getIpfsBinPath() {
  return require("go-ipfs").path().replace("app.asar", "app.asar.unpacked");
}

function swarmKeyExists(ipfsd: any) {
  return fs.pathExistsSync(path.join(ipfsd?.path, "swarm.key"));
}

function configExists(ipfsd: any) {
  return fs.pathExistsSync(path.join(ipfsd?.path, "config"));
}

function rmApiFile(ipfsd: any) {
  return fs.removeSync(path.join(ipfsd.path, "api"));
}

const createWindow = async (): Promise<void> => {
  try {
    const ipfsBin = getIpfsBinPath();

    ipfsd = await Ctl.createController({
      ipfsHttpModule: require("ipfs-http-client"),
      type: "go",
      ipfsBin: ipfsBin,
      ipfsOptions: {
        config: {
          Bootstrap: BOOTSTRAP,
          Routing: {
            Type: "dhtserver",
          },
          Discovery: {
            MDNS: {
              Enabled: true,
            },
          },
          Swarm: {
            DisableBandwidthMetrics: false,
            DisableNatPortMap: false,
            EnableAutoRelay: true,
            EnableRelayHop: true,
          },
        },
      },
      remote: false,
      disposable: false,
      test: false,
      args: ["--migrate", "--enable-gc", "--routing", "dhtclient"],
    });

    if (!swarmKeyExists(ipfsd)) {
      copyfiles(
        [path.join(__dirname, "./assets/swarm.key"), ipfsd.path],
        {
          up: true,
          error: true,
        },
        (err) => {
          console.log(`err`, err);
        }
      );
    }

    if (!configExists(ipfsd)) {
      await ipfsd.init();
    }

    await ipfsd.start();

    const id = await ipfsd.api.id();
    const peers = await ipfsd.api.swarm.peers();

    console.log(`id:`, id?.id);
    console.log(`peers:`, peers);
  } catch (error) {
    if (
      !error.message.includes("ECONNREFUSED") &&
      !error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw error;
    }

    rmApiFile(ipfsd);

    await ipfsd.start();

    const id = await ipfsd.api.id();
    const peers = await ipfsd.api.swarm.peers();

    console.log(`id:`, id?.id);
    console.log(`peers:`, peers);
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:1234");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await loadURL(mainWindow);
  }
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("get-file", async (_, hash) => {
  try {
    for await (const file of ipfsd.api.get(hash)) {
      // eslint-disable-next-line
      if (!file.content) continue;
      const content = [];

      // eslint-disable-next-line
      for await (const chunk of file.content) {
        appendFileSync(
          path.join(app.getPath("downloads"), hash),
          Buffer.from(chunk)
        );

        content.push(chunk);
      }
    }

    return {
      success: true,
      path: path.join(app.getPath("downloads"), hash),
    };
  } catch (error) {
    return {
      success: false,
    };
  }
});

ipcMain.handle("upload-file", async (_, path) => {
  try {
    const file = fs.readFileSync(path);
    const fileContent = Buffer.from(file);

    const newFile = await ipfsd.api.add({
      content: fileContent,
    });

    return newFile;
  } catch (e) {
    console.log(`upload-file`, e.message);
  }
});

ipcMain.handle("get-peers", async () => {
  try {
    const peers = await ipfsd.api.swarm.peers();

    return peers.map((p: any) => ({
      peer: p.peer,
      addr: String(p.addr),
    }));
  } catch (e) {
    console.log(`upload-file`, e.message);
  }
});
