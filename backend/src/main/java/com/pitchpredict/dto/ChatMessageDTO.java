package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessageDTO {
    private Long id;
    private Long roomId;
    private Long userId;
    private String username;
    private String content;
    private LocalDateTime createdAt;
    // Note: no avatar here on purpose — clients resolve it from the room member
    // list by userId, so we never repeat a (potentially large) base64 image on
    // every single message broadcast.
}
