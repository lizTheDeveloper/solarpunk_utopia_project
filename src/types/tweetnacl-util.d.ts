declare module 'tweetnacl-util' {
  export function encodeUTF8(str: string): Uint8Array;
  export function decodeUTF8(arr: Uint8Array): string;
  export function encodeBase64(arr: Uint8Array): string;
  export function decodeBase64(str: string): Uint8Array;
}
