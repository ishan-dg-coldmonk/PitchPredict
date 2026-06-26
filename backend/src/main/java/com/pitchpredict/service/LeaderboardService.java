package com.pitchpredict.service;

import com.pitchpredict.dto.LeaderboardEntry;
import com.pitchpredict.entity.User;
import com.pitchpredict.repository.PredictionRepository;
import com.pitchpredict.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardService {

    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;

    public List<LeaderboardEntry> getLeaderboard(Long roomId) {
        log.info("[Leaderboard] getLeaderboard - roomId={}", roomId);
        List<Object[]> rows = predictionRepository.getLeaderboard(roomId);
        List<LeaderboardEntry> entries = new ArrayList<>();

        int rank = 1;
        for (Object[] row : rows) {
            Long userId = (Long) row[0];
            Long totalPoints = (Long) row[1];
            Long matchesPredicted = (Long) row[2];
            Long exactScores = (Long) row[3];
            Long correctOutcomes = (Long) row[4];

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            entries.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .userId(userId)
                    .username(user.getUsername())
                    .profilePic(user.getProfilePic())
                    .totalPoints(totalPoints.intValue())
                    .matchesPredicted(matchesPredicted)
                    .exactScores(exactScores)
                    .correctOutcomes(correctOutcomes)
                    .build());
        }

        log.info("[Leaderboard] getLeaderboard ✓ - roomId={} → {} entries", roomId, entries.size());
        return entries;
    }
}
