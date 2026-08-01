(function installFastCfdCloudBridge() {
  "use strict";

  const config = Object.assign(
    {
      googleClientId: "",
      driveFolderName: "FastCFD Cloud Reports",
      driveScope: "https://www.googleapis.com/auth/drive.file",
      alsoDownloadReports: false,
    },
    window.FASTCFD_CLOUD_CONFIG || {},
  );

  const state = {
    accessToken: "",
    folderId: "",
    tokenClient: null,
    connecting: false,
    recent: new Map(),
  };

  const nativeFetch = window.fetch.bind(window);
  const nativeDownloadBlob =
    typeof window.downloadBlob === "function" ? window.downloadBlob.bind(window) : null;

  function notify(message, level) {
    if (typeof window.toast === "function") {
      window.toast(message, level === "error" ? "error" : level === "warn" ? "warn" : "ok");
      return;
    }
    console[level === "error" ? "error" : "log"]("[FastCFD Cloud]", message);
  }

  function safeFileName(name) {
    const cleaned = String(name || "FastCFD_report.bin")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return (cleaned || "FastCFD_report.bin").slice(0, 180);
  }

  function downloadLocally(blob, name) {
    if (nativeDownloadBlob) {
      nativeDownloadBlob(blob, name);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    setTimeout(function cleanup() {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function requestJson(url, init) {
    const response = await nativeFetch(url, init);
    const body = await response.json().catch(function invalidJson() {
      return {};
    });
    if (!response.ok) {
      const detail = body.error && body.error.message ? body.error.message : response.statusText;
      throw new Error(detail || "Google Drive request failed");
    }
    return body;
  }

  function authHeaders(extra) {
    if (!state.accessToken) throw new Error("Google Drive is not connected");
    return Object.assign({ Authorization: "Bearer " + state.accessToken }, extra || {});
  }

  async function ensureDriveFolder() {
    if (state.folderId) return state.folderId;
    const folderName = String(config.driveFolderName || "FastCFD Cloud Reports");
    const escaped = folderName.replace(/'/g, "\\'");
    const query = [
      "mimeType='application/vnd.google-apps.folder'",
      "trashed=false",
      "name='" + escaped + "'",
    ].join(" and ");
    const found = await requestJson(
      "https://www.googleapis.com/drive/v3/files?q=" +
        encodeURIComponent(query) +
        "&fields=files(id,name)&pageSize=10&spaces=drive",
      { headers: authHeaders() },
    );
    if (found.files && found.files.length) {
      state.folderId = found.files[0].id;
      return state.folderId;
    }
    const created = await requestJson(
      "https://www.googleapis.com/drive/v3/files?fields=id,name",
      {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      },
    );
    state.folderId = created.id;
    return state.folderId;
  }

  async function uploadToDrive(blob, name) {
    const folderId = await ensureDriveFolder();
    const metadata = {
      name: safeFileName(name),
      parents: [folderId],
      appProperties: {
        producer: "FastCFD Urban Studio",
        fastcfdVersion: "3.24.7",
      },
    };
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json; charset=UTF-8" }),
    );
    form.append("file", blob, metadata.name);
    return requestJson(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: authHeaders(),
        body: form,
      },
    );
  }

  function isDuplicate(name, blob) {
    const key = [safeFileName(name), blob.type || "", blob.size].join("|");
    const now = Date.now();
    const seen = state.recent.get(key) || 0;
    state.recent.set(key, now);
    for (const entry of state.recent) {
      if (now - entry[1] > 10000) state.recent.delete(entry[0]);
    }
    return now - seen < 1500;
  }

  async function saveBlob(blob, requestedName, options) {
    const name = safeFileName(requestedName);
    const opts = options || {};
    if (!(blob instanceof Blob)) throw new TypeError("FastCFD report output must be a Blob");
    if (isDuplicate(name, blob)) return { ok: true, duplicate: true, name: name };

    if (!state.accessToken) {
      if (opts.requireDrive) throw new Error("Connect Google Drive before generating reports");
      downloadLocally(blob, name);
      notify("Drive non connesso: " + name + " scaricato localmente.", "warn");
      return { ok: true, mode: "download", name: name, path: "download://" + name };
    }

    try {
      const uploaded = await uploadToDrive(blob, name);
      if (config.alsoDownloadReports) downloadLocally(blob, name);
      notify("Salvato in Google Drive: " + uploaded.name, "success");
      return {
        ok: true,
        mode: "drive",
        id: uploaded.id,
        name: uploaded.name,
        path: uploaded.webViewLink || "https://drive.google.com/open?id=" + uploaded.id,
      };
    } catch (error) {
      downloadLocally(blob, name);
      notify("Drive non disponibile; copia locale salvata: " + error.message, "error");
      return { ok: true, mode: "download", name: name, path: "download://" + name, error: error.message };
    }
  }

  async function blobFromHref(href) {
    if (/^data:/i.test(href) || /^blob:/i.test(href)) {
      const response = await nativeFetch(href);
      return response.blob();
    }
    throw new Error("Only data and blob report URLs can be stored");
  }

  function loadGoogleIdentityServices() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve();
    }
    return new Promise(function load(resolve, reject) {
      const existing = document.querySelector('script[data-fastcfd-google-identity="1"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.fastcfdGoogleIdentity = "1";
      script.onload = resolve;
      script.onerror = function failed() {
        reject(new Error("Google Identity Services could not be loaded"));
      };
      document.head.appendChild(script);
    });
  }

  async function connectDrive() {
    if (state.connecting) return;
    if (!config.googleClientId) {
      notify("Configurazione Drive incompleta: manca il Google OAuth client ID del deployment.", "warn");
      throw new Error("Missing googleClientId in fastcfd-config.js");
    }
    state.connecting = true;
    updateDriveButton();
    try {
      await loadGoogleIdentityServices();
      if (!state.tokenClient) {
        state.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: config.googleClientId,
          scope: config.driveScope,
          callback: function tokenCallback(response) {
            state.connecting = false;
            if (response && response.access_token) {
              state.accessToken = response.access_token;
              state.folderId = "";
              ensureDriveFolder()
                .then(function ready() {
                  notify("Google Drive connesso. I report saranno salvati automaticamente.", "success");
                  updateDriveButton();
                })
                .catch(function folderError(error) {
                  notify("Drive connesso, ma la cartella non è disponibile: " + error.message, "error");
                  updateDriveButton();
                });
            } else {
              notify("Connessione Google Drive annullata.", "warn");
              updateDriveButton();
            }
          },
          error_callback: function oauthError(error) {
            state.connecting = false;
            notify("Errore OAuth Google Drive: " + (error.type || "unknown"), "error");
            updateDriveButton();
          },
        });
      }
      state.tokenClient.requestAccessToken({ prompt: state.accessToken ? "" : "consent" });
    } catch (error) {
      state.connecting = false;
      updateDriveButton();
      notify(error.message, "error");
      throw error;
    }
  }

  function disconnectDrive() {
    if (state.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(state.accessToken, function revoked() {});
    }
    state.accessToken = "";
    state.folderId = "";
    updateDriveButton();
    notify("Google Drive disconnesso.", "warn");
  }

  function driveButton() {
    return document.getElementById("fastCfdDriveButton");
  }

  function updateDriveButton() {
    const button = driveButton();
    if (!button) return;
    button.disabled = state.connecting;
    button.textContent = state.connecting
      ? "DRIVE: CONNESSIONE…"
      : state.accessToken
        ? "DRIVE: CONNESSO"
        : config.googleClientId
          ? "CONNETTI DRIVE"
          : "DRIVE: DA CONFIGURARE";
    button.dataset.connected = state.accessToken ? "true" : "false";
  }

  function installDriveUi() {
    if (driveButton()) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "fastCfdDriveButton";
    button.className = "quick-cfd-btn";
    button.title = "Collega Google Drive. I report vengono salvati nella cartella FastCFD Cloud Reports.";
    button.addEventListener("click", function driveClick() {
      if (state.accessToken) disconnectDrive();
      else connectDrive().catch(function ignored() {});
    });
    const bar = document.getElementById("quickCfdBar");
    if (bar) bar.appendChild(button);
    else {
      button.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:12000;padding:10px 13px;border-radius:8px;border:1px solid #d4a574;background:#17171b;color:#f0f0f3;font:700 12px monospace";
      document.body.appendChild(button);
    }
    updateDriveButton();
  }

  window.fetch = async function fastCfdCloudFetch(input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    const method = String((init && init.method) || "GET").toUpperCase();
    if (/^http:\/\/127\.0\.0\.1(?::\d+)?\/?$/i.test(url || "") && method === "POST") {
      try {
        const payload = JSON.parse(String((init && init.body) || "{}"));
        const blob = await blobFromHref(payload.dataurl);
        const result = await saveBlob(blob, payload.name || "FastCFD_report.bin");
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return nativeFetch(input, init);
  };

  window.downloadBlob = function cloudDownloadBlob(blob, name) {
    saveBlob(blob, name).catch(function failed(error) {
      notify("Output non salvato: " + error.message, "error");
    });
  };

  document.addEventListener(
    "click",
    function interceptGeneratedDownloads(event) {
      const link = event.target && event.target.closest ? event.target.closest("a[download]") : null;
      if (!link || !state.accessToken || link.dataset.fastcfdCloudBypass === "1") return;
      if (!/^(?:data:|blob:)/i.test(link.href || "")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      blobFromHref(link.href)
        .then(function save(blob) {
          return saveBlob(blob, link.download || "FastCFD_report.bin");
        })
        .catch(function fallback(error) {
          notify("Drive non disponibile: " + error.message, "error");
        });
    },
    true,
  );

  window.FastCFDCloud = Object.freeze({
    connectDrive: connectDrive,
    disconnectDrive: disconnectDrive,
    saveBlob: saveBlob,
    isDriveConnected: function isDriveConnected() {
      return Boolean(state.accessToken);
    },
    getDriveFolderId: function getDriveFolderId() {
      return state.folderId;
    },
    config: Object.freeze(Object.assign({}, config, { googleClientId: config.googleClientId ? "configured" : "" })),
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function ready() {
      setTimeout(installDriveUi, 500);
    });
  } else {
    setTimeout(installDriveUi, 500);
  }
})();
