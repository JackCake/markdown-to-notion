import {
  clean,
  convertToRichText,
} from './mapper.js';
import markdownToNotionLanguageMap from './markdownToNotionLanguageMap.js';

export function makeTableOfContents() {
  return {
    object: 'block',
    type: 'table_of_contents',
    table_of_contents: {
      color: 'default'
    }
  };
}

export function makeHeadingBlock(text, level) {
  return {
    object: 'block',
    type: 'heading_' + level,
    ['heading_' + level]: {
      rich_text: convertToRichText(text)
    }
  };
}

export function makeParagraphBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: convertToRichText(text)
    }
  };
}

export function makeNestedListBlocks(listLines) {
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

export function makeLinkBlock(text, url) {
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

export function makeCodeBlock(code, language) {
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

export function makeTableBlock(lines) {
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

export function makeTableRowBlock(cells) {
  return {
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: cells.map(cell => convertToRichText(cell))
    }
  };
}

export function makeEmbedBlock(url) {
  return {
    object: 'block',
    type: 'embed',
    embed: {
      url: url
    }
  };
}

export function makeQuoteBlock(text) {
  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: convertToRichText(text)
    }
  };
}

export function makeEquationBlock(texFormula) {
  return {
    object: 'block',
    type: 'equation',
    equation: {
      expression: clean(texFormula)
    }
  }
}

export function makeCalloutBlock(text, icon, color) {
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

export function makeDivider() {
  return {
    object: 'block',
    type: 'divider',
    divider: {}
  };
}