package com.pitchpredict.service;

import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Prediction;
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

    public void calculatePointsForMatch(Match match) {
        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            return;
        }

        List<Prediction> predictions = predictionRepository.findByMatchId(match.getId());
        int actualHome = match.getHomeScore();
        int actualAway = match.getAwayScore();

        for (Prediction p : predictions) {
            int predHome = p.getPredictedHomeScore();
            int predAway = p.getPredictedAwayScore();

            int diff = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
            int base = Math.max(0, 10 - 2 * diff);

            int outcome = 0;
            if (getResult(predHome, predAway) == getResult(actualHome, actualAway)) {
                outcome = 4;
            }

            int gd = 0;
            if ((predHome - predAway) == (actualHome - actualAway)) {
                gd = 3;
            }

            p.setBasePoints(base);
            p.setOutcomeBonus(outcome);
            p.setGdBonus(gd);
            p.setPoints(base + outcome + gd);

            log.info("Scored prediction {}: {}:{} vs actual {}:{} → {} pts",
                    p.getId(), predHome, predAway, actualHome, actualAway, p.getPoints());
        }

        predictionRepository.saveAll(predictions);
    }

    private int getResult(int home, int away) {
        if (home > away) return 1;
        if (home < away) return -1;
        return 0;
    }
}
