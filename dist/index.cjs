'use strict';

const markdownToNotionLanguageMap = {
    "abap": "abap",
    "bash": "shell",
    "bsdmake": "makefile",
    "cake": "c#",
    "cakescript": "c#",
    "c_cpp": "c++",
    "cperl": "perl",
    "cpp": "c++",
    "clojure": "clojure",
    "coffee": "coffeescript",
    "coffee-script": "coffeescript",
    "csharp": "c#",
    "css": "css",
    "cucumber": "gherkin",
    "dart": "dart",
    "delphi": "pascal",
    "diff": "diff",
    "dockerfile": "docker",
    "elixir": "elixir",
    "elm": "elm",
    "erlang": "erlang",
    "fsharp": "f#",
    "gherkin": "gherkin",
    "glsl": "glsl",
    "go": "go",
    "golang": "go",
    "groovy": "groovy",
    "haskell": "haskell",
    "html": "html",
    "inc": "php",
    "java": "java/c/c++/c#",
    "javascript": "javascript",
    "json": "json",
    "jruby": "ruby",
    "js": "javascript",
    "jsx": "javascript",
    "julia": "julia",
    "latex": "latex",
    "less": "less",
    "lisp": "webassembly",
    "live-script": "livescript",
    "livescript": "livescript",
    "ls": "livescript",
    "lua": "lua",
    "macruby": "ruby",
    "make": "makefile",
    "makefile": "makefile",
    "markdown": "markdown",
    "matlab": "matlab",
    "mermaid": "mermaid",
    "mf": "makefile",
    "nix": "nix",
    "nixos": "nix",
    "node": "javascript",
    "objectivec": "objective-c",
    "obj-c": "objective-c",
    "objc": "objective-c",
    "ocaml": "ocaml",
    "octave": "matlab",
    "Protocol Buffers": "protobuf",
    "pandoc": "markdown",
    "pascal": "pascal",
    "perl": "perl",
    "php": "php",
    "posh": "powershell",
    "powershell": "powershell",
    "protobuf": "protobuf",
    "prolog": "prolog",
    "pwsh": "powershell",
    "python": "python",
    "python3": "python",
    "R": "r",
    "Rscript": "r",
    "r": "r",
    "rake": "ruby",
    "rb": "ruby",
    "rbx": "ruby",
    "rss": "xml",
    "rs": "rust",
    "rust": "rust",
    "rusthon": "python",
    "splus": "r",
    "sass": "sass",
    "scala": "scala",
    "scheme": "scheme",
    "scss": "scss",
    "sh": "shell",
    "shell-script": "shell",
    "sql": "sql",
    "swift": "swift",
    "tex": "latex",
    "text": "vb.net",
    "ts": "typescript",
    "typescript": "typescript",
    "udiff": "diff",
    "vb .net": "vb.net",
    "vb.net": "vb.net",
    "vbnet": "vb.net",
    "verilog": "verilog",
    "vhdl": "vhdl",
    "visual basic": "vb.net",
    "wast": "webassembly",
    "wasm": "webassembly",
    "wsdl": "xml",
    "xhtml": "html",
    "xml": "xml",
    "xsd": "xml",
    "yaml": "yaml",
    "yml": "yaml",
    "zsh": "shell"
};

function makeTableOfContents() {
  return {
    object: 'block',
    type: 'table_of_contents',
    table_of_contents: {
      color: 'default'
    }
  };
}

function makeHeadingBlock(text, level) {
  return {
    object: 'block',
    type: 'heading_' + level,
    ['heading_' + level]: {
      rich_text: convertToRichText(text)
    }
  };
}

function makeParagraphBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: convertToRichText(text)
    }
  };
}

