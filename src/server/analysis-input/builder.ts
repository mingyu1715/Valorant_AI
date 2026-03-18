import type { RawMatchRecordForFeatureExtraction } from "@/src/server/db/repositories";
import type {
  MatchAnalysisInput,
  MatchCombatAnalysisInput,
  MatchCommonAnalysisInput,
  MatchContextAnalysisInput,
  MatchEconomyAnalysisInput,
  PlayerAnalysisInput,
  PlayerSummaryAnalysisInput,
  ThemeAnalysisInputPayloadMap
} from "@/src/server/analysis-input/types";

const TRADE_WINDOW_MS = 5000;
const ECO_LOADOUT_MAX = 2500;
const FULL_BUY_LOADOUT_MIN = 3900;
const SAVE_SPENT_MAX = 1000;
const SAVE_LOADOUT_MAX = 2200;

type RoundSide = "attack" | "defense" | "unknown";
type BuyTier = "eco" | "force" | "full_buy";

interface KillEvent {
  killer: string;
  victim: string;
  assistants: string[];
  timeSinceRoundStartMillis: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((item) => toRecord(item)) : [];
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => toStringValue(item)).filter(Boolean);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value: unknown): number {
  const numeric = toNumber(value, 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.round(numeric);
}

function toMetric(value: number, digits = 4): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(digits));
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function oppositeSide(side: RoundSide): RoundSide {
  if (side === "attack") {
    return "defense";
  }
  if (side === "defense") {
    return "attack";
  }
  return "unknown";
}

function normalizeWinningRole(value: unknown): RoundSide {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized.includes("attack")) {
    return "attack";
  }
  if (normalized.includes("def")) {
    return "defense";
  }
  return "unknown";
}

function inferRoundSideForPlayer(roundResult: Record<string, unknown>, playerTeamId: string): RoundSide {
  const winningTeam = toStringValue(roundResult.winningTeam);
  const winningRole = normalizeWinningRole(roundResult.winningTeamRole);
  if (!playerTeamId || !winningTeam || winningRole === "unknown") {
    return "unknown";
  }
  if (winningTeam === playerTeamId) {
    return winningRole;
  }
  return oppositeSide(winningRole);
}

function classifyBuyTier(loadoutValue: number): BuyTier {
  if (loadoutValue >= FULL_BUY_LOADOUT_MIN) {
    return "full_buy";
  }
  if (loadoutValue <= ECO_LOADOUT_MAX) {
    return "eco";
  }
  return "force";
}

function isSaveRound(loadoutValue: number, spent: number): boolean {
  return loadoutValue <= SAVE_LOADOUT_MAX && spent <= SAVE_SPENT_MAX;
}

function extractMatchPayload(rawJson: unknown): Record<string, unknown> {
  if (!isRecord(rawJson)) {
    return {};
  }

  if (isRecord(rawJson.matchPayload)) {
    return rawJson.matchPayload;
  }

  if (isRecord(rawJson.matchInfo) || Array.isArray(rawJson.players) || Array.isArray(rawJson.roundResults)) {
    return rawJson;
  }

  return {};
}

function extractKillEvents(playerRoundStats: Record<string, unknown>[]): KillEvent[] {
  const events: KillEvent[] = [];

  for (const stat of playerRoundStats) {
    const kills = toRecordArray(stat.kills);
    for (const kill of kills) {
      events.push({
        killer: toStringValue(kill.killer),
        victim: toStringValue(kill.victim),
        assistants: toStringArray(kill.assistants),
        timeSinceRoundStartMillis: toNumber(kill.timeSinceRoundStartMillis, Number.MAX_SAFE_INTEGER)
      });
    }
  }

  return events
    .filter((event) => event.killer || event.victim)
    .sort((left, right) => left.timeSinceRoundStartMillis - right.timeSinceRoundStartMillis);
}

function hasTradedDeath(puuid: string, teammatePuuidSet: Set<string>, events: KillEvent[]): boolean {
  const myDeath = events.find((event) => event.victim === puuid);
  if (!myDeath || !myDeath.killer) {
    return false;
  }

  return events.some((event) => {
    if (!event.killer || !event.victim) {
      return false;
    }
    if (!teammatePuuidSet.has(event.killer)) {
      return false;
    }
    if (event.victim !== myDeath.killer) {
      return false;
    }
    const diff = event.timeSinceRoundStartMillis - myDeath.timeSinceRoundStartMillis;
    return diff >= 0 && diff <= TRADE_WINDOW_MS;
  });
}

