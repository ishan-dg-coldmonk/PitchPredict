package com.pitchpredict.scheduler;

import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.service.FootballDataService;
import com.pitchpredict.service.MatchService;
import com.pitchpredict.service.PointsCalculationService;
import com.pitchpredict.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * MatchScoreUpdater
 *
 * Runs every 60 seconds.
 *
 * Finds matches in the active window:
 *   matchDate BETWEEN (now - 3h) AND (now + 15min)
 *   AND status NOT IN (FINISHED, CANCELLED, POSTPONED)
 *   AND externalMatchId IS NOT NULL
 *
 * For each match:
 *   1. Polls football-data.org for current status + score
 *   2. Persists any changes to DB
 *   3. Broadcasts WebSocket events for status/score changes
 *   4. Triggers points calculation on FINISHED transition
 *
 * If no matches are in the window: returns early, zero API calls.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MatchScoreUpdater {

    private static final int LOOKBACK_HOURS    = 3;
    private static final int LOOKAHEAD_MINUTES = 15;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd-MMM HH:mm");

    private final MatchRepository          matchRepository;
    private final FootballDataService      footballDataService;
    private final PointsCalculationService pointsCalculationService;
    private final MatchService             matchService;
    private final WebSocketService         webSocketService;

    @Scheduled(fixedRate = 60_000)
    public void run() {
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime from = now.minusHours(LOOKBACK_HOURS);
        LocalDateTime to   = now.plusMinutes(LOOKAHEAD_MINUTES);

        List<Match> candidates = matchRepository.findMatchesInActiveWindow(from, to);

        if (candidates.isEmpty()) {
            log.debug("[Scheduler] No matches in window [{} → {}] — idle",
                    from.format(FMT), to.format(FMT));
            return;
        }

        log.info("[Scheduler] Window [{} → {}] │ {} match(es) to poll",
                from.format(FMT), to.format(FMT), candidates.size());

        int polled = 0, changed = 0, failed = 0;

        for (Match match : candidates) {
            MatchStatus statusBefore = match.getStatus();
            Integer scoreBefore_home = match.getHomeScore();
            Integer scoreBefore_away = match.getAwayScore();

            var result = footballDataService.pollSingleMatch(match);

            if (result.isEmpty()) {
                failed++;
                continue;
            }

            Match updated = result.get();
            polled++;

            MatchStatus statusAfter = updated.getStatus();
            boolean statusChanged = statusBefore != statusAfter;
            boolean scoreChanged  = statusAfter == MatchStatus.LIVE && (
                    !java.util.Objects.equals(scoreBefore_home, updated.getHomeScore()) ||
                    !java.util.Objects.equals(scoreBefore_away, updated.getAwayScore())
            );

            // Build DTO once (predictionOpen computed dynamically inside toDTO)
            MatchDTO dto = matchService.toDTO(updated);

            // ── WebSocket broadcasts ────────────────────────────────────────
            if (statusChanged && statusAfter == MatchStatus.LIVE) {
                webSocketService.broadcastMatchLive(dto);
                changed++;
            } else if (statusChanged && statusAfter == MatchStatus.FINISHED) {
                webSocketService.broadcastMatchFinished(dto);
                changed++;
            } else if (scoreChanged) {
                webSocketService.broadcastMatchUpdated(dto);
                changed++;
                log.info("[Scheduler] Score update │ matchId={} │ {} {}-{} {}",
                        updated.getId(),
                        updated.getHomeTeam(), updated.getHomeScore(),
                        updated.getAwayScore(), updated.getAwayTeam());
            }

            // ── Points calculation on FINISHED transition ───────────────────
            if (statusBefore != MatchStatus.FINISHED && statusAfter == MatchStatus.FINISHED) {
                log.info("[Scheduler] FINISHED │ matchId={} │ {} {}-{} {} → calculating points",
                        updated.getId(),
                        updated.getHomeTeam(), updated.getHomeScore(),
                        updated.getAwayScore(), updated.getAwayTeam());
                pointsCalculationService.calculatePointsForMatch(updated);
            }
        }

        log.info("[Scheduler] Tick done │ polled={} broadcasts={} failed={}",
                polled, changed, failed);
    }
}
