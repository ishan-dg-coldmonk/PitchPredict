package com.pitchpredict.repository;

import com.pitchpredict.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByEventId(Long eventId);
    long countByEventId(Long eventId);
    Optional<Room> findByEventIdAndRegistrationCode(Long eventId, String registrationCode);
}
