const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getByChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const result = await query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.building_id AND r.is_active = TRUE) AS room_count,
        (SELECT COUNT(*) FROM assets a JOIN rooms r ON a.room_id = r.room_id WHERE r.building_id = b.building_id AND a.is_active = TRUE) AS asset_count
       FROM buildings b WHERE b.channel_id = $1 AND b.is_active = TRUE
       ORDER BY b.building_name`,
      [parseInt(channelId)]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM buildings WHERE building_id = $1`, [parseInt(id)]);
    if (!result.recordset[0]) return next(createError('Bina bulunamadı.', 404));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { channelId, buildingName, city, address } = req.body;
    const result = await query(
      `INSERT INTO buildings (channel_id, building_name, city, address) VALUES ($1, $2, $3, $4) RETURNING *`,
      [channelId, buildingName, city, address]
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buildingName, city, address, isActive } = req.body;
    const result = await query(
      `UPDATE buildings SET
        building_name = COALESCE($1, building_name),
        city          = COALESCE($2, city),
        address       = COALESCE($3, address),
        is_active     = COALESCE($4, is_active),
        updated_date  = NOW()
       WHERE building_id = $5 RETURNING *`,
      [buildingName, city, address, isActive, parseInt(id)]
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE buildings SET is_active = FALSE WHERE building_id = $1`, [parseInt(id)]);
    res.json({ success: true, message: 'Bina silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getByChannel, getById, create, update, remove };
