const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure';

function numberParam(value, name, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`invalid ${name}`);
  }
  return number;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(JSON.stringify(body));
}

module.exports = async function weatherProxy(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  try {
    const query = req.query || {};
    const latitude = numberParam(query.latitude, 'latitude', -90, 90);
    const longitude = numberParam(query.longitude, 'longitude', -180, 180);
    const timezone = typeof query.timezone === 'string' && /^[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(query.timezone)
      ? query.timezone
      : 'auto';

    // 서버가 허용한 필드만 전달하고, 클라이언트의 _t는 서버에서 새로 생성한다.
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: CURRENT_FIELDS,
      hourly: 'precipitation_probability',
      temperature_unit: query.temperature_unit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
      wind_speed_unit: query.wind_speed_unit === 'mph' ? 'mph' : 'ms',
      timezone,
      _t: String(Date.now())
    });

    const upstream = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return sendJson(res, 502, { error: 'open_meteo_error', upstreamStatus: upstream.status });
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return sendJson(res, 502, { error: 'invalid_upstream_json' });
    }
    return sendJson(res, 200, payload);
  } catch (error) {
    console.error('weather proxy failed', error);
    return sendJson(res, 400, { error: 'weather_proxy_failed' });
  }
};