function countTradeKills(puuid: string, teammatePuuidSet: Set<string>, events: KillEvent[]): number {
  const teammateDeaths = events.filter((event) => teammatePuuidSet.has(event.victim));
  let count = 0;

  for (const event of events) {
    if (event.killer !== puuid || !event.victim) {
      continue;
    }

    const tradedTeammateDeath = teammateDeaths.some((death) => {
      if (!death.killer || death.killer !== event.victim) {
        return false;
      }
      const diff = event.timeSinceRoundStartMillis - death.timeSinceRoundStartMillis;
      return diff >= 0 && diff <= TRADE_WINDOW_MS;
    });

    if (tradedTeammateDeath) {
      count += 1;
    }
  }

  return count;
}

function detectClutchAttempt(
  puuid: string,
  teammatePuuidSet: Set<string>,
  enemyPuuidSet: Set<string>,
  events: KillEvent[]
): boolean {
  if (!puuid || !enemyPuuidSet.size) {
    return false;
  }

  const aliveTeammates = new Set<string>([...teammatePuuidSet, puuid]);
  const aliveEnemies = new Set<string>(enemyPuuidSet);

  for (const event of events) {
    if (event.victim && aliveTeammates.has(event.victim)) {
      aliveTeammates.delete(event.victim);
    }
    if (event.victim && aliveEnemies.has(event.victim)) {
      aliveEnemies.delete(event.victim);
    }

    if (aliveTeammates.has(puuid) && aliveTeammates.size === 1 && aliveEnemies.size >= 1) {
      return true;
    }
  }

  return false;
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function resolveRoundOrder(roundResults: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...roundResults].sort((left, right) => {
    const leftRound = toInteger(left.roundNum);
    const rightRound = toInteger(right.roundNum);
    return leftRound - rightRound;
  });
}

function resolveMatchResult(params: {
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  lastRoundWon: boolean | null;
}): MatchCommonAnalysisInput["result"] {
  if (params.roundsPlayed <= 0) {
    return "unknown";
  }
  if (params.roundsWon > params.roundsLost) {
    return "win";
  }
  if (params.roundsWon < params.roundsLost) {
    return "loss";
  }

  // VALORANT에서 동률은 연장 구간에서만 발생 가능하다고 보고 draw(unknown)로 처리합니다.
  if (params.roundsPlayed > 24) {
    return "unknown";
  }

  // 비정상/누락 데이터 fallback: 일반 구간은 승패 둘 중 하나로 귀결되도록 마지막 라운드 결과를 사용합니다.
  if (params.lastRoundWon === true) {
    return "win";
  }
  if (params.lastRoundWon === false) {
    return "loss";
  }
  return "loss";
}

