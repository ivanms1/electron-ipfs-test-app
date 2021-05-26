import React, { useState } from "react";

import styles from "./App.module.scss";

const { api } = window;

function App() {
  const [hash, setHash] = useState("");
  const [file, setFile] = useState(null);
  const [successHash, setSuccessHash] = useState(null);
  const [peers, setPeers] = useState([]);
  const [successDownload, setSuccessDownload] = useState(false);

  const handleDownloadSubmit = async (e) => {
    e.preventDefault();
    const data = await api.getFile(hash);

    if (data?.success) {
      setSuccessDownload(true);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const data = await api.uploadFile(file.path);
    setSuccessHash(data.path);
  };

  const getPeers = async () => {
    const peers = await api.getPeers();

    setPeers(peers);
  };

  return (
    <div>
      <h1 className={styles.Title}>IPFS Test App</h1>
      <h2>Get File</h2>
      <form onSubmit={handleDownloadSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={hash}
          onChange={(e) => {
            if (successDownload) {
              setSuccessDownload(false);
            }
            setHash(e.target.value);
          }}
        />
        <button type="submit">Download</button>
        {successDownload && <p>File downloaded!</p>}
      </form>
      <h2>Upload File</h2>
      <form onSubmit={handleUploadSubmit} style={{ marginBottom: 20 }}>
        <input
          type="file"
          onChange={(e) => {
            if (successHash) {
              setSuccessHash(null);
            }
            setFile(e.target.files[0]);
          }}
        />
        <button type="submit">Upload</button>
        {successHash && <p>Hash: {successHash}</p>}
      </form>

      <div>
        <h2>Get Peers</h2>
        <button type="button" onClick={getPeers}>
          Get
        </button>
        <ul>
          {peers.map((peer) => (
            <li key={peer.peer} style={{ marginBottom: 10 }}>
              <p>Peer ID: {peer.peer}</p>
              <p>Address: {peer.addr}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
