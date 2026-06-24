package teamguard.hackathon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import teamguard.hackathon.domain.Member;

import java.util.List;

public interface MemberRepository extends JpaRepository<Member, Long> {

    List<Member> findByRoomIdOrderByIdAsc(Long roomId);
}