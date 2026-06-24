package teamguard.hackathon.dto;

import java.util.List;

public record MemberResponse(
        Long memberId,
        String name,
        int availableHours,
        List<SkillResponse> skills,
        List<PreferenceResponse> preferences
) {

    public record SkillResponse(
            String skillName,
            int level
    ) {
    }

    public record PreferenceResponse(
            Long roleId,
            String roleName,
            int score
    ) {
    }
}