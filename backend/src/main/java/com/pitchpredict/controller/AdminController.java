package com.pitchpredict.controller;

import com.pitchpredict.dto.EventDTO;
import com.pitchpredict.dto.LeaderboardEntry;
import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.dto.RoomDTO;
import com.pitchpredict.dto.RoomMemberDTO;
import com.pitchpredict.entity.Event;
import com.pitchpredict.entity.Match;
import com.pitchpredict.entity.Room;
import com.pitchpredict.entity.User;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.service.EventService;
import com.pitchpredict.service.FootballDataService;
import com.pitchpredict.service.LeaderboardService;
import com.pitchpredict.service.MatchService;
import com.pitchpredict.service.PointsCalculationService;
import com.pitchpredict.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchpredict.dto.MatchGoalDTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final EventService eventService;
    private final RoomService roomService;
    private final FootballDataService footballDataService;
    private final MatchRepository matchRepository;
    private final MatchService matchService;
    private final PointsCalculationService pointsCalculationService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final LeaderboardService leaderboardService;

    @PostMapping("/events")
    public ResponseEntity<EventDTO> createEvent(@RequestBody Map<String, Object> body,
                                                Authentication authentication) {
        Long userId = getUserId(authentication);

        Event event = Event.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .sport((String) body.getOrDefault("sport", "Football"))
                .bannerUrl((String) body.get("bannerUrl"))
                .startDate(LocalDate.parse((String) body.get("startDate")))
                .endDate(LocalDate.parse((String) body.get("endDate")))
                .apiCompId((String) body.get("apiCompId"))
                .predictableStages((String) body.get("predictableStages"))
                .createdBy(userId)
                .build();

        return ResponseEntity.ok(eventService.createEvent(event));
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<EventDTO> updateEvent(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body) {
        Event updated = Event.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .sport((String) body.get("sport"))
                .bannerUrl((String) body.get("bannerUrl"))
                .startDate(body.get("startDate") != null ? LocalDate.parse((String) body.get("startDate")) : null)
                .endDate(body.get("endDate") != null ? LocalDate.parse((String) body.get("endDate")) : null)
                .apiCompId((String) body.get("apiCompId"))
                .predictableStages((String) body.get("predictableStages"))
                .build();

        return ResponseEntity.ok(eventService.updateEvent(id, updated));
    }

    @PostMapping("/events/{id}/sync-matches")
    public ResponseEntity<Map<String, Object>> syncMatches(@PathVariable Long id) {
        int count = footballDataService.syncMatches(id);
        return ResponseEntity.ok(Map.of("synced", count));
    }

    @PostMapping("/events/{id}/sync-goals")
    public ResponseEntity<Map<String, Object>> syncGoals(@PathVariable Long id) {
        int count = footballDataService.syncGoalsForEvent(id);
        return ResponseEntity.ok(Map.of("synced", count));
    }

    @PostMapping("/events/{id}/activate")
    public ResponseEntity<EventDTO> activateEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.activateEvent(id));
    }

    @PostMapping("/events/{id}/finish")
    public ResponseEntity<EventDTO> finishEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.finishEvent(id));
    }

    // ── NEW: list rooms for an event (admin view) ──────────────────────────────
    @GetMapping("/events/{eventId}/rooms")
    public ResponseEntity<List<RoomDTO>> getRoomsForEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(roomService.getRoomsForAdmin(eventId));
    }

    // ── NEW: leaderboard for a specific room (admin view) ─────────────────────
    @GetMapping("/rooms/{roomId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getRoomLeaderboard(@PathVariable Long roomId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(roomId));
    }

    // ── NEW: list members of a room (admin view) ───────────────────────────────
    @GetMapping("/rooms/{roomId}/members")
    public ResponseEntity<List<RoomMemberDTO>> getRoomMembers(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomMembers(roomId));
    }

    @PostMapping("/matches")
    public ResponseEntity<MatchDTO> createMatch(@RequestBody Map<String, Object> body) {
        Match match = Match.builder()
                .eventId(Long.valueOf(body.get("eventId").toString()))
                .homeTeam((String) body.get("homeTeam"))
                .awayTeam((String) body.get("awayTeam"))
                .homeFlag((String) body.get("homeFlag"))
                .awayFlag((String) body.get("awayFlag"))
                .matchDate(LocalDateTime.parse((String) body.get("matchDate")))
                .stage((String) body.getOrDefault("stage", "REGULAR_SEASON"))
                .venue((String) body.get("venue"))
                .build();
        match = matchRepository.save(match);
        return ResponseEntity.ok(matchService.toDTO(match));
    }

    @PostMapping("/matches/{id}/set-score")
    public ResponseEntity<MatchDTO> setMatchScore(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> body) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        match.setHomeScore(Integer.parseInt(body.get("homeScore").toString()));
        match.setAwayScore(Integer.parseInt(body.get("awayScore").toString()));
        match.setStatus(MatchStatus.FINISHED);
        match.setPredictionOpen(false);
        match = matchRepository.save(match);
        pointsCalculationService.calculatePointsForMatch(match);
        return ResponseEntity.ok(matchService.toDTO(match));
    }

    @PostMapping("/matches/{id}/goals")
    public ResponseEntity<MatchDTO> setMatchGoals(@PathVariable Long id,
                                                  @RequestBody List<MatchGoalDTO> goals) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        try {
            match.setGoalsJson(objectMapper.writeValueAsString(goals));
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid goals data");
        }
        match = matchRepository.save(match);
        return ResponseEntity.ok(matchService.toDTO(match));
    }

    @PostMapping("/rooms")
    public ResponseEntity<RoomDTO> createRoom(@RequestBody Map<String, Object> body,
                                              Authentication authentication) {
        Long userId = getUserId(authentication);

        Room room = Room.builder()
                .eventId(Long.valueOf(body.get("eventId").toString()))
                .name((String) body.get("name"))
                .description((String) body.get("description"))
                .registrationCode((String) body.get("registrationCode"))
                .maxMembers(body.get("maxMembers") != null
                        ? Integer.parseInt(body.get("maxMembers").toString()) : null)
                .createdBy(userId)
                .build();

        return ResponseEntity.ok(roomService.createRoom(room));
    }

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
