import { prisma } from "./prisma";

export async function logActivity(type: string, description: string, userEmail?: string) {
  try {
    let user;
    if (userEmail) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
    }
    if (!user) {
      // Fallback ke user pertama (biasanya admin) jika email tidak disediakan atau tidak ditemukan
      user = await prisma.user.findFirst();
    }
    if (user) {
      await prisma.activity.create({
        data: {
          type,
          description,
          userId: user.id,
        },
      });
    }
  } catch (error) {
    console.error("Gagal mencatat aktivitas:", error);
  }
}
