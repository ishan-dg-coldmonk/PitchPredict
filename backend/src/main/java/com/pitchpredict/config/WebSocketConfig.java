package com.pitchpredict.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor authInterceptor;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Authenticates CONNECT frames and gates chat subscriptions to members.
        registration.interceptors(authInterceptor);
        log.info("[WS] Inbound auth interceptor registered");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Clients connect to ws://host/ws (or http://host/ws with SockJS)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // CORS for WebSocket — CorsConfig handles REST
                .withSockJS();                   // SockJS fallback for environments that block ws://
        log.info("[WS] STOMP endpoint registered: /ws (with SockJS)");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker for /topic destinations (pub-sub, one-to-many)
        registry.enableSimpleBroker("/topic");

        // Prefix for messages routed TO backend @MessageMapping methods (not used yet)
        registry.setApplicationDestinationPrefixes("/app");
        log.info("[WS] Simple broker enabled: /topic | App prefix: /app");
    }
}
