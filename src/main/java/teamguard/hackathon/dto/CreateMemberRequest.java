package teamguard.hackathon.dto;

import java.util.List;

public record CreateMemberRequest(
        String name,
        int availableHours,
        List<SkillRequest> skills,
        List<PreferenceRequest> preferences
) {

    public record SkillRequest(
            String skillName,
            int level
    ) {
    }

    public record PreferenceRequest(
            Long roleId,
            int score
    ) {
    }
}