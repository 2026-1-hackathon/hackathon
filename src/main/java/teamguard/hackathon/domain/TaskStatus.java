package teamguard.hackathon.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TaskStatus {

    NOT_STARTED("미완료"),
    IN_PROGRESS("진행중"),
    DONE("완료");

    private final String label;
}