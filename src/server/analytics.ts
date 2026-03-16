import { buildPlayerPayload } from "@/src/server/riot";
import {
  AppError,
  formatKdaTriplet,
  formatPercent,
  formatRatio,
  safeDiv,
  safeInt
} from "@/src/server/shared";
import type {
  AccountInfo,
  OverviewPayload,
  PreparedAnalysisInput,
  RiotKill,
  RiotMatchPayload,
  RiotPlayer,
  RiotRoundPlayerStats,
  RiotRoundResult,
  SectionPayload
} from "@/src/server/types";

interface MatchContext {
  match: RiotMatchPayload;
  players: RiotPlayer[];
  player: RiotPlayer;
  playerByPuuid: Map<string, RiotPlayer>;
  teamByPuuid: Map<string, string>;
  teamId: string;
  rounds: RiotRoundResult[];
}

function buildPlayerContexts(matches: RiotMatchPayload[], puuid: string): MatchContext[] {
  const contexts: MatchContext[] = [];

  for (const match of matches) {
    const players = (match.players ?? []).filter((player) => !player.isObserver);
    const playerByPuuid = new Map<string, RiotPlayer>();
    const teamByPuuid = new Map<string, string>();

    for (const player of players) {
      if (!player.puuid) {
        continue;
      }
      playerByPuuid.set(player.puuid, player);
      if (player.teamId) {
        teamByPuuid.set(player.puuid, player.teamId);
      }
    }

    const player = playerByPuuid.get(puuid);
    if (!player) {
      continue;
    }

    contexts.push({
      match,
      players,
      player,
      playerByPuuid,
      teamByPuuid,
      teamId: player.teamId ?? "",
      rounds: match.roundResults ?? []
    });
  }

  return contexts;
}

function findRoundPlayerStats(roundResult: RiotRoundResult, puuid: string): RiotRoundPlayerStats {
  return (roundResult.playerStats ?? []).find((playerStats) => playerStats.puuid === puuid) ?? {};
}

function collectRoundKills(roundResult: RiotRoundResult): RiotKill[] {
  const deduped = new Map<string, RiotKill>();

  for (const playerStats of roundResult.playerStats ?? []) {
    for (const kill of playerStats.kills ?? []) {
      const key = [
        safeInt(kill.timeSinceRoundStartMillis),
        kill.killer ?? "",
        kill.victim ?? ""
      ].join(":");
      deduped.set(key, kill);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const timeDelta = safeInt(left.timeSinceRoundStartMillis) - safeInt(right.timeSinceRoundStartMillis);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    const killerDelta = String(left.killer ?? "").localeCompare(String(right.killer ?? ""));
    if (killerDelta !== 0) {
      return killerDelta;
    }
    return String(left.victim ?? "").localeCompare(String(right.victim ?? ""));
  });
}

function collectRoundAssists(roundKills: RiotKill[], puuid: string): number {
  return roundKills.reduce((count, kill) => count + ((kill.assistants ?? []).includes(puuid) ? 1 : 0), 0);
}

function getOppositeRole(role: string | null): "attack" | "defense" | null {
  if (role === "attack") {
    return "defense";
  }
  if (role === "defense") {
    return "attack";
  }
  return null;
}

function normalizeRole(role: string | undefined): "attack" | "defense" | null {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (normalized.startsWith("attack")) {
    return "attack";
  }
  if (normalized.startsWith("defend")) {
    return "defense";
  }
  return null;
}

function getPlayerRoundRole(
  roundResult: RiotRoundResult,
  playerTeamId: string,
  teamByPuuid: Map<string, string>
): "attack" | "defense" | null {
  const winningRole = normalizeRole(roundResult.winningTeamRole);
  const winningTeam = roundResult.winningTeam;
  if (winningRole && winningTeam) {
    return winningTeam === playerTeamId ? winningRole : getOppositeRole(winningRole);
  }

  if (roundResult.bombPlanter) {
    const planterTeam = teamByPuuid.get(roundResult.bombPlanter);
    if (planterTeam) {
      return planterTeam === playerTeamId ? "attack" : "defense";
    }
  }

  if (roundResult.bombDefuser) {
    const defuserTeam = teamByPuuid.get(roundResult.bombDefuser);
    if (defuserTeam) {
      return defuserTeam === playerTeamId ? "defense" : "attack";
    }
  }

  return null;
}

