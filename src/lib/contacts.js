/** Official public contact numbers (call, SMS, WhatsApp). */

export const WHATSAPP_PREFILL =
  'Hello SHE CHAMPIONS, I would like to learn more about your programmes.';

export const SITE_CONTACTS = Object.freeze([
  {
    id: 'primary',
    e164: '+2349043197743',
    display: '+234 904 319 7743',
    waDigits: '2349043197743',
  },
  {
    id: 'secondary',
    e164: '+2347065733947',
    display: '+234 706 573 3947',
    waDigits: '2347065733947',
  },
]);

export const PRIMARY_CONTACT = SITE_CONTACTS[0];

export function telHref(contact) {
  return `tel:${contact.e164}`;
}

export function smsHref(contact) {
  return `sms:${contact.e164}`;
}

export function whatsappHref(contact, message = WHATSAPP_PREFILL) {
  return `https://wa.me/${contact.waDigits}?text=${encodeURIComponent(message)}`;
}

export const PRIMARY_WHATSAPP_HREF = whatsappHref(PRIMARY_CONTACT);

export function contactsDisplayList() {
  return SITE_CONTACTS.map((c) => c.display).join(' / ');
}
