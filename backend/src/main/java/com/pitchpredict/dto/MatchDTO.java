package com.pitchpredict.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchDTO {
    private Long id;
    private Long eventId;
    private Long externalMatchId;
    private String homeTeam;
    private String awayTeam;
    private String homeFlag;
    private String awayFlag;
    private String homeCrest;
    private String awayCrest;
    private Integer homeScore;
    private Integer awayScore;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime matchDate;
    private String stage;
    private String groupName;
    private String venue;
    private String status;

    /**
     * Computed dynamically in MatchService.toDTO().
     * True when: status == SCHEDULED and now < matchDate - 5 minutes.
     * Never stored in the database.
     */
    private Boolean predictionOpen;

    private List<MatchGoalDTO> goals;
}
