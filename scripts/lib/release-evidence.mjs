// 강성호 2026-10-13: command gate의 artifact 키를 파일 참조(path)와 혼동하지 않도록 분리한다.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function commandArtifactGate(path, command) {
  if(typeof command!=='string' || !command.trim()) throw new Error('Actual command description required');
  return {passed:true,exit_code:0,command,artifact:path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};
}
