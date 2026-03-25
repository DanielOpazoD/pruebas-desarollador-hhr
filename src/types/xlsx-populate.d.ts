declare module 'xlsx-populate' {
  interface XlsxPopulateWorkbook {
    outputAsync(options?: { password?: string }): Promise<Uint8Array | Buffer>;
  }

  interface XlsxPopulateStatic {
    fromDataAsync(data: Uint8Array | ArrayBuffer | Buffer): Promise<XlsxPopulateWorkbook>;
  }

  const XlsxPopulate: XlsxPopulateStatic;
  export default XlsxPopulate;
}
