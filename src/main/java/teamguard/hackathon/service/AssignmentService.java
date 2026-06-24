package teamguard.hackathon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import teamguard.hackathon.domain.Assignment;
import teamguard.hackathon.domain.Member;
import teamguard.hackathon.domain.MemberPreference;
import teamguard.hackathon.domain.Role;
import teamguard.hackathon.domain.Room;
import teamguard.hackathon.dto.AssignmentResponse;
import teamguard.hackathon.repository.AssignmentRepository;
import teamguard.hackathon.repository.MemberPreferenceRepository;
import teamguard.hackathon.repository.MemberRepository;
import teamguard.hackathon.repository.MemberSkillRepository;
import teamguard.hackathon.repository.RoleRepository;
import teamguard.hackathon.repository.RoomRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final RoomRepository roomRepository;
    private final RoleRepository roleRepository;
    private final MemberRepository memberRepository;
    private final MemberSkillRepository memberSkillRepository;
    private final MemberPreferenceRepository memberPreferenceRepository;
    private final AssignmentRepository assignmentRepository;

    /**
     * 역할 자동 분배
     *
     * 규칙:
     * 1. 모든 역할에 최소 1명을 배정한다.
     * 2. 모든 팀원은 정확히 하나의 역할을 배정받는다.
     * 3. 남은 팀원은 가장 점수가 높은 역할에 배정한다.
     * 4. 하나의 역할에 여러 명이 배정될 수 있다.
     */
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

        /*
         * 역할마다 최소 1명을 배정해야 하므로
         * 팀원 수가 역할 수보다 적으면 배정할 수 없습니다.
         */
        if (members.size() < roles.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "모든 역할에 최소 1명을 배정하려면 "
                            + "팀원 수가 역할 수 이상이어야 합니다."
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

        /*
         * 사용자가 6, 6, 2처럼 입력해도
         * 6/14, 6/14, 2/14로 자동 정규화합니다.
         */
        double normalizedSkillWeight =
                room.getSkillWeight() / weightTotal;

        double normalizedTimeWeight =
                room.getTimeWeight() / weightTotal;

        double normalizedPreferenceWeight =
                room.getPreferenceWeight() / weightTotal;

        /*
         * 역할 분배를 다시 실행하면
         * 이전 배정 결과를 제거합니다.
         */
        assignmentRepository.deleteByRoomId(roomId);
        assignmentRepository.flush();

        Set<Long> assignedMemberIds = new HashSet<>();
        List<AssignmentResponse> results = new ArrayList<>();

        /*
         * 1단계:
         * 모든 역할에 최소 1명씩 배정합니다.
         *
         * 업무량이 큰 역할부터 처리하고,
         * 아직 배정되지 않은 사람 중 해당 역할 점수가
         * 가장 높은 팀원을 선택합니다.
         */
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
                    .max(candidateComparator())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "배정 가능한 팀원이 없습니다."
                    ));

            AssignmentResponse response =
                    saveAssignment(room, bestCandidate);

            assignedMemberIds.add(bestCandidate.member().getId());
            results.add(response);
        }

        /*
         * 2단계:
         * 아직 배정되지 않은 모든 팀원을
         * 자신에게 가장 점수가 높은 역할로 배정합니다.
         *
         * 이 단계에서는 한 역할에 여러 명이 들어갈 수 있습니다.
         */
        for (Member member : members) {
            if (assignedMemberIds.contains(member.getId())) {
                continue;
            }

            Candidate bestCandidate = roles.stream()
                    .map(role -> calculateCandidate(
                            member,
                            role,
                            normalizedSkillWeight,
                            normalizedTimeWeight,
                            normalizedPreferenceWeight
                    ))
                    .max(candidateComparator())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "배정 가능한 역할이 없습니다."
                    ));

            AssignmentResponse response =
                    saveAssignment(room, bestCandidate);

            assignedMemberIds.add(member.getId());
            results.add(response);
        }

        return results;
    }

    /**
     * 저장된 역할 배정 결과 조회
     */
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

    /**
     * 실제 배정 결과를 DB에 저장합니다.
     */
    private AssignmentResponse saveAssignment(
            Room room,
            Candidate candidate
    ) {
        Assignment assignment = Assignment.builder()
                .room(room)
                .member(candidate.member())
                .role(candidate.role())
                .skillScore(round(candidate.skillScore()))
                .timeScore(round(candidate.timeScore()))
                .preferenceScore(round(candidate.preferenceScore()))
                .totalScore(round(candidate.totalScore()))
                .build();

        Assignment saved =
                assignmentRepository.save(assignment);

        return AssignmentResponse.from(saved);
    }

    /**
     * 후보 간 점수 비교 기준입니다.
     *
     * 우선순위:
     * 1. 최종 점수
     * 2. 역량 점수
     * 3. 선호도 점수
     * 4. 투자 가능 시간
     */
    private Comparator<Candidate> candidateComparator() {
        return Comparator
                .comparingDouble(Candidate::totalScore)
                .thenComparingDouble(Candidate::skillScore)
                .thenComparingDouble(Candidate::preferenceScore)
                .thenComparingInt(candidate ->
                        candidate.member().getAvailableHours()
                );
    }

    /**
     * 한 팀원이 특정 역할을 맡았을 때의 점수를 계산합니다.
     */
    private Candidate calculateCandidate(
            Member member,
            Role role,
            double skillWeight,
            double timeWeight,
            double preferenceWeight
    ) {
        /*
         * 현재 MVP 규칙:
         * 역할 이름과 개인 역량 이름이 같아야 합니다.
         *
         * 역할 이름: 백엔드
         * 개인 역량: 백엔드, level 5
         */
        double skillScore = memberSkillRepository
                .findFirstByMemberIdAndSkillNameIgnoreCase(
                        member.getId(),
                        role.getName()
                )
                .map(skill ->
                        clamp(skill.getLevel(), 1, 5)
                                / 5.0
                                * 100.0
                )
                .orElse(0.0);

        /*
         * 투자 가능 시간 / 역할 업무량
         *
         * 투자 가능 시간이 업무량 이상이면 100점입니다.
         */
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

        /*
         * 해당 역할의 선호도를 입력하지 않았다면
         * 기본값은 보통인 3점입니다.
         */
        int preference = memberPreferenceRepository
                .findByMemberIdAndRoleId(
                        member.getId(),
                        role.getId()
                )
                .map(MemberPreference::getScore)
                .orElse(3);

        preference = clamp(preference, 1, 5);

        /*
         * 선호도 1~5를 0~100으로 변환합니다.
         *
         * 1점 = 0점
         * 2점 = 25점
         * 3점 = 50점
         * 4점 = 75점
         * 5점 = 100점
         */
        double preferenceScore =
                (preference - 1) / 4.0 * 100.0;

        double totalScore =
                skillScore * skillWeight
                        + timeScore * timeWeight
                        + preferenceScore * preferenceWeight;

        return new Candidate(
                member,
                role,
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

    /**
     * 팀원과 역할 조합별 계산 결과
     */
    private record Candidate(
            Member member,
            Role role,
            double skillScore,
            double timeScore,
            double preferenceScore,
            double totalScore
    ) {
    }
}