package com.pitchpredict.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchpredict.dto.MatchGoalDTO;
import com.pitchpredict.dto.StandingRowDTO;
import com.pitchpredict.dto.StandingsGroupDTO;
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

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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

    // ── Standings: on-demand fetch with a short-lived in-memory cache ─────────
    //
    // Standings change only when a match finishes (a few times a day), but page
    // loads can be frequent — and we share a 10 req/min budget with the live
    // score scheduler. So we cache per competition for STANDINGS_TTL_MS and only
    // hit the API when the cache is cold or stale.

    private static final long STANDINGS_TTL_MS = 3 * 60 * 1000; // 3 minutes

    private record CachedStandings(List<StandingsGroupDTO> groups, long fetchedAt) {}

    private final Map<String, CachedStandings> standingsCache = new ConcurrentHashMap<>();

    /**
     * Returns group standings for an event's competition.
     * Cached; serves the last good value if a refresh fails.
     */
    public List<StandingsGroupDTO> getStandings(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found"));

        String compId = event.getApiCompId();
        if (compId == null || compId.isBlank()) {
            throw ApiException.badRequest("Event has no API competition ID configured");
        }

        CachedStandings cached = standingsCache.get(compId);
        if (cached != null && System.currentTimeMillis() - cached.fetchedAt() < STANDINGS_TTL_MS) {
            log.debug("[Standings] cache hit for comp {}", compId);
            return cached.groups();
        }

        try {
            List<StandingsGroupDTO> fresh = fetchStandings(compId);
            standingsCache.put(compId, new CachedStandings(fresh, System.currentTimeMillis()));
            log.info("[Standings] fetched comp {} → {} group(s)", compId, fresh.size());
            return fresh;
        } catch (Exception e) {
            log.warn("[Standings] fetch failed for comp {}: {}", compId, e.getMessage());
            if (cached != null) return cached.groups(); // serve stale rather than fail
            throw ApiException.badRequest("Failed to fetch standings: " + e.getMessage());
        }
    }

    private List<StandingsGroupDTO> fetchStandings(String apiCompId) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        String url = baseUrl + "/competitions/" + apiCompId + "/standings";
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());

        List<StandingsGroupDTO> groups = new ArrayList<>();
        for (JsonNode s : root.path("standings")) {
            // The API returns TOTAL/HOME/AWAY variants per group — we only want TOTAL.
            if (!"TOTAL".equals(s.path("type").asText())) continue;

            String group = s.path("group").isNull() ? null : s.path("group").asText(null);

            List<StandingRowDTO> table = new ArrayList<>();
            for (JsonNode r : s.path("table")) {
                JsonNode team = r.path("team");
                table.add(StandingRowDTO.builder()
                        .position(r.path("position").asInt())
                        .teamId(team.path("id").asLong())
                        .teamName(team.path("name").asText(null))
                        .teamTla(team.path("tla").asText(null))
                        .teamCrest(team.path("crest").asText(null))
                        .playedGames(r.path("playedGames").asInt())
                        .won(r.path("won").asInt())
                        .draw(r.path("draw").asInt())
                        .lost(r.path("lost").asInt())
                        .points(r.path("points").asInt())
                        .goalsFor(r.path("goalsFor").asInt())
                        .goalsAgainst(r.path("goalsAgainst").asInt())
                        .goalDifference(r.path("goalDifference").asInt())
                        .build());
            }
            groups.add(StandingsGroupDTO.builder().group(group).table(table).build());
        }
        return groups;
    }

    // ── Admin: bulk sync all matches for an event ────────────────────────────

    public int syncMatches(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found"));

        if (event.getApiCompId() == null || event.getApiCompId().isBlank()) {
            throw ApiException.badRequest("Event has no API competition ID configured");
        }

        String url = baseUrl + "/competitions/" + event.getApiCompId() + "/matches";

        if (event.getPredictableStages() != null && !event.getPredictableStages().isBlank()) {
            int total = 0;
            for (String stage : event.getPredictableStages().split(",")) {
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
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);
            JsonNode root    = objectMapper.readTree(response.getBody());
            JsonNode matches = root.path("matches");

            int count = 0;
            for (JsonNode m : matches) {
                long externalId = m.path("id").asLong();
                Match match = matchRepository.findByExternalMatchId(externalId)
                        .orElse(Match.builder()
                                .eventId(eventId)
                                .externalMatchId(externalId)
                                .build());

                applyMatchFields(match, m);

                // For already-finished matches set the full-time score immediately
                if (match.getStatus() == MatchStatus.FINISHED) {
                    applyFullTimeScore(match, m);
                }

                matchRepository.save(match);
                count++;
            }

            log.info("Synced {} matches for event {}", count, eventId);
            return count;
        } catch (Exception e) {
            log.error("Failed to sync matches: {}", e.getMessage());
            throw ApiException.badRequest("Failed to sync: " + e.getMessage());
        }
    }

    // ── Scheduler: poll one match by its external ID and update DB ───────────
    //
    // Called by MatchScoreUpdater for every match in the active time window.
    // Returns Optional.empty() if the API call fails — caller skips that match.
    // Never throws.

    public Optional<Match> pollSingleMatch(Match match) {
        if (match.getExternalMatchId() == null) return Optional.empty();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Auth-Token", apiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = baseUrl + "/matches/" + match.getExternalMatchId();
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);
            JsonNode m = objectMapper.readTree(response.getBody());

            MatchStatus oldStatus = match.getStatus();
            MatchStatus newStatus = mapApiStatus(m.path("status").asText("SCHEDULED"));
            match.setStatus(newStatus);

            // ── Score update ─────────────────────────────────────────────────
            //
            // football-data.org v4 populates score.fullTime in real time during
            // the match — it is NOT only available after full time.
            //
            // We only read fullTime.  We intentionally never fall back to
            // halfTime because PAUSED (half-time) maps to LIVE in our system,
            // and showing the half-time score made the card look "finished" at HT.

            if (newStatus == MatchStatus.LIVE || newStatus == MatchStatus.FINISHED) {
                applyFullTimeScore(match, m);
            }

            // Extract goal scorers only once the match is completely done
            if (newStatus == MatchStatus.FINISHED) {
                String goalsJson = extractGoalsJson(m);
                if (goalsJson != null) match.setGoalsJson(goalsJson);
            }

            matchRepository.save(match);

            if (oldStatus != newStatus) {
                log.info("Match {} ({} vs {}): {} → {}",
                        match.getId(), match.getHomeTeam(), match.getAwayTeam(),
                        oldStatus, newStatus);
            }

            return Optional.of(match);

        } catch (Exception e) {
            log.warn("pollSingleMatch failed for match {} (extId={}): {}",
                    match.getId(), match.getExternalMatchId(), e.getMessage());
            return Optional.empty();
        }
    }

    // ── Admin: sync goal scorers for finished matches missing goal data ───────

    public int syncGoalsForEvent(Long eventId) {
        List<Match> targets = matchRepository.findByEventIdOrderByMatchDateAsc(eventId).stream()
                .filter(m -> m.getStatus() == MatchStatus.FINISHED)
                .filter(m -> m.getExternalMatchId() != null)
                .filter(m -> m.getGoalsJson() == null || m.getGoalsJson().isBlank())
                .toList();

        int synced = 0;
        for (Match match : targets) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("X-Auth-Token", apiKey);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                ResponseEntity<String> response = restTemplate.exchange(
                        baseUrl + "/matches/" + match.getExternalMatchId(),
                        HttpMethod.GET, entity, String.class);
                JsonNode m = objectMapper.readTree(response.getBody());

                String goalsJson = extractGoalsJson(m);
                if (goalsJson != null) {
                    match.setGoalsJson(goalsJson);
                    matchRepository.save(match);
                    synced++;
                }

                Thread.sleep(7000); // stay within 10 req/min on free tier
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Goals sync failed for match {}: {}",
                        match.getExternalMatchId(), e.getMessage());
            }
        }
        log.info("Synced goals for {} matches in event {}", synced, eventId);
        return synced;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void applyMatchFields(Match match, JsonNode m) {
        match.setHomeTeam(m.path("homeTeam").path("name").asText("TBD"));
        match.setAwayTeam(m.path("awayTeam").path("name").asText("TBD"));
        match.setHomeFlag(m.path("homeTeam").path("tla").asText(null));
        match.setAwayFlag(m.path("awayTeam").path("tla").asText(null));
        match.setHomeCrest(m.path("homeTeam").path("crest").asText(null));
        match.setAwayCrest(m.path("awayTeam").path("crest").asText(null));
        match.setVenue(m.path("venue").asText(null));

        String utcDate = m.path("utcDate").asText(null);
        if (utcDate != null && !utcDate.isBlank()) {
            ZonedDateTime zdt = ZonedDateTime.parse(utcDate, DateTimeFormatter.ISO_DATE_TIME);
            // Store in UTC so timezone is unambiguous across all servers & clients
            match.setMatchDate(zdt.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime());
        }

        match.setStage(m.path("stage").asText(null));

        String group = m.path("group").asText(null);
        if (group != null && group.startsWith("GROUP_")) group = group.substring(6);
        match.setGroupName(group);

        match.setStatus(mapApiStatus(m.path("status").asText("SCHEDULED")));
    }

    private void applyFullTimeScore(Match match, JsonNode m) {
        JsonNode ft = m.path("score").path("fullTime");
        if (!ft.path("home").isNull() && !ft.path("away").isNull()) {
            match.setHomeScore(ft.path("home").asInt());
            match.setAwayScore(ft.path("away").asInt());
        }
    }

    private String extractGoalsJson(JsonNode matchNode) {
        JsonNode goals = matchNode.path("goals");
        if (goals.isMissingNode() || !goals.isArray() || goals.isEmpty()) return null;

        List<MatchGoalDTO> list = new ArrayList<>();
        for (JsonNode g : goals) {
            list.add(MatchGoalDTO.builder()
                    .minute(g.path("minute").isNull()         ? null : g.path("minute").asInt())
                    .injuryTime(g.path("injuryTime").isNull() ? null : g.path("injuryTime").asInt())
                    .type(g.path("type").asText(null))
                    .teamName(g.path("team").path("name").asText(null))
                    .scorerName(g.path("scorer").path("name").asText(null))
                    .assistName(g.path("assist").path("name").asText(null))
                    .build());
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            log.warn("Failed to serialize goals: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Maps football-data.org v4 status strings to our MatchStatus enum.
     *
     *   SCHEDULED / TIMED              → SCHEDULED
     *   IN_PLAY                        → LIVE  (1st or 2nd half)
     *   PAUSED                         → LIVE  (half-time — still live, NOT finished)
     *   EXTRA_TIME / PENALTY_SHOOTOUT  → LIVE
     *   FINISHED / AWARDED             → FINISHED
     *   SUSPENDED                      → SUSPENDED
     *   POSTPONED                      → POSTPONED
     *   CANCELLED                      → CANCELLED
     */
    public MatchStatus mapApiStatus(String apiStatus) {
        return switch (apiStatus) {
            case "FINISHED", "AWARDED"                                  -> MatchStatus.FINISHED;
            case "IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT" -> MatchStatus.LIVE;
            case "SUSPENDED"                                            -> MatchStatus.SUSPENDED;
            case "POSTPONED"                                            -> MatchStatus.POSTPONED;
            case "CANCELLED"                                            -> MatchStatus.CANCELLED;
            default                                                     -> MatchStatus.SCHEDULED;
        };
    }
}