function makeNestedListBlocks(listLines) {
  // Lists (bulleted, numbered, and task lists)
  let lists = [];
  let listBlocks = [];
  let maxIndentLevel = 0;
  let maxIndentLevelListsStack = [];

  listLines.forEach((listLine) => {
    const match = listLine.match(/^(\s*)([-*+]|\d+\.\s|-\s\[( |x|X)\]\s)(.+)/);
    const spaces = match[1].length;
    const indentLevel = Math.floor(spaces / 4);
    let type = "";
    const content = match[4].trim();
    let checked = null;
    if (listLine.match(/^(\s*)-\s\[( |x|X)\]\s(.+)/)) {
      type = "to_do";
      if (listLine.match(/^\-\s\[x|X\]$/)) {
        checked = true;
      } else {
        checked = false;
      }
    } else if (listLine.match(/^(\s*)\d+\.\s(.+)/)) {
      type = "numbered_list_item";
    } else {
      type = "bulleted_list_item";
    }
    maxIndentLevel = indentLevel > maxIndentLevel ? indentLevel : maxIndentLevel;
    let list = {
      indentLevel: indentLevel,
      type: type,
      content: content,
    };
    if (checked != null) {
      list["checked"] = checked;
    }
    lists.push(list);
  });

  while (maxIndentLevel > 0) {
    for (let i = lists.length - 1; i >= 0; i--) {
      if (lists[i].indentLevel === maxIndentLevel) {
        maxIndentLevelListsStack.push(lists[i]);
      } else {
        while (maxIndentLevelListsStack.length > 0) {
          if (lists[i].children) {
            lists[i].children.push(makeListBlock(maxIndentLevelListsStack.pop()));
          } else {
            lists[i].children = [makeListBlock(maxIndentLevelListsStack.pop())];
          }
        }
      }
    }
    maxIndentLevel--;
  }

  lists = lists.filter((list) => list.indentLevel === 0);

  lists.forEach((list) => {
    const listBlock = makeListBlock(list);
    listBlocks.push(listBlock);
  });

  return listBlocks;
}

function makeListBlock(list) {
  let listBlock;
  if (list.type === 'to_do') {
    listBlock = makeToDoBlock(list.content, list.checked, list.children);
  } else if (list.type === 'numbered_list_item') {
    listBlock = makeNumberedListItemBlock(list.content, list.children);
  } else {
    listBlock = makeBulletedListItemBlock(list.content, list.children);
  }
  return listBlock;
}

function makeBulletedListItemBlock(text, children) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: convertToRichText(text),
      children: children,
    }
  };
}

function makeNumberedListItemBlock(text, children) {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: convertToRichText(text),
      children: children,
    }
  };
}

function makeToDoBlock(text, checked, children) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: convertToRichText(text),
      checked: checked,
      children: children,
    }
  };
}

function makeLinkBlock(text, url) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: clean(text),
            link: {
              url: url
            }
          }
        }
      ]
    }
  };
}

function makeCodeBlock(code, language) {
  const isCodeBlock = true;
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: convertToRichText(code, isCodeBlock),
      language: markdownToNotionLanguageMap[language] ?? 'plain text'
    }
  };
}

function makeTableBlock(lines) {
  const tableBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: 0,
      has_column_header: true,
      has_row_header: false,
      children: []
    }
  };

  lines.forEach((line, index) => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim().replace('<br>', '\n'));
    if (index === 0) {
      tableBlock.table.table_width = cells.length;
    }
    tableBlock.table.children.push(makeTableRowBlock(cells));
  });

  return tableBlock;
}

function makeTableRowBlock(cells) {
  return {
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: cells.map(cell => convertToRichText(cell))
    }
  };
}

function makeEmbedBlock(url) {
  return {
    object: 'block',
    type: 'embed',
    embed: {
      url: url
    }
  };
}

function makeQuoteBlock(text) {
  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: convertToRichText(text)
    }
  };
}

function makeEquationBlock(texFormula) {
  return {
    object: 'block',
    type: 'equation',
    equation: {
      expression: clean(texFormula)
    }
  }
}

function makeCalloutBlock(text, icon, color) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: convertToRichText(text),
      icon: {
        emoji: icon
      },
      color: color
    }
  };
}

function makeDivider() {
  return {
    object: 'block',
    type: 'divider',
    divider: {}
  };
}

function clean(line = '') {
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
    .replaceAll('\\`', '`');
}

