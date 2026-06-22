package com.pitchpredict.scheduler;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PredictionWindowManager {

    private final MatchRepository matchRepository;

    /**
     * Runs every minute.
     *
     * Rules:
     *  - Prediction window OPENS  24 hours before the match starts.
     *  - Prediction window CLOSES 10 minutes before the match starts.
     *
     * A match is created with predictionOpen = true by default (see Match entity).
     * We flip it to false when (matchDate - now) <= 10 minutes.
     * We also flip it back to true when (matchDate - now) is between 10 min and 24 h,
     * so that matches synced far in advance get opened at the right time.
     */
    @Scheduled(fixedRate = 60_000)
    public void managePredictionWindows() {
        LocalDateTime now = LocalDateTime.now();

        // Close predictions for matches within 10 minutes
        LocalDateTime closeThreshold = now.plusMinutes(10);
        // Open predictions for matches within 24 hours
        LocalDateTime openThreshold = now.plusHours(24);

        List<Match> scheduledMatches = matchRepository.findByStatus(MatchStatus.SCHEDULED);

        for (Match match : scheduledMatches) {
            LocalDateTime matchDate = match.getMatchDate();

            boolean shouldBeOpen = matchDate.isAfter(closeThreshold) && matchDate.isBefore(openThreshold);

            if (shouldBeOpen && !match.getPredictionOpen()) {
                match.setPredictionOpen(true);
                matchRepository.save(match);
                log.info("Opened prediction window for match {}: {} vs {}",
                        match.getId(), match.getHomeTeam(), match.getAwayTeam());
            } else if (!shouldBeOpen && match.getPredictionOpen()) {
                // matchDate <= closeThreshold → closes prediction 10 min before
                if (matchDate.isBefore(closeThreshold)) {
                    match.setPredictionOpen(false);
                    matchRepository.save(match);
                    log.info("Closed prediction window for match {}: {} vs {}",
                            match.getId(), match.getHomeTeam(), match.getAwayTeam());
                }
                // If matchDate > openThreshold (>24h away), keep closed (not yet open)
            }
        }
    }
}
