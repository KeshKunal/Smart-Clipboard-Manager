export interface ClipboardItem {
  text: string;
  timestamp: number;
}

export interface StoreSchema {
  clipboardHistory: ClipboardItem[];
}