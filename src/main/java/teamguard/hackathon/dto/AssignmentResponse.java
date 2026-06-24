package teamguard.hackathon.dto;

import teamguard.hackathon.domain.Assignment;

public record AssignmentResponse(
        Long assignmentId,
        Long memberId,
        String memberName,
        Long roleId,
        String roleName,
        double skillScore,
        double timeScore,
        double preferenceScore,
        double totalScore
) {

    public static AssignmentResponse from(Assignment assignment) {
        return new AssignmentResponse(
                assignment.getId(),
                assignment.getMember().getId(),
                assignment.getMember().getName(),
                assignment.getRole().getId(),
                assignment.getRole().getName(),
                assignment.getSkillScore(),
                assignment.getTimeScore(),
                assignment.getPreferenceScore(),
                assignment.getTotalScore()
        );
    }
}