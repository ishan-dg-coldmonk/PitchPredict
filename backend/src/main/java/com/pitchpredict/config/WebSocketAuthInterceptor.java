package com.pitchpredict.config;

import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.security.JwtTokenProvider;
import com.pitchpredict.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;

/**
 * Authenticates and authorizes STOMP frames on the inbound channel.
 *
 *  • CONNECT   — reads the "Authorization: Bearer <jwt>" native header and, if
 *                valid, binds the authenticated user to the WebSocket session.
 *                Best-effort: an unauthenticated CONNECT is still allowed so the
 *                existing public read-only topics keep working; write/private
 *                topics are gated below.
 *  • SUBSCRIBE — for /topic/chat/{roomId}, only room members may subscribe, so a
 *                non-member can't even read a room's chat.
 *
 * Because the Principal is set on CONNECT, every later frame (SUBSCRIBE, SEND)
 * and every @MessageMapping handler can trust {@code accessor.getUser()} /
 * {@code Principal} for the sender's identity — clients can't spoof it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;

    private static final String CHAT_PREFIX = "/topic/chat/";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command) && !authorizeSubscribe(accessor)) {
            // Drop the frame instead of throwing: throwing would emit a STOMP
            // ERROR frame and close the whole socket (killing the user's match /
            // leaderboard subscriptions too). Returning null just prevents this
            // one chat subscription — no messages are ever delivered to them.
            return null;
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String bearer = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(bearer) || !bearer.startsWith("Bearer ")) {
            log.debug("[WS-Auth] CONNECT without bearer token — proceeding unauthenticated");
            return;
        }
        String token = bearer.substring(7);
        if (!tokenProvider.validateToken(token)) {
            log.warn("[WS-Auth] CONNECT with invalid/expired token — proceeding unauthenticated");
            return;
        }
        String username = tokenProvider.getUsernameFromToken(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        accessor.setUser(auth);
        log.debug("[WS-Auth] CONNECT authenticated as {}", username);
    }

    /** @return true if the SUBSCRIBE is allowed (non-chat topics always are). */
    private boolean authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(CHAT_PREFIX)) {
            return true; // only chat topics are membership-gated; others stay public
        }

        Long roomId = parseRoomId(destination);
        Principal principal = accessor.getUser();
        boolean allowed = roomId != null && principal != null && isMember(roomId, principal.getName());
        if (!allowed) {
            log.warn("[WS-Auth] SUBSCRIBE denied for {} → {}",
                    principal == null ? "anonymous" : principal.getName(), destination);
        }
        return allowed;
    }

    private boolean isMember(Long roomId, String username) {
        return userRepository.findByUsername(username)
                .map(u -> roomMemberRepository.existsByRoomIdAndUserId(roomId, u.getId()))
                .orElse(false);
    }

    private Long parseRoomId(String destination) {
        try {
            return Long.valueOf(destination.substring(CHAT_PREFIX.length()));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
