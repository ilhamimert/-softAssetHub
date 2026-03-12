const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getByBuilding = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const result = await query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM assets a WHERE a.room_id = r.room_id AND a.is_active = TRUE) AS asset_count
       FROM rooms r WHERE r.building_id = $1 AND r.is_active = TRUE
       ORDER BY r.room_name`,
      [parseInt(buildingId)]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM rooms WHERE room_id = $1`, [parseInt(id)]);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { buildingId, roomName, floor, roomType } = req.body;
    const result = await query(
      `INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES ($1, $2, $3, $4) RETURNING *`,
      [buildingId, roomName, floor, roomType]
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomName, floor, roomType, isActive } = req.body;
    const result = await query(
      `UPDATE rooms SET
        room_name    = COALESCE($1, room_name),
        floor        = COALESCE($2, floor),
        room_type    = COALESCE($3, room_type),
        is_active    = COALESCE($4, is_active),
        updated_date = NOW()
       WHERE room_id = $5 RETURNING *`,
      [roomName, floor, roomType, isActive, parseInt(id)]
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE rooms SET is_active = FALSE WHERE room_id = $1`, [parseInt(id)]);
    res.json({ success: true, message: 'Oda silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getByBuilding, getById, create, update, remove };
