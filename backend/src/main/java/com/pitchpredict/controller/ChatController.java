package com.pitchpredict.controller;

import com.pitchpredict.dto.ChatMessageDTO;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** REST access to chat history (live messages arrive over WebSocket). */
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    /**
     * Chat history for a room, oldest→newest.
     * @param before optional cursor — return messages older than this id ("load more")
     * @param limit  page size (default 40, capped server-side)
     */
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getMessages(@PathVariable Long roomId,
                                                            @RequestParam(required = false) Long before,
                                                            @RequestParam(required = false) Integer limit,
                                                            Authentication authentication) {
        Long userId = getUserId(authentication);
        log.info("[API] GET /api/rooms/{}/messages - userId={} before={} limit={}", roomId, userId, before, limit);
        List<ChatMessageDTO> messages = chatService.getHistory(roomId, userId, before, limit);
        log.info("[API] GET /api/rooms/{}/messages ✓ - {} message(s)", roomId, messages.size());
        return ResponseEntity.ok(messages);
    }

    private Long getUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getId();
    }
}
