package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Task;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByRoleRoomIdOrderByDeadlineAsc(Long roomId);

    List<Task> findByRoleIdOrderByDeadlineAsc(Long roleId);
}