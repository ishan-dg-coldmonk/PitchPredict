package com.pitchpredict.dto;

import lombok.*;

import java.util.List;

/**
 * A single standings table. For group tournaments (e.g. World Cup) there is one
 * per group ("Group A", "Group B", …). For leagues/knockouts, group is null and
 * there is a single table.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StandingsGroupDTO {
    private String group;
    private List<StandingRowDTO> table;
}
