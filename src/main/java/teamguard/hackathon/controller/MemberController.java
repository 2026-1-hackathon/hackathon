package teamguard.hackathon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import teamguard.hackathon.domain.*;
import teamguard.hackathon.dto.CreateMemberRequest;
import teamguard.hackathon.repository.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class MemberController {

    private final RoomRepository roomRepository;
    private final RoleRepository roleRepository;
    private final MemberRepository memberRepository;
    private final MemberSkillRepository memberSkillRepository;
    private final MemberPreferenceRepository memberPreferenceRepository;

    @PostMapping("/invite/{inviteCode}/members")
    @Transactional
    public Map<String, Object> createMember(
            @PathVariable String inviteCode,
            @RequestBody CreateMemberRequest request
    ) {
        Room room = roomRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "방을 찾을 수 없습니다."
                ));

        Member member = Member.builder()
                .name(request.name())
                .availableHours(request.availableHours())
                .room(room)
                .build();

        memberRepository.save(member);

        if (request.skills() != null) {
            for (CreateMemberRequest.SkillRequest skill : request.skills()) {
                memberSkillRepository.save(
                        MemberSkill.builder()
                                .skillName(skill.skillName())
                                .level(skill.level())
                                .member(member)
                                .build()
                );
            }
        }

        if (request.preferences() != null) {
            for (CreateMemberRequest.PreferenceRequest preference
                    : request.preferences()) {

                Role role = roleRepository.findById(preference.roleId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "역할을 찾을 수 없습니다."
                        ));

                if (!role.getRoom().getId().equals(room.getId())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "해당 방의 역할이 아닙니다."
                    );
                }

                memberPreferenceRepository.save(
                        MemberPreference.builder()
                                .member(member)
                                .role(role)
                                .score(preference.score())
                                .build()
                );
            }
        }

        return Map.of(
                "memberId", member.getId(),
                "name", member.getName(),
                "roomId", room.getId()
        );
    }
}