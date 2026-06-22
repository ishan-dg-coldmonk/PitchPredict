package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaderboardEntry {
    private Integer rank;
    private Long userId;
    private String username;
    private String profilePic;
    private Integer totalPoints;
    private Long matchesPredicted;
    private Long exactScores;
    private Long correctOutcomes;
}