function didTeamWin(context: MatchContext): boolean {
  for (const team of context.match.teams ?? []) {
    if (team.teamId === context.teamId) {
      return Boolean(team.won);
    }
  }
  return false;
}

export function buildPlayerOverview(accountInfo: AccountInfo, matches: RiotMatchPayload[]): OverviewPayload {
  const contexts = buildPlayerContexts(matches, accountInfo.puuid);
  if (!contexts.length) {
    throw new AppError("수집된 매치 데이터에서 해당 플레이어를 찾지 못했습니다.");
  }

  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let totalRounds = 0;
  let totalScore = 0;

  for (const context of contexts) {
    const playerStats = context.player.stats ?? {};
    kills += safeInt(playerStats.kills);
    deaths += safeInt(playerStats.deaths);
    assists += safeInt(playerStats.assists);
    totalRounds += safeInt(playerStats.roundsPlayed);
    totalScore += safeInt(playerStats.score);
    if (didTeamWin(context)) {
      wins += 1;
    }
  }

  const totalMatches = contexts.length;
  const overviewRaw = {
    matchesAnalyzed: totalMatches,
    wins,
    losses: totalMatches - wins,
    matchWinRate: safeDiv(wins, totalMatches),
    kills,
    deaths,
    assists,
    rounds: totalRounds,
    acs: safeDiv(totalScore, totalRounds),
    kdaRatio: safeDiv(kills + assists, Math.max(1, deaths))
  };

  return {
    facts: [
      `최근 ${totalMatches}경기 / 총 ${totalRounds}라운드 기준으로 분석했습니다.`,
      `전체 K/D/A는 ${formatKdaTriplet(kills, deaths, assists)}이고 KDA 비율은 ${formatRatio(overviewRaw.kdaRatio)}입니다.`,
      `매치 승률은 ${formatPercent(overviewRaw.matchWinRate)}, 평균 ACS는 ${overviewRaw.acs.toFixed(1)}입니다.`
    ],
    raw: overviewRaw
  };
}

