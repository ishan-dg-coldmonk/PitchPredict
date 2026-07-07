package com.pitchpredict.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ScorerDTO {
    private String playerName;
    private String playerNationality;
    private String teamName;
    private String teamTla;
    private String teamCrest;
    private int goals;
    private int assists;
    private Integer penalties;
    private int playedMatches;
}
