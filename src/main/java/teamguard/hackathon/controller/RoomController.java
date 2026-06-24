package teamguard.hackathon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import teamguard.hackathon.domain.Role;
import teamguard.hackathon.domain.Room;
import teamguard.hackathon.dto.CreateRoomRequest;
import teamguard.hackathon.repository.RoleRepository;
import teamguard.hackathon.repository.RoomRepository;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomRepository roomRepository;
    private final RoleRepository roleRepository;

    @PostMapping
    @Transactional
    public Map<String, Object> createRoom(
            @RequestBody CreateRoomRequest request
    ) {
        validateWeights(request);

        String inviteCode = UUID.randomUUID()
                .toString()
                .substring(0, 8);

        Room room = Room.builder()
                .title(request.title())
                .topic(request.topic())
                .inviteCode(inviteCode)
                .skillWeight(request.skillWeight())
                .timeWeight(request.timeWeight())
                .preferenceWeight(request.preferenceWeight())
                .deadline(request.deadline())
                .build();

        roomRepository.save(room);

        if (request.roles() != null) {
            for (CreateRoomRequest.RoleRequest roleRequest : request.roles()) {
                Role role = Role.builder()
                        .name(roleRequest.name())
                        .workload(roleRequest.workload())
                        .description(roleRequest.description())
                        .room(room)
                        .build();

                roleRepository.save(role);
            }
        }

        return Map.of(
                "roomId", room.getId(),
                "inviteCode", room.getInviteCode()
        );
    }

    private void validateWeights(CreateRoomRequest request) {
        if (request.skillWeight() < 0
                || request.timeWeight() < 0
                || request.preferenceWeight() < 0) {
            throw new IllegalArgumentException("가중치는 음수일 수 없습니다.");
        }

        int total = request.skillWeight()
                + request.timeWeight()
                + request.preferenceWeight();

        if (total == 0) {
            throw new IllegalArgumentException(
                    "가중치 중 하나는 0보다 커야 합니다."
            );
        }
    }
}