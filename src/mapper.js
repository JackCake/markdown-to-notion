import {
  makeTableOfContents,
  makeHeadingBlock,
  makeParagraphBlock,
  makeNestedListBlocks,
  makeLinkBlock,
  makeCodeBlock,
  makeTableBlock,
  makeEmbedBlock,
  makeQuoteBlock,
  makeEquationBlock,
  makeCalloutBlock,
  makeDivider,
} from './factory.js';

export function clean(line = '') {
  return line.replaceAll('\\\\', '\\')
    .replaceAll('\\~', '~')
    .replaceAll('\\_', '_')
    .replaceAll('\\+', '+')
    .replaceAll('\\-', '-')
    .replaceAll('\\*', '*')
    .replaceAll('\\$', '$')
    .replaceAll('\\.', '.')
    .replaceAll('\\[', '[')
    .replaceAll('\\]', ']')
    .replaceAll('\\`', '`')
    .trim();
}

export function convertToNotionBlocks(lines = [], imageProcessCallback, emojiTable = {}) {
  const listItemMarkdownRegex = /^(\s*)([-*+]|\d+\.\s|-\s\[( |x|X)\]\s)(.+)/;
  const headerMarkdownRegex = /^#{1,3} /;
  const embedFileMarkdownRegex = /^!\[\]\((.*?)\)/;
  const tableMarkdownRegex = /^\|(.+)\|$/;
  const linkMarkdownRegex = /^\[(.*)\]\((.*)\)$/;
  const quoteMarkdownRegex = /^> /;
  const equationMarkdownRegex = /\$\$(.*?)\$\$/;
  const codeMarkdownLine = '```';
  let blocks = [makeTableOfContents()];
  let isCodeBlock = false;
  let codeLanguage = '';
  let codeContent = '';
  let isTableBlock = false;
  let tableLines = [];
  let isListBlock = false;
  let listLines = [];
  let emoji = '';
  let isCalloutBloack = false;
  let calloutMessage = '';

  for (let line of lines) {
    const isDividerLine = (line === '***' || line === '* * *' || line === '- - -');
    if (
      line.match(listItemMarkdownRegex) ||
      line.match(headerMarkdownRegex) ||
      line.match(embedFileMarkdownRegex) ||
      line.match(tableMarkdownRegex) ||
      line.match(linkMarkdownRegex) ||
      line.match(quoteMarkdownRegex) ||
      line.match(equationMarkdownRegex) ||
      line.startsWith(codeMarkdownLine) ||
      isDividerLine
    ) {
      if (isCalloutBloack) {
        blocks.push(makeCalloutBlock(calloutMessage, emoji, emojiTable[emoji]));
        isCalloutBloack = false;
        emoji = '';
        calloutMessage = '';
      }
    }
    if (isDividerLine) {
      // Horizontal Rule
      blocks.push(makeDivider());
    } else if (line.match(listItemMarkdownRegex) && !isCodeBlock && !line.startsWith('**')) {
      // List Item
      listLines.push(line);
      isListBlock = true;
    } else if (line.startsWith('|') && !isCodeBlock) {
      if (!line.startsWith('| --- |')) {
        tableLines.push(line);
        isTableBlock = true;
      }
    } else {
      if (isListBlock) {
        blocks = [...blocks, ...makeNestedListBlocks(listLines)];
        isListBlock = false;
        listLines = [];
      } else if (isTableBlock) {
        blocks.push(makeTableBlock(tableLines));
        isTableBlock = false;
        tableLines = [];
      }
      if (line.startsWith(codeMarkdownLine)) {
        if (isCodeBlock) {
          codeContent = codeContent.trim();
          blocks.push(makeCodeBlock(codeContent, codeLanguage));
          isCodeBlock = false;
          codeLanguage = '';
          codeContent = '';
        } else {
          isCodeBlock = true;
          codeLanguage = line.replace(codeMarkdownLine, '').trim();
        }
      } else if (isCodeBlock) {
        codeContent += line + '\n';
      } else if (line.match(headerMarkdownRegex)) {
        // Headers
        const headerLevel = line.match(headerMarkdownRegex)[0].trim().length;
        const headerContent = line.replace(headerMarkdownRegex, '');
        blocks.push(makeHeadingBlock(headerContent, headerLevel));
      } else if (line.match(embedFileMarkdownRegex)) {
        // Embed File (Image or PDF)
        const localFilePath = line.match(embedFileMarkdownRegex)[1];
        if (imageProcessCallback.constructor.name === 'AsyncFunction') {
          imageProcessCallback(localFilePath).then((url) => {
            blocks.push(makeEmbedBlock(url));
          });
        } else {
          const url = imageProcessCallback(localFilePath);
          blocks.push(makeEmbedBlock(url));
        }
      } else if (line.match(tableMarkdownRegex)) {
        // Table
        const rows = line.split(/\r?\n/).filter(row => row.match(tableMarkdownRegex));
        const tableRows = rows.map(row => ({
          type: 'table_row',
          table_row: {
            cells: row.split('|').slice(1, -1).map(cell => [{ type: 'text', text: { content: cell.trim() } }])
          }
        }));
        blocks.push({
          object: 'block',
          type: 'table',
          table: {
            table_width: rows[0].split('|').length - 2,
            has_column_header: true,
            children: tableRows
          }
        });
      } else if (line.match(linkMarkdownRegex)) {
        // Link
        const match = line.match(linkMarkdownRegex);
        blocks.push(makeLinkBlock(match[1], match[2]));
      } else if (line.match(quoteMarkdownRegex)) {
        // Quote
        blocks.push(makeQuoteBlock(line.replace(quoteMarkdownRegex, '')));
      } else if (line.match(equationMarkdownRegex)) {
        // Equation
        const texFormula = line.replace(equationMarkdownRegex, '').trim();
        blocks.push(makeEquationBlock(texFormula));
      } else if (isCalloutBloack) {
        // Callout
        calloutMessage += '\n' + clean(line);
      } else if (line.trim() !== '') {
        Object.keys(emojiTable).forEach((emojiKey) => {
          if (line.startsWith(emojiKey)) {
            isCalloutBloack = true;
            emoji = emojiKey;
            calloutMessage = clean(line.replace(emojiKey, ''));
            return;
          }
        });
        if (!isCalloutBloack) {
          // Paragraphs
          blocks.push(makeParagraphBlock(line));
        }
      }
    }
  };
  if (isListBlock) {
    blocks = [...blocks, ...makeNestedListBlocks(listLines)];
    isListBlock = false;
    listLines = [];
  }
  if (isTableBlock) {
    blocks.push(makeTableBlock(tableLines));
    isTableBlock = false;
    tableLines = [];
  }
  return blocks;
}

