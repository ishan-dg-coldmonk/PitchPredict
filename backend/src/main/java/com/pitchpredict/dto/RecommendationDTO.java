package com.pitchpredict.dto;

import lombok.*;

/** AI score suggestion + pre-match commentary sent to the prediction modal. */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RecommendationDTO {
    private Integer homeScore;
    private Integer awayScore;
    private Integer penaltyHome;
    private Integer penaltyAway;
    private String rationale;
    private String commentary;
    private Integer confidence;
}
