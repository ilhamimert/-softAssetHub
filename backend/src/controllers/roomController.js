const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getByBuilding = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const result = await query(
      `SELECT r.*, (SELECT COUNT(*) FROM Assets a WHERE a.RoomID = r.RoomID AND a.IsActive = 1) AS AssetCount
       FROM Rooms r WHERE r.BuildingID = @buildingId AND r.IsActive = 1
       ORDER BY r.RoomName`,
      { buildingId: parseInt(buildingId) }
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM Rooms WHERE RoomID = @id`, { id: parseInt(id) });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { buildingId, roomName, floor, roomType } = req.body;
    const result = await query(
      `INSERT INTO Rooms (BuildingID, RoomName, Floor, RoomType) OUTPUT INSERTED.* VALUES (@buildingId, @roomName, @floor, @roomType)`,
      { buildingId, roomName, floor, roomType }
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomName, floor, roomType, isActive } = req.body;
    const result = await query(
      `UPDATE Rooms SET RoomName = COALESCE(@roomName, RoomName), Floor = COALESCE(@floor, Floor), RoomType = COALESCE(@roomType, RoomType), IsActive = COALESCE(@isActive, IsActive), UpdatedDate = GETDATE() OUTPUT INSERTED.* WHERE RoomID = @id`,
      { id: parseInt(id), roomName, floor, roomType, isActive }
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE Rooms SET IsActive = 0 WHERE RoomID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Oda silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getByBuilding, getById, create, update, remove };
