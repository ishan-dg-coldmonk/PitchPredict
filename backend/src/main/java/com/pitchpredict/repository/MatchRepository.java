package com.pitchpredict.repository;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByEventIdOrderByMatchDateAsc(Long eventId);
    List<Match> findByStatus(MatchStatus status);
    List<Match> findByStatusIn(List<MatchStatus> statuses);
    Optional<Match> findByExternalMatchId(Long externalMatchId);
    List<Match> findByPredictionOpenTrueAndStatus(MatchStatus status);
}
