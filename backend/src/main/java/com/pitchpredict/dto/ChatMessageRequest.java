package com.pitchpredict.dto;

import lombok.Data;

/** Inbound payload for a chat SEND frame: { "content": "..." }. */
@Data
public class ChatMessageRequest {
    private String content;
}
