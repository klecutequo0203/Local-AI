# AGENT INSTRUCTION & REPOSITORY DIRECTIVE (AGENT.MD)

> **Project**: Desktop AI Companion (Frontend: Cross-platform macOS/Windows / Backend: Windows PC GTX 5070 16GB VRAM)  
> **Document Version**: 3.2
> **Target Framework**: Tauri 2 + React 19 + TypeScript + Vite + Live2D (PixiJS) + XState  
> **Primary Authority**: **BỘ NÃO ĐIỀU HÀNH & BẢNG QUY TẮC BẮT BUỘC (SINGLE SOURCE OF TRUTH)**  
> Mọi AI Agent và lập trình viên **BẮT BUỘC** phải tuân thủ nghiêm ngặt toàn bộ chỉ dẫn trong file này trước và trong suốt quá trình phát triển mã nguồn của dự án Desktop AI Companion.

---

## 1. QUY TẮC CỐT LÕI: ĐỌC TÀI LIỆU TRƯỚC KHI THỰC THI (MANDATORY PRE-FLIGHT DIRECTIVE)

Trước khi thực hiện bất kỳ lệnh nào, viết code, sửa đổi file hoặc đưa ra phương án:
1. **Luôn đọc các file cốt lõi**:
   - [`README.md`](file:///Users/khangle/Desktop/Project/README.md): Nắm vững kiến trúc chi tiết của Desktop AI Companion, cây components frontend, quy tắc giao tiếp Tauri 2 native, ranh giới BackendGateway và kịch bản lệnh.
   - [`activity.log`](file:///Users/khangle/Desktop/Project/activity.log): Nắm toàn bộ bối cảnh phiên làm việc trước, diary progress, các bước diffs để loại bỏ hoàn toàn **hallucination** và giữ vững tính liên tục của dự án.
   - [`error.log`](file:///Users/khangle/Desktop/Project/error.log): Kiểm tra lịch sử lỗi hệ thống để tránh lặp lại bug hoặc nhận biết các điểm nghẽn runtime.
   - [`contracts/protocol-v1.md`](file:///Users/khangle/Desktop/Project/contracts/protocol-v1.md): Hợp đồng giao tiếp WebSocket chuẩn giữa Frontend và Backend.
2. **Luôn đọc các file Markdown phát sinh (`*.md`)**:
   - Khi dự án mở rộng và xuất hiện các tài liệu mới trong thư mục gốc hoặc `docs/`, Agent **phải đọc ngay** để cập nhật đặc tả kỹ thuật tương ứng.
3. **Không đoán mò (No Assumptions)**:
   - Nếu đặc tả chưa rõ ràng hoặc yêu cầu mơ hồ, phải tra cứu lại tài liệu hoặc hỏi người dùng để xác nhận thay vì tự suy diễn.
4. **Không viết code vội vàng (No Early Code Generation)**:
   - Khi có yêu cầu tạo cấu trúc dự án hoặc setup, **chỉ tạo cây thư mục và file trống hoặc bộ khung (stub)**. Tuyệt đối không generate logic code phức tạp ngay từ đầu để tránh lỗi và over-engineering. Phải đợi yêu cầu cụ thể mới tiến hành code implementation.

---

## 2. RANH GIỚI TRÁCH NHIỆM & KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Client-Server tách biệt hoàn toàn về phần cứng**.
- **Client (Frontend)**: Chạy đa nền tảng (macOS Apple Silicon M4 hoặc Windows OS).
- **Server (Backend)**: Chạy trên Windows PC với GPU RTX 5070 16GB VRAM.

```text
┌──────────────────── FRONTEND (macOS / Windows OS) ──────────────────────┐
│  React UI                                                               │
│    ├── Live2D Avatar (Transparent window, Click-through, Scaling)       │
│    ├── Floating Frameless Chatbox (Auto-hide 5-10s, Screen Tool)        │
│    ├── macOS Menu Bar Popover (Mute AI, Mute Mic, Always-on-top, Scale) │
│    ├── Audio Visualizer (Web Audio API Canvas, Lip-sync)                │
│    ├── Companion State Machine (XState: idle/listen/think/speak/error)  │
│    └── BackendGateway Interface                                         │
│             ├── MockBackendGateway (Phát triển UI độc lập)              │
│             └── WebSocketBackendGateway (Kết nối backend thật qua WS)   │
│                                                                         │
│  Tauri/Rust Native Layer (src-tauri/)                                   │
│    └── Window transparent, Tray popover, Global shortcuts, Permissions  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ WebSocket (contracts/protocol-v1.md)
                                ▼
┌──────────────── BACKEND (Windows PC / GTX 5070 16GB VRAM) ──────────────┐
│  Rust / Python Orchestrator                                             │
│    ├── LLM: Sẵn sàng chạy mọi model cục bộ nặng (Bonsai 8B, Gemma 4,    │
│    │        Llama 3 8B...) nhờ 16GB VRAM. (llama.cpp / LM Studio)       │
│    ├── Cognitive Loop & Emotion Tag Parser ([emotion tag]: context)     │
│    ├── Tool Calling (Screen Capture...)                                 │
│    ├── STT Engine: Whisper (Nhận diện tiếng Việt nhanh & chính xác)     │
│    └── TTS Engine: Kokoro-82M hoặc các model TTS chất lượng cao khác    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1. ĐIỀU GÌ TUYỆT ĐỐI KHÔNG NẰM TRONG FRONTEND?
- **KHÔNG** gọi trực tiếp LM Studio, Ollama, OpenAI hay model weights từ React component. LLM chạy hoàn toàn bên phía Windows PC.
- **KHÔNG** tự parse regex trong text để đoán `[emotion]` hoặc tool call (Backend chịu trách nhiệm bóc tách và trả emotion có cấu trúc).
- **KHÔNG** tự nhúng engine STT (Whisper) hoặc TTS vào bundle frontend. 
- **Frontend chỉ đóng vai trò là một "Thin Client" giao tiếp qua duy nhất `BackendGateway`**. Nhiệm vụ chính là render UI thật đẹp, mượt mà trên macOS và Windows.

---

## 3. TỐI ƯU HÓA MÃ NGUỒN: CÁC BỘ CÔNG CỤ HOÀN HẢO

### 3.1. Ponytail Protocol (Anti-Overengineering & Tối giản tuyệt đối)
> **Quy tắc vàng**: Đưa ra giải pháp đơn giản nhất, ngắn nhất, ít phụ thuộc nhất.

**Thang bậc tối giản (The Ponytail Ladder):**
1. **YAGNI (You Aren't Gonna Need It)**: Không viết các tầng trung gian suy đoán, không cài thêm thư viện npm nặng nề khi Web API có sẵn giải quyết được.
2. **Chỉ viết code khi được yêu cầu**: Tập trung thiết kế cấu trúc (structure/skeleton) trước. Tránh tạo ra boilerplate code không cần thiết.
3. **Web Audio & Canvas Native First**: Vẽ sóng âm trực tiếp qua Canvas 2D + `requestAnimationFrame`. Tuyệt đối không `setState` theo từng frame để tránh giật lag.
4. **Cắt giảm hơn là thêm mới (Prune & Delete)**: Mã nguồn sạch nhất là mã nguồn ít dòng nhất giải quyết trọn vẹn bài toán.
5. **Mandatory Post-Implementation Pass**: Ngay sau khi hoàn thành một đoạn code/module, Agent phải thực hiện một lượt rà soát Ponytail để tinh giản logic.

### 3.2. Spec Kit Lifecycle (Quy trình phát triển chuẩn hoá theo đặc tả)
Đối với các tính năng mới (Live2D renderer, Audio capture, Global shortcut, IPC window controller):
1. **`/speckit-specify`**: Định hình yêu cầu, user stories, acceptance criteria.
2. **`/speckit-clarify`**: Đặt câu hỏi làm rõ các điểm chưa rõ trước khi lập kế hoạch.
3. **`/speckit-plan`**: Thiết kế kế hoạch kỹ thuật, sơ đồ dữ liệu, API contract và luồng giao diện.
4. **`/speckit-tasks`**: Chia nhỏ kế hoạch thành danh sách task tuần tự, nguyên tử.
5. **`/speckit-implement`**: Triển khai code theo từng task, kiểm tra từng bước.
6. **`/speckit-converge`**: Đối chiếu lại sản phẩm cuối cùng với spec để đảm bảo 100% yêu cầu được đáp ứng trước khi mở PR.

### 3.3. Tiêu chuẩn Thẩm mỹ Cross-platform (macOS & Windows) & Glassmorphism
- **Giao diện đẳng cấp**: Hiệu ứng kính mờ (frosted glass `backdrop-filter: blur(28px)` tương đương Fluent Design Acrylic trên Windows), viền mỏng tinh tế `rgba(255,255,255,0.12)`, bo góc lớn (`radius-lg: 18px`).
- **Micro-interactions mượt mà**: Hiệu ứng chuyển cảnh 60/120 FPS, bóng đổ có chiều sâu.
- **Auto-hide Chatbox thông minh**: Tự làm mờ và ẩn sau 5-10s không tương tác (nhưng không ẩn khi đang focus, hover hoặc gõ phím).

---

## 4. QUY TRÌNH QUẢN TRỊ MÃ NGUỒN & GIT WORKFLOW

### 4.1. Luồng Branch & Pull Request 2 Giai đoạn Bắt buộc
```text
feature/<tên_tính_năng>  ──(PR)──>  develop  ──(PR)──>  main
```
1. **KHÔNG BAO GIỜ merge trực tiếp vào branch `main`**.
2. Kéo code mới nhất từ `develop` trước khi tạo nhánh:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/<tên_tính_năng>
   ```
3. Sau khi test thành công, ghi diff vào [`activity.log`](file:///Users/khangle/Desktop/Project/activity.log), commit chuẩn Conventional Commits.
4. Tạo Pull Request vào `develop`. Sau khi release-ready, mở PR từ `develop` vào `main`.

### 4.2. Bảo mật File Nhật ký & Môi trường
- File `.env`, `*.log`, `activity.log`, `error.log` luôn nằm trong `.gitignore`.

---

## 5. NHẬT KÝ THỰC THI (`activity.log`) VÀ THEO DÕI LỖI (`error.log`)

### 5.1. `activity.log` - Bộ nhớ làm việc chống Hallucination
- Mọi phiên prompt có sửa đổi mã nguồn **phải ghi lại code diff (+ / -)** và checklist nhiệm vụ `[x]`.
- Giúp Agent ở các phiên tiếp theo nắm trọn vẹn hiện trạng dự án mà không sinh ra ảo giác.

### 5.2. `error.log` - Nhật ký ngoại lệ hệ thống
- Mọi lỗi crash window, lỗi kết nối WebSocket hoặc runtime exception bắt buộc ghi theo format:
```text
[YYYY-MM-DDTHH:mm:ss.sssZ] ERROR <TYPE> <ORIGIN>
Details:
<Message and Stack Trace>
------------------------------------------------------------
```

---

## 6. HƯỚNG DẪN KHỞI CHẠY & VẬN HÀNH

```bash
# Di chuyển vào thư mục Frontend
cd Frontend

# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy Vite dev server ở chế độ Mock
cp .env.example .env
npm run dev

# Khởi chạy môi trường máy tính native Tauri
npm run tauri dev
```
