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

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class MatchScoreUpdater {

    private final MatchRepository matchRepository;
    private final FootballDataService footballDataService;
    private final PointsCalculationService pointsCalculationService;

    /**
     * Runs every 60 seconds.
     *
     * 1. Finds all LIVE + SCHEDULED matches (SCHEDULED ones are pre-filtered
     *    inside FootballDataService to only those within 5 min of kick-off).
     * 2. Calls football-data.org to update scores/status.
     * 3. After the update, checks which LIVE matches became FINISHED and
     *    triggers points calculation for them.
     *
     * Half-time (PAUSED in football-data v4) stays as LIVE in our system —
     * points are only calculated when status transitions to FINISHED.
     */
    @Scheduled(fixedRate = 60_000)
    public void updateScores() {
        // Snapshot IDs of currently-live matches before the update
        List<Match> liveMatchesBefore = matchRepository.findByStatus(MatchStatus.LIVE);
        if (liveMatchesBefore.isEmpty()) {
            // Still poll scheduled matches near kick-off time
            List<Match> scheduled = matchRepository.findByStatus(MatchStatus.SCHEDULED);
            if (scheduled.isEmpty()) return;
        }

        Set<Long> liveIdsBefore = liveMatchesBefore.stream()
                .map(Match::getId)
                .collect(Collectors.toSet());

        // Update scores + statuses from API
        footballDataService.updateLiveScores();

        // For every match that was LIVE before the update, check if it's now FINISHED
        for (Long matchId : liveIdsBefore) {
            Match match = matchRepository.findById(matchId).orElse(null);
            if (match == null) continue;

            if (match.getStatus() == MatchStatus.FINISHED) {
                log.info("Match {} just finished — calculating points", matchId);
                pointsCalculationService.calculatePointsForMatch(match);
            }
        }
    }
}
