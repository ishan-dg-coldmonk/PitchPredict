package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "predictions", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "matchId", "roomId"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long matchId;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long roomId;

    @Column(nullable = false)
    private Integer predictedHomeScore;

    @Column(nullable = false)
    private Integer predictedAwayScore;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 0;

    @Builder.Default
    private Integer basePoints = 0;

    @Builder.Default
    private Integer outcomeBonus = 0;

    @Builder.Default
    private Integer gdBonus = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
