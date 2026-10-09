# HỢP ĐỒNG GIAO THỨC FRONTEND - BACKEND (PROTOCOL V1)

> **Dự án**: Desktop AI Companion (macOS Apple Silicon M4 / 16GB)  
> **Phiên bản giao thức**: `1`  
> **Kênh truyền dẫn**: WebSocket (JSON Envelope)  
> **Địa chỉ mặc định**: `ws://127.0.0.1:8765/ws`

---

## 1. CẤU TRÚC ENVELOPE CHUẨN

Mọi thông điệp truyền tải giữa Frontend và Backend bắt buộc phải tuân theo khung chuẩn:

```json
{
  "version": 1,
  "id": "msg_01HXYZ",
  "type": "chat.send",
  "timestamp": "2026-10-09T15:00:00.000Z",
  "requestId": "req_01HXYZ",
  "payload": {}
}
```

---

## 2. DANH MỤC THÔNG ĐIỆP (MESSAGE REGISTRY)

| Hướng | `type` | Payload | Mục đích |
| :--- | :--- | :--- | :--- |
| **FE ➔ BE** | `client.hello` | `{ "clientVersion": "1.0.0", "protocolVersion": 1 }` | Bắt tay xác thực phiên bản khi mở WebSocket |
| **BE ➔ FE** | `server.hello` | `{ "protocolVersion": 1, "capabilities": ["chat", "stt", "tts"] }` | Xác nhận kết nối và các tính năng backend hỗ trợ |
| **FE ➔ BE** | `chat.send` | `{ "text": "string", "conversationId?": "string" }` | Gửi tin nhắn văn bản từ khung chat |
| **BE ➔ FE** | `assistant.state` | `{ "phase": "thinking" \| "speaking" \| "idle" \| "error" }` | Cập nhật trạng thái xử lý cho Avatar & Bubble |
| **BE ➔ FE** | `assistant.delta` | `{ "text": "string" }` | Streaming từng phần câu trả lời (tuỳ chọn) |
| **BE ➔ FE** | `assistant.message`| `{ "messageId": "string", "text": "string", "emotion?": "happy" \| "curious" \| "sad" \| "surprised" \| "thinking" }` | Câu trả lời hoàn tất kèm nhãn cảm xúc cho Live2D |
| **FE ➔ BE** | `audio.input` | `{ "mimeType": "audio/webm;codecs=opus", "dataBase64": "...", "durationMs": 1500 }` | Gửi đoạn thu âm push-to-talk cho STT |
| **BE ➔ FE** | `stt.partial` | `{ "text": "string" }` | Bản dịch giọng nói tạm thời khi đang nói |
| **BE ➔ FE** | `stt.final` | `{ "text": "string" }` | Bản dịch giọng nói hoàn tất |
| **BE ➔ FE** | `tts.audio` | `{ "mimeType": "audio/wav", "dataBase64": "...", "text?": "...", "emotion?": "..." }` | Âm thanh sinh bởi Kokoro TTS để Frontend phát |
| **FE ➔ BE** | `audio.output.set_enabled` | `{ "enabled": boolean }` | Báo backend bật/tắt sinh âm thanh TTS |
| **FE ➔ BE** | `assistant.cancel` | `{ "requestId?": "string" }` | Hủy tác vụ AI đang thực thi |
| **BE ➔ FE** | `tool.status` | `{ "toolName": "capture_screen", "status": "running" \| "completed" \| "failed", "displayText?": "..." }` | Trạng thái công cụ tool calling |
| **BE ➔ FE** | `assistant.error` | `{ "code": "ERR_LLM_TIMEOUT", "message": "string", "retryable": boolean }` | Báo lỗi có cấu trúc chuẩn |