function convertToNotionBlocks(lines = [], imageProcessCallback, localFileProcessCallback, emojiTable = {}) {
  const listItemMarkdownRegex = /^(\s*)([-*+]|\d+\.\s|-\s\[( |x|X)\]\s)(.+)/;
  const headerMarkdownRegex = /^#{1,3} /;
  const imageMarkdownRegex = /^!\[\]\((.*?)\)/;
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
      line.match(imageMarkdownRegex) ||
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
      } else if (line.match(imageMarkdownRegex)) {
        // Image
        const imageFilePath = line.match(imageMarkdownRegex)[1];
        if (imageFilePath.startsWith('http')) {
          blocks.push(makeEmbedBlock(imageFilePath));
        } else {
          if (imageProcessCallback.constructor.name === 'AsyncFunction') {
            imageProcessCallback(imageFilePath).then((url) => {
              blocks.push(makeEmbedBlock(url));
            });
          } else {
            const url = imageProcessCallback(imageFilePath);
            blocks.push(makeEmbedBlock(url));
          }
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
        const text = match[1];
        const url = match[2];
        if (line.startsWith('http')) {
          blocks.push(makeLinkBlock(text, url));
        } else {
          const localFilePath = url;
          if (localFileProcessCallback.constructor.name === 'AsyncFunction') {
            localFileProcessCallback(localFilePath).then((url) => {
              blocks.push(makeEmbedBlock(url));
            });
          } else {
            const url = imageProcessCallback(localFilePath);
            blocks.push(makeEmbedBlock(url));
          }
        }
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
  }  if (isListBlock) {
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

function convertToRichText(content = '', isCodeBlock = false) {
  const boldMarkdownRegex = /(?<!\\)\*\*(.*?)\*\*/g;  // **bold**
  const italicMarkdownRegex = /(?<!\\)\*(.*?)\*/g;    // *italic*
  const strikethroughMarkdownRegex = /(?<!\\)~~(.*?)~~/g;  // ~~strikethrough~~
  const underlineMarkdownRegex = /(?<!\\)_(.*?)_/g;   // _underline_
  const codeMarkdownRegex = /(?<!\\)`(.*?)`/g;        // `code`
  const highlightMarkdownRegex = /(?<!\\)==(.*?)==/g; // ==highlight==
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
  let regex = /(?<!\\)(\*\*(.*?)\*\*|\*(.*?)\*|~~(.*?)~~|_(.*?)_|`(.*?)`|==(.*?)==|\$(.*?)\$|\[(.*?)\]\((.*?)\))/g;
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
        color: 'default',
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
    match = highlightMarkdownRegex.exec(content);
    if (match !== null && (match.index === 0 && highlightMarkdownRegex.lastIndex === content.length)) {
      isAllHighlight = true;
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
          color: 'default',
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
            color: 'default',
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
        richTextObject[textType] = {
          content: match[3]
        };
        richTextObject.annotations.italic = true;
        richTextArray.push(richTextObject);
      } else if (match[4]) { // strikethrough
        richTextObject.type = textType;
        richTextObject[textType] = {
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
      } else if (match[7]) { // highlight
        richTextObject.type = textType;
        richTextObject[textType] = {
          content: match[7]
        };
        richTextObject.annotations.color = 'yellow_background';
        richTextArray.push(richTextObject);
      } else if (match[8]) { // equation
        richTextObject.type = equationType;
        richTextObject[equationType] = {
          expression: match[8]
        };
        richTextArray.push(richTextObject);
      } else if (match[9] && match[10]) { // link
        richTextObject.type = textType;
        let url = match[10];
        if (url.includes(' \'')) {
          url = url.substring(0, url.indexOf(' \''));
        }
        richTextObject[textType] = {
          content: match[9],
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
          color: 'default',
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
      if (isAllHighlight) {
        richTextObject.annotations.color = 'yellow_background';
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

exports.clean = clean;
exports.convertToNotionBlocks = convertToNotionBlocks;
exports.convertToRichText = convertToRichText;
exports.makeCalloutBlock = makeCalloutBlock;
exports.makeCodeBlock = makeCodeBlock;
exports.makeDivider = makeDivider;
exports.makeEmbedBlock = makeEmbedBlock;
exports.makeEquationBlock = makeEquationBlock;
exports.makeHeadingBlock = makeHeadingBlock;
exports.makeLinkBlock = makeLinkBlock;
exports.makeNestedListBlocks = makeNestedListBlocks;
exports.makeParagraphBlock = makeParagraphBlock;
exports.makeQuoteBlock = makeQuoteBlock;
exports.makeTableBlock = makeTableBlock;
exports.makeTableOfContents = makeTableOfContents;
