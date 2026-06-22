package com.pitchpredict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PitchPredictApplication {
    public static void main(String[] args) {
        SpringApplication.run(PitchPredictApplication.class, args);
    }
}
