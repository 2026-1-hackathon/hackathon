package teamguard.hackathon.dto;

import jakarta.validation.constraints.NotNull;
import teamguard.hackathon.domain.TaskStatus;

public record UpdateTaskStatusRequest(

        @NotNull(message = "변경할 상태가 필요합니다.")
        TaskStatus status
) {
}