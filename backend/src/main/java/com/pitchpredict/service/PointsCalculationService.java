package com.pitchpredict.service;

import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Prediction;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.PredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointsCalculationService {

    private final PredictionRepository predictionRepository;
    private final MatchRepository matchRepository;

    /**
     * Calculates and saves points for every prediction made on this match.
     *
     * Guarded by match.pointsCalculated — if this has already run for the
     * match (e.g. scheduler fired twice around the FINISHED transition, or
     * the app restarted mid-game), we skip silently to avoid overwriting
     * correct points with duplicate runs.
     *
     * Points breakdown (max 17):
     *   Base:    max(0, 10 − 2 × totalGoalDiff)   → up to 10 pts
     *   Outcome: +4 if correct result (W/D/L)
     *   GD:      +3 if exact goal difference matches
     */
    public void calculatePointsForMatch(Match match) {
        // Idempotency guard
        if (Boolean.TRUE.equals(match.getPointsCalculated())) {
            log.info("Points already calculated for match {} — skipping", match.getId());
            return;
        }

        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            log.warn("Cannot calculate points for match {} — score not set", match.getId());
            return;
        }

        List<Prediction> predictions = predictionRepository.findByMatchId(match.getId());

        if (predictions.isEmpty()) {
            log.info("No predictions to score for match {}", match.getId());
            // Still mark as calculated so we don't keep hitting this
            markCalculated(match);
            return;
        }

        int actualHome = match.getHomeScore();
        int actualAway = match.getAwayScore();

        for (Prediction p : predictions) {
            int predHome = p.getPredictedHomeScore();
            int predAway = p.getPredictedAwayScore();

            // Base points: penalise every goal difference from actual score
            int diff = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
            int base = Math.max(0, 10 - 2 * diff);

            // Outcome bonus: correct win / draw / loss
            int outcome = 0;
            if (getResult(predHome, predAway) == getResult(actualHome, actualAway)) {
                outcome = 4;
            }

            // Goal difference bonus: exact GD match
            int gd = 0;
            if ((predHome - predAway) == (actualHome - actualAway)) {
                gd = 3;
            }

            p.setBasePoints(base);
            p.setOutcomeBonus(outcome);
            p.setGdBonus(gd);
            p.setPoints(base + outcome + gd);

            log.info("Scored prediction {} (user {}): {}:{} vs actual {}:{} → {} pts",
                    p.getId(), p.getUserId(),
                    predHome, predAway, actualHome, actualAway,
                    p.getPoints());
        }

        predictionRepository.saveAll(predictions);
        markCalculated(match);

        log.info("Points calculation complete for match {} ({} vs {}) — {} predictions scored",
                match.getId(), match.getHomeTeam(), match.getAwayTeam(), predictions.size());
    }

    private void markCalculated(Match match) {
        match.setPointsCalculated(true);
        matchRepository.save(match);
    }

    private int getResult(int home, int away) {
        if (home > away) return 1;
        if (home < away) return -1;
        return 0;
    }
}
