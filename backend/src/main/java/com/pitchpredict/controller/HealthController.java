package com.pitchpredict.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight liveness endpoint. Returns 200 without touching the database, so an
 * external uptime pinger (e.g. UptimeRobot) can keep a free-tier host awake and
 * confirm the app is up — cheaply, without waking the DB on every ping.
 */
@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
