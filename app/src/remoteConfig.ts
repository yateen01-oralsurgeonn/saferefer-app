// Remote Config (T11): the only file that talks to Firebase Remote Config.
// It fetches the cloud model name and the three section lists, hands the raw strings to resolveRemote() (core/remoteValues.ts),
// and gets back safe values. It never delays the screen (the app starts on the defaults compiled into it), never logs,
// and any failure at all (offline, no config, not supported, a bad value) means the defaults. No analytics.
import { fetchAndActivate, getAll, getRemoteConfig, isSupported } from 'firebase/remote-config'
import { DEFAULT_REMOTE, PARAM_MODEL, PARAM_TEMPLATE, resolveRemote, type RemoteValues } from './core'
import { app, isConfigured } from './firebase'

/** A short minimum interval in the built app so a console change shows within about a minute; none in development. */
const MIN_FETCH_MS = import.meta.env.DEV ? 0 : 60_000
const FETCH_TIMEOUT_MS = 4_000

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('remote-config-timeout')), ms))

export async function loadRemoteValues(): Promise<RemoteValues> {
  if (!isConfigured) return DEFAULT_REMOTE
  try {
    if (!(await isSupported())) return DEFAULT_REMOTE
    const rc = getRemoteConfig(app)
    rc.settings.minimumFetchIntervalMillis = MIN_FETCH_MS
    rc.settings.fetchTimeoutMillis = FETCH_TIMEOUT_MS
    // Empty defaults: "no value" resolves to the defaults compiled into core/.
    rc.defaultConfig = Object.fromEntries([PARAM_MODEL, ...Object.values(PARAM_TEMPLATE)].map((k) => [k, '']))
    await Promise.race([fetchAndActivate(rc), timeout(FETCH_TIMEOUT_MS + 1_000)])
    const all = getAll(rc)
    const raw: Record<string, unknown> = {}
    for (const key of [PARAM_MODEL, ...Object.values(PARAM_TEMPLATE)]) raw[key] = all[key]?.asString()
    return resolveRemote(raw)
  } catch {
    return DEFAULT_REMOTE
  }
}
