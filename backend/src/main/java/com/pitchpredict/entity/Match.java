package com.pitchpredict.entity;

import com.pitchpredict.enums.MatchStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "matches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    private Long externalMatchId;

    @Column(length = 100, nullable = false)
    private String homeTeam;

    @Column(length = 100, nullable = false)
    private String awayTeam;

    @Column(length = 10)
    private String homeFlag;

    @Column(length = 10)
    private String awayFlag;

    @Column(length = 255)
    private String homeCrest;

    @Column(length = 255)
    private String awayCrest;

    /**
     * The "rated" scoreline shown in the UI and scored against:
     *   REGULAR         → 90-minute score
     *   EXTRA_TIME      → end-of-extra-time score (fullTime)
     *   PENALTY_SHOOTOUT→ open-play draw (fullTime − penalties)
     */
    private Integer homeScore;

    private Integer awayScore;

    /** REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT (from football-data score.duration). */
    @Column(length = 20)
    private String duration;

    /** Shootout tally — set only when duration == PENALTY_SHOOTOUT. */
    private Integer penaltyHome;
    private Integer penaltyAway;

    @Column(nullable = false)
    private LocalDateTime matchDate;

    @Column(length = 50)
    private String stage;

    @Column(length = 10)
    private String groupName;

    @Column(length = 200)
    private String venue;

    @Column(columnDefinition = "TEXT")
    private String goalsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MatchStatus status = MatchStatus.SCHEDULED;

    /**
     * Guards against double points calculation if the scheduler fires twice
     * around the FINISHED transition (e.g. app restart mid-game).
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean pointsCalculated = false;

    private LocalDateTime lastUpdated;

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
