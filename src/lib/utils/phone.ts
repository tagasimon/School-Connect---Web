export function phoneToAuthEmail(phone: string) {
  return `${phone.replace(/[^0-9+]/g, '')}@schoolconnect.app`
}
