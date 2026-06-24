package teamguard.hackathon.dto;

import teamguard.hackathon.domain.Task;
import teamguard.hackathon.domain.TaskStatus;

import java.time.LocalDateTime;

public record TaskResponse(
        Long taskId,
        Long roomId,
        Long roleId,
        String roleName,
        String title,
        String description,
        int estimatedHours,
        LocalDateTime deadline,
        TaskStatus status,
        String statusLabel,
        boolean overdue
) {

    public static TaskResponse from(Task task) {
        boolean overdue =
                task.getStatus() != TaskStatus.DONE
                        && task.getDeadline().isBefore(LocalDateTime.now());

        return new TaskResponse(
                task.getId(),
                task.getRole().getRoom().getId(),
                task.getRole().getId(),
                task.getRole().getName(),
                task.getTitle(),
                task.getDescription(),
                task.getEstimatedHours(),
                task.getDeadline(),
                task.getStatus(),
                task.getStatus().getLabel(),
                overdue
        );
    }
}