package com.pitchpredict.repository;

import com.pitchpredict.entity.MatchRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MatchRecommendationRepository extends JpaRepository<MatchRecommendation, Long> {
    Optional<MatchRecommendation> findByMatchId(Long matchId);
}
