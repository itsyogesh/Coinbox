export default class PostalMime {
  static parse(input: ArrayBuffer, options: {
    maxRfc822NestingDepth: number;
    maxNestingDepth: number;
    maxHeadersSize: number;
    maxPartCount: number;
  }): Promise<{
    subject?: string;
    from?: { address?: string };
    attachments: {
      filename?: string;
      related?: boolean;
      disposition?: string;
      content: ArrayBuffer;
    }[];
  }>;
}
