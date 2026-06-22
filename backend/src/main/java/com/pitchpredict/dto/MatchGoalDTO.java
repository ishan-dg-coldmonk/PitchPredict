package com.pitchpredict.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchGoalDTO {
    private Integer minute;
    private Integer injuryTime;
    private String type;
    private String teamName;
    private String scorerName;
    private String assistName;
}
