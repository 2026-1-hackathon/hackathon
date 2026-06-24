package teamguard.hackathon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import teamguard.hackathon.dto.AssignmentResponse;
import teamguard.hackathon.service.AssignmentService;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping("/{roomId}/assignments")
    public List<AssignmentResponse> assignRoles(
            @PathVariable Long roomId
    ) {
        return assignmentService.assignRoles(roomId);
    }

    @GetMapping("/{roomId}/assignments")
    public List<AssignmentResponse> getAssignments(
            @PathVariable Long roomId
    ) {
        return assignmentService.getAssignments(roomId);
    }
}