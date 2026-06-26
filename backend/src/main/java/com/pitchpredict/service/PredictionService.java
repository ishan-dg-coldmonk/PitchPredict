package com.pitchpredict.service;

import com.pitchpredict.dto.PredictionDTO;
import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Prediction;
import com.pitchpredict.entity.User;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.PredictionRepository;
import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    /** Must match MatchService.PREDICTION_CLOSE_MINUTES */
    private static final int CLOSE_BEFORE_KICKOFF_MINUTES = 5;

    private final PredictionRepository predictionRepository;
    private final MatchRepository matchRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;

    public PredictionDTO submitPrediction(Long userId, Long matchId, Long eventId,
                                          Long roomId, int homeScore, int awayScore) {
        log.info("[Prediction] submitPrediction - userId={} matchId={} roomId={} pred={}:{}",
                userId, matchId, roomId, homeScore, awayScore);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match not found"));

        // Dynamic prediction window check — backend is the authority.
        // The DB no longer stores a predictionOpen flag.
        if (match.getStatus() != MatchStatus.SCHEDULED) {
            log.warn("[Prediction] REJECTED - match not SCHEDULED (status={}) - userId={} matchId={}",
                    match.getStatus(), userId, matchId);
            throw ApiException.badRequest("Predictions are not accepted for matches that are live or finished");
        }

        LocalDateTime deadline = match.getMatchDate().minusMinutes(CLOSE_BEFORE_KICKOFF_MINUTES);
        if (!LocalDateTime.now().isBefore(deadline)) {
            log.warn("[Prediction] REJECTED - window closed (deadline={}) - userId={} matchId={}",
                    deadline, userId, matchId);
            throw ApiException.badRequest("Prediction window is closed — submissions end 5 minutes before kick-off");
        }

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            log.warn("[Prediction] REJECTED - user not in room - userId={} roomId={}", userId, roomId);
            throw ApiException.forbidden("You must join the room before predicting");
        }

        Optional<Prediction> existing = predictionRepository
                .findByUserIdAndMatchIdAndRoomId(userId, matchId, roomId);

        Prediction prediction;
        if (existing.isPresent()) {
            prediction = existing.get();
            prediction.setPredictedHomeScore(homeScore);
            prediction.setPredictedAwayScore(awayScore);
            log.info("[Prediction] Updated existing prediction id={} - userId={} matchId={} now={}:{}",
                    prediction.getId(), userId, matchId, homeScore, awayScore);
        } else {
            prediction = Prediction.builder()
                    .userId(userId)
                    .matchId(matchId)
                    .eventId(eventId)
                    .roomId(roomId)
                    .predictedHomeScore(homeScore)
                    .predictedAwayScore(awayScore)
                    .build();
            log.info("[Prediction] Creating new prediction - userId={} matchId={} roomId={}",
                    userId, matchId, roomId);
        }

        prediction = predictionRepository.save(prediction);
        log.info("[Prediction] submitPrediction ✓ - predictionId={} userId={} matchId={}",
                prediction.getId(), userId, matchId);
        return toDTO(prediction);
    }

    public List<PredictionDTO> getUserPredictionsForEvent(Long userId, Long eventId, Long roomId) {
        return predictionRepository.findByUserIdAndEventIdAndRoomId(userId, eventId, roomId).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<PredictionDTO> getPredictionsForMatch(Long roomId, Long matchId, Long currentUserId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match not found"));

        List<Prediction> allPreds = predictionRepository.findByMatchIdAndRoomId(matchId, roomId);

        // Prediction window is computed dynamically
        boolean windowOpen = match.getStatus() == MatchStatus.SCHEDULED
                && LocalDateTime.now().isBefore(
                        match.getMatchDate().minusMinutes(CLOSE_BEFORE_KICKOFF_MINUTES));

        // If window is still open, only reveal other predictions if current user has predicted
        if (windowOpen) {
            boolean userHasPredicted = allPreds.stream()
                    .anyMatch(p -> p.getUserId().equals(currentUserId));
            if (!userHasPredicted) return List.of();
        }

        // Window closed (match live, finished, or within 5 min) → show everyone's predictions
        return allPreds.stream().map(this::toDTO).toList();
    }

    private PredictionDTO toDTO(Prediction p) {
        User user = userRepository.findById(p.getUserId()).orElse(null);
        return PredictionDTO.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .username(user != null ? user.getUsername() : "Unknown")
                .profilePic(user != null ? user.getProfilePic() : null)
                .matchId(p.getMatchId())
                .eventId(p.getEventId())
                .roomId(p.getRoomId())
                .predictedHomeScore(p.getPredictedHomeScore())
                .predictedAwayScore(p.getPredictedAwayScore())
                .points(p.getPoints())
                .basePoints(p.getBasePoints())
                .outcomeBonus(p.getOutcomeBonus())
                .gdBonus(p.getGdBonus())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
