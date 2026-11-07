import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const appKey = import.meta.env.VITE_REVERB_APP_KEY;

// Only connect when an app key is configured. If you want to fully disable
// realtime, remove/empty VITE_REVERB_APP_KEY in your .env (and restart Vite).
const echo =
  appKey && appKey !== "my-app-key-disabled"
    ? new Echo({
        broadcaster: "reverb",
        key: appKey,
        wsHost: import.meta.env.VITE_REVERB_HOST || "127.0.0.1",
        wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
        wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
        forceTLS: false,
        encrypted: false,
        enabledTransports: ["ws"],
        disableStats: true,
      })
    : null;

export default echo;
