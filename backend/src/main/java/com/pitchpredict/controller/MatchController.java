package com.pitchpredict.controller;

import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.dto.RecommendationDTO;
import com.pitchpredict.service.MatchService;
import com.pitchpredict.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@Slf4j
public class MatchController {

    private final MatchService matchService;
    private final RecommendationService recommendationService;

    @GetMapping("/{id}")
    public ResponseEntity<MatchDTO> getMatch(@PathVariable Long id) {
        log.info("[API] GET /api/matches/{}", id);
        MatchDTO match = matchService.getMatch(id);
        log.info("[API] GET /api/matches/{} ✓ - {} vs {} ({})",
                id, match.getHomeTeam(), match.getAwayTeam(), match.getStatus());
        return ResponseEntity.ok(match);
    }

    @GetMapping("/{id}/recommendation")
    public ResponseEntity<RecommendationDTO> getRecommendation(@PathVariable Long id) {
        try {
            RecommendationDTO rec = recommendationService.getRecommendation(id);
            return rec != null ? ResponseEntity.ok(rec) : ResponseEntity.noContent().build();
        } catch (Exception e) {
            // Generation failed with no cached fallback (e.g. rate limit) → let the UI retry.
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    @GetMapping("/live")
    public ResponseEntity<List<MatchDTO>> getLiveMatches() {
        log.info("[API] GET /api/matches/live");
        List<MatchDTO> matches = matchService.getLiveMatches();
        log.info("[API] GET /api/matches/live ✓ - {} live match(es)", matches.size());
        return ResponseEntity.ok(matches);
    }
}
