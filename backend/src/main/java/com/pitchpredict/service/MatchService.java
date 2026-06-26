package com.pitchpredict.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.dto.MatchGoalDTO;
import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    /** Prediction window closes this many minutes before kick-off */
    private static final int PREDICTION_CLOSE_MINUTES = 5;

    private final MatchRepository matchRepository;
    private final ObjectMapper objectMapper;

    public List<MatchDTO> getMatchesByEvent(Long eventId) {
        log.info("[Match] getMatchesByEvent - eventId={}", eventId);
        List<MatchDTO> matches = matchRepository.findByEventIdOrderByMatchDateAsc(eventId).stream()
                .map(this::toDTO)
                .toList();
        log.info("[Match] getMatchesByEvent ✓ - eventId={} → {} match(es)", eventId, matches.size());
        return matches;
    }

    public MatchDTO getMatch(Long id) {
        log.info("[Match] getMatch - id={}", id);
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        MatchDTO dto = toDTO(match);
        log.info("[Match] getMatch ✓ - id={} {} vs {} ({})", id, dto.getHomeTeam(), dto.getAwayTeam(), dto.getStatus());
        return dto;
    }

    public List<MatchDTO> getLiveMatches() {
        List<MatchDTO> matches = matchRepository.findByStatus(MatchStatus.LIVE).stream()
                .map(this::toDTO)
                .toList();
        log.info("[Match] getLiveMatches ✓ - {} live match(es)", matches.size());
        return matches;
    }

    public MatchDTO toDTO(Match match) {
        return MatchDTO.builder()
                .id(match.getId())
                .eventId(match.getEventId())
                .externalMatchId(match.getExternalMatchId())
                .homeTeam(match.getHomeTeam())
                .awayTeam(match.getAwayTeam())
                .homeFlag(match.getHomeFlag())
                .awayFlag(match.getAwayFlag())
                .homeCrest(match.getHomeCrest())
                .awayCrest(match.getAwayCrest())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .matchDate(match.getMatchDate())
                .stage(match.getStage())
                .groupName(match.getGroupName())
                .venue(match.getVenue())
                .status(match.getStatus().name())
                .predictionOpen(computePredictionOpen(match))
                .goals(parseGoals(match.getGoalsJson()))
                .build();
    }

    /**
     * Prediction eligibility is computed dynamically — never stored in DB.
     *
     * Rules:
     *   - Only SCHEDULED matches can accept predictions.
     *   - Window closes exactly PREDICTION_CLOSE_MINUTES before kick-off.
     *   - LIVE, FINISHED, SUSPENDED etc. are always false.
     */
    public boolean computePredictionOpen(Match match) {
        if (match.getStatus() != MatchStatus.SCHEDULED) {
            log.debug("[Match] predictionOpen=false - matchId={} status={} (not SCHEDULED)",
                    match.getId(), match.getStatus());
            return false;
        }
        LocalDateTime deadline = match.getMatchDate().minusMinutes(PREDICTION_CLOSE_MINUTES);
        boolean open = LocalDateTime.now().isBefore(deadline);
        log.debug("[Match] predictionOpen={} - matchId={} matchDate={} deadline={}",
                open, match.getId(), match.getMatchDate(), deadline);
        return open;
    }

    private List<MatchGoalDTO> parseGoals(String goalsJson) {
        if (goalsJson == null || goalsJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(goalsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse goalsJson: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