export function convertToRichText(content = '', isCodeBlock = false) {
  const boldMarkdownRegex = /(?<!\\)\*\*(.*?)\*\*/g;  // **bold**
  const italicMarkdownRegex = /(?<!\\)\*(.*?)\*/g;    // *italic*
  const strikethroughMarkdownRegex = /(?<!\\)~~(.*?)~~/g;  // ~~strikethrough~~
  const underlineMarkdownRegex = /(?<!\\)_(.*?)_/g;   // _underline_
  const codeMarkdownRegex = /(?<!\\)`(.*?)`/g;        // `code`
  const imageMarkdownRegex = /!\[.*?\]\(.*?\)/g;
  const localLinkMarkdownRegex = /\[(.*?)\]\(\.\.\\(.*?)\)/g;
  content = content.replaceAll(imageMarkdownRegex, '').replaceAll(localLinkMarkdownRegex, '');
  const textType = 'text', equationType = 'equation';
  let isAllBold = false;
  let isAllItalic = false;
  let isAllStrikethrough = false;
  let isAllUnderline = false;
  let isAllCode = false;
  let richTextArray = [];
  let regex = /(?<!\\)(\*\*(.*?)\*\*|\*(.*?)\*|~~(.*?)~~|_(.*?)_|`(.*?)`|\$(.*?)\$|\[(.*?)\]\((.*?)\))/g;
  let lastIndex = 0;
  let match;

  if (isCodeBlock) {
    richTextArray.push({
      type: 'text',
      text: {
        content: content
      },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
      }
    });
  } else { // The code block does not need to parse the rich text.
    match = boldMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && boldMarkdownRegex.lastIndex === content.length)) {
      isAllBold = true;
      content = match[1];
    }
    match = italicMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && italicMarkdownRegex.lastIndex === content.length)) {
      isAllItalic = true;
      content = match[1];
    }
    match = strikethroughMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && strikethroughMarkdownRegex.lastIndex === content.length)) {
      isAllStrikethrough = true;
      content = match[1];
    }
    match = underlineMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && underlineMarkdownRegex.lastIndex === content.length)) {
      isAllUnderline = true;
      content = match[1];
    }
    match = codeMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && codeMarkdownRegex.lastIndex === content.length)) {
      isAllCode = true;
      content = match[1];
    }

    while ((match = regex.exec(content)) !== null) {
      let richTextObject = {
        type: '',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
        }
      };
      if (match.index > lastIndex) {
        richTextArray.push({
          type: 'text',
          text: {
            content: content.slice(lastIndex, match.index)
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
          }
        });
      }
      if (match[2]) { // bold
        richTextObject.type = textType;
        richTextObject[textType] = {
          content: match[2]
        };
        richTextObject.annotations.bold = true;
        richTextArray.push(richTextObject);
      } else if (match[3]) { // italic
        richTextObject.type = textType;
        richTextObject[textType].content = {
          content: match[3]
        };
        richTextObject.annotations.italic = true;
        richTextArray.push(richTextObject);
      } else if (match[4]) { // strikethrough
        richTextObject.type = textType;
        richTextObject[textType].content = {
          content: match[4]
        };
        richTextObject.annotations.strikethrough = true;
        richTextArray.push(richTextObject);
      } else if (match[5]) { // underline
        richTextObject.type = textType;
        richTextObject[textType] = {
          content: match[5]
        };
        richTextObject.annotations.underline = true;
        richTextArray.push(richTextObject);
      } else if (match[6]) { // code
        richTextObject.type = textType;
        richTextObject[textType] = {
          content: match[6]
        };
        richTextObject.annotations.code = true;
        richTextArray.push(richTextObject);
      } else if (match[7]) { // equation
        richTextObject.type = equationType;
        richTextObject[equationType] = {
          expression: match[7]
        };
        richTextArray.push(richTextObject);
      } else if (match[8] && match[9]) { // link
        richTextObject.type = textType;
        let url = match[9];
        if (url.includes(' \'')) {
          url = url.substring(0, url.indexOf(' \''));
        }
        richTextObject[textType] = {
          content: match[8],
          link: {
            url: url
          }
        };
        richTextArray.push(richTextObject);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      richTextArray.push({
        type: 'text',
        text: {
          content: content.slice(lastIndex)
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
        }
      });
    }
  }

  let splitRichTextArray = [];
  richTextArray.forEach((richTextObject) => {
    let richTextContent = richTextObject[richTextObject.type].content || richTextObject[richTextObject.type].expression;
    let richTextStartCursor = 0, richTextEndCursor = richTextContent.length <= 2000 ? richTextContent.length : 2000;
    do {
      let splitRichTextObject = JSON.parse(JSON.stringify(richTextObject));
      if (richTextObject.type === equationType) {
        splitRichTextObject[splitRichTextObject.type].expression = richTextContent.substring(richTextStartCursor, richTextEndCursor);
      } else {
        splitRichTextObject[splitRichTextObject.type].content = richTextContent.substring(richTextStartCursor, richTextEndCursor);
      }
      splitRichTextArray.push(splitRichTextObject);
      richTextStartCursor += 2000;
      richTextEndCursor += 2000;
      if (richTextEndCursor > richTextContent.length) {
        richTextEndCursor = richTextContent.length;
      }
    } while (richTextStartCursor < richTextContent.length);
  });

  // Update richTextArray!!!
  richTextArray = splitRichTextArray;

  if (!isCodeBlock) { // The code block does not need to parse the rich text.
    richTextArray.forEach((richTextObject) => {
      if (isAllBold) {
        richTextObject.annotations.bold = true;
      }
      if (isAllItalic) {
        richTextObject.annotations.italic = true;
      }
      if (isAllStrikethrough) {
        richTextObject.annotations.strikethrough = true;
      }
      if (isAllUnderline) {
        richTextObject.annotations.underline = true;
      }
      if (isAllCode) {
        richTextObject.annotations.code = true;
      }
      if (richTextObject.type === equationType) {
        richTextObject[richTextObject.type].expression = clean(richTextObject[richTextObject.type].expression); // Remove the slash.
      } else {
        richTextObject[richTextObject.type].content = clean(richTextObject[richTextObject.type].content); // Remove the slash.
      }
    });
  }

  return richTextArray;
}