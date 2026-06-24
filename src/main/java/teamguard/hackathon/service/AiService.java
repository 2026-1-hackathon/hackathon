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

                [충돌 위험 평가 기준]
                모든 팀원의 배정 결과를 아래 기준으로 개별 평가한 뒤, 팀 전체의 충돌 위험을 종합하세요.

                선호도 점수 기준:
                - 0점: 매우높음
                - 25점: 높음
                - 50점: 중간
                - 75점 이상: 낮음
                - 100점: 매우낮음

                시간 점수 기준:
                - 50 미만: 매우높음
                - 50~70: 높음
                - 70~90: 보통
                - 90 이상: 낮음

                두 기준 조합 규칙:
                - 선호도 매우높음 + 시간 매우높음 → 극위험
                - 선호도 매우높음 + 시간 높음 → 매우높음
                - 선호도 매우높음 + 시간 보통/낮음 → 높음
                - 선호도 높음 + 시간 매우높음 → 매우높음
                - 선호도 높음 + 시간 높음/보통 → 높음
                - 선호도 높음 + 시간 낮음 → 중간
                - 선호도 중간 + 시간 매우높음 → 높음
                - 선호도 중간 + 시간 높음/보통 → 중간
                - 선호도 중간 + 시간 낮음 → 낮음
                - 선호도 낮음 + 시간 매우높음 → 중간
                - 선호도 낮음 + 시간 높음/보통/낮음 → 낮음 또는 매우낮음
                - 선호도 매우낮음 + 시간 매우높음 → 중간
                - 선호도 매우낮음 + 시간 높음 이하 → 낮음 또는 매우낮음

                원칙:
                - 선호도 0점은 시간과 무관하게 최소 높음
                - 시간점수 50 미만은 선호도와 무관하게 최소 높음

                팀 전체 충돌 위험 집계 (업무량 반영):
                - 업무량이 많은 팀원의 충돌 위험이 높으면 팀 전체에 큰 영향을 준다
                - 업무량 상위 팀원의 위험도가 높음 이상이면 팀 전체 충돌 위험은 높음 이상
                - 업무량이 많은 팀원 대부분이 위험하면 팀 전체 충돌 위험은 매우높음 이상
                - 업무량이 적은 팀원만 위험하고 나머지는 안전하면 팀 전체 위험도는 한 단계 하향 조정

                위험도를 0~100 정수로 변환: 매우낮음=10, 낮음=30, 중간=50, 높음=70, 매우높음=85, 극위험=100

                [일정 지연 위험 평가 기준]
                각 팀원의 배정된 역할(작업)별로 업무 완료 가능 비율을 계산해 지연 여부를 예측하세요.

                업무 완료 가능 비율 계산:
                완료 가능 비율 = (timeScore × skillScore) / 10000
                - timeScore = 투자시간 / 업무량 × 100 (데이터에 제공됨)
                - skillScore = 역량 점수 (데이터에 제공됨)

                완료 가능 비율 기준:
                - 90% 이상: 낮음 (완료 가능)
                - 70~90%: 중간 (대부분 완료, 일부 지연 가능)
                - 50~70%: 높음 (완료 불투명)
                - 50% 미만: 매우높음 (절반도 완료 못할 가능성)

                마감일 반영:
                - 남은 일수가 14일 이하이면 각 역할의 위험도 한 단계 상승
                - 남은 일수가 7일 이하이면 각 역할의 위험도 두 단계 상승

                팀 전체 일정 지연 위험 집계 (업무량 반영):
                - 업무량이 많은 팀원의 일정 지연 위험이 높으면 팀 전체에 큰 영향을 준다
                - 업무량 상위 팀원의 위험도가 높음 이상이면 팀 전체 일정 지연 위험은 높음 이상
                - 업무량이 많은 팀원 대부분이 위험하면 팀 전체 일정 지연 위험은 매우높음 이상
                - 업무량이 적은 팀원만 위험하고 나머지는 안전하면 팀 전체 위험도는 한 단계 하향 조정

                위험도를 0~100 정수로 변환: 매우낮음=10, 낮음=30, 중간=50, 높음=70, 매우높음=85, 극위험=100

                [마감 지연 위험 평가 기준]
                충돌 위험과 일정 지연 위험을 종합해서 최종 마감 지연 위험을 평가하세요.

                충돌 위험 + 일정 지연 위험 조합:
                - 일정 낮음 + 충돌 낮음 → 매우낮음
                - 일정 낮음 + 충돌 중간 → 낮음
                - 일정 낮음 + 충돌 높음 → 중간
                - 일정 낮음 + 충돌 매우높음 → 높음
                - 일정 중간 + 충돌 낮음 → 낮음
                - 일정 중간 + 충돌 중간 → 중간
                - 일정 중간 + 충돌 높음 → 높음
                - 일정 중간 + 충돌 매우높음 → 매우높음
                - 일정 높음 + 충돌 낮음 → 중간
                - 일정 높음 + 충돌 중간 → 높음
                - 일정 높음 + 충돌 높음 → 매우높음
                - 일정 높음 + 충돌 매우높음 → 극위험
                - 일정 매우높음 + 충돌 낮음 → 높음
                - 일정 매우높음 + 충돌 중간 → 매우높음
                - 일정 매우높음 + 충돌 높음/매우높음 → 극위험

                마감일 최종 조정:
                - 남은 일수 7일 이하: 한 단계 추가 상승 (회복 불가)
                - 남은 일수 21일 이상: 한 단계 하강 (회복 여지 있음)

                논리:
                - 일정 지연이 높아도 팀 갈등이 없으면 회복 가능
                - 충돌이 높으면 팀 효율 저하로 일정 지연이 더 심해짐
                - 마감이 촉박할수록 회복 기회가 없어 위험 가중

                위험도를 0~100 정수로 변환: 매우낮음=10, 낮음=30, 중간=50, 높음=70, 매우높음=85, 극위험=100

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
