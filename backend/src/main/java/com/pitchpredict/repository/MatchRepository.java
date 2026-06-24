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

    List<Match> findByPredictionOpenTrueAndStatus(MatchStatus status);

    /**
     * The core query for the scheduler.
     *
     * Returns all matches where:
     *   matchDate is between (now - lookbackHours) and (now + lookaheadMinutes)
     *   AND externalMatchId is not null (we need it to call the API)
     *   AND status is NOT already FINISHED, CANCELLED, or POSTPONED
     *       (no point polling a match that is conclusively done)
     *
     * The lookback window (e.g. 3 hours back) catches matches that:
     *   - kicked off and are still running (90 min + extra time + penalties can hit ~130 min)
     *   - kicked off but our DB still shows SCHEDULED (first poll will flip them to LIVE)
     *
     * The lookahead window (5 min forward) catches matches about to start,
     * so we begin polling before kickoff and detect the SCHEDULED → LIVE flip
     * immediately rather than waiting for the next scheduler tick after kickoff.
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
