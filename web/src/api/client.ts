import type { ApplyLine, Detection, DryRunResult, Profile } from '../types';

const BASE = 'http://localhost:7420';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(
      "L'agent local ne répond pas. Lancez-le avec : python3 agent/server.py",
      0,
    );
  }
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) return body.detail.join(' ; ');
  } catch {
    /* corps non JSON */
  }
  return `Erreur de l'agent (code ${res.status})`;
}

export const api = {
  health: () => request<{ status: 'ok' }>('/health'),
  detect: () => request<Detection>('/detect'),
  /** Le profil est envoyé tel quel comme corps de la requête. */
  dryrun: (profile: Profile) =>
    request<DryRunResult>('/dryrun', { method: 'POST', body: JSON.stringify(profile) }),
  rollback: () => request<{ restored: boolean }>('/rollback', { method: 'POST' }),

  /** Réponse en flux : une ligne JSON par action. */
  async apply(profile: Profile, token: string, onLine: (line: ApplyLine) => void): Promise<void> {
    let res: Response;
    try {
      res = await fetch(BASE + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, token }),
      });
    } catch {
      throw new ApiError("L'agent local ne répond pas.", 0);
    }
    if (!res.ok || !res.body) throw new ApiError(await errorMessage(res), res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (raw) onLine(JSON.parse(raw) as ApplyLine);
      }
      if (done) break;
    }
    if (buffer.trim()) onLine(JSON.parse(buffer) as ApplyLine);
  },
};
