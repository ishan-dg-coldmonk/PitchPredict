package com.pitchpredict.service;

import com.pitchpredict.dto.PredictionDTO;
import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Prediction;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.PredictionRepository;
import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final PredictionRepository predictionRepository;
    private final MatchRepository matchRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;

    public PredictionDTO submitPrediction(Long userId, Long matchId, Long eventId,
                                           Long roomId, int homeScore, int awayScore) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match not found"));

        if (!match.getPredictionOpen()) {
            throw ApiException.badRequest("Prediction window is closed for this match");
        }

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw ApiException.forbidden("You must join the room before predicting");
        }

        Optional<Prediction> existing = predictionRepository
                .findByUserIdAndMatchIdAndRoomId(userId, matchId, roomId);

        Prediction prediction;
        if (existing.isPresent()) {
            prediction = existing.get();
            prediction.setPredictedHomeScore(homeScore);
            prediction.setPredictedAwayScore(awayScore);
        } else {
            prediction = Prediction.builder()
                    .userId(userId)
                    .matchId(matchId)
                    .eventId(eventId)
                    .roomId(roomId)
                    .predictedHomeScore(homeScore)
                    .predictedAwayScore(awayScore)
                    .build();
        }

        prediction = predictionRepository.save(prediction);
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

        if (match.getPredictionOpen()) {
            boolean userHasPredicted = allPreds.stream()
                    .anyMatch(p -> p.getUserId().equals(currentUserId));
            if (userHasPredicted) {
                return allPreds.stream().map(this::toDTO).toList();
            }
            return List.of();
        }

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
