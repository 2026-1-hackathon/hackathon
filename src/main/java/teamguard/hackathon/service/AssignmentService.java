package teamguard.hackathon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import teamguard.hackathon.domain.*;
import teamguard.hackathon.dto.AssignmentResponse;
import teamguard.hackathon.repository.*;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final RoomRepository roomRepository;
    private final RoleRepository roleRepository;
    private final MemberRepository memberRepository;
    private final MemberSkillRepository memberSkillRepository;
    private final MemberPreferenceRepository memberPreferenceRepository;
    private final AssignmentRepository assignmentRepository;

    @Transactional
    public List<AssignmentResponse> assignRoles(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "방을 찾을 수 없습니다."
                ));

        List<Role> roles = roleRepository.findByRoomId(roomId)
                .stream()
                .sorted(
                        Comparator.comparingInt(Role::getWorkload)
                                .reversed()
                )
                .toList();

        List<Member> members =
                memberRepository.findByRoomIdOrderByIdAsc(roomId);

        if (roles.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "등록된 역할이 없습니다."
            );
        }

        if (members.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "등록된 팀원이 없습니다."
            );
        }

        if (roles.size() > members.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "역할 수보다 팀원 수가 적습니다."
            );
        }

        double weightTotal =
                room.getSkillWeight()
                        + room.getTimeWeight()
                        + room.getPreferenceWeight();

        if (weightTotal <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "가중치 합은 0보다 커야 합니다."
            );
        }

        double normalizedSkillWeight =
                room.getSkillWeight() / weightTotal;

        double normalizedTimeWeight =
                room.getTimeWeight() / weightTotal;

        double normalizedPreferenceWeight =
                room.getPreferenceWeight() / weightTotal;

        // 다시 배정할 경우 기존 결과 제거
        assignmentRepository.deleteByRoomId(roomId);

        Set<Long> assignedMemberIds = new HashSet<>();
        List<AssignmentResponse> results = new ArrayList<>();

        for (Role role : roles) {
            Candidate bestCandidate = members.stream()
                    .filter(member ->
                            !assignedMemberIds.contains(member.getId())
                    )
                    .map(member -> calculateCandidate(
                            member,
                            role,
                            normalizedSkillWeight,
                            normalizedTimeWeight,
                            normalizedPreferenceWeight
                    ))
                    .max(
                            Comparator.comparingDouble(
                                            Candidate::totalScore
                                    )
                                    .thenComparingDouble(
                                            Candidate::skillScore
                                    )
                                    .thenComparingInt(candidate ->
                                            candidate.member()
                                                    .getAvailableHours()
                                    )
                    )
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "배정 가능한 팀원이 없습니다."
                    ));

            Assignment assignment = Assignment.builder()
                    .room(room)
                    .member(bestCandidate.member())
                    .role(role)
                    .skillScore(round(bestCandidate.skillScore()))
                    .timeScore(round(bestCandidate.timeScore()))
                    .preferenceScore(
                            round(bestCandidate.preferenceScore())
                    )
                    .totalScore(round(bestCandidate.totalScore()))
                    .build();

            Assignment saved =
                    assignmentRepository.save(assignment);

            assignedMemberIds.add(bestCandidate.member().getId());
            results.add(AssignmentResponse.from(saved));
        }

        return results;
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAssignments(Long roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "방을 찾을 수 없습니다."
            );
        }

        return assignmentRepository
                .findByRoomIdOrderByRoleIdAsc(roomId)
                .stream()
                .map(AssignmentResponse::from)
                .toList();
    }

    private Candidate calculateCandidate(
            Member member,
            Role role,
            double skillWeight,
            double timeWeight,
            double preferenceWeight
    ) {
        /*
         * MVP 규칙:
         * 역할 이름과 동일한 개인 역량을 조회합니다.
         *
         * 역할: "백엔드"
         * 개인 역량: {"skillName":"백엔드", "level":5}
         */
        double skillScore = memberSkillRepository
                .findFirstByMemberIdAndSkillNameIgnoreCase(
                        member.getId(),
                        role.getName()
                )
                .map(skill ->
                        clamp(skill.getLevel(), 1, 5) / 5.0 * 100.0
                )
                .orElse(0.0);

        double timeScore;

        if (role.getWorkload() <= 0) {
            timeScore = 100.0;
        } else {
            timeScore = Math.min(
                    member.getAvailableHours()
                            / (double) role.getWorkload(),
                    1.0
            ) * 100.0;
        }

        // 해당 역할 선호도를 입력하지 않았으면 보통인 3점 처리
        int preference = memberPreferenceRepository
                .findByMemberIdAndRoleId(
                        member.getId(),
                        role.getId()
                )
                .map(MemberPreference::getScore)
                .orElse(3);

        preference = clamp(preference, 1, 5);

        double preferenceScore =
                (preference - 1) / 4.0 * 100.0;

        double totalScore =
                skillScore * skillWeight
                        + timeScore * timeWeight
                        + preferenceScore * preferenceWeight;

        return new Candidate(
                member,
                skillScore,
                timeScore,
                preferenceScore,
                totalScore
        );
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record Candidate(
            Member member,
            double skillScore,
            double timeScore,
            double preferenceScore,
            double totalScore
    ) {
    }
}