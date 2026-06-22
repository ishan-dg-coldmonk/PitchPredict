package com.pitchpredict.repository;

import com.pitchpredict.entity.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    Optional<Prediction> findByUserIdAndMatchIdAndRoomId(Long userId, Long matchId, Long roomId);
    List<Prediction> findByUserIdAndEventIdAndRoomId(Long userId, Long eventId, Long roomId);
    List<Prediction> findByMatchIdAndRoomId(Long matchId, Long roomId);
    List<Prediction> findByMatchId(Long matchId);

    @Query("SELECT p.userId, SUM(p.points) as totalPoints, COUNT(p) as matchesPredicted, " +
           "SUM(CASE WHEN p.basePoints = 10 THEN 1 ELSE 0 END) as exactScores, " +
           "SUM(CASE WHEN p.outcomeBonus > 0 THEN 1 ELSE 0 END) as correctOutcomes " +
           "FROM Prediction p WHERE p.roomId = :roomId " +
           "GROUP BY p.userId ORDER BY totalPoints DESC")
    List<Object[]> getLeaderboard(@Param("roomId") Long roomId);
}
