import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { writeFile } from 'jsonfile';

// Đường dẫn thư mục
const srcDir = path.resolve(__dirname, '../public/images_original');
const dstDir = path.resolve(__dirname, '../public/images');

// Tạo thư mục nếu chưa tồn tại
async function ensureDirectoryExists(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    console.log(`✅ Đã tạo thư mục: ${dir}`);
  }
}

// Tối ưu hóa hình ảnh
async function optimizeImages() {
  console.log('🚀 Bắt đầu tối ưu hóa hình ảnh...');

  // Đảm bảo thư mục tồn tại
  await ensureDirectoryExists(srcDir);
  await ensureDirectoryExists(dstDir);

  // Lấy danh sách file hình ảnh
  const files = await fs.readdir(srcDir);
  const imageFiles = files.filter(file =>
    file.match(/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i)
  );

  if (imageFiles.length === 0) {
    console.log('⚠️ Không tìm thấy hình ảnh nào trong thư mục images_original');
    return;
  }

  console.log(`📁 Tìm thấy ${imageFiles.length} hình ảnh cần tối ưu`);

  const results = [];

  for (const file of imageFiles) {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(dstDir, `${path.basename(file, path.extname(file))}.webp`);

    try {
      // Lấy thông tin kích thước gốc
      const metadata = await sharp(inputPath).metadata();

      // Tối ưu hóa hình ảnh
      await sharp(inputPath)
        .resize(metadata.width, metadata.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: 80,      // Chất lượng 80% (tối ưu dung lượng)
          effort: 6,        // Mức nén cao
          lossless: false    // Sử dụng lossy compression
        })
        .toFile(outputPath);

      results.push({
        original: file,
        optimized: outputPath,
        originalSize: metadata.size,
        dimensions: `${metadata.width}x${metadata.height}`
      });

      console.log(`✅ Đã tối ưu: ${file} → ${path.basename(outputPath)}`);
    } catch (error) {
      console.error(`❌ Lỗi khi xử lý ${file}:`, error);
    }
  }

  // Lưu manifest
  const manifestPath = path.join(dstDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(results, null, 2));

  console.log(`\n🎉 Hoàn thành! Đã tối ưu ${results.length} hình ảnh`);
  console.log(`📄 Manifest đã được lưu tại: ${manifestPath}`);
}

// Chạy hàm chính
optimizeImages().catch(console.error);