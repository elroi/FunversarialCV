declare module "word-extractor" {
  interface Document {
    getBody(): string;
  }
  class WordExtractor {
    extract(source: string | Buffer): Promise<Document>;
  }
  export = WordExtractor;
}
