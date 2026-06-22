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

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    private final MatchRepository matchRepository;
    private final ObjectMapper objectMapper;

    public List<MatchDTO> getMatchesByEvent(Long eventId) {
        return matchRepository.findByEventIdOrderByMatchDateAsc(eventId).stream()
                .map(this::toDTO)
                .toList();
    }

    public MatchDTO getMatch(Long id) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        return toDTO(match);
    }

    public List<MatchDTO> getLiveMatches() {
        return matchRepository.findByStatus(MatchStatus.LIVE).stream()
                .map(this::toDTO)
                .toList();
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
                .predictionOpen(match.getPredictionOpen())
                .goals(parseGoals(match.getGoalsJson()))
                .build();
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
