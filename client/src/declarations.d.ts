declare module 'piexifjs' {
  const piexif: {
    load: (data: string) => any;
    dump: (exifObj: any) => string;
    insert: (exifStr: string, jpegData: string) => string;
    remove: (jpegData: string) => string;
    TAGS: any;
    ImageIFD: any;
    ExifIFD: any;
    GPSIFD: any;
    InteropIFD: any;
    version: string;
  };
  export default piexif;
}

declare module 'heic2any' {
  interface Heic2AnyOptions {
    blob: Blob;
    toType?: string;
    quality?: number;
    multiple?: boolean;
  }
  function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;
  export default heic2any;
}

declare module 'exifr' {
  const exifr: {
    parse: (input: any, options?: any) => Promise<any>;
    sidecar: (input: any) => Promise<any>;
    thumbnail: (input: any) => Promise<any>;
    tagValues: any;
  };
  export default exifr;
}

