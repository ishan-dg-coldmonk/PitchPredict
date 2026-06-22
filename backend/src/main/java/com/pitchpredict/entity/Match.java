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

    private Integer homeScore;

    private Integer awayScore;

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

    @Column(nullable = false)
    @Builder.Default
    private Boolean predictionOpen = true;

    private LocalDateTime lastUpdated;

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
