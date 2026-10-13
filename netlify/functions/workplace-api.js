exports.handler = async function(event) {
  const APPS_SCRIPT_URL =
    process.env.APPS_SCRIPT_URL ||
    process.env.App_Script ||
    process.env.appscript ||
    '';

  if (!APPS_SCRIPT_URL) {
    return response(500, {
      success: false,
      error: 'APPS_SCRIPT_URL belum diatur di Netlify Environment Variables.'
    });
  }

  try {
    if (event.httpMethod === 'GET') {
      const params = new URLSearchParams(event.queryStringParameters || {});
      const target = APPS_SCRIPT_URL + (params.toString() ? '?' + params.toString() : '');
      const upstream = await fetch(target, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'application/json' }
      });
      const text = await upstream.text();
      return relay(upstream.status, text);
    }

    if (event.httpMethod === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); }
      catch (_) { return response(400, { success:false, error:'Body JSON tidak valid.' }); }

      const upstream = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          action: body.action || '',
          payload: body.payload || {},
          token: process.env.APP_API_TOKEN || ''
        })
      });
      const text = await upstream.text();
      return relay(upstream.status, text);
    }

    return response(405, { success:false, error:'Method not allowed.' });
  } catch (error) {
    return response(500, { success:false, error:error.message || String(error) });
  }
};

function relay(status, text) {
  try {
    const parsed = JSON.parse(text);
    return response(status >= 200 && status < 400 ? 200 : status, parsed);
  } catch (_) {
    return response(502, {
      success:false,
      error:'Apps Script tidak mengembalikan JSON. Pastikan deployment Web App benar dan URL berakhiran /exec.',
      upstreamStatus:status
    });
  }
}

function response(statusCode, data) {
  return {
    statusCode,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store'
    },
    body:JSON.stringify(data)
  };
}
