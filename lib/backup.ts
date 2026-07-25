import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type BackupInfo = {
  fileName: string;
  filePath: string;
  createdAt: Date;
};

export function getBackupDirectory() {
  return process.env.BACKUP_DIR ?? "/var/backups/mini-sporty";
}

export async function readLatestBackupInfo(): Promise<BackupInfo | null> {
  const backupDir = getBackupDirectory();

  try {
    await access(backupDir);
  } catch {
    return null;
  }

  const files = (await readdir(backupDir)).filter((file) => file.startsWith("mini-sporty-") && file.endsWith(".sql.gz"));
  if (files.length === 0) return null;

  const fileStats = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(backupDir, fileName);
      const fileStat = await stat(filePath);
      return {
        fileName,
        filePath,
        createdAt: fileStat.mtime
      };
    })
  );

  fileStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return fileStats[0] ?? null;
}
