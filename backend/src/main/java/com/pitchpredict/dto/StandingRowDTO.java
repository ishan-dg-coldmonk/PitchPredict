package com.pitchpredict.dto;

import lombok.*;

/** One row in a standings table — maps 1:1 to football-data.org standings[].table[] */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StandingRowDTO {
    private int position;
    private Long teamId;
    private String teamName;
    private String teamTla;
    private String teamCrest;
    private int playedGames;
    private int won;
    private int draw;
    private int lost;
    private int points;
    private int goalsFor;
    private int goalsAgainst;
    private int goalDifference;
}
