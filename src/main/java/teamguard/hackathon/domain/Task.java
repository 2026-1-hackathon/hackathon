package teamguard.hackathon.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int estimatedHours;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (status == null) {
            status = TaskStatus.NOT_STARTED;
        }

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void changeStatus(TaskStatus status) {
        this.status = status;
    }
}