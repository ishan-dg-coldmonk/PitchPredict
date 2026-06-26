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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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

    // ── Events ────────────────────────────────────────────────────────────────

    @PostMapping("/events")
    public ResponseEntity<EventDTO> createEvent(@RequestBody Map<String, Object> body,
                                                 Authentication authentication) {
        Long userId = getUserId(authentication);
        String title = (String) body.get("title");
        log.info("[API] POST /api/admin/events - title={} by userId={}", title, userId);
        Event event = Event.builder()
                .title(title)
                .description((String) body.get("description"))
                .sport((String) body.getOrDefault("sport", "Football"))
                .bannerUrl((String) body.get("bannerUrl"))
                .prize((String) body.get("prize"))
                .startDate(LocalDate.parse((String) body.get("startDate")))
                .endDate(LocalDate.parse((String) body.get("endDate")))
                .apiCompId((String) body.get("apiCompId"))
                .predictableStages((String) body.get("predictableStages"))
                .createdBy(userId)
                .build();
        EventDTO dto = eventService.createEvent(event);
        log.info("[API] POST /api/admin/events ✓ - eventId={}", dto.getId());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<EventDTO> updateEvent(@PathVariable Long id,
                                                 @RequestBody Map<String, Object> body) {
        log.info("[API] PUT /api/admin/events/{}", id);
        Event updated = Event.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .sport((String) body.get("sport"))
                .bannerUrl((String) body.get("bannerUrl"))
                .prize((String) body.get("prize"))
                .startDate(body.get("startDate") != null ? LocalDate.parse((String) body.get("startDate")) : null)
                .endDate(body.get("endDate") != null ? LocalDate.parse((String) body.get("endDate")) : null)
                .apiCompId((String) body.get("apiCompId"))
                .predictableStages((String) body.get("predictableStages"))
                .build();
        EventDTO dto = eventService.updateEvent(id, updated);
        log.info("[API] PUT /api/admin/events/{} ✓", id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/events/{id}/sync-matches")
    public ResponseEntity<Map<String, Object>> syncMatches(@PathVariable Long id) {
        log.info("[API] POST /api/admin/events/{}/sync-matches", id);
        int count = footballDataService.syncMatches(id);
        log.info("[API] POST /api/admin/events/{}/sync-matches ✓ - {} match(es)", id, count);
        return ResponseEntity.ok(Map.of("synced", count));
    }

    @PostMapping("/events/{id}/sync-goals")
    public ResponseEntity<Map<String, Object>> syncGoals(@PathVariable Long id) {
        log.info("[API] POST /api/admin/events/{}/sync-goals", id);
        int count = footballDataService.syncGoalsForEvent(id);
        log.info("[API] POST /api/admin/events/{}/sync-goals ✓ - {} goal(s)", id, count);
        return ResponseEntity.ok(Map.of("synced", count));
    }

    @PostMapping("/events/{id}/activate")
    public ResponseEntity<EventDTO> activateEvent(@PathVariable Long id) {
        log.info("[API] POST /api/admin/events/{}/activate", id);
        EventDTO dto = eventService.activateEvent(id);
        log.info("[API] POST /api/admin/events/{}/activate ✓", id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/events/{id}/finish")
    public ResponseEntity<EventDTO> finishEvent(@PathVariable Long id) {
        log.info("[API] POST /api/admin/events/{}/finish", id);
        EventDTO dto = eventService.finishEvent(id);
        log.info("[API] POST /api/admin/events/{}/finish ✓", id);
        return ResponseEntity.ok(dto);
    }

    // ── Admin: rooms under an event ───────────────────────────────────────────

    @GetMapping("/events/{eventId}/rooms")
    public ResponseEntity<List<RoomDTO>> getRoomsForEvent(@PathVariable Long eventId) {
        log.info("[API] GET /api/admin/events/{}/rooms", eventId);
        List<RoomDTO> rooms = roomService.getRoomsForAdmin(eventId);
        log.info("[API] GET /api/admin/events/{}/rooms ✓ - {} room(s)", eventId, rooms.size());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/rooms/{roomId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getRoomLeaderboard(@PathVariable Long roomId) {
        log.info("[API] GET /api/admin/rooms/{}/leaderboard", roomId);
        List<LeaderboardEntry> lb = leaderboardService.getLeaderboard(roomId);
        log.info("[API] GET /api/admin/rooms/{}/leaderboard ✓ - {} entries", roomId, lb.size());
        return ResponseEntity.ok(lb);
    }

    @GetMapping("/rooms/{roomId}/members")
    public ResponseEntity<List<RoomMemberDTO>> getRoomMembers(@PathVariable Long roomId) {
        log.info("[API] GET /api/admin/rooms/{}/members", roomId);
        List<RoomMemberDTO> members = roomService.getRoomMembers(roomId);
        log.info("[API] GET /api/admin/rooms/{}/members ✓ - {} member(s)", roomId, members.size());
        return ResponseEntity.ok(members);
    }

    // ── Matches ───────────────────────────────────────────────────────────────

    @PostMapping("/matches")
    public ResponseEntity<MatchDTO> createMatch(@RequestBody Map<String, Object> body) {
        String homeTeam = (String) body.get("homeTeam");
        String awayTeam = (String) body.get("awayTeam");
        log.info("[API] POST /api/admin/matches - {} vs {}", homeTeam, awayTeam);
        Match match = Match.builder()
                .eventId(Long.valueOf(body.get("eventId").toString()))
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeFlag((String) body.get("homeFlag"))
                .awayFlag((String) body.get("awayFlag"))
                .matchDate(LocalDateTime.parse((String) body.get("matchDate")))
                .stage((String) body.getOrDefault("stage", "REGULAR_SEASON"))
                .venue((String) body.get("venue"))
                .build();
        match = matchRepository.save(match);
        MatchDTO dto = matchService.toDTO(match);
        log.info("[API] POST /api/admin/matches ✓ - matchId={}", dto.getId());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/matches/{id}/set-score")
    public ResponseEntity<MatchDTO> setMatchScore(@PathVariable Long id,
                                                   @RequestBody Map<String, Object> body) {
        int homeScore = Integer.parseInt(body.get("homeScore").toString());
        int awayScore = Integer.parseInt(body.get("awayScore").toString());
        log.info("[API] POST /api/admin/matches/{}/set-score - setting {}:{} (FINISHED)", id, homeScore, awayScore);
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        match.setHomeScore(homeScore);
        match.setAwayScore(awayScore);
        match.setStatus(MatchStatus.FINISHED);
        // Note: no predictionOpen flag — eligibility is computed dynamically
        match = matchRepository.save(match);
        pointsCalculationService.calculatePointsForMatch(match);
        MatchDTO dto = matchService.toDTO(match);
        log.info("[API] POST /api/admin/matches/{}/set-score ✓", id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/matches/{id}/goals")
    public ResponseEntity<MatchDTO> setMatchGoals(@PathVariable Long id,
                                                   @RequestBody List<MatchGoalDTO> goals) {
        log.info("[API] POST /api/admin/matches/{}/goals - {} goal(s)", id, goals.size());
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found"));
        try {
            match.setGoalsJson(objectMapper.writeValueAsString(goals));
        } catch (Exception e) {
            log.warn("[API] Failed to serialize goals for match {}: {}", id, e.getMessage());
            throw ApiException.badRequest("Invalid goals data");
        }
        match = matchRepository.save(match);
        MatchDTO dto = matchService.toDTO(match);
        log.info("[API] POST /api/admin/matches/{}/goals ✓", id);
        return ResponseEntity.ok(dto);
    }

    // ── Rooms ─────────────────────────────────────────────────────────────────

    @PostMapping("/rooms")
    public ResponseEntity<RoomDTO> createRoom(@RequestBody Map<String, Object> body,
                                               Authentication authentication) {
        Long userId = getUserId(authentication);
        String name = (String) body.get("name");
        log.info("[API] POST /api/admin/rooms - name={} by userId={}", name, userId);
        Room room = Room.builder()
                .eventId(Long.valueOf(body.get("eventId").toString()))
                .name(name)
                .description((String) body.get("description"))
                .registrationCode((String) body.get("registrationCode"))
                .maxMembers(body.get("maxMembers") != null
                        ? Integer.parseInt(body.get("maxMembers").toString()) : null)
                .createdBy(userId)
                .build();
        RoomDTO dto = roomService.createRoom(room);
        log.info("[API] POST /api/admin/rooms ✓ - roomId={} code={}", dto.getId(), dto.getRegistrationCode());
        return ResponseEntity.ok(dto);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
