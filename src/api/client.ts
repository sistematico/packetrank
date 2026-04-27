import type { Match, PlayerRank, LastMatchRanking, OverallRanking, SubmitMatch, SubmitMatchResponse } from './types.js'

// ---------------------------------------------------------------------------
// Mockup data — substitua pelas rotas reais do packetloss quando disponíveis
// ---------------------------------------------------------------------------

const MOCK_MATCHES: Match[] = [
  {
    id: 'match-001',
    map: 'de_dust2',
    mode: 'Competitivo',
    startedAt: '2026-04-24T20:00:00Z',
    endedAt: '2026-04-24T21:15:00Z',
    team1Score: 16,
    team2Score: 12,
    winner: 'team1',
    players: [
      { player: { id: '1', discordId: '123456789', name: 'Fenrir' }, kills: 28, deaths: 14, assists: 6, score: 180, team: 'team1' },
      { player: { id: '2', discordId: '234567890', name: 'Nexus' }, kills: 22, deaths: 18, assists: 9, score: 140, team: 'team1' },
      { player: { id: '3', discordId: '345678901', name: 'Axiom' }, kills: 19, deaths: 20, assists: 5, score: 118, team: 'team2' },
      { player: { id: '4', discordId: '456789012', name: 'Volt' }, kills: 15, deaths: 22, assists: 7, score: 95, team: 'team2' },
    ],
  },
  {
    id: 'match-002',
    map: 'de_mirage',
    mode: 'Competitivo',
    startedAt: '2026-04-23T19:00:00Z',
    endedAt: '2026-04-23T20:30:00Z',
    team1Score: 13,
    team2Score: 16,
    winner: 'team2',
    players: [
      { player: { id: '1', discordId: '123456789', name: 'Fenrir' }, kills: 20, deaths: 16, assists: 4, score: 130, team: 'team1' },
      { player: { id: '3', discordId: '345678901', name: 'Axiom' }, kills: 25, deaths: 12, assists: 8, score: 162, team: 'team2' },
      { player: { id: '2', discordId: '234567890', name: 'Nexus' }, kills: 14, deaths: 19, assists: 3, score: 88, team: 'team1' },
      { player: { id: '4', discordId: '456789012', name: 'Volt' }, kills: 18, deaths: 15, assists: 6, score: 115, team: 'team2' },
    ],
  },
]

const MOCK_PLAYER_RANKS: PlayerRank[] = [
  { player: { id: '1', discordId: '123456789', name: 'Fenrir' }, rank: 1, score: 310, wins: 5, losses: 2, kills: 48, deaths: 30, assists: 10, kd: 1.6, winRate: 71.4, lastMatchScore: 180 },
  { player: { id: '3', discordId: '345678901', name: 'Axiom' }, rank: 2, score: 280, wins: 4, losses: 3, kills: 44, deaths: 32, assists: 13, kd: 1.37, winRate: 57.1, lastMatchScore: 162 },
  { player: { id: '2', discordId: '234567890', name: 'Nexus' }, rank: 3, score: 228, wins: 3, losses: 3, kills: 36, deaths: 37, assists: 12, kd: 0.97, winRate: 50.0, lastMatchScore: 140 },
  { player: { id: '4', discordId: '456789012', name: 'Volt' }, rank: 4, score: 210, wins: 1, losses: 5, kills: 33, deaths: 37, assists: 13, kd: 0.89, winRate: 16.6, lastMatchScore: 95 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiUrl(path: string): string {
  const base = process.env.API_BASE_URL ?? 'https://packetloss.com.br'
  return `${base}${path}`
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = buildApiUrl(path)
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`API error ${res.status} — ${url}`)
  return res.json() as Promise<T>
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = buildApiUrl(path)
  const apiToken = process.env.API_TOKEN
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`API error ${res.status} — ${url}`)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Usa mockup quando USE_MOCK_API=true ou API_BASE_URL não estiver definida
// ---------------------------------------------------------------------------

const useMock = process.env.USE_MOCK_API === 'true' || !process.env.API_BASE_URL

export async function getMatches(): Promise<Match[]> {
  if (useMock) return MOCK_MATCHES
  return apiFetch<Match[]>('/api/bot/partidas')
}

export async function getMatch(id: string): Promise<Match | null> {
  if (useMock) return MOCK_MATCHES.find(m => m.id === id) ?? null
  try {
    return await apiFetch<Match>(`/api/bot/partida?id=${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function getLastMatch(): Promise<Match | null> {
  if (useMock) return MOCK_MATCHES[0] ?? null
  try {
    return await apiFetch<Match>('/api/bot/partida')
  } catch {
    return null
  }
}

export async function getPlayerRank(discordId: string): Promise<PlayerRank | null> {
  if (useMock) return MOCK_PLAYER_RANKS.find(r => r.player.discordId === discordId) ?? null
  try {
    return await apiFetch<PlayerRank>(`/api/bot/rank?player=${encodeURIComponent(discordId)}`)
  } catch {
    return null
  }
}

export async function getLastMatchRanking(): Promise<LastMatchRanking | null> {
  if (useMock) {
    const last = MOCK_MATCHES[0]
    if (!last) return null
    const entries = [...last.players]
      .sort((a, b) => b.score - a.score)
      .map((mp, i) => ({
        rank: i + 1,
        player: mp.player,
        score: mp.score,
        kills: mp.kills,
        deaths: mp.deaths,
        assists: mp.assists,
        kd: Number((mp.kills / Math.max(mp.deaths, 1)).toFixed(2)),
      }))
    return { matchId: last.id, map: last.map, playedAt: last.endedAt, entries }
  }
  return apiFetch<LastMatchRanking>('/api/bot/rankings?tipo=ultima')
}

export async function getOverallRanking(): Promise<OverallRanking | null> {
  if (useMock) {
    const entries = MOCK_PLAYER_RANKS.map((r, i) => ({
      rank: i + 1,
      player: r.player,
      score: r.score,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      kd: r.kd,
      wins: r.wins,
      losses: r.losses,
      winRate: r.winRate,
    }))
    return { entries, totalMatches: MOCK_MATCHES.length, updatedAt: new Date().toISOString() }
  }
  return apiFetch<OverallRanking>('/api/bot/rankings?tipo=geral')
}

export async function submitMatch(payload: SubmitMatch): Promise<SubmitMatchResponse> {
  return apiPost<SubmitMatchResponse>('/api/bot/partida', payload)
}
