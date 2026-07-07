package com.pitchpredict.repository;

import com.pitchpredict.entity.ScorerRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScorerRowRepository extends JpaRepository<ScorerRow, Long> {
    List<ScorerRow> findByEventId(Long eventId);
    void deleteByEventId(Long eventId);
}
