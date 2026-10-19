# Ảnh nhân vật dùng trong NecroChibi

Nguồn tham khảo: ảnh ba pháp sư Linh, Mộc, Lam do người dùng gửi, tên `codex-clipboard-810ef8ea-7175-43d9-8037-ca955c566b3f.png`.

Công cụ: **imagegen tích hợp**; một lượt xử lý riêng cho mỗi nhân vật, bật nền trong suốt. Không dùng CLI/API dự phòng. Ba đầu ra đã được chép nguyên trạng vào thư mục này, RGBA 1254 × 1254. Đây là ảnh đã qua xử lý bằng mô hình dựa trên ảnh tham khảo, không phải bản cắt pixel nguyên gốc.

- [Linh](linh.png)
- [Mộc](moc.png)
- [Lam](lam.png)

Game dùng các bản WebP 512 × 512 cùng tên để giảm dung lượng tải và giải mã trên điện thoại: linh.webp 40,852 byte, moc.webp 37,264 byte, lam.webp 46,200 byte. Xuất trực tiếp từ ba PNG bằng Sharp, quality 86 và alphaQuality 100; không thay đổi tạo hình. Các PNG gốc vẫn được giữ nguyên để chỉnh sửa và xuất lại khi cần.

Phần gậy và hiệu ứng rời được bỏ khỏi PNG để game gắn một trong năm vũ khí theo trang bị. Sách ở thắt lưng của Linh, đèn bên hông của Mộc và tinh thể trên mũ Lam được giữ. `dist/hero-art.js` lưu điểm cầm; `dist/renderer.js` ghép ảnh với vũ khí và lớp bàn tay. Cửa hàng dùng cùng các điểm cầm.

Các prompt đầy đủ đã dùng:

## linh.png

```text
Use case: background-extraction / identity-preserve. Asset type: ONE high-quality transparent full-body 2D game character sprite. Edit target: the attached three-character reference sheet. Extract ONLY LINH, the LEFT purple wizard with silver-lavender hair and golden eyes, purple wide-brim floppy wizard hat and layered purple cape and gold-trimmed robe. Preserve the small black-and-gold book attached to the belt. Keep the original character's exact face, big eye shapes, facial proportions, head-to-body ratio, original soft cel-painted illustration style, dark clean outlines, shading, colors, clothing details, hat silhouette, boots and frontal pose. This is a faithful cutout asset for the game, NOT a redesign or simplified vector recreation. Remove the handheld staff/wand completely, including its head, shaft, attached vines and magical particles; retain and neatly complete the closed gripping hand on the LEFT side of the image, empty so a separate interchangeable weapon can be drawn there by the game. Keep both hands and arms in the reference pose. Remove the other two characters, card frame, background, floor rings, floor shadow, labels, all lettering and free-floating sparkles. Transparent RGBA background, clean alpha edges with no dark matte or rectangular card. One character only, complete hat-to-boots, centered and evenly padded, large on a square canvas, no cropping. Pose and identity must remain extremely close to the supplied reference. No text, no new props, no watermark.
```

## moc.png

```text
Use case: background-extraction / identity-preserve. Asset type: ONE high-quality transparent full-body 2D game character sprite. Edit target: the attached three-character reference sheet. Extract ONLY MỘC, the MIDDLE green wizard with tousled dark hair and green eyes, leaf-adorned green wide-brim floppy wizard hat, layered green cape and cream robe. Preserve the yellow lantern hanging at the right hip and all belt accessories. Keep the original character's exact face, big eye shapes, facial proportions, head-to-body ratio, original soft cel-painted illustration style, dark clean outlines, shading, colors, clothing details, hat silhouette, boots and frontal pose. This is a faithful cutout asset for the game, NOT a redesign or simplified vector recreation. Remove the handheld staff/wand completely, including its head, shaft, attached vines and magical particles; retain and neatly complete the closed gripping hand on the LEFT side of the image, empty so a separate interchangeable weapon can be drawn there by the game. Keep both hands and arms in the reference pose. Remove the other two characters, card frame, background, floor rings, floor shadow, labels, all lettering and free-floating sparkles. Transparent RGBA background, clean alpha edges with no dark matte or rectangular card. One character only, complete hat-to-boots, centered and evenly padded, large on a square canvas, no cropping. Pose and identity must remain extremely close to the supplied reference. No text, no new props, no watermark.
```

## lam.png

```text
Use case: background-extraction / identity-preserve. Asset type: ONE high-quality transparent full-body 2D game character sprite. Edit target: the attached three-character reference sheet. Extract ONLY LAM, the RIGHT blue wizard with blue hair and blue eyes, navy wide-brim floppy wizard hat with hanging cyan crystals, pale cyan scarf, layered navy cloak with white star appliques. Keep the original character's exact face, big eye shapes, facial proportions, head-to-body ratio, original soft cel-painted illustration style, dark clean outlines, shading, colors, clothing details, hat silhouette, boots and frontal pose. This is a faithful cutout asset for the game, NOT a redesign or simplified vector recreation. Remove the handheld staff/wand completely, including its head, shaft, attached vines and magical particles; retain and neatly complete the closed gripping hand on the LEFT side of the image, empty so a separate interchangeable weapon can be drawn there by the game. Keep both hands and arms in the reference pose. Remove the other two characters, card frame, background, floor rings, floor shadow, labels, all lettering and free-floating sparkles. Transparent RGBA background, clean alpha edges with no dark matte or rectangular card. One character only, complete hat-to-boots, centered and evenly padded, large on a square canvas, no cropping. Pose and identity must remain extremely close to the supplied reference. No text, no new props, no watermark.
```

