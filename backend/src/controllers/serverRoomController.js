const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /buildings/:buildingId/rooms
const getByBuilding = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const result = await query(
      `SELECT sr.*,
        (SELECT COUNT(*) FROM Assets a WHERE a.ServerRoomID = sr.ServerRoomID AND a.IsActive = 1) AS AssetCount
       FROM ServerRooms sr WHERE sr.BuildingID = @buildingId AND sr.IsActive = 1
       ORDER BY sr.Floor, sr.RoomName`,
      { buildingId: parseInt(buildingId) }
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /serverrooms/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT sr.*, b.BuildingName, b.City, c.ChannelName, c.ChannelID
       FROM ServerRooms sr
       JOIN Buildings b ON sr.BuildingID = b.BuildingID
       JOIN Channels c ON b.ChannelID = c.ChannelID
       WHERE sr.ServerRoomID = @id`,
      { id: parseInt(id) }
    );
    const room = result.recordset[0];
    if (!room) return next(createError('Server odası bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// POST /serverrooms
const create = async (req, res, next) => {
  try {
    const { buildingId, roomName, floor, capacity, maxTemperature, maxHumidity, powerCapacity } = req.body;
    if (!buildingId || !roomName) return next(createError('Bina ID ve oda adı gerekli.', 400));

    const result = await query(
      `INSERT INTO ServerRooms (BuildingID, RoomName, Floor, Capacity, MaxTemperature, MaxHumidity, PowerCapacity)
       OUTPUT INSERTED.*
       VALUES (@buildingId, @roomName, @floor, @capacity, @maxTemperature, @maxHumidity, @powerCapacity)`,
      { buildingId: parseInt(buildingId), roomName, floor, capacity, maxTemperature, maxHumidity, powerCapacity }
    );
    res.status(201).json({ success: true, message: 'Server odası oluşturuldu.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /serverrooms/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomName, floor, capacity, maxTemperature, maxHumidity, powerCapacity, currentTemperature, currentHumidity, isActive } = req.body;

    const result = await query(
      `UPDATE ServerRooms SET
        RoomName = COALESCE(@roomName, RoomName),
        Floor = COALESCE(@floor, Floor),
        Capacity = COALESCE(@capacity, Capacity),
        MaxTemperature = COALESCE(@maxTemperature, MaxTemperature),
        MaxHumidity = COALESCE(@maxHumidity, MaxHumidity),
        PowerCapacity = COALESCE(@powerCapacity, PowerCapacity),
        CurrentTemperature = COALESCE(@currentTemperature, CurrentTemperature),
        CurrentHumidity = COALESCE(@currentHumidity, CurrentHumidity),
        IsActive = COALESCE(@isActive, IsActive),
        UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE ServerRoomID = @id`,
      { id: parseInt(id), roomName, floor, capacity, maxTemperature, maxHumidity, powerCapacity, currentTemperature, currentHumidity, isActive }
    );

    if (!result.recordset[0]) return next(createError('Server odası bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Server odası güncellendi.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /serverrooms/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE ServerRooms SET IsActive = 0, UpdatedDate = GETDATE() WHERE ServerRoomID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Server odası silindi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByBuilding, getById, create, update, remove };
