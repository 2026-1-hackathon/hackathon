package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.MemberPreference;

public interface MemberPreferenceRepository
        extends JpaRepository<MemberPreference, Long> {
}