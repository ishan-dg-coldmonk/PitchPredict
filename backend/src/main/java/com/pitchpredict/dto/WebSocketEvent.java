package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generic wrapper sent over WebSocket to the frontend.
 *
 * type values:
 *   MATCH_UPDATED       — score changed while live
 *   MATCH_LIVE          — status flipped to LIVE
 *   MATCH_FINISHED      — status flipped to FINISHED
 *   LEADERBOARD_UPDATED — points recalculated after a match finishes
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WebSocketEvent {

    public enum Type {
        MATCH_UPDATED,
        MATCH_LIVE,
        MATCH_FINISHED,
        LEADERBOARD_UPDATED
    }

    private Type type;

    /** The actual payload — MatchDTO or List<LeaderboardEntry> serialised by Jackson */
    private Object payload;
}
