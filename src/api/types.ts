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

// ---------------------------------------------------------------------------
// Submissão de partida (Among Us)
// ---------------------------------------------------------------------------

export type PlayerRole = 'impostor' | 'tripulante'

export interface SubmitMatchPlayer {
  discordId: string
  name: string
  role: PlayerRole
  /** Número de kills (impostores) */
  kills: number
  /** O jogador morreu durante a partida */
  died: boolean
  /** O time do jogador venceu */
  won: boolean
  /** Impostor venceu por sabotagem (+2 bônus) */
  wonBySabotage: boolean
  /** Tripulante perdeu por sabotagem (-5) */
  lostBySabotage: boolean
  /** Botão de impostor que ejetou tripulante (+1) */
  ejectedCrewmate: boolean
  /** Kitar ou cair (-5) */
  kited: boolean
  /** Punição administrativa (-10) */
  punished: boolean
  /** Votos corretos na reunião (+3 cada) */
  correctVotes: number
  /** Votos errados na reunião (-4 cada) */
  wrongVotes: number
}

export interface SubmitMatch {
  map: string
  /** ISO 8601 */
  playedAt: string
  players: SubmitMatchPlayer[]
}

export interface SubmitMatchResponse {
  id: string
  map: string
  playedAt: string
  players: (SubmitMatchPlayer & { score: number })[]
}

// ---------------------------------------------------------------------------
// Recrutamento do clan
// ---------------------------------------------------------------------------

export interface SubmitRecruitment {
  discordId: string
  nick: string
  age: string
  availability: string
  experience: string
  motivation: string
  referral?: string
}

export interface SubmitRecruitmentResponse {
  id: string
  status: 'pending'
  nick: string
  message: string
}

export interface RecruitmentApplication {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  nick: string
  createdAt: string | null
  reviewedAt: string | null
  notes: string | null
}

export interface RecruitmentStatusResponse {
  application: RecruitmentApplication | null
}
