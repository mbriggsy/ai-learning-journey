// Room code alphabet — no O or I to avoid confusion with 0 and 1
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 chars

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}
