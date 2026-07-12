// Lazily injects the YouTube IFrame Player API script exactly once and
// resolves when window.YT is ready to construct players with.

let apiPromise = null

export function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }

  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof existingCallback === 'function') existingCallback()
      resolve(window.YT)
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => reject(new Error('Failed to load the YouTube player.'))
    document.head.appendChild(script)

    // Safety timeout in case the callback never fires (e.g. blocked script)
    setTimeout(() => {
      if (!(window.YT && window.YT.Player)) {
        reject(new Error('Timed out loading the YouTube player.'))
      }
    }, 10000)
  })

  return apiPromise
}
