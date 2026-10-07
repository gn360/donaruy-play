import { apiClient } from './apiClient'

// ── Tipos ──

export interface PlayOption {
  shots: number
  amount: number
  currency: string
  label: string
}

export interface NgoOption {
  id: number
  slug: string
  name: string
  avatar: string | null
}

export interface PlayGameLead {
  id: number
  code: string
  game: string
  origin: string | null
  attempts_granted: number
  attempts_used: number
  people_id: number | null
  shots: PlayGameShot[]
}

export interface PlayGameShot {
  id: number
  lead_id: number
  award_id: number
  award_title: string
  award_photo: string | null
  shot_number: number
  award_price?: number | string | null
  award_type?: string | null
  award_commerce_name?: string | null
  award_commerce_address?: string | null
}

export interface ShotSummary {
  award_title: string
  award_photo: string | null
  shot_number: number
}

export interface LeadData {
  lead: PlayGameLead
  attempts_remaining: number
  is_exhausted: boolean
  is_claimed: boolean
  people?: { name: string; last_name: string; email: string }
  shots_summary?: ShotSummary[]
}

export interface PlayGameAward {
  id: number
  title: string
  type: string
  photo: string | null
  price: number
}

export interface ApiResponse<T> {
  ok: boolean
  message?: string
  data: T
}

// ── Funciones ──

export async function fetchPlayConfig(): Promise<PlayOption[]> {
  const res = await apiClient.get<ApiResponse<{ options: PlayOption[] }>>('/config')
  return res.data.data.options
}

export async function fetchNgos(): Promise<NgoOption[]> {
  const res = await apiClient.get<ApiResponse<NgoOption[]>>('/ngos')
  return res.data.data
}

export async function fetchAwards(): Promise<PlayGameAward[]> {
  const res = await apiClient.get<ApiResponse<PlayGameAward[]>>('/awards')
  return res.data.data
}

export async function fetchLeadByCode(code: string): Promise<LeadData> {
  const res = await apiClient.get<ApiResponse<LeadData>>(`/leads?code=${encodeURIComponent(code)}`)
  return res.data.data
}

export async function submitShot(
  lead_id: number,
  award_id: number
): Promise<{
  shot: PlayGameShot
  shots_remaining: number
  is_exhausted: boolean
}> {
  const res = await apiClient.post<
    ApiResponse<{
      shot: PlayGameShot
      shots_remaining: number
      is_exhausted: boolean
    }>
  >('/shots', { lead_id, award_id })
  return res.data.data
}

export async function updateShot(
  id: number,
  fields: Partial<Pick<PlayGameShot, 'award_title' | 'award_photo' | 'award_price' | 'award_type' | 'award_commerce_name' | 'award_commerce_address'>>
): Promise<PlayGameShot> {
  const res = await apiClient.put<ApiResponse<PlayGameShot>>(`/shots/${id}`, fields)
  return res.data.data
}

export async function claimPrizes(payload: {
  code: string
  name: string
  last_name: string
  phone: string
  email: string
  doc_number: string
}): Promise<{ lead: PlayGameLead; people: unknown; shots: PlayGameShot[] }> {
  const res = await apiClient.post<
    ApiResponse<{
      lead: PlayGameLead
      people: unknown
      shots: PlayGameShot[]
    }>
  >('/leads/claim', payload)
  return res.data.data
}

export async function initDonation(payload: {
  option_index: number
  name: string
  last_name: string
  phone: string
  email: string
  doc_number: string
  ngo_slug: string
}): Promise<{ redirect_url: string; code: string }> {
  const res = await apiClient.post<
    ApiResponse<{ redirect_url: string; code: string }>
  >('/donations/init', payload)
  return res.data.data
}
