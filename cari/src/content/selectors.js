'use strict';

// Selector DOM terpusat. Ubah file ini saja bila struktur Shopee berubah.
// Urutan = prioritas: atribut stabil dulu, class hash di tengah,
// selector struktural generik paling terakhir.
window.RCH_SELECTORS = {
  resiInput: [
    'input[placeholder="Masukkan no. resi jasa kirim"]',
    'input.eds-input__input'
  ],
  chatButton: [
    '[data-testid="buyer-chat-action"]',
    '.buyer-chat-action'
  ],
  chatSidebarSearch: [
    'input[placeholder="Cari nama"].shopee-react-input__input',
    'input[placeholder="Cari nama"]'
  ],
  chatList: [
    '#infinite-list',
    '.ReactVirtualized__Grid'
  ],
  chatItem: [
    '[data-testid="buyer-chat-item"]',
    '.buyer-chat-item',
    '.chat-item',
    '.AxOomp7jNy.eaXBbcCrTd',
    '.AxOomp7jNy',
    '.eaXBbcCrTd',
    '[role="listitem"]',
    '#infinite-list > div',
    '.ReactVirtualized__Grid__innerScrollContainer > div'
  ]
};