export function summarizeAttackDefense(accountInfo: AccountInfo, matches: RiotMatchPayload[]): SectionPayload {
  const contexts = buildPlayerContexts(matches, accountInfo.puuid);
  const sideTotals = {
    attack: {
      rounds: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      roundWins: 0,
      teamOpeningAdvantage: 0,
      teamOpeningConversion: 0,
      openingDuels: 0,
      openingDuelWins: 0,
      firstBloods: 0,
      firstDeaths: 0
    },
    defense: {
      rounds: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      roundWins: 0,
      teamOpeningAdvantage: 0,
      teamOpeningConversion: 0,
      openingDuels: 0,
      openingDuelWins: 0,
      firstBloods: 0,
      firstDeaths: 0
    }
  };

  for (const context of contexts) {
    for (const roundResult of context.rounds) {
      const role = getPlayerRoundRole(roundResult, context.teamId, context.teamByPuuid);
      if (!role) {
        continue;
      }

      const roundKills = collectRoundKills(roundResult);
      const playerRound = findRoundPlayerStats(roundResult, accountInfo.puuid);
      const metrics = sideTotals[role];
      metrics.rounds += 1;
      metrics.kills += (playerRound.kills ?? []).length;
      metrics.deaths += roundKills.filter((kill) => kill.victim === accountInfo.puuid).length;
      metrics.assists += collectRoundAssists(roundKills, accountInfo.puuid);

      if (roundResult.winningTeam === context.teamId) {
        metrics.roundWins += 1;
      }

      if (!roundKills.length) {
        continue;
      }

      const firstKill = roundKills[0];
      if (context.teamByPuuid.get(firstKill.killer ?? "") === context.teamId) {
        metrics.teamOpeningAdvantage += 1;
        if (roundResult.winningTeam === context.teamId) {
          metrics.teamOpeningConversion += 1;
        }
      }

      if (firstKill.killer === accountInfo.puuid || firstKill.victim === accountInfo.puuid) {
        metrics.openingDuels += 1;
        if (firstKill.killer === accountInfo.puuid) {
          metrics.openingDuelWins += 1;
          metrics.firstBloods += 1;
        } else {
          metrics.firstDeaths += 1;
        }
      }
    }
  }

  const attack = sideTotals.attack;
  const defense = sideTotals.defense;
  const attackKda = safeDiv(attack.kills + attack.assists, Math.max(1, attack.deaths));
  const defenseKda = safeDiv(defense.kills + defense.assists, Math.max(1, defense.deaths));
  const attackOpening = safeDiv(attack.openingDuelWins, Math.max(1, attack.openingDuels));
  const defenseOpening = safeDiv(defense.openingDuelWins, Math.max(1, defense.openingDuels));

  const raw = {
    attack: {
      rounds: attack.rounds,
      kills: attack.kills,
      deaths: attack.deaths,
      assists: attack.assists,
      kdaRatio: attackKda,
      roundWinRate: safeDiv(attack.roundWins, Math.max(1, attack.rounds)),
      openingDuelRate: attackOpening,
      openingDuels: attack.openingDuels,
      firstBloods: attack.firstBloods,
      firstDeaths: attack.firstDeaths,
      teamOpeningConversion: safeDiv(attack.teamOpeningConversion, Math.max(1, attack.teamOpeningAdvantage))
    },
    defense: {
      rounds: defense.rounds,
      kills: defense.kills,
      deaths: defense.deaths,
      assists: defense.assists,
      kdaRatio: defenseKda,
      roundWinRate: safeDiv(defense.roundWins, Math.max(1, defense.rounds)),
      openingDuelRate: defenseOpening,
      openingDuels: defense.openingDuels,
      firstBloods: defense.firstBloods,
      firstDeaths: defense.firstDeaths,
      teamOpeningConversion: safeDiv(defense.teamOpeningConversion, Math.max(1, defense.teamOpeningAdvantage))
    },
    delta: {
      kdaGapDefenseMinusAttack: defenseKda - attackKda,
      openingDuelGapDefenseMinusAttack: defenseOpening - attackOpening
    }
  } satisfies Record<string, unknown>;

  return {
    key: "attack_defense",
    title: "공수 진영 분석",
    facts: [
      `공격 라운드 ${attack.rounds}개에서 K/D/A ${formatKdaTriplet(attack.kills, attack.deaths, attack.assists)}, KDA ${formatRatio(attackKda)}, 라운드 승률 ${formatPercent((raw.attack as { roundWinRate: number }).roundWinRate)}입니다.`,
      `수비 라운드 ${defense.rounds}개에서 K/D/A ${formatKdaTriplet(defense.kills, defense.deaths, defense.assists)}, KDA ${formatRatio(defenseKda)}, 라운드 승률 ${formatPercent((raw.defense as { roundWinRate: number }).roundWinRate)}입니다.`,
      `개인 첫 교전 승률은 공격 ${formatPercent(attackOpening)} (${attack.openingDuels}회 참여), 수비 ${formatPercent(defenseOpening)} (${defense.openingDuels}회 참여)입니다.`,
      `수비가 공격보다 KDA는 ${(raw.delta as { kdaGapDefenseMinusAttack: number }).kdaGapDefenseMinusAttack >= 0 ? "+" : ""}${(raw.delta as { kdaGapDefenseMinusAttack: number }).kdaGapDefenseMinusAttack.toFixed(2)}, 첫 교전 승률은 ${((raw.delta as { openingDuelGapDefenseMinusAttack: number }).openingDuelGapDefenseMinusAttack * 100).toFixed(1)}%p 차이입니다.`
    ],
    raw
  };
}

