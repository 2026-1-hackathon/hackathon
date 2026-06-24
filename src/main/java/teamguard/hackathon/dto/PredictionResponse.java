package teamguard.hackathon.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PredictionResponse(
        int conflictRisk,
        int scheduleRisk,
        int deadlineRisk,
        List<String> riskFactors,
        List<String> recommendations
) {
}
