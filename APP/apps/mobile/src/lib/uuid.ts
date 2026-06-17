/**
 * UUID v4 — clé d'idempotence des messages (clientMsgId, ADR-12). N'a pas besoin d'être
 * cryptographiquement fort : seule l'unicité compte (un rejeu hors ligne = un seul message).
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
