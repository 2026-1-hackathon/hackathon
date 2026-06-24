package teamguard.hackathon.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false, unique = true)
    private String inviteCode;

    @Column(nullable = false)
    private int skillWeight;

    @Column(nullable = false)
    private int timeWeight;

    @Column(nullable = false)
    private int preferenceWeight;

    @Column(nullable = false)
    private LocalDateTime deadline;
}