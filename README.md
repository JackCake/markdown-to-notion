# markdown-to-notion

## Installation 
``` npm install @jackcake/markdown-to-notion ```

## Usage
```javascript
import fs from 'fs';
import {
  convertToNotionBlocks,
} from '@jackcake/markdown-to-notion';
const content = fs.readFileSync('./your-markdown-file.md', { encoding: 'utf8', flag: 'r' });
const lines = content.split(/\r?\n/).filter((line) => (line != ''));
const emojiTable = {
    '🧨': 'red',
    '⚠️': 'yellow'
};
let blocks = convertToNotionBlocks(lines, async(localFilePath) => {
    const destinationFileName = await uploadFileToYourAPI(localFilePath);
    return destinationFileName;
}, emojiTable);
```