package com.pitchpredict.service;

import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Prediction;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.PredictionRepository;
import com.pitchpredict.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointsCalculationService {

    private final PredictionRepository  predictionRepository;
    private final MatchRepository       matchRepository;
    private final LeaderboardService    leaderboardService;
    private final WebSocketService      webSocketService;

    /**
     * Calculates points for every prediction made on this match,
     * then broadcasts updated leaderboards for all affected rooms.
     *
     * Idempotency guard: if pointsCalculated is already true, skip.
     *
     * Points breakdown (max 17):
     *   Base    max(0, 10 − 2 × totalGoalDiff)  → up to 10 pts
     *   Outcome +4 if correct result (W/D/L)
     *   GD      +3 if exact goal difference matches
     */
    public void calculatePointsForMatch(Match match) {
        if (Boolean.TRUE.equals(match.getPointsCalculated())) {
            log.info("[Points] Already calculated for match {} — skipping", match.getId());
            return;
        }

        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            log.warn("[Points] Score not set for match {} — cannot calculate", match.getId());
            return;
        }

        List<Prediction> predictions = predictionRepository.findByMatchId(match.getId());

        if (predictions.isEmpty()) {
            log.info("[Points] No predictions for match {} — marking done", match.getId());
            markCalculated(match);
            return;
        }

        int actualHome = match.getHomeScore();
        int actualAway = match.getAwayScore();

        // A shootout gets a penalty bonus on top of the result points.
        boolean shootout = "PENALTY_SHOOTOUT".equals(match.getDuration())
                && match.getPenaltyHome() != null && match.getPenaltyAway() != null;

        for (Prediction p : predictions) {
            int predHome = p.getPredictedHomeScore();
            int predAway = p.getPredictedAwayScore();

            int diff    = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
            int base    = Math.max(0, 10 - 2 * diff);
            int outcome = getResult(predHome, predAway) == getResult(actualHome, actualAway) ? 4 : 0;
            int gd      = (predHome - predAway) == (actualHome - actualAway) ? 3 : 0;

            // ── Penalty bonus: only when the match went to pens AND the user predicted a
            //    tie (so they entered a shootout prediction). +5 for the right advancer,
            //    up to +3 for closeness to the exact shootout scoreline. Max +8.
            int penaltyBonus = 0;
            if (shootout && predHome == predAway
                    && p.getPredictedPenaltyHome() != null && p.getPredictedPenaltyAway() != null) {
                int actPenH  = match.getPenaltyHome(),  actPenA  = match.getPenaltyAway();
                int predPenH = p.getPredictedPenaltyHome(), predPenA = p.getPredictedPenaltyAway();
                int penWinner = Integer.compare(predPenH, predPenA) == Integer.compare(actPenH, actPenA) ? 5 : 0;
                int penDiff   = Math.abs(predPenH - actPenH) + Math.abs(predPenA - actPenA);
                int penExact  = Math.max(0, 3 - penDiff);
                penaltyBonus  = penWinner + penExact;
            }

            p.setBasePoints(base);
            p.setOutcomeBonus(outcome);
            p.setGdBonus(gd);
            p.setPenaltyBonus(penaltyBonus);
            p.setPoints(base + outcome + gd + penaltyBonus);

            log.info("[Points] matchId={} userId={} pred={}:{} actual={}:{} → {}pts (pen {})",
                    match.getId(), p.getUserId(),
                    predHome, predAway, actualHome, actualAway,
                    p.getPoints(), penaltyBonus);
        }

        predictionRepository.saveAll(predictions);
        markCalculated(match);

        log.info("[Points] Completed for match {} ({} vs {}) — {} predictions scored",
                match.getId(), match.getHomeTeam(), match.getAwayTeam(), predictions.size());

        // Broadcast updated leaderboards for all rooms that had predictions on this match
        Set<Long> affectedRooms = predictions.stream()
                .map(Prediction::getRoomId)
                .collect(Collectors.toSet());

        for (Long roomId : affectedRooms) {
            try {
                var leaderboard = leaderboardService.getLeaderboard(roomId);
                webSocketService.broadcastLeaderboardUpdated(roomId, leaderboard);
            } catch (Exception e) {
                log.warn("[Points] Failed to broadcast leaderboard for room {}: {}",
                        roomId, e.getMessage());
            }
        }
    }

    private void markCalculated(Match match) {
        match.setPointsCalculated(true);
        matchRepository.save(match);
    }

    private int getResult(int home, int away) {
        return Integer.compare(home, away);
    }
}
