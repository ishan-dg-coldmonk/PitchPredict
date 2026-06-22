package com.pitchpredict.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchpredict.entity.Event;
import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.EventRepository;
import com.pitchpredict.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.pitchpredict.dto.MatchGoalDTO;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FootballDataService {

    private final MatchRepository matchRepository;
    private final EventRepository eventRepository;
    private final ObjectMapper objectMapper;

    @Value("${football-data.api-key}")
    private String apiKey;

    @Value("${football-data.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public int syncMatches(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found"));

        if (event.getApiCompId() == null || event.getApiCompId().isBlank()) {
            throw ApiException.badRequest("Event has no API competition ID configured");
        }

        String url = baseUrl + "/competitions/" + event.getApiCompId() + "/matches";

        if (event.getPredictableStages() != null && !event.getPredictableStages().isBlank()) {
            String[] stages = event.getPredictableStages().split(",");
            int total = 0;
            for (String stage : stages) {
                total += fetchAndSaveMatches(url + "?stage=" + stage.trim(), eventId);
            }
            return total;
        }

        return fetchAndSaveMatches(url, eventId);
    }

    private int fetchAndSaveMatches(String url, Long eventId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode matches = root.path("matches");

            int count = 0;
            for (JsonNode m : matches) {
                long externalId = m.path("id").asLong();
                Optional<Match> existing = matchRepository.findByExternalMatchId(externalId);

                Match match = existing.orElse(Match.builder()
                        .eventId(eventId)
                        .externalMatchId(externalId)
                        .build());

                match.setHomeTeam(m.path("homeTeam").path("name").asText("TBD"));
                match.setAwayTeam(m.path("awayTeam").path("name").asText("TBD"));
                match.setHomeFlag(m.path("homeTeam").path("tla").asText(null));
                match.setAwayFlag(m.path("awayTeam").path("tla").asText(null));
                match.setHomeCrest(m.path("homeTeam").path("crest").asText(null));
                match.setAwayCrest(m.path("awayTeam").path("crest").asText(null));

                String utcDate = m.path("utcDate").asText();
                ZonedDateTime zdt = ZonedDateTime.parse(utcDate, DateTimeFormatter.ISO_DATE_TIME);
                match.setMatchDate(zdt.withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());

                match.setStage(m.path("stage").asText(null));

                String group = m.path("group").asText(null);
                if (group != null && group.startsWith("GROUP_")) {
                    group = group.substring(6);
                }
                match.setGroupName(group);

                match.setVenue(m.path("venue").asText(null));

                JsonNode score = m.path("score").path("fullTime");
                if (!score.path("home").isNull()) {
                    match.setHomeScore(score.path("home").asInt());
                }
                if (!score.path("away").isNull()) {
                    match.setAwayScore(score.path("away").asInt());
                }

                match.setStatus(mapApiStatus(m.path("status").asText("SCHEDULED")));

                matchRepository.save(match);
                count++;
            }

            log.info("Synced {} matches for event {}", count, eventId);
            return count;
        } catch (Exception e) {
            log.error("Failed to sync matches from football-data.org", e);
            throw ApiException.badRequest("Failed to sync: " + e.getMessage());
        }
    }

    public void updateLiveScores() {
        List<Match> liveMatches = matchRepository.findByStatusIn(
                List.of(MatchStatus.LIVE, MatchStatus.SCHEDULED, MatchStatus.SUSPENDED));

        for (Match match : liveMatches) {
            if (match.getExternalMatchId() == null) continue;

            if (match.getStatus() == MatchStatus.SCHEDULED) {
                if (match.getMatchDate().isAfter(LocalDateTime.now().plusMinutes(5))) {
                    continue;
                }
            }

            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("X-Auth-Token", apiKey);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                String url = baseUrl + "/matches/" + match.getExternalMatchId();
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                JsonNode m = objectMapper.readTree(response.getBody());

                MatchStatus newStatus = mapApiStatus(m.path("status").asText("SCHEDULED"));
                MatchStatus oldStatus = match.getStatus();

                match.setStatus(newStatus);

                JsonNode fullTime = m.path("score").path("fullTime");
                JsonNode halfTime = m.path("score").path("halfTime");

                if (!fullTime.path("home").isNull()) {
                    match.setHomeScore(fullTime.path("home").asInt());
                    match.setAwayScore(fullTime.path("away").asInt());
                } else if (!halfTime.path("home").isNull()) {
                    match.setHomeScore(halfTime.path("home").asInt());
                    match.setAwayScore(halfTime.path("away").asInt());
                }

                match.setGoalsJson(extractGoalsJson(m));
                matchRepository.save(match);

                if (oldStatus != MatchStatus.FINISHED && newStatus == MatchStatus.FINISHED) {
                    log.info("Match {} finished: {} {} - {} {}",
                            match.getId(), match.getHomeTeam(), match.getHomeScore(),
                            match.getAwayScore(), match.getAwayTeam());
                }

            } catch (Exception e) {
                log.warn("Failed to update match {}: {}", match.getExternalMatchId(), e.getMessage());
            }
        }
    }

    public int syncGoalsForEvent(Long eventId) {
        List<Match> finishedMatches = matchRepository.findByEventIdOrderByMatchDateAsc(eventId).stream()
                .filter(m -> m.getStatus() == MatchStatus.FINISHED)
                .filter(m -> m.getExternalMatchId() != null)
                .filter(m -> m.getGoalsJson() == null || m.getGoalsJson().isBlank())
                .toList();

        int synced = 0;
        for (Match match : finishedMatches) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("X-Auth-Token", apiKey);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                String url = baseUrl + "/matches/" + match.getExternalMatchId();
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                JsonNode m = objectMapper.readTree(response.getBody());

                match.setGoalsJson(extractGoalsJson(m));
                matchRepository.save(match);
                synced++;

                Thread.sleep(7000);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Failed to fetch goals for match {}: {}", match.getExternalMatchId(), e.getMessage());
            }
        }
        log.info("Synced goals for {} matches", synced);
        return synced;
    }

    private String extractGoalsJson(JsonNode matchNode) {
        JsonNode goals = matchNode.path("goals");
        if (goals.isMissingNode() || !goals.isArray() || goals.isEmpty()) return null;

        List<MatchGoalDTO> goalList = new ArrayList<>();
        for (JsonNode g : goals) {
            goalList.add(MatchGoalDTO.builder()
                    .minute(g.path("minute").isNull() ? null : g.path("minute").asInt())
                    .injuryTime(g.path("injuryTime").isNull() ? null : g.path("injuryTime").asInt())
                    .type(g.path("type").asText(null))
                    .teamName(g.path("team").path("name").asText(null))
                    .scorerName(g.path("scorer").path("name").asText(null))
                    .assistName(g.path("assist").path("name").asText(null))
                    .build());
        }
        try {
            return objectMapper.writeValueAsString(goalList);
        } catch (Exception e) {
            log.warn("Failed to serialize goals: {}", e.getMessage());
            return null;
        }
    }

    private MatchStatus mapApiStatus(String apiStatus) {
        return switch (apiStatus) {
            case "FINISHED", "AWARDED" -> MatchStatus.FINISHED;
            case "IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT" -> MatchStatus.LIVE;
            case "SUSPENDED" -> MatchStatus.SUSPENDED;
            case "POSTPONED" -> MatchStatus.POSTPONED;
            case "CANCELLED" -> MatchStatus.CANCELLED;
            default -> MatchStatus.SCHEDULED;
        };
    }
}
