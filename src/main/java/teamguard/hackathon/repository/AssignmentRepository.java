package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Assignment;

import java.util.List;

public interface AssignmentRepository
        extends JpaRepository<Assignment, Long> {

    List<Assignment> findByRoomIdOrderByRoleIdAsc(Long roomId);

    void deleteByRoomId(Long roomId);
}