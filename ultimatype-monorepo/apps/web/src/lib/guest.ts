const GUEST_ID_KEY = 'ultimatype_guest_id';
const GUEST_NAME_KEY = 'ultimatype_guest_name';

export function getGuestId(): string {
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = 'guest_' + crypto.randomUUID();
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestName(): string {
  let name = sessionStorage.getItem(GUEST_NAME_KEY);
  if (!name) {
    const num = Math.floor(Math.random() * 9999) + 1;
    name = `Invitado #${num}`;
    sessionStorage.setItem(GUEST_NAME_KEY, name);
  }
  return name;
}
