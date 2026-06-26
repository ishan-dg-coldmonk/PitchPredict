package com.pitchpredict.controller;

import com.pitchpredict.dto.LeaderboardEntry;
import com.pitchpredict.dto.RoomDTO;
import com.pitchpredict.dto.RoomMemberDTO;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.service.LeaderboardService;
import com.pitchpredict.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomController {

    private final RoomService roomService;
    private final LeaderboardService leaderboardService;
    private final UserRepository userRepository;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<RoomDTO>> getRoomsByEvent(@PathVariable Long eventId,
                                                          Authentication authentication) {
        Long userId = getUserId(authentication);
        log.info("[API] GET /api/rooms/event/{} - userId={}", eventId, userId);
        List<RoomDTO> rooms = roomService.getRoomsByEvent(eventId, userId);
        log.info("[API] GET /api/rooms/event/{} ✓ - {} room(s)", eventId, rooms.size());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDTO> getRoom(@PathVariable Long roomId,
                                            Authentication authentication) {
        Long userId = getUserId(authentication);
        log.info("[API] GET /api/rooms/{} - userId={}", roomId, userId);
        RoomDTO room = roomService.getRoom(roomId, userId);
        log.info("[API] GET /api/rooms/{} ✓ - name={}", roomId, room.getName());
        return ResponseEntity.ok(room);
    }

    @PostMapping("/join")
    public ResponseEntity<RoomDTO> joinRoom(@RequestBody Map<String, Object> body,
                                             Authentication authentication) {
        Long eventId = Long.valueOf(body.get("eventId").toString());
        String code  = body.get("registrationCode").toString();
        Long userId  = getUserId(authentication);
        log.info("[API] POST /api/rooms/join - eventId={} userId={} code={}", eventId, userId, code);
        RoomDTO room = roomService.joinRoom(eventId, code, userId);
        log.info("[API] POST /api/rooms/join ✓ - roomId={} name={}", room.getId(), room.getName());
        return ResponseEntity.ok(room);
    }

    @GetMapping("/my")
    public ResponseEntity<List<RoomDTO>> getMyRooms(Authentication authentication) {
        Long userId = getUserId(authentication);
        log.info("[API] GET /api/rooms/my - userId={}", userId);
        List<RoomDTO> rooms = roomService.getMyRooms(userId);
        log.info("[API] GET /api/rooms/my ✓ - {} room(s)", rooms.size());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{roomId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard(@PathVariable Long roomId) {
        log.info("[API] GET /api/rooms/{}/leaderboard", roomId);
        List<LeaderboardEntry> lb = leaderboardService.getLeaderboard(roomId);
        log.info("[API] GET /api/rooms/{}/leaderboard ✓ - {} entries", roomId, lb.size());
        return ResponseEntity.ok(lb);
    }

    /** Returns the member list for a room — accessible to any authenticated member */
    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<RoomMemberDTO>> getMembers(@PathVariable Long roomId) {
        log.info("[API] GET /api/rooms/{}/members", roomId);
        List<RoomMemberDTO> members = roomService.getRoomMembers(roomId);
        log.info("[API] GET /api/rooms/{}/members ✓ - {} member(s)", roomId, members.size());
        return ResponseEntity.ok(members);
    }

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
