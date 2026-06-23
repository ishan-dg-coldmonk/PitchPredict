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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final LeaderboardService leaderboardService;
    private final UserRepository userRepository;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<RoomDTO>> getRoomsByEvent(@PathVariable Long eventId,
                                                          Authentication authentication) {
        Long userId = getUserId(authentication);
        return ResponseEntity.ok(roomService.getRoomsByEvent(eventId, userId));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDTO> getRoom(@PathVariable Long roomId,
                                            Authentication authentication) {
        Long userId = getUserId(authentication);
        return ResponseEntity.ok(roomService.getRoom(roomId, userId));
    }

    @PostMapping("/join")
    public ResponseEntity<RoomDTO> joinRoom(@RequestBody Map<String, Object> body,
                                             Authentication authentication) {
        Long eventId = Long.valueOf(body.get("eventId").toString());
        String code  = body.get("registrationCode").toString();
        Long userId  = getUserId(authentication);
        return ResponseEntity.ok(roomService.joinRoom(eventId, code, userId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<RoomDTO>> getMyRooms(Authentication authentication) {
        Long userId = getUserId(authentication);
        return ResponseEntity.ok(roomService.getMyRooms(userId));
    }

    @GetMapping("/{roomId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard(@PathVariable Long roomId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(roomId));
    }

    /** Returns the member list for a room — accessible to any authenticated member */
    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<RoomMemberDTO>> getMembers(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomMembers(roomId));
    }

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
