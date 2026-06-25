const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('aetherDesktop', {
  getConnection: profile => ipcRenderer.invoke('aether:connection', profile),
  revalidateConnection: () => ipcRenderer.invoke('aether:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('aether:backend:touch', profile),
  getGatewayWsUrl: profile => ipcRenderer.invoke('aether:gateway:ws-url', profile),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('aether:window:openSession', sessionId, opts),
  openNewSessionWindow: () => ipcRenderer.invoke('aether:window:openNewSession'),
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('aether:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('aether:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('aether:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('aether:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('aether:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('aether:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('aether:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('aether:pet-overlay:state', listener)
      return () => ipcRenderer.removeListener('aether:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('aether:pet-overlay:control', listener)
      return () => ipcRenderer.removeListener('aether:pet-overlay:control', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('aether:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('aether:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('aether:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('aether:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('aether:connection-config:test', payload),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('aether:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('aether:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('aether:connection-config:oauth-logout', remoteUrl),
  profile: {
    get: () => ipcRenderer.invoke('aether:profile:get'),
    set: name => ipcRenderer.invoke('aether:profile:set', name)
  },
  api: request => ipcRenderer.invoke('aether:api', request),
  notify: payload => ipcRenderer.invoke('aether:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('aether:requestMicrophoneAccess'),
  readFileDataUrl: filePath => ipcRenderer.invoke('aether:readFileDataUrl', filePath),
  readFileText: filePath => ipcRenderer.invoke('aether:readFileText', filePath),
  selectPaths: options => ipcRenderer.invoke('aether:selectPaths', options),
  writeClipboard: text => ipcRenderer.invoke('aether:writeClipboard', text),
  saveImageFromUrl: url => ipcRenderer.invoke('aether:saveImageFromUrl', url),
  saveImageBuffer: (data, ext) => ipcRenderer.invoke('aether:saveImageBuffer', { data, ext }),
  saveClipboardImage: () => ipcRenderer.invoke('aether:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('aether:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('aether:watchPreviewFile', url),
  stopPreviewFileWatch: id => ipcRenderer.invoke('aether:stopPreviewFileWatch', id),
  setTitleBarTheme: payload => ipcRenderer.send('aether:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('aether:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('aether:translucency', payload),
  setPreviewShortcutActive: active => ipcRenderer.send('aether:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('aether:openExternal', url),
  openPreviewInBrowser: url => ipcRenderer.invoke('aether:openPreviewInBrowser', url),
  fetchLinkTitle: url => ipcRenderer.invoke('aether:fetchLinkTitle', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('aether:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('aether:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('aether:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('aether:setting:defaultProjectDir:pick')
  },
  revealLogs: () => ipcRenderer.invoke('aether:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('aether:logs:recent'),
  readDir: dirPath => ipcRenderer.invoke('aether:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('aether:fs:gitRoot', startPath),
  worktrees: cwds => ipcRenderer.invoke('aether:fs:worktrees', cwds),
  terminal: {
    dispose: id => ipcRenderer.invoke('aether:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('aether:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('aether:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('aether:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `aether:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `aether:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('aether:close-preview-requested', listener)
    return () => ipcRenderer.removeListener('aether:close-preview-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('aether:open-updates', listener)
    return () => ipcRenderer.removeListener('aether:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:deep-link', listener)
    return () => ipcRenderer.removeListener('aether:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('aether:deep-link-ready'),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:window-state-changed', listener)
    return () => ipcRenderer.removeListener('aether:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('aether:focus-session', listener)
    return () => ipcRenderer.removeListener('aether:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:notification-action', listener)
    return () => ipcRenderer.removeListener('aether:notification-action', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:preview-file-changed', listener)
    return () => ipcRenderer.removeListener('aether:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:backend-exit', listener)
    return () => ipcRenderer.removeListener('aether:backend-exit', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('aether:power-resume', listener)
    return () => ipcRenderer.removeListener('aether:power-resume', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:boot-progress', listener)
    return () => ipcRenderer.removeListener('aether:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.cjs (apps/desktop/electron/bootstrap-runner.cjs).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('aether:bootstrap:get'),
  resetBootstrap: () => ipcRenderer.invoke('aether:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('aether:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('aether:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('aether:bootstrap:event', listener)
    return () => ipcRenderer.removeListener('aether:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('aether:version'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('aether:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('aether:uninstall:summary'),
    run: mode => ipcRenderer.invoke('aether:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('aether:updates:check'),
    apply: opts => ipcRenderer.invoke('aether:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('aether:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('aether:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('aether:updates:progress', listener)
      return () => ipcRenderer.removeListener('aether:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('aether:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('aether:vscode-theme:search', query)
  }
})
