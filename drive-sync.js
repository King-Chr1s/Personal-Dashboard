exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, token, data, fileId } = JSON.parse(event.body || '{}');

    if (action === 'save') {
      // Create or update file in Google Drive
      const fileName = 'dashboard-chris-backup.json';
      
      // Check if file exists first
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const searchData = await searchRes.json();
      const existingFile = searchData.files?.[0];

      if (existingFile) {
        // Update existing file
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          }
        );
        const updateData = await updateRes.json();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, fileId: updateData.id }) };
      } else {
        // Create new file
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--boundary--`;
        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/related; boundary=boundary',
            },
            body: form,
          }
        );
        const createData = await createRes.json();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, fileId: createData.id }) };
      }
    }

    if (action === 'load') {
      // Find and load backup file
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='dashboard-chris-backup.json' and trashed=false&fields=files(id,name,modifiedTime)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const searchData = await searchRes.json();
      const file = searchData.files?.[0];
      
      if (!file) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Aucune sauvegarde trouvée' }) };
      }

      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fileData = await fileRes.json();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: fileData, modifiedTime: file.modifiedTime }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action invalide' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
