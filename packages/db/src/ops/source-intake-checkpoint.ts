// 강성호 2026-10-11: 중간 HTTP 실패가 앞서 취득한 사실 증적을 잃게 하지 않도록 성공 record만 별도 보존한다.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
export const intakeDirectoryUrl = (directory: string) => pathToFileURL(resolve(directory) + sep);
export function writeImmutableIntake(output: string | URL, value: unknown) {
  // The early existence check is not sufficient: another collector can finish during HTTP acquisition.
  writeFileSync(output, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
export function createIntakeCheckpoint(directory: string) {
  if (existsSync(directory)) throw new Error("Source checkpoint directory already exists; use a new acquisition run");
  mkdirSync(directory, { recursive: true });
  let count = 0;
  return (record: unknown) => {
    const output = join(directory, `record-${String(++count).padStart(3, "0")}.json`);
    // Individual bytes are immutable. Partial records never imply a complete source intake.
    writeImmutableIntake(output, record);
  };
}
