const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getAll = async (req, res, next) => {
  try {
    const { channelId, reportType, limit = 50 } = req.query;
    let sql = `
      SELECT r.*, u.full_name AS generated_by_name, c.channel_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.user_id
      LEFT JOIN channels c ON r.channel_id = c.channel_id
      WHERE 1=1
    `;
    const params = [];
    if (channelId) { params.push(parseInt(channelId)); sql += ` AND r.channel_id = $${params.length}`; }
    if (reportType) { params.push(reportType); sql += ` AND r.report_type = $${params.length}`; }
    sql += ` ORDER BY r.generated_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const result = await query(sql, params);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT r.*, u.full_name AS generated_by_name, c.channel_name
       FROM reports r
       LEFT JOIN users u ON r.generated_by = u.user_id
       LEFT JOIN channels c ON r.channel_id = c.channel_id
       WHERE r.report_id = $1`,
      [parseInt(id)]
    );
    if (!result.recordset[0]) return next(createError('Rapor bulunamadı.', 404));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { reportName, reportType, channelId, dateRangeFrom, dateRangeTo, reportData, fileUrl, expiryDate } = req.body;
    if (!reportName) return next(createError('Rapor adı zorunludur.', 400));
    const result = await query(
      `INSERT INTO reports
         (report_name, report_type, channel_id, date_range_from, date_range_to, generated_by, report_data, file_url, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [reportName, reportType, channelId || null, dateRangeFrom || null, dateRangeTo || null,
       req.user.userId, reportData || null, fileUrl || null, expiryDate || null]
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM reports WHERE report_id = $1`, [parseInt(id)]);
    res.json({ success: true, message: 'Rapor silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, remove };
