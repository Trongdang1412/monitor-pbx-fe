# monitor-pbx-fe

Frontend React + Vite cho Monitor PBX.

- **Dashboard**: CCU realtime (tự làm mới 5s), summary hôm nay và theo khoảng thời gian (Tổng cuộc gọi, ASR, ACD, thời lượng, Fee), biểu đồ CCU, hangup cause, thống kê theo KH.
- **CDR**: lọc theo KH, Caller, Callee, Duration, Hangup Cause, Hangup Side, Connecting Duration, Fee + phân trang.

## Chạy dev

```bash
npm install
npm run dev          # http://localhost:5173, /api được proxy sang http://localhost:8080
```

Đổi địa chỉ backend khi dev: `API_PROXY=http://host:8080 npm run dev`.

## Build

```bash
npm run build        # ra thư mục dist/ (file tĩnh)
```

Mặc định frontend gọi API cùng domain (`/api/...`), nên khi deploy cần reverse proxy `/api` sang backend.
Hoặc build với địa chỉ backend cố định: `VITE_API_URL=http://backend:8080 npm run build` (backend đã bật CORS).
