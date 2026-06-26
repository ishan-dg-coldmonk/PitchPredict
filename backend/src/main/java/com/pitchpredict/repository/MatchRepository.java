package com.pitchpredict.repository;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByEventIdOrderByMatchDateAsc(Long eventId);

    List<Match> findByStatus(MatchStatus status);

    List<Match> findByStatusIn(List<MatchStatus> statuses);

    Optional<Match> findByExternalMatchId(Long externalMatchId);

    /**
     * Core scheduler query.
     *
     * Finds matches where:
     *   - matchDate is within [now - lookback, now + lookahead]
     *   - status is not FINISHED, CANCELLED, or POSTPONED
     *   - externalMatchId exists (needed to call the football API)
     *
     * Lookback (3h) covers matches that are still running.
     * Lookahead (15min) catches matches about to start.
     */
    @Query("SELECT m FROM Match m " +
           "WHERE m.externalMatchId IS NOT NULL " +
           "AND m.status NOT IN ('FINISHED', 'CANCELLED', 'POSTPONED') " +
           "AND m.matchDate BETWEEN :from AND :to")
    List<Match> findMatchesInActiveWindow(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );
}
