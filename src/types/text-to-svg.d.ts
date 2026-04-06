declare module 'text-to-svg' {
  interface Options {
    x?: number;
    y?: number;
    fontSize?: number;
    anchor?: string;
    attributes?: Record<string, string>;
  }

  interface Metrics {
    x: number;
    y: number;
    width: number;
    height: number;
    ascender: number;
    descender: number;
  }

  class TextToSVG {
    static loadSync(fontPath?: string): TextToSVG;
    static load(fontPath: string, callback: (err: Error | null, textToSVG: TextToSVG) => void): void;
    getPath(text: string, options?: Options): string;
    getMetrics(text: string, options?: Options): Metrics;
    getD(text: string, options?: Options): string;
  }

  export default TextToSVG;
}