function classifyEconomyRound(roundIndex: number, teamRoundStats: RiotRoundPlayerStats[]): "pistol" | "eco" | "half_buy" | "full_buy" {
  if (roundIndex === 0 || roundIndex === 12) {
    return "pistol";
  }

  const loadoutValues = teamRoundStats.map((playerStats) => safeInt(playerStats.economy?.loadoutValue));
  const averageLoadout = safeDiv(loadoutValues.reduce((sum, current) => sum + current, 0), Math.max(1, loadoutValues.length));
  if (averageLoadout < 2000) {
    return "eco";
  }
  if (averageLoadout < 3900) {
    return "half_buy";
  }
  return "full_buy";
}

export function summarizeEconomy(accountInfo: AccountInfo, matches: RiotMatchPayload[]): SectionPayload {
  const contexts = buildPlayerContexts(matches, accountInfo.puuid);
  const economyTotals = {
    pistol: { rounds: 0, kills: 0, deaths: 0, assists: 0, roundWins: 0, score: 0, teamSpent: 0, teamLoadoutValue: 0 },
    eco: { rounds: 0, kills: 0, deaths: 0, assists: 0, roundWins: 0, score: 0, teamSpent: 0, teamLoadoutValue: 0 },
    half_buy: { rounds: 0, kills: 0, deaths: 0, assists: 0, roundWins: 0, score: 0, teamSpent: 0, teamLoadoutValue: 0 },
    full_buy: { rounds: 0, kills: 0, deaths: 0, assists: 0, roundWins: 0, score: 0, teamSpent: 0, teamLoadoutValue: 0 }
  };

  for (const context of contexts) {
    context.rounds.forEach((roundResult, roundIndex) => {
      const teamRoundStats = (roundResult.playerStats ?? []).filter(
        (playerStats) => context.teamByPuuid.get(playerStats.puuid ?? "") === context.teamId
      );
      if (!teamRoundStats.length) {
        return;
      }

      const bucket = classifyEconomyRound(roundIndex, teamRoundStats);
      const metrics = economyTotals[bucket];
      const playerRound = findRoundPlayerStats(roundResult, accountInfo.puuid);
      const roundKills = collectRoundKills(roundResult);

      metrics.rounds += 1;
      metrics.kills += (playerRound.kills ?? []).length;
      metrics.deaths += roundKills.filter((kill) => kill.victim === accountInfo.puuid).length;
      metrics.assists += collectRoundAssists(roundKills, accountInfo.puuid);
      metrics.score += safeInt(playerRound.score);

      for (const teammateRound of teamRoundStats) {
        metrics.teamLoadoutValue += safeInt(teammateRound.economy?.loadoutValue);
        metrics.teamSpent += safeInt(teammateRound.economy?.spent);
      }

      if (roundResult.winningTeam === context.teamId) {
        metrics.roundWins += 1;
      }
    });
  }

  const labelMap = {
    pistol: "피스톨",
    eco: "이코",
    half_buy: "하프바이",
    full_buy: "풀바이"
  } as const;

  const raw: Record<string, unknown> = {};
  const facts: string[] = [];

  for (const key of ["pistol", "eco", "half_buy", "full_buy"] as const) {
    const metrics = economyTotals[key];
    const bucketRaw = {
      rounds: metrics.rounds,
      kills: metrics.kills,
      deaths: metrics.deaths,
      assists: metrics.assists,
      kdaRatio: safeDiv(metrics.kills + metrics.assists, Math.max(1, metrics.deaths)),
      roundWinRate: safeDiv(metrics.roundWins, Math.max(1, metrics.rounds)),
      avgScore: safeDiv(metrics.score, Math.max(1, metrics.rounds)),
      avgTeamLoadoutValue: safeDiv(metrics.teamLoadoutValue, Math.max(1, metrics.rounds * 5)),
      avgTeamSpent: safeDiv(metrics.teamSpent, Math.max(1, metrics.rounds * 5))
    };
    raw[key] = bucketRaw;
    facts.push(
      `${labelMap[key]} ${metrics.rounds}라운드: K/D/A ${formatKdaTriplet(metrics.kills, metrics.deaths, metrics.assists)}, KDA ${formatRatio(bucketRaw.kdaRatio)}, 라운드 승률 ${formatPercent(bucketRaw.roundWinRate)}, 평균 팀 장비가치 ${bucketRaw.avgTeamLoadoutValue.toFixed(0)}입니다.`
    );
  }

  return {
    key: "economy",
    title: "자금 및 경제",
    facts,
    raw
  };
}

