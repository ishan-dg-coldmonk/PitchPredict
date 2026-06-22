package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PredictionDTO {
    private Long id;
    private Long userId;
    private String username;
    private String profilePic;
    private Long matchId;
    private Long eventId;
    private Long roomId;
    private Integer predictedHomeScore;
    private Integer predictedAwayScore;
    private Integer points;
    private Integer basePoints;
    private Integer outcomeBonus;
    private Integer gdBonus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
