package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One persisted standings row for an event's competition.
 * Populated by the daily sync job (and the admin sync-standings endpoint);
 * the standings UI reads from this table, not from the football API.
 */
@Entity
@Table(name = "standings", indexes = @Index(name = "idx_standings_event", columnList = "eventId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StandingRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    /** "Group A" … for group tournaments; null for league/knockout tables. */
    @Column(length = 20)
    private String groupName;

    private int position;

    private Long teamId;

    @Column(length = 100)
    private String teamName;

    @Column(length = 10)
    private String teamTla;

    @Column(length = 255)
    private String teamCrest;

    private int playedGames;
    private int won;
    private int draw;
    private int lost;
    private int points;
    private int goalsFor;
    private int goalsAgainst;
    private int goalDifference;

    private LocalDateTime lastUpdated;
}
