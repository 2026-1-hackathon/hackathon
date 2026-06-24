package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {
}