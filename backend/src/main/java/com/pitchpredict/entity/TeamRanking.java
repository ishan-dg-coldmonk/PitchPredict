package com.pitchpredict.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * FIFA world ranking for a national team, keyed by TLA (3-letter code that
 * football-data.org already provides, e.g. BRA, MEX). Seeded once on startup;
 * rankings barely move mid-tournament. Used as a signal for AI score suggestions.
 */
@Entity
@Table(name = "team_rankings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamRanking {

    @Id
    @Column(length = 10)
    private String tla;

    private int fifaRank;

    private int fifaPoints;
}
