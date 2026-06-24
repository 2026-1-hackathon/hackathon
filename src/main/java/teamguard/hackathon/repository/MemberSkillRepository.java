package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.MemberSkill;

public interface MemberSkillRepository
        extends JpaRepository<MemberSkill, Long> {
}