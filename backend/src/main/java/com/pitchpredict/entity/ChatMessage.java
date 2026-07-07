package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A single chat message posted inside a room.
 *
 * We store a snapshot of the sender's username (so the message still reads
 * sensibly even if the account is later deleted) but NOT their profile picture —
 * avatars are resolved from the User table at read time so they stay current and
 * we don't duplicate large base64 blobs on every row.
 */
@Entity
@Table(name = "chat_messages",
        indexes = @Index(name = "idx_chat_room_id", columnList = "roomId, id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long roomId;

    @Column(nullable = false)
    private Long userId;

    /** Snapshot of the sender's username at send time. */
    @Column(length = 50, nullable = false)
    private String username;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
