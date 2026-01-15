const API_URL = 'https://dog.ceo/api/breeds/image/random';

// PWA Install prompt handling
let deferredInstallPrompt = null;
const installBtn = typeof document !== 'undefined' ? document.getElementById('installBtn') : null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar on mobile and save the event
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        installBtn.disabled = true;
        try {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            // Hide if accepted; keep hidden if dismissed
            if (outcome === 'accepted') {
                installBtn.hidden = true;
            } else {
                installBtn.disabled = false;
            }
        } catch (_) {
            installBtn.disabled = false;
        } finally {
            deferredInstallPrompt = null;
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    deferredInstallPrompt = null;
});

async function loadData(signal) {
    const container = document.getElementById('content');
    container.textContent = 'Loading…';
    try {
        const res = await fetch(API_URL, { signal, headers: { 'accept': 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Ensure JSON; if not, this will throw and get handled below
        const data = await res.json();

        // Expecting shape { message: <imageUrl>, status: "success" }
        const imgUrl = data && data.message;
        const safe = typeof imgUrl === 'string' ? imgUrl : null;

        container.innerHTML = safe
            ? `<figure>
                   <img src="${safe}" alt="Random dog" style="max-width:100%;height:auto;"/>
                   <figcaption>Random dog from dog.ceo</figcaption>
               </figure>
               <details><summary>Response</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>`
            : `<pre>${JSON.stringify(data, null, 2)}</pre>`;

        // Persist last successful payload for offline fallback
        try {
            localStorage.setItem('lastDogData', JSON.stringify({ t: Date.now(), data }));
        } catch (_) { /* ignore quota/private mode errors */ }

    } catch (e) {
        // Try to show last successful data if available
        let fallbackShown = false;
        try {
            const cached = localStorage.getItem('lastDogData');
            if (cached) {
                const { data } = JSON.parse(cached);
                const imgUrl = data && data.message;
                if (typeof imgUrl === 'string') {
                    container.innerHTML = `<div style="color:#b26;">Offline or fetch failed – showing cached content.</div>
                        <figure>
                          <img src="${imgUrl}" alt="Cached random dog" style="max-width:100%;height:auto;"/>
                          <figcaption>Cached random dog (dog.ceo)</figcaption>
                        </figure>`;
                    fallbackShown = true;
                } else {
                    container.innerHTML = `<div style="color:#b26;">Offline or fetch failed – showing last cached response.</div>
                        <pre>${JSON.stringify(data, null, 2)}</pre>`;
                    fallbackShown = true;
                }
            }
        } catch (_) { /* ignore */ }

        if (!fallbackShown) {
            container.textContent = 'Failed: ' + (e.name === 'AbortError' ? 'Request aborted' : e.message);
        }
    }
}

// Optional: timeout/abort to avoid hanging
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

document.addEventListener('DOMContentLoaded', async () => {
    await loadData(controller.signal);
    clearTimeout(timeout);
});

// Register Service Worker for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                // Optional: log scope
                console.log('Service Worker registered:', reg.scope);
            })
            .catch(err => console.warn('Service Worker registration failed:', err));
    });
}