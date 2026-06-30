package com.pitchpredict.service;

import com.pitchpredict.dto.LeaderboardEntry;
import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.dto.WebSocketEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Central gateway for all backend → frontend WebSocket broadcasts.
 *
 * Topics:
 *   /topic/matches/{eventId}       — match score/status updates
 *   /topic/leaderboard/{roomId}    — leaderboard recalculations
 *
 * Frontend subscribes to the topics relevant to the page it has open.
 * Only sends a message when something actually changed (callers are
 * responsible for checking change before calling these methods).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    // ── Match broadcasts ─────────────────────────────────────────────────────

    public void broadcastMatchUpdated(MatchDTO matchDTO) {
        send("/topic/matches/" + matchDTO.getEventId(),
                WebSocketEvent.Type.MATCH_UPDATED, matchDTO);
    }

    public void broadcastMatchLive(MatchDTO matchDTO) {
        log.info("[WS] MATCH_LIVE → /topic/matches/{} │ {} vs {}",
                matchDTO.getEventId(), matchDTO.getHomeTeam(), matchDTO.getAwayTeam());
        send("/topic/matches/" + matchDTO.getEventId(),
                WebSocketEvent.Type.MATCH_LIVE, matchDTO);
    }

    public void broadcastMatchFinished(MatchDTO matchDTO) {
        log.info("[WS] MATCH_FINISHED → /topic/matches/{} │ {} {}-{} {}",
                matchDTO.getEventId(),
                matchDTO.getHomeTeam(), matchDTO.getHomeScore(),
                matchDTO.getAwayScore(), matchDTO.getAwayTeam());
        send("/topic/matches/" + matchDTO.getEventId(),
                WebSocketEvent.Type.MATCH_FINISHED, matchDTO);
    }

    // ── Leaderboard broadcasts ───────────────────────────────────────────────

    public void broadcastLeaderboardUpdated(Long roomId, List<LeaderboardEntry> entries) {
        log.info("[WS] LEADERBOARD_UPDATED → /topic/leaderboard/{} │ {} entries",
                roomId, entries.size());
        send("/topic/leaderboard/" + roomId,
                WebSocketEvent.Type.LEADERBOARD_UPDATED, entries);
    }

    // ── Internal helper ──────────────────────────────────────────────────────

    private void send(String destination, WebSocketEvent.Type type, Object payload) {
        try {
            WebSocketEvent event = WebSocketEvent.builder()
                    .type(type)
                    .payload(payload)
                    .build();
            log.info("[WS] PUSH → {} │ type={}", destination, type);
            messagingTemplate.convertAndSend(destination, event);
        } catch (Exception e) {
            log.warn("[WS] Failed to send {} to {}: {}", type, destination, e.getMessage());
        }
    }
}
