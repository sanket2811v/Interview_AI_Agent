import { logger } from '../utils/logger.js';

/**
 * Lightweight, zero-dependency streaming multipart/form-data parser for Node.js
 * Strictly enforces 5MB file size limit and prevents memory exhaustion.
 */
export const handleMultipartUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return res.status(400).json({
      success: false,
      message: 'Invalid multipart form-data: boundary missing'
    });
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
  const chunks = [];
  let totalBytes = 0;

  req.on('data', (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_UPLOAD_SIZE) {
      req.pause();
      return res.status(413).json({
        success: false,
        message: 'File upload exceeds maximum allowable size of 5MB'
      });
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const fullBuffer = Buffer.concat(chunks);
      const boundaryDelimiter = `--${boundary}`;
      const boundaryBuffer = Buffer.from(boundaryDelimiter);

      const parts = [];
      let startIdx = 0;

      while ((startIdx = fullBuffer.indexOf(boundaryBuffer, startIdx)) !== -1) {
        startIdx += boundaryBuffer.length;
        const endIdx = fullBuffer.indexOf(boundaryBuffer, startIdx);
        if (endIdx === -1) break;

        const partBuffer = fullBuffer.subarray(startIdx, endIdx);
        parts.push(partBuffer);
      }

      req.body = req.body || {};

      for (const part of parts) {
        // Strip leading CRLF if present
        let cleanPart = part;
        if (cleanPart[0] === 0x0d && cleanPart[1] === 0x0a) {
          cleanPart = cleanPart.subarray(2);
        }
        // Strip trailing CRLF
        if (
          cleanPart.length >= 2 &&
          cleanPart[cleanPart.length - 2] === 0x0d &&
          cleanPart[cleanPart.length - 1] === 0x0a
        ) {
          cleanPart = cleanPart.subarray(0, cleanPart.length - 2);
        }

        const headerSeparator = Buffer.from('\r\n\r\n');
        const sepIdx = cleanPart.indexOf(headerSeparator);
        if (sepIdx === -1) continue;

        const headersString = cleanPart.subarray(0, sepIdx).toString('utf8');
        const bodyBuffer = cleanPart.subarray(sepIdx + 4);

        const dispositionMatch = headersString.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
        if (!dispositionMatch) continue;

        const fieldName = dispositionMatch[1];
        const fileName = dispositionMatch[2];

        if (fileName !== undefined) {
          // File part
          const contentTypeMatch = headersString.match(/Content-Type:\s*([^\r\n]+)/i);
          const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

          req.file = {
            fieldname: fieldName,
            originalname: fileName,
            mimetype: mimeType,
            buffer: bodyBuffer,
            size: bodyBuffer.length
          };
        } else {
          // Regular text field
          req.body[fieldName] = bodyBuffer.toString('utf8');
        }
      }

      next();
    } catch (error) {
      logger.error('Error parsing multipart form-data', { error: error.message });
      return res.status(400).json({
        success: false,
        message: 'Malformed form upload data'
      });
    }
  });

  req.on('error', (err) => {
    logger.error('Stream error during upload', { error: err.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to process incoming file stream'
    });
  });
};

