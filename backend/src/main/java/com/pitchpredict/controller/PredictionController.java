package com.pitchpredict.controller;

import com.pitchpredict.dto.PredictionDTO;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<PredictionDTO> submitPrediction(@RequestBody Map<String, Object> body,
                                                           Authentication authentication) {
        Long userId = getUserId(authentication);
        Long matchId = Long.valueOf(body.get("matchId").toString());
        Long eventId = Long.valueOf(body.get("eventId").toString());
        Long roomId = Long.valueOf(body.get("roomId").toString());
        int homeScore = Integer.parseInt(body.get("predictedHomeScore").toString());
        int awayScore = Integer.parseInt(body.get("predictedAwayScore").toString());

        return ResponseEntity.ok(predictionService.submitPrediction(
                userId, matchId, eventId, roomId, homeScore, awayScore));
    }

    @GetMapping("/room/{roomId}/event/{eventId}")
    public ResponseEntity<List<PredictionDTO>> getUserPredictions(
            @PathVariable Long roomId, @PathVariable Long eventId,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        return ResponseEntity.ok(predictionService.getUserPredictionsForEvent(userId, eventId, roomId));
    }

    @GetMapping("/room/{roomId}/match/{matchId}")
    public ResponseEntity<List<PredictionDTO>> getMatchPredictions(
            @PathVariable Long roomId, @PathVariable Long matchId,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        return ResponseEntity.ok(predictionService.getPredictionsForMatch(roomId, matchId, userId));
    }

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
