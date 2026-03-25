---
description: Push all changes to git after completing a feature
---

// turbo-all

1. Run the git push script with a commit message describing what was done:

```
powershell -ExecutionPolicy Bypass -File "d:\truyen_chu\scripts\git-push.ps1" "<commit message>"
```

Replace `<commit message>` with a concise Vietnamese or English description of what was implemented, e.g.:
- `"feat: thêm phân trang danh sách chương"`
- `"fix: sửa lỗi quét danh sách batch crawl"`
- `"feat: chỉ lấy thẻ p và br trong nội dung chương"`
