package com.pitchpredict.service;

import com.pitchpredict.dto.ChatMessageDTO;
import com.pitchpredict.entity.ChatMessage;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.ChatMessageRepository;
import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.RoomRepository;
import com.pitchpredict.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Chat domain logic: history reads, message posting, validation and a
 * lightweight anti-spam rate limiter. Membership is enforced on every path so
 * a user can only read or write in rooms they've actually joined.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;

    /** Hard cap on stored message length; longer input is trimmed to this. */
    public static final int MAX_CONTENT_LENGTH = 1000;
    private static final int DEFAULT_LIMIT = 40;
    private static final int MAX_LIMIT = 100;

    // ── Rate limiter: max RATE_MAX messages per RATE_WINDOW_MS, per user ──────
    private static final int RATE_MAX = 5;
    private static final long RATE_WINDOW_MS = 5_000L;
    private final Map<Long, Deque<Long>> recentSends = new ConcurrentHashMap<>();

    // ── History ───────────────────────────────────────────────────────────────

    /**
     * Returns a page of messages in chronological (oldest→newest) order.
     * @param before cursor — return messages with id < before (for "load older"); null = latest page
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getHistory(Long roomId, Long userId, Long before, Integer limit) {
        requireMembership(roomId, userId);

        int size = (limit == null || limit <= 0) ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        PageRequest page = PageRequest.of(0, size);

        List<ChatMessage> rows = (before == null)
                ? chatMessageRepository.findByRoomIdOrderByIdDesc(roomId, page)
                : chatMessageRepository.findByRoomIdAndIdLessThanOrderByIdDesc(roomId, before, page);

        // Query is newest-first for the cursor; flip to chronological for display.
        Collections.reverse(rows);
        return toDTOs(rows);
    }

    // ── Posting ─────────────────────────────────────────────────────────────

    /**
     * Validates, persists and broadcasts a message from {@code username}.
     * Returns the saved DTO, or {@code null} if the message was dropped
     * (blank content or rate-limited) so callers can no-op silently.
     */
    @Transactional
    public ChatMessageDTO postMessage(Long roomId, String username, String rawContent) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        requireMembership(roomId, sender.getId());

        String content = normalize(rawContent);
        if (content.isEmpty()) {
            log.debug("[Chat] Dropped blank message from {} in room {}", username, roomId);
            return null;
        }
        if (isRateLimited(sender.getId())) {
            log.warn("[Chat] Rate-limited {} in room {}", username, roomId);
            return null;
        }

        ChatMessage saved = chatMessageRepository.save(ChatMessage.builder()
                .roomId(roomId)
                .userId(sender.getId())
                .username(sender.getUsername())
                .content(content)
                .build());

        ChatMessageDTO dto = toDTO(saved);
        webSocketService.broadcastChatMessage(dto);
        log.info("[Chat] {} posted in room {} (msg {})", username, roomId, saved.getId());
        return dto;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void requireMembership(Long roomId, Long userId) {
        if (!roomRepository.existsById(roomId)) {
            throw ApiException.notFound("Room not found");
        }
        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw ApiException.forbidden("Join this room to access its chat");
        }
    }

    private String normalize(String raw) {
        if (raw == null) return "";
        String trimmed = raw.strip();
        if (trimmed.length() > MAX_CONTENT_LENGTH) {
            trimmed = trimmed.substring(0, MAX_CONTENT_LENGTH);
        }
        return trimmed;
    }

    private boolean isRateLimited(Long userId) {
        long now = System.currentTimeMillis();
        Deque<Long> stamps = recentSends.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (stamps) {
            while (!stamps.isEmpty() && now - stamps.peekFirst() > RATE_WINDOW_MS) {
                stamps.pollFirst();
            }
            if (stamps.size() >= RATE_MAX) return true;
            stamps.addLast(now);
            return false;
        }
    }

    private List<ChatMessageDTO> toDTOs(List<ChatMessage> rows) {
        return rows.stream().map(this::toDTO).toList();
    }

    private ChatMessageDTO toDTO(ChatMessage m) {
        return ChatMessageDTO.builder()
                .id(m.getId())
                .roomId(m.getRoomId())
                .userId(m.getUserId())
                .username(m.getUsername())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
