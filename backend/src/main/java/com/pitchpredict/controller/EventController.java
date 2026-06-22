package com.pitchpredict.controller;

import com.pitchpredict.dto.EventDTO;
import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.service.EventService;
import com.pitchpredict.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<List<EventDTO>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDTO> getEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEvent(id));
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<List<MatchDTO>> getEventMatches(@PathVariable Long id) {
        return ResponseEntity.ok(matchService.getMatchesByEvent(id));
    }
}
