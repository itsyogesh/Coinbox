import { decodeBase64 } from './decode-strings.js';
import ChunkWriter from './chunk-writer.js';
export default class Base64Decoder {
    constructor(opts) {
        opts = opts || {};
        this.decoder = opts.decoder || new TextDecoder();
        this.maxChunkSize = 100 * 1024;
        this.output = new ChunkWriter();
        this.remainder = '';
    }
    pushChunk(base64Str) {
        if (base64Str.length) {
            this.output.append(new Uint8Array(decodeBase64(base64Str)));
        }
    }
    flushRemainder() {
        this.pushChunk(this.remainder);
        this.remainder = '';
    }
    update(buffer) {
        let str = this.decoder.decode(buffer).replace(/[^a-zA-Z0-9+/=]+/g, '');
        // '=' terminates a base64 unit. Some mailers pad every line, and erasing the
        // padding used to concatenate the units, which knocked everything after the first
        // embedded pad out of 4 character alignment and decoded it to garbage.
        //
        // Each unit is flushed as soon as its '=' is found. A run of '=' flushes an empty
        // remainder, which writes nothing.
        let start = 0;
        let end;
        while ((end = str.indexOf('=', start)) >= 0) {
            this.remainder += str.substring(start, end);
            this.flushRemainder();
            start = end + 1;
        }
        // the trailing piece is not followed by padding, so it stays open
        this.remainder += str.substring(start);
        if (this.remainder.length >= this.maxChunkSize) {
            const alignedLength = Math.floor(this.remainder.length / 4) * 4;
            this.pushChunk(this.remainder.substring(0, alignedLength));
            this.remainder = this.remainder.substring(alignedLength);
        }
    }
    finalize() {
        this.flushRemainder();
        return this.output.finalize();
    }
}
