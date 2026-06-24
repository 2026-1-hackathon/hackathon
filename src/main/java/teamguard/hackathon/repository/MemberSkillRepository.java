package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.MemberSkill;

import java.util.List;
import java.util.Optional;

public interface MemberSkillRepository
        extends JpaRepository<MemberSkill, Long> {

    List<MemberSkill> findByMemberId(Long memberId);

    Optional<MemberSkill> findFirstByMemberIdAndSkillNameIgnoreCase(
            Long memberId,
            String skillName
    );
}