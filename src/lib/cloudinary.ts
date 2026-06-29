import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ModerationRejectedError extends Error {
  constructor() {
    super('La imagen fue rechazada por contener contenido inapropiado');
    this.name = 'ModerationRejectedError';
  }
}

export async function uploadImage(
  file: string, // base64 o URL
  folder = 'conect-app/listings',
  moderationEnabled = true,
): Promise<{ url: string; publicId: string }> {
  const uploadOptions: any = {
    folder,
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  };

  // Moderación automática usando AWS Rekognition (requiere add-on en Cloudinary)
  // Si el add-on no está activo, la subida continúa normalmente sin moderar
  if (moderationEnabled && process.env.CLOUDINARY_MODERATION === 'aws_rek') {
    uploadOptions.moderation = 'aws_rek';
  }

  const result = await cloudinary.uploader.upload(file, uploadOptions);

  // Si la moderación rechazó la imagen, borrarla y lanzar error
  if (result.moderation?.[0]?.status === 'rejected') {
    await cloudinary.uploader.destroy(result.public_id).catch(() => {});
    throw new ModerationRejectedError();
  }

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
