import fetch from 'node-fetch';

/**
 * Backend proxy for Databricks file uploads
 * Handles CORS issues by proxying requests through a server
 * 
 * Usage: POST /api/upload
 * Body: { fileName: string, fileContent: string (base64) }
 * Response: { success: boolean, fileLink: string, fileViewUrl: string }
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileContent } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'Missing fileName or fileContent' });
    }

    // Configuration from environment
    const DATABRICKS_HOST = process.env.DATABRICKS_HOST || 'https://adb-2477674967236179.19.azuredatabricks.net';
    const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN || process.env.VITE_DATABRICKS_TOKEN;
    const DATABRICKS_VOLUME = process.env.DATABRICKS_VOLUME_PATH || '/Volumes/marketing_insight_prod/feedbackmanagement/raw_attachments';

    if (!DATABRICKS_TOKEN) {
      console.error('Missing DATABRICKS_TOKEN environment variable');
      return res.status(500).json({ error: 'Server configuration error: missing token' });
    }

    // Convert base64 to buffer
    const binaryData = Buffer.from(fileContent, 'base64');
    const uploadPath = `${DATABRICKS_VOLUME}/${fileName}`;
    const uploadUrl = `${DATABRICKS_HOST}/api/2.0/fs/files${uploadPath}?overwrite=true`;

    // Upload to Databricks
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: binaryData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Databricks API error: ${response.status}`, errorText);
      return res.status(response.status).json({
        error: `Databricks upload failed: HTTP ${response.status}`,
        details: errorText
      });
    }

    const fileLink = uploadPath;
    const fileViewUrl = `${DATABRICKS_HOST}/files${uploadPath}`;

    return res.status(200).json({
      success: true,
      fileName,
      fileLink,
      fileViewUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