function buildMatchAnalysisInput(puuid: string, rawMatch: RawMatchRecordForFeatureExtraction): MatchAnalysisInput {
  const matchPayload = extractMatchPayload(rawMatch.rawJson);
  const matchInfo = toRecord(matchPayload.matchInfo);
  const players = toRecordArray(matchPayload.players);
  const teams = toRecordArray(matchPayload.teams);
  const roundResults = resolveRoundOrder(toRecordArray(matchPayload.roundResults));

  const player = players.find((item) => toStringValue(item.puuid) === puuid) ?? {};
  const playerTeamId = toStringValue(player.teamId);
  const teammatePuids = new Set(
    players
      .filter((item) => toStringValue(item.teamId) === playerTeamId)
      .map((item) => toStringValue(item.puuid))
      .filter((item) => item && item !== puuid)
  );
  const enemyPuids = new Set(
    players
      .filter((item) => toStringValue(item.teamId) && toStringValue(item.teamId) !== playerTeamId)
      .map((item) => toStringValue(item.puuid))
      .filter(Boolean)
  );
  const playerStats = toRecord(player.stats);

  const score = toInteger(playerStats.score);
  const kills = toInteger(playerStats.kills);
  const deaths = toInteger(playerStats.deaths);
  const assists = toInteger(playerStats.assists);

  let firstKills = 0;
  let firstDeaths = 0;
  let headshots = 0;
  let bodyshots = 0;
  let legshots = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let kastRounds = 0;
  let tradeKills = 0;
  let tradedDeaths = 0;
  let clutchCount = 0;
  let clutchWins = 0;
  let aceCount = 0;
  let kills2 = 0;
  let kills3 = 0;
  let kills4 = 0;
  let kills5 = 0;

  let attackRoundCount = 0;
  let defenseRoundCount = 0;
  let attackRoundsWon = 0;
  let defenseRoundsWon = 0;
  let plantCount = 0;
  let defuseCount = 0;

  let ecoCount = 0;
  let forceCount = 0;
  let fullBuyCount = 0;
  let saveCount = 0;
  let ecoWins = 0;
  let forceWins = 0;
  let fullBuyWins = 0;
  let loadoutValueTotal = 0;
  let spentTotal = 0;
  let remainingTotal = 0;

  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let currentWinStreak = 0;
  let currentLoseStreak = 0;
  let lastRoundWon: boolean | null = null;

  for (const roundResult of roundResults) {
    const roundPlayerStats = toRecordArray(roundResult.playerStats);
    const myRoundStats = roundPlayerStats.find((item) => toStringValue(item.puuid) === puuid) ?? {};
    const allKillEvents = extractKillEvents(roundPlayerStats);
    const myRoundKillCount = allKillEvents.filter((event) => event.killer === puuid).length;
    const myRoundDeath = allKillEvents.find((event) => event.victim === puuid) ?? null;
    const firstKillEvent = allKillEvents[0] ?? null;
    const roundWinningTeam = toStringValue(roundResult.winningTeam);
    const roundWon = Boolean(playerTeamId && roundWinningTeam && roundWinningTeam === playerTeamId);

    if (firstKillEvent?.killer === puuid) {
      firstKills += 1;
    }
    if (firstKillEvent?.victim === puuid) {
      firstDeaths += 1;
    }

    const myDamageEvents = toRecordArray(myRoundStats.damage);
    for (const damageEvent of myDamageEvents) {
      const damage = Math.max(0, toNumber(damageEvent.damage, 0));
      damageDealt += damage;
      headshots += Math.max(0, toInteger(damageEvent.headshots));
      bodyshots += Math.max(0, toInteger(damageEvent.bodyshots));
      legshots += Math.max(0, toInteger(damageEvent.legshots));
    }

    for (const stat of roundPlayerStats) {
      if (toStringValue(stat.puuid) === puuid) {
        continue;
      }
      const damageEvents = toRecordArray(stat.damage);
      for (const damageEvent of damageEvents) {
        if (toStringValue(damageEvent.receiver) !== puuid) {
          continue;
        }
        damageTaken += Math.max(0, toNumber(damageEvent.damage, 0));
      }
    }

    const assisted = allKillEvents.some((event) => event.assistants.includes(puuid));
    const survived = myRoundDeath === null;
    const tradedDeath = hasTradedDeath(puuid, teammatePuids, allKillEvents);
    if (tradedDeath) {
      tradedDeaths += 1;
    }
    tradeKills += countTradeKills(puuid, teammatePuids, allKillEvents);

    if (myRoundKillCount > 0 || assisted || survived || tradedDeath) {
      kastRounds += 1;
    }

    if (myRoundKillCount === 2) {
      kills2 += 1;
    } else if (myRoundKillCount === 3) {
      kills3 += 1;
    } else if (myRoundKillCount === 4) {
      kills4 += 1;
    } else if (myRoundKillCount >= 5) {
      kills5 += 1;
      aceCount += 1;
    }

    const clutchAttempt = detectClutchAttempt(puuid, teammatePuids, enemyPuids, allKillEvents);
    if (clutchAttempt) {
      clutchCount += 1;
      if (roundWon) {
        clutchWins += 1;
      }
    }

    const myEconomy = toRecord(myRoundStats.economy);
    const loadoutValue = Math.max(0, toNumber(myEconomy.loadoutValue, 0));
    const spent = Math.max(0, toNumber(myEconomy.spent, 0));
    const remaining = Math.max(0, toNumber(myEconomy.remaining, 0));
    loadoutValueTotal += loadoutValue;
    spentTotal += spent;
    remainingTotal += remaining;

    const tier = classifyBuyTier(loadoutValue);
    if (tier === "eco") {
      ecoCount += 1;
      if (roundWon) {
        ecoWins += 1;
      }
    } else if (tier === "force") {
      forceCount += 1;
      if (roundWon) {
        forceWins += 1;
      }
    } else {
      fullBuyCount += 1;
      if (roundWon) {
        fullBuyWins += 1;
      }
    }

    if (isSaveRound(loadoutValue, spent)) {
      saveCount += 1;
    }

    if (toStringValue(roundResult.bombPlanter) === puuid) {
      plantCount += 1;
    }
    if (toStringValue(roundResult.bombDefuser) === puuid) {
      defuseCount += 1;
    }

    const roundSide = inferRoundSideForPlayer(roundResult, playerTeamId);
    if (roundSide === "attack") {
      attackRoundCount += 1;
      if (roundWon) {
        attackRoundsWon += 1;
      }
    } else if (roundSide === "defense") {
      defenseRoundCount += 1;
      if (roundWon) {
        defenseRoundsWon += 1;
      }
    }

    if (roundWinningTeam) {
      if (roundWon) {
        currentWinStreak += 1;
        currentLoseStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLoseStreak += 1;
        currentWinStreak = 0;
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
      }
      lastRoundWon = roundWon;
    }
  }

  const playerTeam = teams.find((team) => toStringValue(team.teamId) === playerTeamId) ?? {};
  const roundsPlayed = Math.max(
    toInteger(playerStats.roundsPlayed),
    toInteger(playerTeam.roundsPlayed),
    roundResults.length
  );
  const roundsWon = Math.max(
    toInteger(playerTeam.roundsWon),
    attackRoundsWon + defenseRoundsWon
  );
  const roundsLost = Math.max(0, roundsPlayed - roundsWon);
  const result = resolveMatchResult({
    roundsPlayed,
    roundsWon,
    roundsLost,
    lastRoundWon
  });

  const kd = toMetric(safeRate(kills, Math.max(1, deaths)));
  const acs = toMetric(safeRate(score, roundsPlayed));
  const kast = toMetric(safeRate(kastRounds, roundsPlayed));
  const hsPercent = toMetric(safeRate(headshots, headshots + bodyshots + legshots));
  const adr = toMetric(safeRate(damageDealt, roundsPlayed));
  const dda = toMetric(safeRate(damageDealt - damageTaken, roundsPlayed));
  const firstKillRate = toMetric(safeRate(firstKills, roundsPlayed));
  const firstDeathRate = toMetric(safeRate(firstDeaths, roundsPlayed));

  const common: MatchCommonAnalysisInput = {
    map: toStringValue(matchInfo.mapId),
    result,
    roundsPlayed,
    attackRoundsWon,
    defenseRoundsWon,
    agent: toStringValue(player.characterId) || null,
    kills,
    deaths,
    assists,
    kd,
    acs,
    kast,
    hsPercent,
    firstKills,
    firstDeaths,
    adr,
    dda,
    score
  };

  const combat: MatchCombatAnalysisInput = {
    killsPerRound: toMetric(safeRate(kills, roundsPlayed)),
    deathsPerRound: toMetric(safeRate(deaths, roundsPlayed)),
    assistsPerRound: toMetric(safeRate(assists, roundsPlayed)),
    kills2,
    kills3,
    kills4,
    kills5,
    multiKillRate: toMetric(safeRate(kills2 + kills3 + kills4 + kills5, roundsPlayed)),
    tradeKills,
    tradedDeaths,
    firstKillRate,
    firstDeathRate,
    aceCount,
    aceRate: toMetric(safeRate(aceCount, roundsPlayed)),
    clutchCount,
    clutchWinRate: toMetric(safeRate(clutchWins, clutchCount))
  };

  const economy: MatchEconomyAnalysisInput = {
    avgLoadoutValue: toMetric(safeRate(loadoutValueTotal, roundsPlayed)),
    avgSpent: toMetric(safeRate(spentTotal, roundsPlayed)),
    avgRemaining: toMetric(safeRate(remainingTotal, roundsPlayed)),
    ecoRoundRate: toMetric(safeRate(ecoCount, roundsPlayed)),
    forceRoundRate: toMetric(safeRate(forceCount, roundsPlayed)),
    fullBuyRoundRate: toMetric(safeRate(fullBuyCount, roundsPlayed)),
    saveRoundRate: toMetric(safeRate(saveCount, roundsPlayed)),
    avgCreditsSpentPerRound: toMetric(safeRate(spentTotal, roundsPlayed)),
    avgCreditsRemainingPerRound: toMetric(safeRate(remainingTotal, roundsPlayed)),
    ecoWinRate: toMetric(safeRate(ecoWins, ecoCount)),
    forceWinRate: toMetric(safeRate(forceWins, forceCount)),
    fullBuyWinRate: toMetric(safeRate(fullBuyWins, fullBuyCount)),
    avgDamagePerCredit: toMetric(safeRate(damageDealt, spentTotal)),
    avgScorePerCredit: toMetric(safeRate(score, spentTotal)),
    ecoCount,
    forceCount,
    fullBuyCount,
    saveCount
  };

  const context: MatchContextAnalysisInput = {
    plantCount,
    defuseCount,
    plantRoundRate: toMetric(safeRate(plantCount, roundsPlayed)),
    defuseRoundRate: toMetric(safeRate(defuseCount, roundsPlayed)),
    attackWinRate: toMetric(safeRate(attackRoundsWon, attackRoundCount)),
    defenseWinRate: toMetric(safeRate(defenseRoundsWon, defenseRoundCount)),
    winStreak: lastRoundWon === true ? currentWinStreak : 0,
    loseStreak: lastRoundWon === false ? currentLoseStreak : 0,
    maxWinStreak,
    maxLoseStreak,
    clutchCount,
    clutchWinRate: toMetric(safeRate(clutchWins, clutchCount)),
    aceCount,
    aceRate: toMetric(safeRate(aceCount, roundsPlayed))
  };

  return {
    common,
    combat,
    economy,
    context
  };
}

