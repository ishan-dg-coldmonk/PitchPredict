package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One persisted top-scorer row for an event. Populated from the football API's
 * /competitions/{id}/scorers (which carries goals AND assists), refreshed daily.
 * Both the Scorers and Assists boards are derived from these rows.
 */
@Entity
@Table(name = "scorers", indexes = @Index(name = "idx_scorers_event", columnList = "eventId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScorerRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    @Column(length = 100)
    private String playerName;

    @Column(length = 80)
    private String playerNationality;

    @Column(length = 100)
    private String teamName;

    @Column(length = 10)
    private String teamTla;

    @Column(length = 255)
    private String teamCrest;

    private int goals;
    private int assists;
    private Integer penalties;
    private int playedMatches;

    private LocalDateTime lastUpdated;
}
