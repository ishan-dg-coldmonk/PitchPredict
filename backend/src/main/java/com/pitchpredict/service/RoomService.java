package com.pitchpredict.service;

import com.pitchpredict.dto.RoomDTO;
import com.pitchpredict.dto.RoomMemberDTO;
import com.pitchpredict.entity.Room;
import com.pitchpredict.entity.RoomMember;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.RoomMemberRepository;
import com.pitchpredict.repository.RoomRepository;
import com.pitchpredict.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;

    public List<RoomDTO> getRoomsByEvent(Long eventId, Long userId) {
        log.info("[Room] getRoomsByEvent - eventId={} userId={}", eventId, userId);
        List<RoomDTO> rooms = roomRepository.findByEventId(eventId).stream()
                .map(room -> toDTO(room, userId))
                .toList();
        log.info("[Room] getRoomsByEvent ✓ - {} room(s) for event {}", rooms.size(), eventId);
        return rooms;
    }

    /** Admin: get all rooms for an event without user-join context */
    public List<RoomDTO> getRoomsForAdmin(Long eventId) {
        List<RoomDTO> rooms = roomRepository.findByEventId(eventId).stream()
                .map(room -> toDTO(room, null))
                .toList();
        log.info("[Room] getRoomsForAdmin - eventId={} → {} room(s)", eventId, rooms.size());
        return rooms;
    }

    /** Admin: get all members of a room with user details */
    public List<RoomMemberDTO> getRoomMembers(Long roomId) {
        log.info("[Room] getRoomMembers - roomId={}", roomId);
        List<RoomMember> members = roomMemberRepository.findByRoomId(roomId);
        List<RoomMemberDTO> dtos = members.stream()
                .map(rm -> {
                    User user = userRepository.findById(rm.getUserId()).orElse(null);
                    if (user == null) return null;
                    return RoomMemberDTO.builder()
                            .userId(user.getId())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .profilePic(user.getProfilePic())
                            .joinedAt(rm.getJoinedAt())
                            .build();
                })
                .filter(dto -> dto != null)
                .toList();
        log.info("[Room] getRoomMembers ✓ - roomId={} → {} member(s)", roomId, dtos.size());
        return dtos;
    }

    public RoomDTO getRoom(Long roomId, Long userId) {
        log.info("[Room] getRoom - roomId={} userId={}", roomId, userId);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> ApiException.notFound("Room not found"));
        RoomDTO dto = toDTO(room, userId);
        log.info("[Room] getRoom ✓ - roomId={} name={}", roomId, dto.getName());
        return dto;
    }

    public RoomDTO createRoom(Room room) {
        log.info("[Room] createRoom - name={} eventId={} code={}", room.getName(), room.getEventId(), room.getRegistrationCode());
        room = roomRepository.save(room);
        RoomDTO dto = toDTO(room, null);
        log.info("[Room] createRoom ✓ - roomId={}", dto.getId());
        return dto;
    }

    public RoomDTO joinRoom(Long eventId, String registrationCode, Long userId) {
        log.info("[Room] joinRoom - eventId={} userId={} code={}", eventId, userId, registrationCode);
        Room room = roomRepository.findByEventIdAndRegistrationCode(eventId, registrationCode)
                .orElseThrow(() -> ApiException.notFound("Invalid registration code"));

        if (roomMemberRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            log.warn("[Room] joinRoom REJECTED - already joined - userId={} roomId={}", userId, room.getId());
            throw ApiException.conflict("You have already joined this room");
        }

        if (room.getMaxMembers() != null) {
            long currentMembers = roomMemberRepository.countByRoomId(room.getId());
            if (currentMembers >= room.getMaxMembers()) {
                log.warn("[Room] joinRoom REJECTED - room full ({}/{}) - roomId={}",
                        currentMembers, room.getMaxMembers(), room.getId());
                throw ApiException.badRequest("Room is full");
            }
        }

        RoomMember member = RoomMember.builder()
                .roomId(room.getId())
                .userId(userId)
                .build();
        roomMemberRepository.save(member);
        log.info("[Room] joinRoom ✓ - userId={} joined roomId={} ({})", userId, room.getId(), room.getName());

        return toDTO(room, userId);
    }

    public List<RoomDTO> getMyRooms(Long userId) {
        log.info("[Room] getMyRooms - userId={}", userId);
        List<RoomMember> memberships = roomMemberRepository.findByUserId(userId);
        List<RoomDTO> rooms = memberships.stream()
                .map(rm -> {
                    Room room = roomRepository.findById(rm.getRoomId()).orElse(null);
                    return room != null ? toDTO(room, userId) : null;
                })
                .filter(dto -> dto != null)
                .toList();
        log.info("[Room] getMyRooms ✓ - userId={} → {} room(s)", userId, rooms.size());
        return rooms;
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
