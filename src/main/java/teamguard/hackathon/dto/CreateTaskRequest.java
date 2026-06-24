package teamguard.hackathon.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record CreateTaskRequest(

        @NotBlank(message = "업무명을 입력해야 합니다.")
        String title,

        String description,

        @Min(value = 1, message = "예상 작업시간은 1시간 이상이어야 합니다.")
        int estimatedHours,

        @NotNull(message = "업무 기한을 입력해야 합니다.")
        LocalDateTime deadline
) {
}