function bucketClutchEnemyCount(enemyCount: number): "1v1" | "1v2" | "1v3+" {
  if (enemyCount <= 1) {
    return "1v1";
  }
  if (enemyCount === 2) {
    return "1v2";
  }
  return "1v3+";
}

export function summarizeClutch(accountInfo: AccountInfo, matches: RiotMatchPayload[]): SectionPayload {
  const contexts = buildPlayerContexts(matches, accountInfo.puuid);
  const overall = { attempts: 0, survived: 0, wins: 0 };
  const byBucket = {
    "1v1": { attempts: 0, survived: 0, wins: 0 },
    "1v2": { attempts: 0, survived: 0, wins: 0 },
    "1v3+": { attempts: 0, survived: 0, wins: 0 }
  };

  for (const context of contexts) {
    const alivePool = new Set(context.players.map((player) => player.puuid).filter(Boolean) as string[]);

    for (const roundResult of context.rounds) {
      const roundKills = collectRoundKills(roundResult);
      const alive = new Set(alivePool);
      let clutchEnemyCount: number | null = null;

      for (const kill of roundKills) {
        if (kill.victim && alive.has(kill.victim)) {
          alive.delete(kill.victim);
        }

        if (!alive.has(accountInfo.puuid)) {
          break;
        }

        let teamAlive = 0;
        let enemyAlive = 0;
        for (const currentPuuid of alive) {
          if (context.teamByPuuid.get(currentPuuid) === context.teamId) {
            teamAlive += 1;
          } else {
            enemyAlive += 1;
          }
        }

        if (teamAlive === 1 && enemyAlive >= 1 && clutchEnemyCount === null) {
          clutchEnemyCount = enemyAlive;
        }
      }

      if (clutchEnemyCount === null) {
        continue;
      }

      overall.attempts += 1;
      const bucket = bucketClutchEnemyCount(clutchEnemyCount);
      byBucket[bucket].attempts += 1;

      const survived = alive.has(accountInfo.puuid);
      const won = roundResult.winningTeam === context.teamId;

      if (survived) {
        overall.survived += 1;
        byBucket[bucket].survived += 1;
      }
      if (won) {
        overall.wins += 1;
        byBucket[bucket].wins += 1;
      }
    }
  }

  const raw = {
    overall: {
      attempts: overall.attempts,
      survivalRate: safeDiv(overall.survived, Math.max(1, overall.attempts)),
      roundWinRate: safeDiv(overall.wins, Math.max(1, overall.attempts))
    },
    byBucket: {
      "1v1": {
        attempts: byBucket["1v1"].attempts,
        survivalRate: safeDiv(byBucket["1v1"].survived, Math.max(1, byBucket["1v1"].attempts)),
        roundWinRate: safeDiv(byBucket["1v1"].wins, Math.max(1, byBucket["1v1"].attempts))
      },
      "1v2": {
        attempts: byBucket["1v2"].attempts,
        survivalRate: safeDiv(byBucket["1v2"].survived, Math.max(1, byBucket["1v2"].attempts)),
        roundWinRate: safeDiv(byBucket["1v2"].wins, Math.max(1, byBucket["1v2"].attempts))
      },
      "1v3+": {
        attempts: byBucket["1v3+"].attempts,
        survivalRate: safeDiv(byBucket["1v3+"].survived, Math.max(1, byBucket["1v3+"].attempts)),
        roundWinRate: safeDiv(byBucket["1v3+"].wins, Math.max(1, byBucket["1v3+"].attempts))
      }
    }
  } satisfies Record<string, unknown>;

  return {
    key: "clutch",
    title: "클러치 및 멘탈",
    facts: [
      `전체 클러치 시도는 ${overall.attempts}회이며, 생존율은 ${formatPercent((raw.overall as { survivalRate: number }).survivalRate)}, 라운드 승률은 ${formatPercent((raw.overall as { roundWinRate: number }).roundWinRate)}입니다.`,
      `1v1 상황 ${(raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v1"].attempts}회: 생존율 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v1"].survivalRate)}, 승률 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v1"].roundWinRate)}입니다.`,
      `1v2 상황 ${(raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v2"].attempts}회: 생존율 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v2"].survivalRate)}, 승률 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v2"].roundWinRate)}입니다.`,
      `1v3+ 상황 ${(raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v3+"].attempts}회: 생존율 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v3+"].survivalRate)}, 승률 ${formatPercent((raw.byBucket as Record<string, { attempts: number; survivalRate: number; roundWinRate: number }>)["1v3+"].roundWinRate)}입니다.`
    ],
    raw
  };
}

