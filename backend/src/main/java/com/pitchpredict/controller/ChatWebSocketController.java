package com.pitchpredict.controller;

import com.pitchpredict.dto.ChatMessageRequest;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handles inbound chat SEND frames: SEND /app/chat/{roomId} with body { content }.
 * The sender's identity comes solely from the authenticated Principal set by the
 * STOMP auth interceptor — never from the message body. Persist + broadcast is
 * delegated to ChatService (which enforces membership, validation and rate limits).
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatService chatService;

    @MessageMapping("/chat/{roomId}")
    public void handleChat(@DestinationVariable Long roomId,
                           @Payload ChatMessageRequest request,
                           Principal principal) {
        if (principal == null) {
            log.warn("[WS] Dropped chat SEND to room {} — unauthenticated session", roomId);
            return; // interceptor allows anonymous CONNECT; writes require identity
        }
        try {
            chatService.postMessage(roomId, principal.getName(),
                    request == null ? null : request.getContent());
        } catch (ApiException e) {
            // e.g. non-member or unknown room — drop silently (client is gated too)
            log.warn("[WS] Chat SEND rejected for {} in room {}: {}",
                    principal.getName(), roomId, e.getMessage());
        }
    }
}
