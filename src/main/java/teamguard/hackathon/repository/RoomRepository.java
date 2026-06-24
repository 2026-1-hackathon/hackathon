package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Room;

public interface RoomRepository extends JpaRepository<Room, Long> {
}