package teamguard.hackathon.dto;

public record RoleRequest(
        String name,
        int workload,
        String description
) {
}
