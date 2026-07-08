package com.pitchpredict.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pitchpredict.dto.RecommendationDTO;
import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.MatchRecommendation;
import com.pitchpredict.entity.TeamRanking;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRecommendationRepository;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.TeamRankingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Produces an AI score suggestion + pre-match commentary for a match, using
 * FIFA rankings + tournament form (both stage-agnostic, so knockouts work too).
 *
 * One Gemini call per match, cached in the DB and reused by all users; the cache
 * is regenerated when either team has played a new match since (form changed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final MatchRepository matchRepository;
    private final MatchRecommendationRepository recommendationRepository;
    private final TeamRankingRepository teamRankingRepository;
    private final ObjectMapper objectMapper;

    @Value("${openrouter.api-key:}")
    private String apiKey;

    @Value("${openrouter.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${openrouter.model:poolside/laguna-xs-2.1:free}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    @jakarta.annotation.PostConstruct
    void logKeyStatus() {
        if (apiKey == null || apiKey.isBlank())
            log.warn("[AI] OPENROUTER_API_KEY not set — score suggestions disabled");
        else
            log.info("[AI] OpenRouter key loaded (model={})", model);
    }

    /** Returns a cached/fresh suggestion, or null if unavailable (UI hides the strip). */
    public RecommendationDTO getRecommendation(Long matchId) {
        if (apiKey == null || apiKey.isBlank()) return null;

        Match match = matchRepository.findById(matchId).orElse(null);
        if (match == null || match.getStatus() != MatchStatus.SCHEDULED) return null;
        // No suggestion until both teams are confirmed — nothing to reason about.
        if (MatchService.teamsUndetermined(match)) return null;

        List<Match> finished = matchRepository.findByEventIdOrderByMatchDateAsc(match.getEventId()).stream()
                .filter(m -> m.getStatus() == MatchStatus.FINISHED && m.getHomeScore() != null)
                .toList();

        Form home = buildForm(match.getHomeTeam(), finished);
        Form away = buildForm(match.getAwayTeam(), finished);
        int basis = home.played + away.played;

        // Serve cache if form hasn't changed since it was generated.
        MatchRecommendation existing = recommendationRepository.findByMatchId(matchId).orElse(null);
        if (existing != null && existing.getBasisPlayedCount() != null
                && existing.getBasisPlayedCount() == basis) {
            return toDTO(existing);
        }

        try {
            RecommendationDTO ai = callOpenRouter(match, home, away);
            if (ai == null) return existing != null ? toDTO(existing) : null;

            MatchRecommendation rec = existing != null ? existing : new MatchRecommendation();
            rec.setMatchId(matchId);
            rec.setHomeScore(ai.getHomeScore());
            rec.setAwayScore(ai.getAwayScore());
            rec.setPenaltyHome(ai.getPenaltyHome());
            rec.setPenaltyAway(ai.getPenaltyAway());
            rec.setRationale(ai.getRationale());
            rec.setCommentary(ai.getCommentary());
            rec.setConfidence(ai.getConfidence());
            rec.setBasisPlayedCount(basis);
            rec.setCreatedAt(LocalDateTime.now());
            recommendationRepository.save(rec);
            log.info("[AI] Suggestion for match {} → {}:{} (conf {})",
                    matchId, ai.getHomeScore(), ai.getAwayScore(), ai.getConfidence());
            return toDTO(rec);
        } catch (Exception e) {
            log.warn("[AI] Recommendation failed for match {}: {}", matchId, e.getMessage());
            if (existing != null) return toDTO(existing);      // serve stale rather than fail
            throw new IllegalStateException("AI temporarily unavailable"); // → 503 so UI can retry
        }
    }

    // ── Gemini call ──────────────────────────────────────────────────────────

    private RecommendationDTO callOpenRouter(Match match, Form home, Form away) throws Exception {
        boolean knockout = match.getStage() != null && !"GROUP_STAGE".equalsIgnoreCase(match.getStage());
        String prompt = buildPrompt(match, home, away, knockout);

        // OpenAI-compatible chat completions payload
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("temperature", 0.7);
        body.put("max_tokens", 600);
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("X-Title", "PitchPredict");
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> resp = restTemplate.postForEntity(
                baseUrl + "/chat/completions", entity, String.class);

        JsonNode root = objectMapper.readTree(resp.getBody());
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        if (contentNode.isMissingNode() || contentNode.isNull() || contentNode.asText().isBlank())
            throw new IllegalStateException("Empty AI response"); // → treated as failure (retryable)

        JsonNode out = objectMapper.readTree(extractJson(contentNode.asText()));
        return RecommendationDTO.builder()
                .homeScore(out.path("homeScore").asInt())
                .awayScore(out.path("awayScore").asInt())
                .penaltyHome(out.hasNonNull("penaltyHome") ? out.path("penaltyHome").asInt() : null)
                .penaltyAway(out.hasNonNull("penaltyAway") ? out.path("penaltyAway").asInt() : null)
                .rationale(out.path("rationale").asText(null))
                .commentary(out.path("commentary").asText(null))
                .confidence(out.hasNonNull("confidence") ? out.path("confidence").asInt() : 50)
                .build();
    }

    /** Small free models may wrap JSON in prose or ```code fences``` — pull out the object. */
    private String extractJson(String s) {
        if (s == null) return "{}";
        String t = s.trim();
        if (t.startsWith("```")) {
            int nl = t.indexOf('\n');
            if (nl >= 0) t = t.substring(nl + 1);
            if (t.endsWith("```")) t = t.substring(0, t.length() - 3);
            t = t.trim();
        }
        int start = t.indexOf('{');
        int end = t.lastIndexOf('}');
        return (start >= 0 && end > start) ? t.substring(start, end + 1) : t;
    }

    private String buildPrompt(Match match, Form home, Form away, boolean knockout) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a world-class football analyst and TV pundit with deep expertise in ")
          .append("international tournaments. Predict the single most likely final scoreline for the ")
          .append("match below, reasoning like an expert would from each side's quality, form, and the matchup.\n\n");

        sb.append("MATCH: ").append(match.getHomeTeam()).append(" (home) vs ")
          .append(match.getAwayTeam()).append(" (away)\n");
        sb.append("STAGE: ")
          .append(match.getStage() == null ? "unknown" : match.getStage().replace("_", " ")).append("\n");
        if (knockout) sb.append("This is a KNOCKOUT match — a draw goes to extra time and then a penalty shootout.\n");
        sb.append("\n");
        sb.append(teamLine(match.getHomeTeam(), match.getHomeFlag(), home));
        sb.append(teamLine(match.getAwayTeam(), match.getAwayFlag(), away));

        sb.append("\nHOW TO REASON:\n");
        sb.append("- Weigh FIFA ranking (overall quality), current tournament form (goals scored/conceded, ")
          .append("recent results, momentum), home advantage, and the stage — knockouts are tighter and lower-scoring.\n");
        sb.append("- A higher-ranked, in-form side should usually be favoured, but respect a strong underdog's form.\n");
        sb.append("- Give a REALISTIC football scoreline: most matches finish with 0-3 goals per side; blowouts are rare.\n");
        if (knockout) {
            sb.append("- If you predict a draw, you MUST also give a penalty shootout result ")
              .append("(penaltyHome, penaltyAway) with a clear winner (they cannot be equal).\n");
        }

        sb.append("\nOUTPUT FIELDS:\n");
        sb.append("- rationale: one punchy line (<90 chars) justifying the pick.\n");
        sb.append("- commentary: 1-2 sentences of engaging, confident pre-match pundit analysis.\n");
        sb.append("- confidence: 0-100, how sure you are.\n");

        sb.append("\nRespond with ONLY a JSON object (no markdown, no code fences), exactly this shape:\n");
        sb.append("{\"homeScore\": int, \"awayScore\": int, \"penaltyHome\": int or null, ")
          .append("\"penaltyAway\": int or null, \"rationale\": string, \"commentary\": string, \"confidence\": int}\n");
        return sb.toString();
    }

    private String teamLine(String team, String tla, Form f) {
        Integer rank = tla == null ? null : teamRankingRepository.findByTla(tla)
                .map(TeamRanking::getFifaRank).orElse(null);
        return team + ": FIFA rank " + (rank == null ? "unranked" : "#" + rank)
                + ". This tournament: played " + f.played + ", "
                + f.won + "W-" + f.draw + "D-" + f.lost + "L, scored " + f.gf
                + ", conceded " + f.ga
                + (f.recent.isEmpty() ? "" : ". Recent: " + f.recent) + ".\n";
    }

    // ── Form from the matches table (stage-agnostic) ──────────────────────────

    private record Form(int played, int won, int draw, int lost, int gf, int ga, String recent) {}

    private Form buildForm(String team, List<Match> finished) {
        int p = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
        List<String> results = new ArrayList<>();
        for (Match m : finished) {
            boolean isHome = team.equals(m.getHomeTeam());
            boolean isAway = team.equals(m.getAwayTeam());
            if (!isHome && !isAway) continue;
            int forGoals = isHome ? m.getHomeScore() : m.getAwayScore();
            int agGoals  = isHome ? m.getAwayScore() : m.getHomeScore();
            p++; gf += forGoals; ga += agGoals;
            if (forGoals > agGoals) { w++; results.add("W" + forGoals + "-" + agGoals); }
            else if (forGoals < agGoals) { l++; results.add("L" + forGoals + "-" + agGoals); }
            else { d++; results.add("D" + forGoals + "-" + agGoals); }
        }
        // last 3, most recent first
        int from = Math.max(0, results.size() - 3);
        List<String> last = results.subList(from, results.size());
        java.util.Collections.reverse(last);
        return new Form(p, w, d, l, gf, ga, String.join(" ", last));
    }

    private RecommendationDTO toDTO(MatchRecommendation r) {
        return RecommendationDTO.builder()
                .homeScore(r.getHomeScore())
                .awayScore(r.getAwayScore())
                .penaltyHome(r.getPenaltyHome())
                .penaltyAway(r.getPenaltyAway())
                .rationale(r.getRationale())
                .commentary(r.getCommentary())
                .confidence(r.getConfidence())
                .build();
    }
}
