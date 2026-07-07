package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Cached AI score suggestion for a single match (per-match, shared by all users).
 * Regenerated when either team has played a new match since it was created
 * (tracked via basisPlayedCount) so the suggestion always reflects current form.
 */
@Entity
@Table(name = "match_recommendations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long matchId;

    private Integer homeScore;
    private Integer awayScore;

    /** Suggested shootout result for a knockout tie (nullable otherwise). */
    private Integer penaltyHome;
    private Integer penaltyAway;

    @Column(columnDefinition = "TEXT")
    private String rationale;

    @Column(columnDefinition = "TEXT")
    private String commentary;

    private Integer confidence;

    /** Combined matches-played of both teams when this was generated (freshness key). */
    private Integer basisPlayedCount;

    private LocalDateTime createdAt;
}
