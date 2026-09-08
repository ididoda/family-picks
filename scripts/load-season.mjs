#!/usr/bin/env node
/**
 * One-off: load the full NFL regular season (weeks 1-18) into Supabase.
 *
 * For each week it ensures a `weeks` row exists for the active season, pulls that
 * week's schedule from ESPN, and inserts any games not already present (dedup by
 * away@home within the week). Safe to re-run — it only adds missing games, it
 * does not update or remove games whose matchup or time later changed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/load-season.mjs [--weeks 1-18] [--year 2026] [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.
 */
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}
const dryRun = args.includes('--dry-run')

const [wkStart, wkEnd] = (getArg('weeks') ?? '1-18')
  .split('-')
  .map((n) => parseInt(n, 10))
const weekNumbers = []
for (let w = wkStart; w <= (wkEnd ?? wkStart); w++) weekNumbers.push(w)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Run with: node --env-file=.env.local scripts/load-season.mjs')
  process.exit(1)
}
const supabase = createClient(url, key)

// ESPN uses different abbreviations for a handful of teams
const ESPN_ABBR_MAP = { JAX: 'JAC', WSH: 'WAS' }
const normalizeAbbr = (a) => ESPN_ABBR_MAP[a] ?? a

async function fetchEspnWeek(weekNumber, year) {
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}&dates=${year}`
  const res = await fetch(espnUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)
  const data = await res.json()

  return (data.events ?? []).map((event) => {
    const competition = event.competitions[0]
    const competitors = competition.competitors
    const statusType = competition.status.type

    const away = competitors.find((c) => c.homeAway === 'away')
    const home = competitors.find((c) => c.homeAway === 'home')

    const awayAbbr = normalizeAbbr(away.team.abbreviation.toUpperCase())
    const homeAbbr = normalizeAbbr(home.team.abbreviation.toUpperCase())
    const awayScore = away.score ? parseInt(away.score, 10) : null
    const homeScore = home.score ? parseInt(home.score, 10) : null

    let status = 'scheduled'
    if (statusType.completed) status = 'final'
    else if (statusType.name === 'STATUS_IN_PROGRESS' || statusType.name === 'STATUS_HALFTIME')
      status = 'in_progress'

    let winningTeam = null
    if (status === 'final' && awayScore !== null && homeScore !== null) {
      winningTeam = awayScore > homeScore ? awayAbbr : homeAbbr
    }

    return {
      awayTeam: awayAbbr,
      homeTeam: homeAbbr,
      kickoffTime: event.date,
      status,
      awayScore,
      homeScore,
      winningTeam,
    }
  })
}

async function ensureWeek(seasonId, weekNumber) {
  const { data: existing } = await supabase
    .from('weeks')
    .select('id')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .maybeSingle()
  if (existing) return { id: existing.id, created: false }

  if (dryRun) return { id: null, created: true }

  const { data, error } = await supabase
    .from('weeks')
    .insert({ season_id: seasonId, week_number: weekNumber, status: 'open' })
    .select('id')
    .single()
  if (error) throw new Error(`create week ${weekNumber}: ${error.message}`)
  return { id: data.id, created: true }
}

async function main() {
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .select('id, year')
    .eq('is_active', true)
    .single()
  if (seasonErr || !season) throw new Error(`no active season: ${seasonErr?.message}`)

  const year = parseInt(getArg('year') ?? String(season.year), 10)
  console.log(
    `${dryRun ? '[dry-run] ' : ''}Loading weeks ${weekNumbers[0]}-${weekNumbers.at(-1)} for ${year} (season ${season.id})\n`
  )

  let totalAdded = 0
  for (const weekNumber of weekNumbers) {
    let week
    try {
      week = await ensureWeek(season.id, weekNumber)
    } catch (e) {
      console.log(`Week ${String(weekNumber).padStart(2)}: ERROR ${e.message}`)
      continue
    }

    let espnGames
    try {
      espnGames = await fetchEspnWeek(weekNumber, year)
    } catch (e) {
      console.log(
        `Week ${String(weekNumber).padStart(2)}: ${week.created ? 'week created, ' : ''}ESPN ERROR ${e.message}`
      )
      continue
    }

    let existingSet = new Set()
    if (week.id) {
      const { data: existing } = await supabase
        .from('games')
        .select('away_team, home_team')
        .eq('week_id', week.id)
      existingSet = new Set((existing ?? []).map((g) => `${g.away_team}@${g.home_team}`))
    }

    const toInsert = espnGames
      .filter((g) => !existingSet.has(`${g.awayTeam}@${g.homeTeam}`))
      .map((g) => ({
        week_id: week.id,
        away_team: g.awayTeam,
        home_team: g.homeTeam,
        kickoff_time: g.kickoffTime,
        status: g.status,
      }))

    if (toInsert.length > 0 && !dryRun) {
      const { error } = await supabase.from('games').insert(toInsert)
      if (error) {
        console.log(`Week ${String(weekNumber).padStart(2)}: insert ERROR ${error.message}`)
        continue
      }
    }

    totalAdded += toInsert.length
    console.log(
      `Week ${String(weekNumber).padStart(2)}: ${week.created ? 'week created, ' : ''}+${toInsert.length} games (ESPN returned ${espnGames.length}, ${existingSet.size} already present)`
    )
  }

  console.log(`\n${dryRun ? '[dry-run] would add' : 'Added'} ${totalAdded} games across ${weekNumbers.length} weeks.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
