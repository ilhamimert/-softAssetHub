'use strict';

const { query } = require('../config/database');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-12b-it:free';

/**
 * POST /api/v1/ai/analyze-alerts
 * Son 24 saatteki çözülmemiş alertları analiz eder, Türkçe öneri döner.
 */
async function analyzeAlerts(req, res, next) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI servisi yapılandırılmamış. OPENROUTER_API_KEY eksik.',
      code: 'AI_NOT_CONFIGURED',
    });
  }

  try {
    const { channelId } = req.body;

    // Son 24 saatin çözülmemiş alertlarını ve asset monitoring verisini çek
    let alertsQuery = `
      SELECT
        a.alert_id,
        a.alert_type,
        a.alert_category,
        a.alert_message,
        a.alert_severity,
        a.current_value,
        a.threshold_value,
        a.created_at,
        ast.asset_name,
        ast.asset_type,
        c.channel_name,
        lm.cpu_usage,
        lm.ram_usage,
        lm.temperature,
        lm.performance_score,
        lm.is_online
      FROM alerts a
      JOIN assets ast ON a.asset_id = ast.asset_id
      JOIN channels c ON ast.channel_id = c.channel_id
      LEFT JOIN LATERAL (
        SELECT cpu_usage, ram_usage, temperature, performance_score, is_online
        FROM asset_monitoring
        WHERE asset_id = a.asset_id
        ORDER BY monitoring_time DESC
        LIMIT 1
      ) lm ON true
      WHERE a.resolved_at IS NULL
        AND a.created_at >= NOW() - INTERVAL '24 hours'
    `;

    const params = [];
    if (channelId) {
      params.push(parseInt(channelId));
      alertsQuery += ` AND c.channel_id = $${params.length}`;
    }

    alertsQuery += ' ORDER BY a.alert_severity DESC, a.created_at DESC LIMIT 20';

    const result = await query(alertsQuery, params);
    const alerts = result.rows;

    if (alerts.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: 'Son 24 saatte çözülmemiş kritik alert bulunmuyor.',
          recommendations: [],
          alertCount: 0,
        },
      });
    }

    // Prompt oluştur
    const alertLines = alerts.map(a =>
      `- [${a.alertType}/${a.alertCategory}] ${a.assetName} (${a.channelName}): ${a.alertMessage}` +
      (a.currentValue != null ? ` | Mevcut: ${a.currentValue}` : '') +
      (a.thresholdValue != null ? `, Eşik: ${a.thresholdValue}` : '') +
      (a.cpuUsage != null ? ` | CPU: ${a.cpuUsage}%` : '') +
      (a.temperature != null ? `, Sıcaklık: ${a.temperature}°C` : '') +
      (a.isOnline === false ? ' | OFFLINE' : '')
    ).join('\n');

    const prompt = `Aşağıda bir broadcast yayın sistemine ait son 24 saatin çözülmemiş sistem alertları listelenmiştir.
Her alert için kısa bir kök neden analizi yap ve öncelikli aksiyonları öner.
Yanıtı Türkçe ver. Maksimum 300 kelime. Teknik ve öz ol.

ALERTLAR (${alerts.length} adet):
${alertLines}

Yanıt formatı:
## Özet
[1-2 cümle genel durum]

## Öncelikli Aksiyonlar
1. [En kritik sorun ve çözüm]
2. [İkinci kritik]
3. [Diğerleri]`;

    // OpenRouter API çağrısı
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ilhami.yesiloz.net',
        'X-Title': 'AssetHub AI',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AI] OpenRouter hata:', response.status, err);
      return res.status(502).json({
        success: false,
        error: 'AI servisi yanıt vermedi. Lütfen tekrar deneyin.',
        code: 'AI_UPSTREAM_ERROR',
      });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content?.trim() || '';

    return res.json({
      success: true,
      data: {
        analysis: aiText,
        alertCount: alerts.length,
        model: MODEL,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({
        success: false,
        error: 'AI servisi zaman aşımına uğradı.',
        code: 'AI_TIMEOUT',
      });
    }
    next(err);
  }
}

module.exports = { analyzeAlerts };
