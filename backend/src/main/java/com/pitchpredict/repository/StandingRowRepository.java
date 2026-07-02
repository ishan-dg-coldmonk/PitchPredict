package com.pitchpredict.repository;

import com.pitchpredict.entity.StandingRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StandingRowRepository extends JpaRepository<StandingRow, Long> {

    List<StandingRow> findByEventIdOrderByGroupNameAscPositionAsc(Long eventId);

    void deleteByEventId(Long eventId);
}
