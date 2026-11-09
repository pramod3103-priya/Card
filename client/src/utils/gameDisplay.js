export const enterGameFullscreen = () => {
  const root = document.documentElement;
  try {
    const request = root.requestFullscreen?.({ navigationUI: 'hide' });
    if (request && typeof request.then === 'function') {
      request.then(() => {
        window.screen?.orientation?.lock?.('landscape').catch(() => {});
      }).catch(() => {});
    } else {
      window.screen?.orientation?.lock?.('landscape').catch(() => {});
    }
  } catch {
    // Fullscreen and orientation locking are browser-controlled capabilities.
  }
};