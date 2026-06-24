package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {
}