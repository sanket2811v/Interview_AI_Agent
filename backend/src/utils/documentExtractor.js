import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { logger } from './logger.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Magic bytes for supported document types
const MAGIC_BYTES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  ZIP_DOCX: [0x50, 0x4b, 0x03, 0x04] // PK.. (ZIP archive)
};

// Executable signatures to explicitly reject
const EXECUTABLE_SIGNATURES = [
  [0x4d, 0x5a], // MZ (Windows PE exe/dll)
  [0x7f, 0x45, 0x4c, 0x46], // ELF (Linux binary)
  [0xfe, 0xed, 0xfa, 0xce], // Mach-O 32
  [0xfe, 0xed, 0xfa, 0xcf], // Mach-O 64
  [0xca, 0xfe, 0xba, 0xbe]  // Java class / Mach-O universal
];

/**
 * Checks if a buffer matches a given byte prefix
 */
function matchesPrefix(buffer, prefix) {
  if (buffer.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buffer[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Validates document buffer for security and type integrity
 */
export function validateDocumentBuffer(buffer, originalFileName = '') {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }

  // Reject oversized documents (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum allowable size of 5MB.');
  }

  // Reject known executable signatures
  for (const sig of EXECUTABLE_SIGNATURES) {
    if (matchesPrefix(buffer, sig)) {
      throw new Error('Executable or binary application files are strictly prohibited.');
    }
  }

  const ext = path.extname(originalFileName).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];

  if (ext && !allowedExtensions.includes(ext)) {
    throw new Error(`Unsupported file extension "${ext}". Allowed: PDF, DOCX, TXT, MD.`);
  }

  // Determine detected type
  if (matchesPrefix(buffer, MAGIC_BYTES.PDF)) {
    return { type: 'pdf', ext: '.pdf' };
  }

  if (matchesPrefix(buffer, MAGIC_BYTES.ZIP_DOCX)) {
    return { type: 'docx', ext: '.docx' };
  }

  // Plain text / Markdown fallback verification
  if (ext === '.txt' || ext === '.md') {
    // Check if buffer contains binary nulls (characteristic of compiled binaries)
    const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        throw new Error('File contains null bytes or binary data and is not a valid text document.');
      }
    }
    return { type: 'text', ext };
  }

  throw new Error('Unrecognized or invalid document format. Please upload a valid PDF, DOCX, or text file.');
}

/**
 * Extracts plain text from DOCX (unzipping word/document.xml)
 */
export function extractTextFromDocx(buffer) {
  try {
    // Parse zip archive directory entries manually using Node's zlib
    let offset = 0;
    let xmlContent = '';

    while (offset < buffer.length - 30) {
      // Local file header signature: 0x04034b50 ("PK\x03\x04")
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileNameStart = offset + 30;
        const fileNameEnd = fileNameStart + fileNameLength;
        const fileName = buffer.toString('utf8', fileNameStart, fileNameEnd);

        const dataStart = fileNameEnd + extraFieldLength;
        const dataEnd = dataStart + compressedSize;

        if (fileName === 'word/document.xml' && dataEnd <= buffer.length) {
          const compressedData = buffer.subarray(dataStart, dataEnd);
          const decompressed =
            compressionMethod === 8
              ? zlib.inflateRawSync(compressedData)
              : compressedData;
          xmlContent = decompressed.toString('utf8');
          break;
        }

        offset = dataEnd;
      } else {
        offset++;
      }
    }

    if (!xmlContent) {
      throw new Error('Could not locate word/document.xml in the DOCX archive.');
    }

    // Extract text from <w:t> tags and paragraphs
    const paragraphs = xmlContent.split(/<\/w:p>/);
    const textLines = paragraphs.map((p) => {
      const matches = p.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      return matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join('');
    }).filter((line) => line.trim().length > 0);

    return textLines.join('\n');
  } catch (error) {
    logger.warn('DOCX text extraction error', { error: error.message });
    throw new Error(`Failed to parse DOCX document: ${error.message}`);
  }
}

/**
 * Extracts plain text from PDF streams
 */
export function extractTextFromPdf(buffer) {
  try {
    const rawPdf = buffer.toString('binary');
    let extractedText = '';

    // Search for stream ... endstream blocks
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;

    while ((match = streamRegex.exec(rawPdf)) !== null) {
      const streamContent = match[1];
      const streamBuffer = Buffer.from(streamContent, 'binary');

      let decompressed = '';
      try {
        decompressed = zlib.inflateSync(streamBuffer).toString('utf8');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamBuffer).toString('utf8');
        } catch {
          // If not compressed, use as-is
          decompressed = streamBuffer.toString('utf8');
        }
      }

      // Extract text in parentheses (Tj / TJ operators)
      // Tj: (text) Tj
      const tjMatches = decompressed.match(/\(([^)]+)\)\s*(?:Tj|'|")/g);
      if (tjMatches) {
        for (const item of tjMatches) {
          const text = item.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '');
          extractedText += text + ' ';
        }
        extractedText += '\n';
      }

      // TJ: [(text) 20 (more text)] TJ
      const arrayMatches = decompressed.match(/\[([^\]]+)\]\s*TJ/g);
      if (arrayMatches) {
        for (const item of arrayMatches) {
          const parts = item.match(/\(([^)]+)\)/g) || [];
          const text = parts.map((p) => p.slice(1, -1)).join('');
          extractedText += text + ' ';
        }
        extractedText += '\n';
      }
    }

    // Clean up escaped PDF chars (\(, \), \\, \r, \n)
    extractedText = extractedText
      .replace(/\\([()\\])/g, '$1')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.length < 20) {
      throw new Error(
        'PDF does not contain extractable plain text. It may be scanned or image-based. Please copy and paste the Job Description manually.'
      );
    }

    return extractedText;
  } catch (error) {
    logger.warn('PDF text extraction notice', { error: error.message });
    throw new Error(
      error.message.includes('scanned')
        ? error.message
        : `Could not parse text from this PDF file. Please paste the job description text manually.`
    );
  }
}

/**
 * Extracts and sanitizes text from supported document types
 */
export async function processDocumentUpload(buffer, originalFileName) {
  const { type, ext } = validateDocumentBuffer(buffer, originalFileName);

  let extractedText = '';
  if (type === 'pdf') {
    extractedText = extractTextFromPdf(buffer);
  } else if (type === 'docx') {
    extractedText = extractTextFromDocx(buffer);
  } else {
    // Text / Markdown
    extractedText = buffer.toString('utf8').trim();
  }

  // Final length & character validation
  if (!extractedText || extractedText.trim().length < 20) {
    throw new Error(
      'Document text extraction resulted in fewer than 20 characters. Please provide a complete Job Description.'
    );
  }

  // Safe server-side file persistence in uploads/ with UUID
  const safeFileName = `jd_${crypto.randomUUID()}${ext}`;
  const safeFilePath = path.join(UPLOADS_DIR, safeFileName);
  fs.writeFileSync(safeFilePath, buffer);

  return {
    rawText: extractedText.trim(),
    sourceType: type === 'pdf' ? 'PDF_UPLOAD' : type === 'docx' ? 'DOCX_UPLOAD' : 'TEXT_UPLOAD',
    originalFileName: path.basename(originalFileName || 'document' + ext),
    safeFileName,
    fileSize: buffer.length
  };
}

