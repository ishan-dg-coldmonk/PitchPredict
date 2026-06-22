package com.pitchpredict.service;

import com.pitchpredict.dto.RoomDTO;
import com.pitchpredict.entity.Room;
import com.pitchpredict.entity.RoomMember;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    public List<RoomDTO> getRoomsByEvent(Long eventId, Long userId) {
        return roomRepository.findByEventId(eventId).stream()
                .map(room -> toDTO(room, userId))
                .toList();
    }

    public RoomDTO getRoom(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> ApiException.notFound("Room not found"));
        return toDTO(room, userId);
    }

    public RoomDTO createRoom(Room room) {
        room = roomRepository.save(room);
        return toDTO(room, null);
    }

    public RoomDTO joinRoom(Long eventId, String registrationCode, Long userId) {
        Room room = roomRepository.findByEventIdAndRegistrationCode(eventId, registrationCode)
                .orElseThrow(() -> ApiException.notFound("Invalid registration code"));

        if (roomMemberRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            throw ApiException.conflict("You have already joined this room");
        }

        if (room.getMaxMembers() != null) {
            long currentMembers = roomMemberRepository.countByRoomId(room.getId());
            if (currentMembers >= room.getMaxMembers()) {
                throw ApiException.badRequest("Room is full");
            }
        }

        RoomMember member = RoomMember.builder()
                .roomId(room.getId())
                .userId(userId)
                .build();
        roomMemberRepository.save(member);

        return toDTO(room, userId);
    }

    public List<RoomDTO> getMyRooms(Long userId) {
        List<RoomMember> memberships = roomMemberRepository.findByUserId(userId);
        return memberships.stream()
                .map(rm -> {
                    Room room = roomRepository.findById(rm.getRoomId()).orElse(null);
                    return room != null ? toDTO(room, userId) : null;
                })
                .filter(dto -> dto != null)
                .toList();
    }

    private RoomDTO toDTO(Room room, Long userId) {
        return RoomDTO.builder()
                .id(room.getId())
                .eventId(room.getEventId())
                .name(room.getName())
                .description(room.getDescription())
                .registrationCode(room.getRegistrationCode())
                .maxMembers(room.getMaxMembers())
                .createdBy(room.getCreatedBy())
                .createdAt(room.getCreatedAt())
                .memberCount(roomMemberRepository.countByRoomId(room.getId()))
                .userJoined(userId != null && roomMemberRepository.existsByRoomIdAndUserId(room.getId(), userId))
                .build();
    }
}
