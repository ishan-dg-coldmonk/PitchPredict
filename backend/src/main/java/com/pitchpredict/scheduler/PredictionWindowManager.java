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
     * Rules (updated):
     *  - Prediction window is OPEN from match creation until 5 minutes before kick-off.
     *  - There is NO earliest-open time — users can predict the moment a match is created.
     *  - The window CLOSES permanently when (now >= matchDate - 5 minutes).
     *
     * This scheduler only needs to close windows; matches start open by default
     * (predictionOpen = true on the Match entity).
     */
    @Scheduled(fixedRate = 60_000)
    public void closePredictionWindows() {
        // All scheduled matches whose prediction window is still open
        List<Match> openMatches = matchRepository.findByPredictionOpenTrueAndStatus(MatchStatus.SCHEDULED);

        // Close threshold: 5 minutes before kick-off
        LocalDateTime closeThreshold = LocalDateTime.now().plusMinutes(5);

        for (Match match : openMatches) {
            if (match.getMatchDate().isBefore(closeThreshold)) {
                match.setPredictionOpen(false);
                matchRepository.save(match);
                log.info("Closed prediction window for match {} ({} vs {}) — kicks off at {}",
                        match.getId(), match.getHomeTeam(), match.getAwayTeam(), match.getMatchDate());
            }
        }
    }
}
