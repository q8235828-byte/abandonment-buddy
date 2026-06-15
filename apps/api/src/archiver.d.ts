declare module 'archiver' {
  import { Transform } from 'node:stream';

  interface ZipArchiveOptions {
    zlib?: { level?: number };
  }

  class ZipArchive extends Transform {
    constructor(options?: ZipArchiveOptions);
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    directory(dirpath: string, destpath: string | false, data?: object): this;
    file(filepath: string, data: { name: string }): this;
    append(source: NodeJS.ReadableStream | Buffer | string, data: { name: string }): this;
    finalize(): Promise<void>;
    pointer(): number;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'warning', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export { ZipArchive };
}