export function summarizeUtility(accountInfo: AccountInfo, matches: RiotMatchPayload[]): SectionPayload {
  const contexts = buildPlayerContexts(matches, accountInfo.puuid);
  const castTotals = {
    grenadeCasts: 0,
    ability1Casts: 0,
    ability2Casts: 0,
    ultimateCasts: 0
  };
  let totalAssists = 0;
  let abilityFinisherKills = 0;
  let effectRounds = 0;
  let totalDamage = 0;
  let totalRounds = 0;

  for (const context of contexts) {
    const playerStats = context.player.stats ?? {};
    totalAssists += safeInt(playerStats.assists);

    const abilityCasts = playerStats.abilityCasts ?? {};
    castTotals.grenadeCasts += safeInt(abilityCasts.grenadeCasts);
    castTotals.ability1Casts += safeInt(abilityCasts.ability1Casts);
    castTotals.ability2Casts += safeInt(abilityCasts.ability2Casts);
    castTotals.ultimateCasts += safeInt(abilityCasts.ultimateCasts);

    for (const roundResult of context.rounds) {
      const playerRound = findRoundPlayerStats(roundResult, accountInfo.puuid);
      totalRounds += 1;
      totalDamage += (playerRound.damage ?? []).reduce((sum, damage) => sum + safeInt(damage.damage), 0);

      for (const kill of playerRound.kills ?? []) {
        const damageType = String(kill.finishingDamage?.damageType ?? "").toLowerCase();
        if (damageType === "ability") {
          abilityFinisherKills += 1;
        }
      }

      const roundAbilityCasts = playerRound.abilityCasts ?? {};
      const abilityEffects = playerRound.ability ?? {};
      const hasRoundUtility =
        safeInt(roundAbilityCasts.grenadeCasts) > 0 ||
        safeInt(roundAbilityCasts.ability1Casts) > 0 ||
        safeInt(roundAbilityCasts.ability2Casts) > 0 ||
        safeInt(roundAbilityCasts.ultimateCasts) > 0 ||
        Boolean(String(abilityEffects.grenadeEffects ?? "").trim()) ||
        Boolean(String(abilityEffects.ability1Effects ?? "").trim()) ||
        Boolean(String(abilityEffects.ability2Effects ?? "").trim()) ||
        Boolean(String(abilityEffects.ultimateEffects ?? "").trim());

      if (hasRoundUtility) {
        effectRounds += 1;
      }
    }
  }

  const totalCasts =
    castTotals.grenadeCasts + castTotals.ability1Casts + castTotals.ability2Casts + castTotals.ultimateCasts;

  const raw = {
    totalCasts,
    castsByType: {
      grenade: castTotals.grenadeCasts,
      ability1: castTotals.ability1Casts,
      ability2: castTotals.ability2Casts,
      ultimate: castTotals.ultimateCasts
    },
    assists: totalAssists,
    assistsPer10Casts: safeDiv(totalAssists * 10, Math.max(1, totalCasts)),
    abilityFinisherKills,
    effectRounds,
    effectRoundRate: safeDiv(effectRounds, Math.max(1, totalRounds)),
    avgDamagePerRound: safeDiv(totalDamage, Math.max(1, totalRounds)),
    castsPerRound: safeDiv(totalCasts, Math.max(1, totalRounds))
  } satisfies Record<string, unknown>;

  return {
    key: "utility",
    title: "스킬 효율성",
    facts: [
      `총 스킬 사용은 ${totalCasts}회이며, 라운드당 평균 ${(raw.castsPerRound as number).toFixed(2)}회입니다. (기본/보조/시그니처/궁극기: ${(raw.castsByType as Record<string, number>).grenade}/${(raw.castsByType as Record<string, number>).ability1}/${(raw.castsByType as Record<string, number>).ability2}/${(raw.castsByType as Record<string, number>).ultimate})`,
      `총 어시스트는 ${totalAssists}개이며 스킬 10회당 어시스트는 ${(raw.assistsPer10Casts as number).toFixed(2)}개입니다.`,
      `능력 마무리 킬은 ${abilityFinisherKills}회, 효과가 실제로 발생한 라운드는 ${effectRounds}회입니다.`,
      `라운드당 평균 가한 피해는 ${(raw.avgDamagePerRound as number).toFixed(1)}입니다.`
    ],
    raw
  };
}

