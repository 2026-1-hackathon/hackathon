package teamguard.hackathon.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import teamguard.hackathon.domain.Assignment;
import teamguard.hackathon.domain.Room;
import teamguard.hackathon.dto.PredictionResponse;
import teamguard.hackathon.repository.AssignmentRepository;
import teamguard.hackathon.repository.RoomRepository;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${openai.api.key}")
    private String apiKey;

    private final RoomRepository roomRepository;
    private final AssignmentRepository assignmentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://api.openai.com")
            .build();

    public String chat(String message) {
        Map<String, Object> body = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(Map.of("role", "user", "content", message))
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        @SuppressWarnings("unchecked")
        Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
        return (String) messageObj.get("content");
    }

    @Transactional(readOnly = true)
    public PredictionResponse predict(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "방을 찾을 수 없습니다."));

        List<Assignment> assignments = assignmentRepository.findByRoomIdOrderByRoleIdAsc(roomId);

        if (assignments.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "역할 배정이 완료되지 않았습니다.");
        }

        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), room.getDeadline().toLocalDate());

        StringBuilder memberData = new StringBuilder();
        for (Assignment a : assignments) {
            memberData.append(String.format(
                    "- %s: 역할=%s, 역량점수=%.0f, 시간점수=%.0f, 선호도점수=%.0f, 투자시간=%dh, 업무량=%d%n",
                    a.getMember().getName(),
                    a.getRole().getName(),
                    a.getSkillScore(),
                    a.getTimeScore(),
                    a.getPreferenceScore(),
                    a.getMember().getAvailableHours(),
                    a.getRole().getWorkload()
            ));
        }

        String prompt = """
                당신은 팀 프로젝트 리스크 분석 전문가입니다.
                아래 팀 데이터를 분석해서 JSON으로만 응답하세요. 마크다운 없이 순수 JSON만 출력하세요.

                [팀 정보]
                - 프로젝트 주제: %s
                - 마감일까지 남은 일수: %d일
                - 방장 설정 가중치 (역량:%d / 시간:%d / 선호도:%d)

                [팀원별 배정 결과] (각 점수는 0~100 기준)
                %s
                점수가 낮을수록 해당 항목이 부족하다는 의미입니다.
                예: 선호도점수 25 = 비선호 역할에 배정됨, 시간점수 50 = 투자 시간이 업무량의 절반

                다음 JSON 형식으로만 응답하세요:
                {
                  "conflictRisk": 0~100 사이 정수,
                  "scheduleRisk": 0~100 사이 정수,
                  "deadlineRisk": 0~100 사이 정수,
                  "riskFactors": ["리스크 요인1", "리스크 요인2"],
                  "recommendations": ["권고사항1", "권고사항2"]
                }
                """.formatted(
                room.getTopic(),
                daysLeft,
                room.getSkillWeight(),
                room.getTimeWeight(),
                room.getPreferenceWeight(),
                memberData
        );

        String responseText = chat(prompt);

        // 마크다운 코드블록 제거
        String json = responseText.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("```json\\n?", "").replaceAll("```\\n?", "").trim();
        }

        try {
            return objectMapper.readValue(json, PredictionResponse.class);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "AI 응답 파싱 실패: " + e.getMessage());
        }
    }
}