function buildPlayerSummary(matches: MatchAnalysisInput[]): PlayerSummaryAnalysisInput {
  if (!matches.length) {
    return {
      winRate: 0,
      avgRoundsPlayed: 0,
      avgAttackRoundsWon: 0,
      avgDefenseRoundsWon: 0,
      mainAgent: null,
      avgKills: 0,
      avgDeaths: 0,
      avgAssists: 0,
      avgKD: 0,
      avgACS: 0,
      avgKAST: 0,
      avgHSPercent: 0,
      avgFirstKills: 0,
      avgFirstDeaths: 0,
      avgADR: 0,
      avgDDA: 0,
      avgScore: 0
    };
  }

  const agentCount = new Map<string, number>();
  let wins = 0;

  for (const match of matches) {
    if (match.common.result === "win") {
      wins += 1;
    }
    if (match.common.agent) {
      agentCount.set(match.common.agent, (agentCount.get(match.common.agent) ?? 0) + 1);
    }
  }

  const sortedAgents = [...agentCount.entries()].sort((left, right) => right[1] - left[1]);
  const mainAgent = sortedAgents[0]?.[0] ?? null;

  return {
    winRate: toMetric(safeRate(wins, matches.length)),
    avgRoundsPlayed: toMetric(average(matches.map((match) => match.common.roundsPlayed))),
    avgAttackRoundsWon: toMetric(average(matches.map((match) => match.common.attackRoundsWon))),
    avgDefenseRoundsWon: toMetric(average(matches.map((match) => match.common.defenseRoundsWon))),
    mainAgent,
    avgKills: toMetric(average(matches.map((match) => match.common.kills))),
    avgDeaths: toMetric(average(matches.map((match) => match.common.deaths))),
    avgAssists: toMetric(average(matches.map((match) => match.common.assists))),
    avgKD: toMetric(average(matches.map((match) => match.common.kd))),
    avgACS: toMetric(average(matches.map((match) => match.common.acs))),
    avgKAST: toMetric(average(matches.map((match) => match.common.kast))),
    avgHSPercent: toMetric(average(matches.map((match) => match.common.hsPercent))),
    avgFirstKills: toMetric(average(matches.map((match) => match.common.firstKills))),
    avgFirstDeaths: toMetric(average(matches.map((match) => match.common.firstDeaths))),
    avgADR: toMetric(average(matches.map((match) => match.common.adr))),
    avgDDA: toMetric(average(matches.map((match) => match.common.dda))),
    avgScore: toMetric(average(matches.map((match) => match.common.score)))
  };
}

export function buildPlayerAnalysisInput(
  puuid: string,
  rawMatches: RawMatchRecordForFeatureExtraction[]
): PlayerAnalysisInput {
  const normalizedPuuid = puuid.trim();
  const matches = rawMatches.map((rawMatch) => buildMatchAnalysisInput(normalizedPuuid, rawMatch));

  return {
    playerSummary: buildPlayerSummary(matches),
    matches
  };
}

export function buildThemeAnalysisInputPayloadMap(input: PlayerAnalysisInput): ThemeAnalysisInputPayloadMap {
  return {
    combat: {
      theme: "combat",
      playerSummary: input.playerSummary,
      matches: input.matches.map((match) => ({
        common: match.common,
        combat: match.combat
      }))
    },
    economy: {
      theme: "economy",
      playerSummary: input.playerSummary,
      matches: input.matches.map((match) => ({
        common: match.common,
        economy: match.economy
      }))
    },
    context: {
      theme: "context",
      playerSummary: input.playerSummary,
      matches: input.matches.map((match) => ({
        common: match.common,
        context: match.context
      }))
    }
  };
}
