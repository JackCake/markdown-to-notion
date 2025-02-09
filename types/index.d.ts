declare module '@jackcake/markdown-to-notion' {
    export function clean(line: any): any;
    export function convertToNotionBlocks(lines: any, imageProcessCallback: any, emojiTable?: {}): any[];
    export function convertToRichText(content: any, isCodeBlock?: boolean): any[];
    export function makeHeadingBlock(text: any, level: any): any;
    export function makeHeadingBlock(text: any, level: any): any;
    export function makeParagraphBlock(text: any): any;
    export function makeNestedListBlocks(listLines: any): any[];
    export function makeLinkBlock(text: any, url: any): any;
    export function makeCodeBlock(code: any, language: any): any;
    export function makeTableBlock(lines: any): any;
    export function makeEmbedBlock(url: any): any;
    export function makeQuoteBlock(text: any): any;
    export function makeEquationBlock(texFormula: any): any;
    export function makeQuoteBlock(text: any): any;
    export function makeCalloutBlock(text: any, icon: any, color: any): any;
    export function makeDivider(): any;
}