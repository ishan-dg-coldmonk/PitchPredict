package com.pitchpredict.repository;

import com.pitchpredict.entity.TeamRanking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TeamRankingRepository extends JpaRepository<TeamRanking, String> {
    Optional<TeamRanking> findByTla(String tla);
}