export function buildSampleAnalysisInputs(accountInfo: AccountInfo): PreparedAnalysisInput {
  return {
    player: buildPlayerPayload(accountInfo),
    overview: {
      facts: [
        "샘플 모드로 최근 5경기 / 118라운드를 가정해 분석합니다.",
        "전체 K/D/A는 81/74/38, KDA 비율은 1.61입니다.",
        "매치 승률은 40.0%, 평균 ACS는 214.6입니다."
      ],
      raw: {
        matchesAnalyzed: 5,
        wins: 2,
        losses: 3,
        matchWinRate: 0.4,
        kills: 81,
        deaths: 74,
        assists: 38,
        rounds: 118,
        acs: 214.6,
        kdaRatio: 1.61
      }
    },
    sections: [
      {
        key: "attack_defense",
        title: "공수 진영 분석",
        facts: [
          "공격 라운드 56개에서 K/D/A 31/38/16, KDA 1.24, 라운드 승률 39.3%입니다.",
          "수비 라운드 62개에서 K/D/A 50/36/22, KDA 2.00, 라운드 승률 54.8%입니다.",
          "개인 첫 교전 승률은 공격 28.6% (14회 참여), 수비 57.1% (14회 참여)입니다.",
          "수비가 공격보다 KDA는 +0.76, 첫 교전 승률은 +28.5%p 높습니다."
        ],
        raw: {
          attack: {
            rounds: 56,
            kills: 31,
            deaths: 38,
            assists: 16,
            kdaRatio: 1.24,
            roundWinRate: 0.393,
            openingDuelRate: 0.286,
            openingDuels: 14,
            firstBloods: 4,
            firstDeaths: 10,
            teamOpeningConversion: 0.421
          },
          defense: {
            rounds: 62,
            kills: 50,
            deaths: 36,
            assists: 22,
            kdaRatio: 2,
            roundWinRate: 0.548,
            openingDuelRate: 0.571,
            openingDuels: 14,
            firstBloods: 8,
            firstDeaths: 6,
            teamOpeningConversion: 0.667
          },
          delta: {
            kdaGapDefenseMinusAttack: 0.76,
            openingDuelGapDefenseMinusAttack: 0.285
          }
        }
      },
      {
        key: "economy",
        title: "자금 및 경제",
        facts: [
          "피스톨 4라운드: K/D/A 4/5/1, KDA 1.00, 라운드 승률 25.0%, 평균 팀 장비가치 800입니다.",
          "이코 21라운드: K/D/A 12/18/8, KDA 1.11, 라운드 승률 23.8%, 평균 팀 장비가치 1570입니다.",
          "하프바이 29라운드: K/D/A 19/18/11, KDA 1.67, 라운드 승률 41.4%, 평균 팀 장비가치 3010입니다.",
          "풀바이 64라운드: K/D/A 46/33/18, KDA 1.94, 라운드 승률 57.8%, 평균 팀 장비가치 4280입니다."
        ],
        raw: {
          pistol: { rounds: 4, kills: 4, deaths: 5, assists: 1, kdaRatio: 1, roundWinRate: 0.25, avgScore: 155, avgTeamLoadoutValue: 800, avgTeamSpent: 800 },
          eco: { rounds: 21, kills: 12, deaths: 18, assists: 8, kdaRatio: 1.11, roundWinRate: 0.238, avgScore: 142, avgTeamLoadoutValue: 1570, avgTeamSpent: 1430 },
          half_buy: { rounds: 29, kills: 19, deaths: 18, assists: 11, kdaRatio: 1.67, roundWinRate: 0.414, avgScore: 198, avgTeamLoadoutValue: 3010, avgTeamSpent: 2780 },
          full_buy: { rounds: 64, kills: 46, deaths: 33, assists: 18, kdaRatio: 1.94, roundWinRate: 0.578, avgScore: 236, avgTeamLoadoutValue: 4280, avgTeamSpent: 3940 }
        }
      },
      {
        key: "clutch",
        title: "클러치 및 멘탈",
        facts: [
          "전체 클러치 시도는 9회이며, 생존율은 33.3%, 라운드 승률은 22.2%입니다.",
          "1v1 상황 2회: 생존율 50.0%, 승률 50.0%입니다.",
          "1v2 상황 4회: 생존율 25.0%, 승률 25.0%입니다.",
          "1v3+ 상황 3회: 생존율 33.3%, 승률 0.0%입니다."
        ],
        raw: {
          overall: { attempts: 9, survivalRate: 0.333, roundWinRate: 0.222 },
          byBucket: {
            "1v1": { attempts: 2, survivalRate: 0.5, roundWinRate: 0.5 },
            "1v2": { attempts: 4, survivalRate: 0.25, roundWinRate: 0.25 },
            "1v3+": { attempts: 3, survivalRate: 0.333, roundWinRate: 0 }
          }
        }
      },
      {
        key: "utility",
        title: "스킬 효율성",
        facts: [
          "총 스킬 사용은 146회이며, 라운드당 평균 1.24회입니다. (기본/보조/시그니처/궁극기: 42/39/51/14)",
          "총 어시스트는 38개이며 스킬 10회당 어시스트는 2.60개입니다.",
          "능력 마무리 킬은 6회, 효과가 실제로 발생한 라운드는 31회입니다.",
          "라운드당 평균 가한 피해는 121.8입니다."
        ],
        raw: {
          totalCasts: 146,
          castsByType: { grenade: 42, ability1: 39, ability2: 51, ultimate: 14 },
          assists: 38,
          assistsPer10Casts: 2.6,
          abilityFinisherKills: 6,
          effectRounds: 31,
          effectRoundRate: 0.263,
          avgDamagePerRound: 121.8,
          castsPerRound: 1.24
        }
      }
    ]
  };
}
