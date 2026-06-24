package teamguard.hackathon.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import teamguard.hackathon.domain.Role;
import teamguard.hackathon.domain.Task;
import teamguard.hackathon.dto.CreateTaskRequest;
import teamguard.hackathon.dto.TaskResponse;
import teamguard.hackathon.dto.UpdateTaskStatusRequest;
import teamguard.hackathon.repository.RoleRepository;
import teamguard.hackathon.repository.RoomRepository;
import teamguard.hackathon.repository.TaskRepository;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final RoomRepository roomRepository;
    private final RoleRepository roleRepository;
    private final TaskRepository taskRepository;

    /**
     * 특정 역할에 업무 추가
     */
    @PostMapping("/rooms/{roomId}/roles/{roleId}/tasks")
    @Transactional
    public TaskResponse createTask(
            @PathVariable Long roomId,
            @PathVariable Long roleId,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "방을 찾을 수 없습니다."
            );
        }

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "역할을 찾을 수 없습니다."
                ));

        if (!role.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "해당 방에 속한 역할이 아닙니다."
            );
        }

        Task task = Task.builder()
                .title(request.title())
                .description(request.description())
                .estimatedHours(request.estimatedHours())
                .deadline(request.deadline())
                .role(role)
                .build();

        Task saved = taskRepository.save(task);

        return TaskResponse.from(saved);
    }

    /**
     * 방의 전체 업무 목록 조회
     */
    @GetMapping("/rooms/{roomId}/tasks")
    @Transactional(readOnly = true)
    public List<TaskResponse> getRoomTasks(
            @PathVariable Long roomId
    ) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "방을 찾을 수 없습니다."
            );
        }

        return taskRepository
                .findByRoleRoomIdOrderByDeadlineAsc(roomId)
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    /**
     * 특정 역할의 업무 목록 조회
     */
    @GetMapping("/rooms/{roomId}/roles/{roleId}/tasks")
    @Transactional(readOnly = true)
    public List<TaskResponse> getRoleTasks(
            @PathVariable Long roomId,
            @PathVariable Long roleId
    ) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "역할을 찾을 수 없습니다."
                ));

        if (!role.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "해당 방에 속한 역할이 아닙니다."
            );
        }

        return taskRepository
                .findByRoleIdOrderByDeadlineAsc(roleId)
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    /**
     * 업무 상태 변경
     */
    @PatchMapping("/tasks/{taskId}/status")
    @Transactional
    public TaskResponse updateTaskStatus(
            @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request
    ) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "업무를 찾을 수 없습니다."
                ));

        task.changeStatus(request.status());

        return TaskResponse.from(task);
    }

    /**
     * 업무 삭제
     */
    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteTask(
            @PathVariable Long taskId
    ) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "업무를 찾을 수 없습니다."
                ));

        taskRepository.delete(task);
    }
}