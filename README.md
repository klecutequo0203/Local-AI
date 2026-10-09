# Desktop AI Companion — Frontend Architecture & Guide

> **Dự án**: Trợ lý Ảo Desktop AI Companion  
> **Kiến trúc phần cứng**: Frontend chạy đa nền tảng (macOS / Windows OS) - Backend chạy trên Windows PC (GTX 5070 16GB VRAM)  
> **Công nghệ Frontend**: Tauri 2 + React 19 + TypeScript + Vite + Live2D (PixiJS) + XState  
> **Tài liệu**: Cẩm nang cấu trúc Frontend và tích hợp hệ thống dành cho thành viên khi cộng tác trên GitHub.

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

Desktop AI Companion là ứng dụng trợ lý ảo màn hình máy tính cao cấp chạy native đa nền tảng (macOS và Windows), sở hữu các tính năng then chốt:
- **Nhân vật Live2D trong suốt**: Cửa sổ trong suốt tuyệt đối (transparent), luôn nổi trên các ứng dụng khác (`always-on-top`), cho phép xuyên chuột (`click-through`) và tùy chỉnh kích thước nhân vật (`scale 50% - 200%`).
- **System Tray / Menu Bar Popover**: Bảng điều khiển tích hợp trên thanh System Tray (Windows) hoặc Menu bar (macOS), điều khiển Mute TTS, Mute Mic, Always-on-top, Click-through và phím tắt nhanh.
- **Chatbox Nổi Tự Ẩn (Floating Frameless Chatbox)**: Khung chat không viền, tự động làm mờ và ẩn sau 5–10 giây khi người dùng không tương tác; hỗ trợ chụp màn hình gửi cho AI (Tool Calling).
- **Hệ thống Âm thanh Độc lập**: Tách biệt hoàn toàn giữa Mic Mute (dừng thu âm) và TTS Mute (tắt phát âm thanh); hiển thị sóng âm qua Canvas (Web Audio API Visualizer).
- **Phân định Ranh giới Kỹ thuật**: Backend (LLM, Whisper STT, Kokoro TTS, Cognitive Loop) được chạy hoàn toàn độc lập trên **Windows PC mạnh mẽ (GTX 5070 16GB VRAM)**. Frontend (macOS / Windows) là một **Thin Client** chỉ giao tiếp qua `BackendGateway` thông qua WebSocket theo hợp đồng [`contracts/protocol-v1.md`](file:///Users/khangle/Desktop/Project/contracts/protocol-v1.md).

Sức mạnh 16GB VRAM của máy Windows cho phép chạy mượt mà nhiều model LLM Local được liệt kê (như Bonsai 8B, Gemma 4, Llama 3) cùng các engine STT/TTS chất lượng cao mà không cần đè gánh nặng xử lý AI lên macOS.

---

## 2. 6 TRẠNG THÁI GIAO DIỆN CỦA NHÂN VẬT (UI STATES)

| STT | Trạng thái | Mô tả hiển thị | Hành vi tương tác |
| :---: | :--- | :--- | :--- |
| **1** | **Trạng thái Thinking** | Xuất hiện bong bóng suy nghĩ *"Đang suy nghĩ..."* trên đầu nhân vật | LLM đang sinh câu trả lời, nhân vật có biểu cảm suy tư |
| **2** | **Menu Bar Control** | Cửa sổ popover kính mờ xuất hiện từ Menu Bar | Tinh chỉnh Mute AI, Mute Mic, Always-on-top, Click-through, Scale |
| **3** | **Trạng thái Listening** | Hiển thị sóng âm thanh (Audio Visualizer) màu xanh dương | Microphone đang mở hoặc người dùng nhấn giữ Push-to-Talk |
| **4** | **Trạng thái Speaking** | Nhân vật mở miệng nhép theo âm thanh (Lip-sync) | Âm thanh TTS đang phát qua loa |
| **5** | **Chế độ Avatar-only** | Toàn bộ thanh công cụ và chatbox bị ẩn | Chỉ hiển thị nhân vật trên màn hình làm việc |
| **6** | **Chế độ Click-through** | Chuột click xuyên qua nhân vật vào ứng dụng bên dưới | Khôi phục tương tác bằng phím tắt toàn cục `⌘⌥C` hoặc icon Menu Bar |

---

## 3. CÂY THƯ MỤC CHI TIẾT FRONTEND (COMPONENTS TREE)

*(Lưu ý: Đây là bản đồ kiến trúc thư mục. Việc code thực tế sẽ được triển khai dần dần theo từng task, không generate toàn bộ code từ sớm để tránh over-engineering)*

```text
Frontend/
├── public/
│   ├── icons/
│   │   ├── app-icon.png               # Icon ứng dụng & avatar mặc định
│   │   └── tray-icon-template.png     # Icon Menu bar trên macOS
│   └── live2d/
│       └── README.md                  # Hướng dẫn đặt model Live2D Cubism
│
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Điều phối view dựa trên Tauri window label (avatar / settings)
│   │   ├── windowRoutes.ts            # Helper phân giải label cửa sổ
│   │   └── providers/                 # Context providers quản lý state
│   │
│   ├── windows/
│   │   ├── avatar/
│   │   │   ├── AvatarWindow.tsx       # Cửa sổ chính: Avatar trong suốt, bong bóng, thanh công cụ
│   │   │   └── avatar-window.css      # CSS nền trong suốt tuyệt đối
│   │   ├── chat/
│   │   │   └── ChatWindow.tsx         # Khung chat độc lập khi tách cửa sổ
│   │   └── settings/
│   │       ├── SettingsWindow.tsx     # Cửa sổ Popover cài đặt mở từ Menu Bar
│   │       └── settings-window.css
│   │
│   ├── components/
│   │   ├── avatar/
│   │   │   ├── Live2DStage.tsx        # Mount canvas / PixiJS Live2D engine
│   │   │   ├── Live2DModelView.ts     # Adapter nạp model và cập nhật biểu cảm
│   │   │   ├── AvatarFallback.tsx     # Đồ họa thay thế sắc nét khi chưa có model Live2D
│   │   │   ├── AvatarHitAreas.ts      # Vùng va chạm chạm vào đầu/thân nhân vật
│   │   │   └── avatar-stage.css
│   │   │
│   │   ├── overlay/
│   │   │   ├── StatusBubble.tsx       # Bong bóng trạng thái (Đang suy nghĩ, Đang nghe...)
│   │   │   ├── DragHandle.tsx         # Vùng kéo thả cửa sổ khi click-through tắt
│   │   │   ├── FloatingToolbar.tsx    # Thanh công cụ nhanh xuất hiện khi hover
│   │   │   └── OverlayVisibility.tsx  # Quản lý ẩn hiện UI phụ mà không ẩn avatar
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx          # Khung chatbox nổi tự ẩn sau 5–10s
│   │   │   ├── MessageList.tsx        # Danh sách tin nhắn kèm auto-scroll
│   │   │   ├── MessageItem.tsx        # Bong bóng tin nhắn người dùng và AI
│   │   │   ├── ChatInput.tsx          # Thanh nhập văn bản, đính kèm và nút Mic Push-to-Talk
│   │   │   ├── AttachmentPreview.tsx  # Xem trước ảnh chụp màn hình gửi cho AI
│   │   │   └── TypingIndicator.tsx    # Hiệu ứng ba chấm động khi AI đang suy nghĩ
│   │   │
│   │   ├── audio/
│   │   │   ├── AudioVisualizer.tsx    # Sóng âm Canvas Web Audio API hiệu năng cao
│   │   │   ├── MicrophoneButton.tsx   # Nút bật/tắt mic độc lập
│   │   │   ├── TtsMuteButton.tsx      # Nút bật/tắt tiếng AI độc lập
│   │   │   └── PlaybackControls.tsx   # Cụm điều khiển âm thanh và nút dừng AI nói
│   │   │
│   │   ├── controls/
│   │   │   ├── AlwaysOnTopToggle.tsx  # Công tắc ghim cửa sổ trên cùng
│   │   │   ├── ClickThroughToggle.tsx # Công tắc chế độ click xuyên chuột
│   │   │   ├── CharacterScaleSlider.tsx # Thanh trượt kích thước nhân vật (50% - 200%)
│   │   │   ├── OpenChatButton.tsx     # Phím tắt mở chatbox (⌘K)
│   │   │   └── HideUiButton.tsx       # Nút chuyển chế độ Avatar-only
│   │   │
│   │   ├── settings/
│   │   │   ├── AudioSettings.tsx      # Cài đặt âm thanh (Mic/TTS riêng biệt)
│   │   │   ├── AvatarSettings.tsx     # Cài đặt hiển thị và kích cỡ nhân vật
│   │   │   ├── ShortcutSettings.tsx   # Danh sách phím tắt toàn cục
│   │   │   └── PerformanceSettings.tsx # Cấu hình FPS và tiết kiệm pin M4
│   │   │
│   │   └── ui/
│   │       ├── IconButton.tsx         # Nút icon phong cách macOS
│   │       ├── Switch.tsx             # Công tắc toggle macOS
│   │       ├── Slider.tsx             # Thanh kéo trượt macOS
│   │       ├── Tooltip.tsx            # Chú thích hiển thị khi hover
│   │       ├── LoadingOverlay.tsx     # Lớp phủ tải dữ liệu kính mờ
│   │       └── ErrorMessage.tsx       # Thông báo lỗi kết nối / server
│   │
│   ├── features/
│   │   ├── companion-state/           # State machine XState (idle -> listen -> think -> speak)
│   │   ├── conversation/              # Kiểu dữ liệu hội thoại và message store
│   │   ├── audio/                     # Controller thu âm và phát audio
│   │   └── preferences/               # Cấu hình lưu trữ tùy chọn người dùng
│   │
│   ├── services/
│   │   ├── backend/
│   │   │   ├── BackendGateway.ts      # Interface chuẩn giao tiếp với Backend
│   │   │   ├── MockBackendGateway.ts  # Giả lập phản hồi phục vụ làm UI độc lập
│   │   │   ├── WebSocketBackendGateway.ts # Adapter kết nối WebSocket thật
│   │   │   ├── backendGatewayFactory.ts   # Factory chuyển đổi giữa Mock và WebSocket
│   │   │   └── protocol.ts            # Kiểu dữ liệu khớp với contracts/protocol-v1.md
│   │   └── tauri/
│   │       ├── commands.ts            # Wrapper gọi lệnh native Rust của Tauri 2
│   │       └── tauriRuntime.ts        # Kiểm tra môi trường native hay web browser
│   │
│   ├── styles/
│   │   ├── tokens.css                 # Bảng màu, bo góc, độ mờ glassmorphism
│   │   ├── globals.css                # CSS reset và phong cách nền trong suốt
│   │   ├── chat.css                   # Định dạng khung chat nổi frameless
│   │   └── popover.css                # Định dạng Menu bar popover
│   │
│   ├── main.tsx                       # Entry point React 19
│   └── vite-env.d.ts
│
├── contracts/
│   └── protocol-v1.md                 # Hợp đồng giao tiếp JSON Envelope giữa 2 nhóm
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (GETTING STARTED)

### 4.1. Yêu cầu môi trường
* **Client (Frontend)**: Hỗ trợ macOS (M1-M4) và Windows OS. Yêu cầu cài đặt Node.js (`18.x` hoặc `20.x`) và Rust toolchain (bao gồm Visual Studio C++ Build tools nếu cài trên Windows).
* **Server (Backend)**: PC Windows (Yêu cầu GTX 5070 16GB VRAM để chạy mượt mà các LLM).

### 4.2. Khởi chạy chế độ phát triển giao diện (Mock Mode)
Frontend hỗ trợ chế độ **Mock Gateway** hoàn chỉnh, cho phép thiết kế toàn bộ UI, chatbox, mic và emotion mà **không cần khởi động backend**:

```bash
# 1. Di chuyển vào thư mục Frontend
cd Frontend

# 2. Cài đặt các gói thư viện
npm install

# 3. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env
# Mặc định: VITE_BACKEND_MODE=mock

# 4. Khởi chạy máy chủ phát triển Vite
npm run dev
```
> Truy cập trình duyệt theo liên kết hiển thị: `http://localhost:5173` để duyệt giao diện.

### 4.3. Kết nối với Backend thật (WebSocket Mode)
Khi máy chủ Windows hoàn thành khởi chạy LLM Orchestrator:
1. Đảm bảo 2 máy macOS và Windows nằm trong cùng mạng (hoặc dùng Tunneling).
2. Mở file `Frontend/.env` trên máy Mac và cập nhật IP của máy Windows:
   ```env
   VITE_BACKEND_MODE=websocket
   VITE_BACKEND_WS_URL=ws://<IP_MAY_WINDOWS>:8765/ws
   ```
3. Khởi chạy lại `npm run dev` (không cần sửa đổi bất kỳ component React nào).

---

## 5. KỊCH BẢN LỆNH (SCRIPTS & TESTING)

| Lệnh | Ý nghĩa | Chi tiết sử dụng |
| :--- | :--- | :--- |
| `npm run dev` | Bật Vite Dev Server | Chạy giao diện với Hot Module Replacement (HMR) cực nhanh. |
| `npm run build` | Đóng gói sản phẩm | Kiểm tra kiểu dữ liệu TypeScript (`tsc`) và build bản phát hành ra thư mục `dist/`. |
| `npm run preview` | Duyệt thử bản build | Kiểm tra bản build tĩnh trên môi trường máy chủ cục bộ. |
| `npm run tauri dev` | Khởi chạy native Tauri | Mở cửa sổ native (macOS/Windows) với tính năng nền trong suốt, click-through và System Tray. |

---

## 6. QUY CHUẨN ĐÓNG GÓP & PUSH CODE LÊN GITHUB

> **QUY TẮC BẮT BUỘC CHO THÀNH VIÊN NHÓM FRONTEND**:

1. **Đồng bộ nhánh `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Tạo nhánh tính năng mới theo quy ước**:
   ```bash
   git checkout -b feature/<tên_tính_năng>
   # Ví dụ: git checkout -b feature/live2d-stage
   ```
3. **Tuân thủ ranh giới trách nhiệm**:
   - Không tự ý sửa đổi schema trong `contracts/protocol-v1.md` nếu chưa thống nhất với nhóm Backend.
   - Không import code LLM hay engine xử lý nặng vào Frontend.
   - Chỉ code khi có yêu cầu (task) rõ ràng, tránh sinh code vội vàng (early generation).
4. **Kiểm tra biên dịch trước khi commit**:
   ```bash
   npm run build
   ```
5. **Commit theo chuẩn Conventional Commits**:
   ```bash
   git commit -m "feat(ui): hoàn thiện floating chatbox auto-hide sau 7s"
   ```
6. **Mở Pull Request vào nhánh `develop`** (Tuyệt đối không merge thẳng vào `main`).
