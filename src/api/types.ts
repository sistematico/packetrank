export interface Player {
  id: string
  discordId: string
  name: string
  avatar?: string
}

export interface MatchPlayer {
  player: Player
  kills: number
  deaths: number
  assists: number
  score: number
  team: 'team1' | 'team2'
}

export interface Match {
  id: string
  map: string
  mode: string
  startedAt: string
  endedAt: string
  team1Score: number
  team2Score: number
  winner: 'team1' | 'team2' | 'draw'
  players: MatchPlayer[]
}

export interface PlayerRank {
  player: Player
  rank: number
  score: number
  wins: number
  losses: number
  kills: number
  deaths: number
  assists: number
  kd: number
  winRate: number
  lastMatchScore: number
}

export interface RankingEntry {
  rank: number
  player: Player
  score: number
  kills: number
  deaths: number
  assists: number
  kd: number
}

export interface LastMatchRanking {
  matchId: string
  map: string
  playedAt: string
  entries: RankingEntry[]
}

export interface OverallRanking {
  entries: (RankingEntry & { wins: number; losses: number; winRate: number })[]
  totalMatches: number
  updatedAt: string
}
