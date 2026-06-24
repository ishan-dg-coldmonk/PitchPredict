package com.pitchpredict.scheduler;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.service.FootballDataService;
import com.pitchpredict.service.PointsCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * MatchScoreUpdater
 *
 * Runs every 60 seconds. Looks at the match schedule by TIME, not by status.
 *
 * Logic:
 *   Window = [ now - 3 hours  →  now + 5 minutes ]
 *
 *   - "now + 5 min" forward edge: catches matches about to kick off.
 *     We start polling 5 minutes before the scheduled start so we detect
 *     SCHEDULED → LIVE the moment the API reflects it, not a minute late.
 *
 *   - "now - 3 hours" back edge: a normal match is 90 min + stoppages.
 *     With extra time and penalties it can reach ~130 min. 3 hours is a
 *     safe upper bound — any match that kicked off within the last 3 hours
 *     and is not yet FINISHED/CANCELLED in our DB still needs polling.
 *
 *   - Matches already FINISHED, CANCELLED, or POSTPONED are excluded by
 *     the query — no point calling the API for them.
 *
 *   - If nothing is in the window: return early, zero API calls made.
 *
 * Points calculation:
 *   When a polled match flips to FINISHED, we immediately calculate points.
 *   The pointsCalculated flag on Match prevents double-calculation if this
 *   scheduler fires twice around the transition (e.g. app restart mid-game).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MatchScoreUpdater {

    /** How far back to look for still-running matches (covers 90min + ET + pens) */
    private static final int LOOKBACK_HOURS   = 3;

    /** How far ahead to look so we catch matches before they go live */
    private static final int LOOKAHEAD_MINUTES = 5;

    private final MatchRepository         matchRepository;
    private final FootballDataService     footballDataService;
    private final PointsCalculationService pointsCalculationService;

    @Scheduled(fixedRate = 60_000)
    public void run() {
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime from = now.minusHours(LOOKBACK_HOURS);
        LocalDateTime to   = now.plusMinutes(LOOKAHEAD_MINUTES);

        List<Match> candidates = matchRepository.findMatchesInActiveWindow(from, to);

        if (candidates.isEmpty()) {
            // Nothing happening right now — skip quietly
            return;
        }

        log.debug("Active window [{} → {}]: {} match(es) to poll",
                from, to, candidates.size());

        for (Match match : candidates) {
            MatchStatus statusBefore = match.getStatus();

            // Poll football-data.org and update the DB record in-place.
            // Returns the updated match, or empty if the API call failed
            // (logged inside; we just skip that match this tick).
            footballDataService.pollSingleMatch(match).ifPresent(updated -> {

                // Detect FINISHED transition
                if (statusBefore != MatchStatus.FINISHED
                        && updated.getStatus() == MatchStatus.FINISHED) {

                    pointsCalculationService.calculatePointsForMatch(updated);
                }
            });
        }
    }
}
