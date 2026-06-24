package teamguard.hackathon.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CreateRoomRequest(
        String title,
        String topic,
        int skillWeight,
        int timeWeight,
        int preferenceWeight,
        LocalDateTime deadline,
        List<RoleRequest> roles
) {
    public record RoleRequest(
            String name,
            int workload,
            String description
    ) {
    }
}