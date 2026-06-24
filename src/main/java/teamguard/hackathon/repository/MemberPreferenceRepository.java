package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.MemberPreference;

import java.util.List;
import java.util.Optional;

public interface MemberPreferenceRepository
        extends JpaRepository<MemberPreference, Long> {

    List<MemberPreference> findByMemberId(Long memberId);

    Optional<MemberPreference> findByMemberIdAndRoleId(
            Long memberId,
            Long roleId
    );
}