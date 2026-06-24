package teamguard.hackathon.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_assignment_room_member",
                        columnNames = {"room_id", "member_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(nullable = false)
    private double skillScore;

    @Column(nullable = false)
    private double timeScore;

    @Column(nullable = false)
    private double preferenceScore;

    @Column(nullable = false)
    private double totalScore;

    @Column(nullable = false)
    private LocalDateTime assignedAt;

    @PrePersist
    void prePersist() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }
}